import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Loader2, Search, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { CandidatoData } from "@/pages/Candidatos";

const USUARIO_FIELDS: { key: string; label: string; table: "usuarios" }[] = [
  { key: "nombres", label: "Nombres", table: "usuarios" },
  { key: "apellidos", label: "Apellidos", table: "usuarios" },
  { key: "celular", label: "Celular", table: "usuarios" },
  { key: "numero_identificacion", label: "Número de identificación", table: "usuarios" },
  { key: "departamento", label: "Departamento", table: "usuarios" },
  { key: "municipio", label: "Municipio", table: "usuarios" },
  { key: "genero", label: "Género", table: "usuarios" },
  { key: "direccion", label: "Dirección", table: "usuarios" },
  { key: "ano_nacimiento", label: "Año de nacimiento", table: "usuarios" },
  { key: "como_se_entero", label: "Por dónde se enteró", table: "usuarios" },
  { key: "camara_aliada", label: "Cámara aliada", table: "usuarios" },
  { key: "universidad", label: "Universidad", table: "usuarios" },
  { key: "otra_institucion", label: "Otra institución", table: "usuarios" },
  { key: "red_social", label: "Red social", table: "usuarios" },
  { key: "creador_contenido", label: "Creador de contenido", table: "usuarios" },
];

const EMPRENDIMIENTO_FIELDS: { key: string; label: string; table: "emprendimientos" }[] = [
  { key: "nombre", label: "Nombre emprendimiento", table: "emprendimientos" },
  { key: "nit", label: "NIT", table: "emprendimientos" },
  { key: "valor_ventas", label: "Valor de las Ventas", table: "emprendimientos" },
  { key: "como_se_entero", label: "Por dónde se enteró", table: "emprendimientos" },
  { key: "categoria", label: "Categoría", table: "emprendimientos" },
  { key: "etapa", label: "Etapa", table: "emprendimientos" },
  { key: "pagina_web", label: "Página web", table: "emprendimientos" },
  { key: "industria_vertical", label: "Industria vertical", table: "emprendimientos" },
];

type FieldDef = (typeof USUARIO_FIELDS)[number] | (typeof EMPRENDIMIENTO_FIELDS)[number];
const ALL_FIELDS: FieldDef[] = [...USUARIO_FIELDS, ...EMPRENDIMIENTO_FIELDS];

interface MatchResult {
  email: string;
  userId: string;
  emprendimientoId?: string;
  rowData: Record<string, string>;
}

interface UpdateDataModalProps {
  open: boolean;
  onClose: () => void;
  candidatos: CandidatoData[];
  onRefresh: () => void;
}

export const UpdateDataModal = ({ open, onClose, candidatos, onRefresh }: UpdateDataModalProps) => {
  const { toast } = useToast();

  // Bulk state
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "upload" | "review" | "done">("select");
  const [matched, setMatched] = useState<MatchResult[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ updated: number; failed: number } | null>(null);

  // Individual state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidato, setSelectedCandidato] = useState<CandidatoData | null>(null);
  const [individualFields, setIndividualFields] = useState<string[]>([]);
  const [individualValues, setIndividualValues] = useState<Record<string, string>>({});
  const [savingIndividual, setSavingIndividual] = useState(false);

  const selectedFieldDefs = useMemo(() => ALL_FIELDS.filter(f => selectedFields.includes(f.key)), [selectedFields]);

  const toggleField = (key: string) => {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // ---- BULK ----

  const downloadTemplate = () => {
    const headers = ["Email", ...selectedFieldDefs.map(f => f.label)];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_actualizacion.xlsx");
    setStep("upload");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rows.length === 0) {
      toast({ title: "Error", description: "El archivo está vacío.", variant: "destructive" });
      return;
    }

    // Normalize emails from Excel
    const emailCol = Object.keys(rows[0]).find(k => k.toLowerCase().trim() === "email");
    if (!emailCol) {
      toast({ title: "Error", description: "No se encontró la columna 'Email'.", variant: "destructive" });
      return;
    }

    const emailsFromFile = rows.map(r => (r[emailCol] || "").toString().trim().toLowerCase()).filter(Boolean);

    // Query DB to find matching users
    const { data: usuarios } = await supabase
      .from("usuarios")
      .select("id, email")
      .in("email", emailsFromFile);

    const userMap = new Map((usuarios || []).map(u => [u.email!.toLowerCase(), u.id]));

    // If any emprendimiento fields selected, fetch emprendimientos
    const needsEmprendimiento = selectedFieldDefs.some(f => f.table === "emprendimientos");
    let empMap = new Map<string, string>();
    if (needsEmprendimiento && usuarios?.length) {
      const uids = usuarios.map(u => u.id);
      const { data: emps } = await supabase
        .from("emprendimientos")
        .select("id, user_id")
        .in("user_id", uids);
      empMap = new Map((emps || []).map(e => [e.user_id, e.id]));
    }

    // Build header mapping: label -> key
    const labelToKey = new Map(selectedFieldDefs.map(f => [f.label, f.key]));

    const matchedRows: MatchResult[] = [];
    const unmatchedEmails: string[] = [];

    for (const row of rows) {
      const email = (row[emailCol] || "").toString().trim().toLowerCase();
      if (!email) continue;
      const userId = userMap.get(email);
      if (!userId) {
        unmatchedEmails.push(email);
        continue;
      }

      const rowData: Record<string, string> = {};
      for (const [colName, value] of Object.entries(row)) {
        const fieldKey = labelToKey.get(colName);
        if (fieldKey) rowData[fieldKey] = String(value);
      }

      matchedRows.push({
        email,
        userId,
        emprendimientoId: empMap.get(userId),
        rowData,
      });
    }

    setMatched(matchedRows);
    setUnmatched(unmatchedEmails);
    setStep("review");
  };

  const executeBulkUpdate = async () => {
    setUpdating(true);
    let updated = 0;
    let failed = 0;

    for (const row of matched) {
      try {
        // Split into usuarios and emprendimientos updates
        const usuarioUpdate: Record<string, unknown> = {};
        const emprendimientoUpdate: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(row.rowData)) {
          const fieldDef = ALL_FIELDS.find(f => f.key === key);
          if (!fieldDef) continue;
          const val = key === "nit" ? (value ? Number(value) : null) : value || null;
          if (fieldDef.table === "usuarios") usuarioUpdate[key] = val;
          else emprendimientoUpdate[key] = val;
        }

        if (Object.keys(usuarioUpdate).length > 0) {
          const { error } = await supabase.from("usuarios").update(usuarioUpdate).eq("id", row.userId);
          if (error) throw error;
        }

        if (Object.keys(emprendimientoUpdate).length > 0 && row.emprendimientoId) {
          const { error } = await supabase.from("emprendimientos").update(emprendimientoUpdate).eq("id", row.emprendimientoId);
          if (error) throw error;
        }

        updated++;
      } catch {
        failed++;
      }
    }

    setUpdateResult({ updated, failed });
    setUpdating(false);
    setStep("done");
    onRefresh();
  };

  // ---- INDIVIDUAL ----

  const filteredCandidatos = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return candidatos.filter(c =>
      c.email.toLowerCase().includes(term) ||
      c.nombres.toLowerCase().includes(term) ||
      c.apellidos.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [searchTerm, candidatos]);

  const selectCandidatoForEdit = (c: CandidatoData) => {
    setSelectedCandidato(c);
    // Pre-fill values
    const values: Record<string, string> = {};
    for (const f of ALL_FIELDS) {
      if (f.table === "usuarios") {
        values[f.key] = (c as any)[f.key] || "";
      } else if (f.table === "emprendimientos" && c.emprendimiento) {
        values[f.key] = String((c.emprendimiento as any)[f.key] ?? "");
      }
    }
    setIndividualValues(values);
  };

  const saveIndividual = async () => {
    if (!selectedCandidato || individualFields.length === 0) return;
    setSavingIndividual(true);

    try {
      const usuarioUpdate: Record<string, unknown> = {};
      const emprendimientoUpdate: Record<string, unknown> = {};

      for (const key of individualFields) {
        const fieldDef = ALL_FIELDS.find(f => f.key === key);
        if (!fieldDef) continue;
        const val = key === "nit" ? (individualValues[key] ? Number(individualValues[key]) : null) : individualValues[key] || null;
        if (fieldDef.table === "usuarios") usuarioUpdate[key] = val;
        else emprendimientoUpdate[key] = val;
      }

      if (Object.keys(usuarioUpdate).length > 0) {
        const { error } = await supabase.from("usuarios").update(usuarioUpdate).eq("id", selectedCandidato.id);
        if (error) throw error;
      }

      if (Object.keys(emprendimientoUpdate).length > 0 && selectedCandidato.emprendimiento?.id) {
        const { error } = await supabase.from("emprendimientos").update(emprendimientoUpdate).eq("id", selectedCandidato.emprendimiento.id);
        if (error) throw error;
      }

      toast({ title: "Éxito", description: "Datos actualizados correctamente." });
      onRefresh();
      setSelectedCandidato(null);
      setIndividualFields([]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingIndividual(false);
    }
  };

  const handleClose = () => {
    setSelectedFields([]);
    setStep("select");
    setMatched([]);
    setUnmatched([]);
    setUpdateResult(null);
    setSearchTerm("");
    setSelectedCandidato(null);
    setIndividualFields([]);
    setIndividualValues({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Actualizar Datos
          </DialogTitle>
          <DialogDescription>Actualización masiva o individual de datos de usuarios y emprendimientos.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="masiva">
          <TabsList className="w-full">
            <TabsTrigger value="masiva" className="flex-1">Masiva</TabsTrigger>
            <TabsTrigger value="individual" className="flex-1">Individual</TabsTrigger>
          </TabsList>

          {/* ===== MASIVA ===== */}
          <TabsContent value="masiva" className="space-y-4">
            {step === "select" && (
              <>
                <p className="text-sm text-muted-foreground">Selecciona los campos que quieres actualizar:</p>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Datos de usuario</p>
                  <div className="grid grid-cols-2 gap-2">
                    {USUARIO_FIELDS.map(f => (
                      <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selectedFields.includes(f.key)} onCheckedChange={() => toggleField(f.key)} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Datos de emprendimiento</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EMPRENDIMIENTO_FIELDS.map(f => (
                      <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selectedFields.includes(f.key)} onCheckedChange={() => toggleField(f.key)} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={downloadTemplate} disabled={selectedFields.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar plantilla ({selectedFields.length} campos)
                </Button>
              </>
            )}

            {step === "upload" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Campos seleccionados: {selectedFieldDefs.map(f => f.label).join(", ")}
                </p>
                <Label>Cargar archivo Excel con datos</Label>
                <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" onClick={() => setStep("select")}>← Volver</Button>
              </div>
            )}

            {step === "review" && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> {matched.length} encontrados
                  </Badge>
                  {unmatched.length > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" /> {unmatched.length} no encontrados
                    </Badge>
                  )}
                </div>

                {unmatched.length > 0 && (
                  <div className="p-3 rounded-md bg-destructive/10 text-sm max-h-32 overflow-y-auto">
                    <p className="font-medium text-destructive mb-1">Emails no encontrados:</p>
                    {unmatched.map(e => <p key={e} className="text-muted-foreground">{e}</p>)}
                  </div>
                )}

                {matched.length > 0 && (
                  <div className="border rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          {selectedFieldDefs.map(f => <TableHead key={f.key}>{f.label}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matched.slice(0, 50).map(r => (
                          <TableRow key={r.email}>
                            <TableCell className="text-xs">{r.email}</TableCell>
                            {selectedFieldDefs.map(f => (
                              <TableCell key={f.key} className="text-xs">{r.rowData[f.key] || "-"}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setStep("upload"); setMatched([]); setUnmatched([]); }}>← Volver</Button>
                  <Button onClick={executeBulkUpdate} disabled={updating || matched.length === 0}>
                    {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Confirmar actualización ({matched.length})
                  </Button>
                </DialogFooter>
              </div>
            )}

            {step === "done" && updateResult && (
              <div className="space-y-4 text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-lg font-semibold">{updateResult.updated} registros actualizados</p>
                {updateResult.failed > 0 && <p className="text-sm text-destructive">{updateResult.failed} fallidos</p>}
                <Button onClick={handleClose}>Cerrar</Button>
              </div>
            )}
          </TabsContent>

          {/* ===== INDIVIDUAL ===== */}
          <TabsContent value="individual" className="space-y-4">
            {!selectedCandidato ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {filteredCandidatos.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {filteredCandidatos.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left p-3 hover:bg-muted transition-colors"
                        onClick={() => selectCandidatoForEdit(c)}
                      >
                        <p className="font-medium text-sm">{c.nombres} {c.apellidos}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-muted">
                  <p className="font-medium text-sm">{selectedCandidato.nombres} {selectedCandidato.apellidos}</p>
                  <p className="text-xs text-muted-foreground">{selectedCandidato.email}</p>
                </div>

                <p className="text-sm text-muted-foreground">Selecciona qué campos editar:</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_FIELDS.map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={individualFields.includes(f.key)}
                        onCheckedChange={() =>
                          setIndividualFields(prev => prev.includes(f.key) ? prev.filter(k => k !== f.key) : [...prev, f.key])
                        }
                      />
                      {f.label}
                    </label>
                  ))}
                </div>

                {individualFields.length > 0 && (
                  <div className="space-y-3 border-t pt-3">
                    {individualFields.map(key => {
                      const fieldDef = ALL_FIELDS.find(f => f.key === key)!;
                      return (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs">{fieldDef.label}</Label>
                          <Input
                            value={individualValues[key] || ""}
                            onChange={(e) => setIndividualValues(prev => ({ ...prev, [key]: e.target.value }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setSelectedCandidato(null); setIndividualFields([]); }}>← Volver</Button>
                  <Button onClick={saveIndividual} disabled={savingIndividual || individualFields.length === 0}>
                    {savingIndividual && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Guardar cambios
                  </Button>
                </DialogFooter>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
