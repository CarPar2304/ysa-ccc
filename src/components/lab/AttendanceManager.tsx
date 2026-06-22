import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, UserX, CheckCircle2, ClipboardList, UserPlus, Sparkles, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ValidatedUser {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  emprendimiento: string | null;
  source: "email" | "emprendimiento" | "identificacion" | "ia";
  alreadyRegistered: boolean;
  selected: boolean;
}

function normalizeId(s: string): string {
  return (s || "").replace(/[\s.\-_]/g, "").trim();
}

interface CohortStudent {
  id: string;
  email: string | null;
  nombres: string | null;
  apellidos: string | null;
  emprendimiento: string | null;
  selected: boolean;
}

interface AttendanceManagerProps {
  claseId: string;
  moduloId: string;
  cohortes?: number[];
  nivelModulo?: string | null;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}

const AttendanceManager = ({ claseId, moduloId, cohortes = [1], nivelModulo }: AttendanceManagerProps) => {
  const [rawEmails, setRawEmails] = useState("");
  const [rawEmps, setRawEmps] = useState("");
  const [rawIds, setRawIds] = useState("");
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatedUsers, setValidatedUsers] = useState<ValidatedUser[]>([]);
  const [notFoundEmails, setNotFoundEmails] = useState<string[]>([]);
  const [notFoundEmps, setNotFoundEmps] = useState<string[]>([]);
  const [notFoundIds, setNotFoundIds] = useState<string[]>([]);
  const [cohortStudents, setCohortStudents] = useState<CohortStudent[]>([]);
  const [existingAttendees, setExistingAttendees] = useState<{ id: string; nombres: string | null; apellidos: string | null; emprendimiento: string | null }[]>([]);
  const [showResults, setShowResults] = useState(false);

  // AI
  const [iaOpen, setIaOpen] = useState(false);
  const [iaExtra, setIaExtra] = useState("");
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSuggestions, setIaSuggestions] = useState<Array<{ item: string; emprendimiento_id: string | null; emprendimiento_nombre: string | null; razon: string; user_ids: string[]; selected: boolean }>>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchExistingAttendance();
  }, [claseId]);

  const fetchExistingAttendance = async () => {
    try {
      const { data: progreso } = await supabase
        .from("progreso_usuario")
        .select("user_id")
        .eq("clase_id", claseId)
        .eq("completado", true);
      if (!progreso || progreso.length === 0) { setExistingAttendees([]); return; }
      const userIds = progreso.map((p) => p.user_id);
      const { data: usuarios } = await supabase.from("usuarios").select("id, nombres, apellidos").in("id", userIds);
      const { data: emprendimientos } = await supabase.from("emprendimientos").select("user_id, nombre").in("user_id", userIds);
      const empMap = new Map(emprendimientos?.map((e) => [e.user_id, e.nombre]) || []);
      setExistingAttendees((usuarios || []).map((u) => ({ id: u.id, nombres: u.nombres, apellidos: u.apellidos, emprendimiento: empMap.get(u.id) || null })));
    } catch (e) { console.error(e); }
  };

  const parseList = (text: string): string[] => text.split(/[,;\n\r]+/).map((e) => e.trim()).filter((e) => e.length > 0);
  const parseEmails = (text: string): string[] => parseList(text).map((e) => e.toLowerCase()).filter((e) => e.includes("@"));

  const fetchCohortStudents = async (excludeUserIds: Set<string>, alreadyRegisteredIds: Set<string>) => {
    if (!nivelModulo) return;
    try {
      const { data: cupos } = await supabase.from("asignacion_cupos").select("emprendimiento_id, cohorte").eq("estado", "aprobado").eq("nivel", nivelModulo as any);
      if (!cupos) { setCohortStudents([]); return; }
      const filteredCupos = cupos.filter((c) => cohortes.includes(c.cohorte));
      const empIds = filteredCupos.map((c) => c.emprendimiento_id);
      if (empIds.length === 0) { setCohortStudents([]); return; }
      const { data: emps } = await supabase.from("emprendimientos").select("id, user_id, nombre").in("id", empIds);
      if (!emps) { setCohortStudents([]); return; }
      const empUserIds = emps.map((e) => e.user_id);
      const remaining = empUserIds.filter((uid) => !excludeUserIds.has(uid) && !alreadyRegisteredIds.has(uid));
      if (remaining.length === 0) { setCohortStudents([]); return; }
      const { data: usuarios } = await supabase.from("usuarios").select("id, email, nombres, apellidos").in("id", remaining);
      const empMap = new Map(emps.map((e) => [e.user_id, e.nombre]));
      setCohortStudents((usuarios || []).map((u) => ({ id: u.id, email: u.email, nombres: u.nombres, apellidos: u.apellidos, emprendimiento: empMap.get(u.id) || null, selected: false })));
    } catch (e) { console.error(e); }
  };

  const handleValidate = async () => {
    const emails = parseEmails(rawEmails);
    const empNames = parseList(rawEmps);
    const ids = parseList(rawIds).map(normalizeId).filter((x) => x.length > 0);
    if (emails.length === 0 && empNames.length === 0 && ids.length === 0) {
      toast({ title: "Ingresa correos, nombres de emprendimientos o identificaciones", variant: "destructive" });
      return;
    }

    setValidating(true);
    try {
      // 1. Email validation
      let usuariosEmail: any[] = [];
      let notFoundE: string[] = [];
      if (emails.length > 0) {
        const { data } = await supabase.from("usuarios").select("id, email, nombres, apellidos").in("email", emails);
        usuariosEmail = data || [];
        const found = new Set(usuariosEmail.map((u) => u.email?.toLowerCase()));
        notFoundE = emails.filter((e) => !found.has(e));
      }

      // 2. Emprendimiento validation (case-insensitive, normalized)
      let usuariosEmp: Array<{ id: string; email: string; nombres: string | null; apellidos: string | null; emprendimiento: string }> = [];
      let notFoundEmp: string[] = [];
      if (empNames.length > 0) {
        // Fetch all emprendimientos with cupo aprobado for this nivel (broader if no nivel)
        let empQuery = supabase.from("emprendimientos").select("id, nombre, user_id");
        const { data: allEmps } = await empQuery;
        const normalizedInput = empNames.map((n) => ({ original: n, norm: normalize(n) }));
        const matchedEmps: Array<{ id: string; nombre: string; user_id: string; inputName: string }> = [];
        const matchedInputs = new Set<string>();
        for (const emp of allEmps || []) {
          const nNorm = normalize(emp.nombre || "");
          for (const ni of normalizedInput) {
            if (nNorm === ni.norm) {
              matchedEmps.push({ ...emp, inputName: ni.original });
              matchedInputs.add(ni.norm);
            }
          }
        }
        notFoundEmp = normalizedInput.filter((n) => !matchedInputs.has(n.norm)).map((n) => n.original);

        // Get all members (owner + cofounders) for matched emprendimientos
        const matchedEmpIds = matchedEmps.map((e) => e.id);
        const ownerIds = matchedEmps.map((e) => e.user_id);
        const { data: miembros } = matchedEmpIds.length
          ? await supabase.from("emprendimiento_miembros").select("user_id, emprendimiento_id").in("emprendimiento_id", matchedEmpIds)
          : { data: [] as any[] };
        const allUserIds = [...new Set([...ownerIds, ...(miembros || []).map((m) => m.user_id)])];
        const { data: usuarios } = allUserIds.length
          ? await supabase.from("usuarios").select("id, email, nombres, apellidos").in("id", allUserIds)
          : { data: [] as any[] };

        for (const u of usuarios || []) {
          // Find which emprendimiento this user belongs to (owner first, else member)
          let emp = matchedEmps.find((e) => e.user_id === u.id);
          if (!emp) {
            const m = (miembros || []).find((mm) => mm.user_id === u.id);
            if (m) emp = matchedEmps.find((e) => e.id === m.emprendimiento_id);
          }
          if (emp) usuariosEmp.push({ id: u.id, email: u.email || "", nombres: u.nombres, apellidos: u.apellidos, emprendimiento: emp.nombre });
        }
      }

      // 2.5 Identification validation
      let usuariosIds: any[] = [];
      let notFoundIdsLocal: string[] = [];
      if (ids.length > 0) {
        // Fetch a broad set, then match normalized
        const { data: idMatches } = await supabase
          .from("usuarios")
          .select("id, email, nombres, apellidos, numero_identificacion")
          .not("numero_identificacion", "is", null);
        const byNorm = new Map<string, any>();
        for (const u of idMatches || []) {
          const n = normalizeId(u.numero_identificacion || "");
          if (n) byNorm.set(n, u);
        }
        for (const id of ids) {
          const u = byNorm.get(id);
          if (u) usuariosIds.push(u); else notFoundIdsLocal.push(id);
        }
      }

      // 3. Merge (dedupe by user id, email source wins)
      const userMap = new Map<string, ValidatedUser>();
      for (const u of usuariosEmail) {
        userMap.set(u.id, { id: u.id, email: u.email || "", nombres: u.nombres, apellidos: u.apellidos, emprendimiento: null, source: "email", alreadyRegistered: false, selected: true });
      }
      for (const u of usuariosEmp) {
        if (!userMap.has(u.id)) {
          userMap.set(u.id, { id: u.id, email: u.email, nombres: u.nombres, apellidos: u.apellidos, emprendimiento: u.emprendimiento, source: "emprendimiento", alreadyRegistered: false, selected: true });
        } else {
          const existing = userMap.get(u.id)!;
          if (!existing.emprendimiento) existing.emprendimiento = u.emprendimiento;
        }
      }
      for (const u of usuariosIds) {
        if (!userMap.has(u.id)) {
          userMap.set(u.id, { id: u.id, email: u.email || "", nombres: u.nombres, apellidos: u.apellidos, emprendimiento: null, source: "identificacion", alreadyRegistered: false, selected: true });
        }
      }

      // Fetch emprendimientos for users found by email/id
      const needEmpUserIds = [...userMap.values()].filter((v) => !v.emprendimiento).map((v) => v.id);
      if (needEmpUserIds.length) {
        const { data: emps } = await supabase.from("emprendimientos").select("user_id, nombre").in("user_id", needEmpUserIds);
        for (const e of emps || []) {
          const v = userMap.get(e.user_id);
          if (v && !v.emprendimiento) v.emprendimiento = e.nombre;
        }
      }

      const allIds = [...userMap.keys()];
      const { data: existingProgress } = allIds.length
        ? await supabase.from("progreso_usuario").select("user_id").eq("clase_id", claseId).eq("completado", true).in("user_id", allIds)
        : { data: [] as any[] };
      const alreadySet = new Set((existingProgress || []).map((p) => p.user_id));
      for (const v of userMap.values()) {
        if (alreadySet.has(v.id)) { v.alreadyRegistered = true; v.selected = false; }
      }

      setValidatedUsers([...userMap.values()]);
      setNotFoundEmails(notFoundE);
      setNotFoundEmps(notFoundEmp);
      setNotFoundIds(notFoundIdsLocal);
      setShowResults(true);
      setIaSuggestions([]);

      const allExcluded = new Set([...allIds, ...existingAttendees.map((a) => a.id)]);
      const allRegistered = new Set([...alreadySet, ...existingAttendees.map((a) => a.id)]);
      await fetchCohortStudents(allExcluded, allRegistered);
    } catch (e) {
      console.error(e);
      toast({ title: "Error al validar", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleAnalyzeIA = async () => {
    if (!nivelModulo) {
      toast({ title: "Sin nivel definido para el módulo", variant: "destructive" });
      return;
    }
    setIaLoading(true);
    try {
      const notFound = [...notFoundEmails, ...notFoundEmps];
      const { data, error } = await supabase.functions.invoke("match-asistencia-ia", {
        body: { not_found: notFound, extra_context: iaExtra, nivel: nivelModulo, cohortes },
      });
      if (error) throw error;
      const sugs = (data?.suggestions || []).map((s: any) => ({ ...s, selected: !!s.emprendimiento_id }));
      setIaSuggestions(sugs);
      if (sugs.filter((s: any) => s.emprendimiento_id).length === 0) {
        toast({ title: "IA no encontró coincidencias", description: "No se encontraron emprendimientos compatibles." });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error en análisis IA", description: e.message || "Intenta de nuevo", variant: "destructive" });
    } finally {
      setIaLoading(false);
    }
  };

  const acceptIaSuggestions = async () => {
    const accepted = iaSuggestions.filter((s) => s.selected && s.user_ids?.length > 0);
    if (accepted.length === 0) { setIaOpen(false); return; }
    const allUserIds = [...new Set(accepted.flatMap((s) => s.user_ids))];
    const { data: usuarios } = await supabase.from("usuarios").select("id, email, nombres, apellidos").in("id", allUserIds);
    const { data: existingProgress } = await supabase.from("progreso_usuario").select("user_id").eq("clase_id", claseId).eq("completado", true).in("user_id", allUserIds);
    const alreadySet = new Set((existingProgress || []).map((p) => p.user_id));
    setValidatedUsers((prev) => {
      const map = new Map(prev.map((v) => [v.id, v]));
      for (const sug of accepted) {
        for (const uid of sug.user_ids) {
          if (!map.has(uid)) {
            const u = (usuarios || []).find((x) => x.id === uid);
            if (!u) continue;
            map.set(uid, {
              id: u.id, email: u.email || "", nombres: u.nombres, apellidos: u.apellidos,
              emprendimiento: sug.emprendimiento_nombre, source: "ia",
              alreadyRegistered: alreadySet.has(uid), selected: !alreadySet.has(uid),
            });
          }
        }
      }
      return [...map.values()];
    });
    // Remove resolved items from not found
    const resolvedItems = new Set(accepted.map((s) => s.item));
    setNotFoundEmails((prev) => prev.filter((e) => !resolvedItems.has(e)));
    setNotFoundEmps((prev) => prev.filter((e) => !resolvedItems.has(e)));
    setIaOpen(false);
    toast({ title: `${accepted.length} sugerencia(s) aplicada(s)` });
  };

  const handleToggleUser = (userId: string) => setValidatedUsers((prev) => prev.map((u) => u.id === userId ? { ...u, selected: !u.selected } : u));
  const handleToggleCohortStudent = (userId: string) => setCohortStudents((prev) => prev.map((u) => u.id === userId ? { ...u, selected: !u.selected } : u));

  const handleSave = async () => {
    const fromValidated = validatedUsers.filter((u) => u.selected && !u.alreadyRegistered);
    const fromCohort = cohortStudents.filter((u) => u.selected);
    const merged = new Map<string, { id: string }>();
    for (const u of [...fromValidated, ...fromCohort]) merged.set(u.id, { id: u.id });
    const toSave = [...merged.values()];
    if (toSave.length === 0) { toast({ title: "No hay nuevas asistencias para guardar" }); return; }
    setSaving(true);
    try {
      const records = toSave.map((u) => ({ user_id: u.id, clase_id: claseId, completado: true, progreso_porcentaje: 100 }));
      const { error } = await supabase.from("progreso_usuario").upsert(records, { onConflict: "user_id,clase_id" });
      if (error) throw error;
      toast({ title: `Asistencia guardada para ${toSave.length} estudiante(s)` });
      setShowResults(false); setRawEmails(""); setRawEmps(""); setValidatedUsers([]); setNotFoundEmails([]); setNotFoundEmps([]); setCohortStudents([]); setIaSuggestions([]);
      fetchExistingAttendance();
    } catch (e) {
      console.error(e); toast({ title: "Error al guardar asistencia", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const newUsersCount = validatedUsers.filter((u) => !u.alreadyRegistered && u.selected).length;
  const manualCount = cohortStudents.filter((u) => u.selected).length;
  const alreadyCount = validatedUsers.filter((u) => u.alreadyRegistered).length;
  const totalToSave = newUsersCount + manualCount;
  const totalNotFound = notFoundEmails.length + notFoundEmps.length;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Registro de Asistencia</h3>
        </div>

        {existingAttendees.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Registrados: {existingAttendees.length}</p>
            <div className="flex flex-wrap gap-1">
              {existingAttendees.map((a) => (
                <Badge key={a.id} variant="secondary" className="text-[10px]">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{a.nombres} {a.apellidos}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium">Correos de asistentes (separados por coma, ; o salto de línea)</label>
          <Textarea value={rawEmails} onChange={(e) => setRawEmails(e.target.value)} placeholder="correo1@ejemplo.com&#10;correo2@ejemplo.com" rows={3} className="text-xs" />

          <label className="text-xs font-medium">Nombres de emprendimientos (no sensible a mayúsculas)</label>
          <Textarea value={rawEmps} onChange={(e) => setRawEmps(e.target.value)} placeholder="Emprendimiento A&#10;Emprendimiento B" rows={3} className="text-xs" />

          <Button size="sm" onClick={handleValidate} disabled={validating || (!rawEmails.trim() && !rawEmps.trim())} className="w-full">
            {validating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Validar
          </Button>
        </div>

        {showResults && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 text-primary"><UserCheck className="h-3 w-3" /> {validatedUsers.length} encontrados</span>
              {alreadyCount > 0 && <span className="flex items-center gap-1 text-muted-foreground"><CheckCircle2 className="h-3 w-3" /> {alreadyCount} ya registrados</span>}
              {totalNotFound > 0 && <span className="flex items-center gap-1 text-destructive"><UserX className="h-3 w-3" /> {totalNotFound} no encontrados</span>}
            </div>

            {validatedUsers.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Validados:</p>
                <div className="max-h-48 overflow-y-auto space-y-0.5 border rounded-lg p-1.5">
                  {validatedUsers.map((u) => (
                    <div key={u.id} className={`flex items-center gap-1.5 p-1.5 rounded text-xs ${u.alreadyRegistered ? "opacity-60 bg-muted" : "hover:bg-muted/50"}`}>
                      <Checkbox checked={u.selected || u.alreadyRegistered} disabled={u.alreadyRegistered} onCheckedChange={() => handleToggleUser(u.id)} />
                      <span className="flex-1 truncate">
                        {u.nombres} {u.apellidos}
                        {u.emprendimiento && <span className="text-muted-foreground"> · {u.emprendimiento}</span>}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1">
                        {u.source === "email" ? "Email" : u.source === "emprendimiento" ? <><Building2 className="h-2.5 w-2.5 mr-0.5 inline" />Empr.</> : <><Sparkles className="h-2.5 w-2.5 mr-0.5 inline" />IA</>}
                      </Badge>
                      {u.alreadyRegistered && <Badge variant="outline" className="text-[10px] px-1">Ya</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalNotFound > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-destructive">No encontrados ({totalNotFound}):</p>
                  <Button size="sm" variant="outline" onClick={() => setIaOpen(true)} className="h-6 text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1" /> Analizar con IA
                  </Button>
                </div>
                <div className="border border-destructive/30 rounded-lg p-1.5 space-y-0.5">
                  {notFoundEmails.map((e) => <p key={`e-${e}`} className="text-xs text-muted-foreground">📧 {e}</p>)}
                  {notFoundEmps.map((e) => <p key={`m-${e}`} className="text-xs text-muted-foreground">🏢 {e}</p>)}
                </div>
              </div>
            )}

            {cohortStudents.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <UserPlus className="h-3 w-3 text-primary" />
                  <p className="text-xs font-medium">Agregar manualmente ({cohortStudents.length} del nivel/cohorte):</p>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5 border rounded-lg p-1.5">
                  {cohortStudents.map((u) => (
                    <div key={u.id} className="flex items-center gap-1.5 p-1.5 rounded text-xs hover:bg-muted/50">
                      <Checkbox checked={u.selected} onCheckedChange={() => handleToggleCohortStudent(u.id)} />
                      <span className="flex-1 truncate">{u.nombres} {u.apellidos}{u.emprendimiento && <span className="text-muted-foreground"> · {u.emprendimiento}</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalToSave > 0 && (
              <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Guardar Asistencia ({totalToSave} nuevos)
              </Button>
            )}
          </div>
        )}

        <Dialog open={iaOpen} onOpenChange={setIaOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Analizar con IA</DialogTitle>
              <DialogDescription>La IA intentará asociar los items no encontrados con emprendimientos del nivel/cohorte.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Contexto adicional (opcional)</label>
                <Textarea value={iaExtra} onChange={(e) => setIaExtra(e.target.value)} placeholder="Pega nombres adicionales separados por coma o salto de línea para ayudar a la IA" rows={3} className="text-xs" />
              </div>
              <Button size="sm" onClick={handleAnalyzeIA} disabled={iaLoading} className="w-full">
                {iaLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Analizar
              </Button>

              {iaSuggestions.length > 0 && (
                <div className="space-y-1 max-h-72 overflow-y-auto border rounded-lg p-2">
                  {iaSuggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded text-xs hover:bg-muted/50">
                      <Checkbox checked={s.selected} disabled={!s.emprendimiento_id} onCheckedChange={(v) => setIaSuggestions((prev) => prev.map((p, idx) => idx === i ? { ...p, selected: !!v } : p))} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{s.item}</p>
                        {s.emprendimiento_id ? (
                          <p className="text-primary">→ {s.emprendimiento_nombre} <span className="text-muted-foreground">({s.user_ids?.length || 0} usuario(s))</span></p>
                        ) : (
                          <p className="text-muted-foreground">Sin match</p>
                        )}
                        <p className="text-[10px] text-muted-foreground italic">{s.razon}</p>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" onClick={acceptIaSuggestions} className="w-full mt-2">Aplicar sugerencias seleccionadas</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AttendanceManager;
