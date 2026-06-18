import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";
import type { Database } from "@/integrations/supabase/types";

type Nivel = Database["public"]["Enums"]["nivel_emprendimiento"];

interface Props {
  open: boolean;
  onClose: () => void;
  allowedNiveles: Nivel[];
}

interface ModuloRow { id: string; titulo: string; nivel: Nivel | null; orden: number | null }
interface ClaseRow { id: string; modulo_id: string; titulo: string; orden: number | null; cohorte: number[] | null }

export const ExportAsistenciaModal = ({ open, onClose, allowedNiveles }: Props) => {
  const { toast } = useToast();
  const [niveles, setNiveles] = useState<Nivel[]>(allowedNiveles);
  const [cohortesDisponibles, setCohortesDisponibles] = useState<number[]>([]);
  const [cohortesSel, setCohortesSel] = useState<number[]>([]);
  const [modulos, setModulos] = useState<ModuloRow[]>([]);
  const [clases, setClases] = useState<ClaseRow[]>([]);
  const [modulosSel, setModulosSel] = useState<Set<string>>(new Set());
  const [clasesSel, setClasesSel] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { if (open) { setNiveles(allowedNiveles); } }, [open, allowedNiveles]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [{ data: mods }, { data: cuposCoh }] = await Promise.all([
        supabase.from("modulos").select("id, titulo, nivel, orden").in("nivel", niveles).order("orden"),
        supabase.from("asignacion_cupos").select("cohorte, nivel").eq("estado", "aprobado").in("nivel", niveles as any),
      ]);
      const modsArr = (mods || []) as ModuloRow[];
      setModulos(modsArr);
      setModulosSel(new Set(modsArr.map((m) => m.id)));

      // Dynamic cohortes (only from Starter/Growth)
      const cohSet = new Set<number>();
      for (const c of cuposCoh || []) {
        if ((c.nivel === "Starter" || c.nivel === "Growth") && typeof c.cohorte === "number") cohSet.add(c.cohorte);
      }
      const cohArr = [...cohSet].sort((a, b) => a - b);
      setCohortesDisponibles(cohArr);
      setCohortesSel(cohArr);

      const modIds = modsArr.map((m) => m.id);
      if (modIds.length) {
        const { data: cls } = await supabase.from("clases").select("id, modulo_id, titulo, orden, cohorte").in("modulo_id", modIds).order("orden");
        const clsArr = (cls || []) as ClaseRow[];
        setClases(clsArr);
        setClasesSel(new Set(clsArr.map((c) => c.id)));
      } else { setClases([]); setClasesSel(new Set()); }
      setLoading(false);
    })();
  }, [open, niveles]);

  const cohortesAplica = useMemo(() => niveles.some((n) => n === "Starter" || n === "Growth"), [niveles]);

  const toggleNivel = (n: Nivel) => setNiveles((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  const toggleModulo = (id: string) => setModulosSel((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleClase = (id: string) => setClasesSel((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleCohorte = (c: number) => setCohortesSel((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const claseApplies = (claseCohorte: number[] | null, studentCohorte: number) => {
    if (!claseCohorte || claseCohorte.length === 0) return true;
    return claseCohorte.includes(studentCohorte);
  };

  const handleExport = async () => {
    if (niveles.length === 0 || modulosSel.size === 0 || clasesSel.size === 0) {
      toast({ title: "Selecciona al menos un nivel, módulo y clase", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const modulosFiltered = modulos.filter((m) => modulosSel.has(m.id));
      const clasesFiltered = clases.filter((c) => clasesSel.has(c.id) && modulosSel.has(c.modulo_id));
      const claseIds = clasesFiltered.map((c) => c.id);

      const { data: cupos } = await supabase.from("asignacion_cupos").select("emprendimiento_id, nivel, cohorte").eq("estado", "aprobado").in("nivel", niveles as any);
      const cuposFiltered = (cupos || []).filter((c) => {
        if (c.nivel === "Starter" || c.nivel === "Growth") return cohortesSel.includes(c.cohorte);
        return true;
      });
      const empIds = [...new Set(cuposFiltered.map((c) => c.emprendimiento_id))];
      const cupoByEmp = new Map(cuposFiltered.map((c) => [c.emprendimiento_id, c]));

      const { data: emps } = empIds.length ? await supabase.from("emprendimientos").select("id, nombre, user_id").in("id", empIds) : { data: [] as any[] };
      const { data: miembros } = empIds.length ? await supabase.from("emprendimiento_miembros").select("user_id, emprendimiento_id").in("emprendimiento_id", empIds) : { data: [] as any[] };

      const studentRows: Array<{ user_id: string; emp_id: string; emp_nombre: string; nivel: string; cohorte: number; tipo: "Owner" | "Co-founder" }> = [];
      for (const e of emps || []) {
        const cupo = cupoByEmp.get(e.id);
        if (!cupo) continue;
        studentRows.push({ user_id: e.user_id, emp_id: e.id, emp_nombre: e.nombre || "", nivel: cupo.nivel, cohorte: cupo.cohorte, tipo: "Owner" });
      }
      for (const m of miembros || []) {
        const emp = (emps || []).find((e) => e.id === m.emprendimiento_id);
        const cupo = cupoByEmp.get(m.emprendimiento_id);
        if (!emp || !cupo) continue;
        if (emp.user_id === m.user_id) continue;
        studentRows.push({ user_id: m.user_id, emp_id: emp.id, emp_nombre: emp.nombre || "", nivel: cupo.nivel, cohorte: cupo.cohorte, tipo: "Co-founder" });
      }

      const userIds = [...new Set(studentRows.map((s) => s.user_id))];
      const { data: usuarios } = userIds.length ? await supabase.from("usuarios").select("id, nombres, apellidos, email").in("id", userIds) : { data: [] as any[] };
      const userMap = new Map((usuarios || []).map((u) => [u.id, u]));

      const { data: progreso } = userIds.length && claseIds.length
        ? await supabase.from("progreso_usuario").select("user_id, clase_id, completado").in("user_id", userIds).in("clase_id", claseIds)
        : { data: [] as any[] };
      const asistio = new Set<string>();
      for (const p of progreso || []) if (p.completado) asistio.add(`${p.user_id}:${p.clase_id}`);

      const wb = new ExcelJS.Workbook();
      wb.creator = "YSA"; wb.created = new Date();

      const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      const headerFont: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true };
      const naFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      const border: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };

      const resumen = wb.addWorksheet("Resumen");
      resumen.columns = [
        { header: "Módulo", key: "modulo", width: 32 },
        { header: "Nivel", key: "nivel", width: 12 },
        { header: "Total clases", key: "total", width: 14 },
        { header: "Estudiantes", key: "est", width: 14 },
        { header: "% Asistencia promedio", key: "prom", width: 22 },
      ];
      resumen.getRow(1).eachCell((c) => { c.fill = headerFill; c.font = headerFont; c.border = border; c.alignment = { horizontal: "center" }; });

      const usedSheetNames = new Set<string>();
      const makeUniqueSheetName = (base: string, nivel: string | null) => {
        const clean = (s: string) => (s || "").replace(/[\\/:*?\[\]]/g, "").trim();
        const nivelTag = nivel ? ` (${clean(nivel)[0] || ""})` : "";
        let name = (clean(base).slice(0, 31 - nivelTag.length) + nivelTag).slice(0, 31) || "Modulo";
        if (!usedSheetNames.has(name)) { usedSheetNames.add(name); return name; }
        let i = 2;
        while (true) {
          const suffix = ` (${i})`;
          const candidate = (clean(base).slice(0, 31 - suffix.length) + suffix).slice(0, 31);
          if (!usedSheetNames.has(candidate)) { usedSheetNames.add(candidate); return candidate; }
          i++;
        }
      };

      for (const modulo of modulosFiltered) {
        const modClases = clasesFiltered.filter((c) => c.modulo_id === modulo.id);
        if (modClases.length === 0) continue;
        const modStudents = studentRows.filter((s) => {
          if (modulo.nivel && s.nivel !== modulo.nivel) return false;
          return true;
        });

        const sheetName = makeUniqueSheetName(modulo.titulo || "Modulo", modulo.nivel);
        const ws = wb.addWorksheet(sheetName);
        const headers = ["Nombre", "Apellidos", "Email", "Emprendimiento", "Nivel", "Cohorte", "Tipo", ...modClases.map((c) => c.titulo), "% Asistencia"];
        ws.addRow(headers);
        const headerRow = ws.getRow(1);
        headerRow.eachCell((c) => { c.fill = headerFill; c.font = headerFont; c.border = border; c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
        headerRow.height = 32;

        let totalPct = 0; let countStu = 0;
        for (const s of modStudents) {
          const u = userMap.get(s.user_id);
          if (!u) continue;
          // For each class: "N/A" if class doesn't apply to student's cohorte
          const cells = modClases.map((c) => {
            if (!claseApplies(c.cohorte, s.cohorte)) return { applies: false, present: false };
            return { applies: true, present: asistio.has(`${s.user_id}:${c.id}`) };
          });
          const applicable = cells.filter((x) => x.applies);
          const present = applicable.filter((x) => x.present).length;
          const pct = applicable.length > 0 ? (present / applicable.length) * 100 : 0;
          totalPct += pct; countStu++;
          const row = ws.addRow([
            u.nombres || "",
            u.apellidos || "",
            u.email || "",
            s.emp_nombre,
            s.nivel,
            s.cohorte,
            s.tipo,
            ...cells.map((x) => !x.applies ? "—" : (x.present ? "✓" : "✗")),
            `${pct.toFixed(1)}%`,
          ]);
          row.eachCell((cell, colNum) => {
            cell.border = border;
            if (colNum > 7 && colNum < headers.length) {
              const x = cells[colNum - 8];
              cell.alignment = { horizontal: "center" };
              if (!x.applies) {
                cell.fill = naFill;
                cell.font = { color: { argb: "FF9CA3AF" } };
              } else {
                cell.font = { color: { argb: x.present ? "FF15803D" : "FFB91C1C" }, bold: true };
              }
            }
          });
        }

        ws.columns.forEach((col, i) => {
          if (i < 7) col.width = [16, 16, 26, 26, 10, 9, 12][i];
          else if (i === ws.columns.length - 1) col.width = 14;
          else col.width = 16;
        });
        ws.views = [{ state: "frozen", xSplit: 4, ySplit: 1 }];

        resumen.addRow({
          modulo: modulo.titulo, nivel: modulo.nivel || "", total: modClases.length, est: countStu,
          prom: countStu > 0 ? `${(totalPct / countStu).toFixed(1)}%` : "0%",
        }).eachCell((c) => { c.border = border; });
      }

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `asistencia-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Exportación exitosa" });
      onClose();
    } catch (e: any) {
      console.error(e); toast({ title: "Error al exportar", description: e.message, variant: "destructive" });
    } finally { setExporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar asistencia</DialogTitle>
          <DialogDescription>Selecciona los filtros para generar el reporte en Excel.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Niveles</p>
            <div className="flex flex-wrap gap-3">
              {allowedNiveles.map((n) => (
                <label key={n} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={niveles.includes(n)} onCheckedChange={() => toggleNivel(n)} />
                  {n}
                </label>
              ))}
            </div>
          </div>

          {cohortesAplica && cohortesDisponibles.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Cohortes (Starter y Growth)</p>
              <div className="flex flex-wrap gap-3">
                {cohortesDisponibles.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={cohortesSel.includes(c)} onCheckedChange={() => toggleCohorte(c)} />
                    Cohorte {c}
                  </label>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium mb-2">Módulos ({modulosSel.size}/{modulos.length})</p>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {modulos.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-xs">
                      <Checkbox checked={modulosSel.has(m.id)} onCheckedChange={() => toggleModulo(m.id)} />
                      <span className="flex-1">{m.titulo}</span>
                      <span className="text-muted-foreground">{m.nivel}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Clases ({clasesSel.size}/{clases.length})</p>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {clases.filter((c) => modulosSel.has(c.modulo_id)).map((c) => {
                    const mod = modulos.find((m) => m.id === c.modulo_id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-xs">
                        <Checkbox checked={clasesSel.has(c.id)} onCheckedChange={() => toggleClase(c.id)} />
                        <span className="flex-1">{c.titulo}</span>
                        <span className="text-muted-foreground truncate max-w-[12rem]">{mod?.titulo}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleExport} disabled={exporting || loading}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
