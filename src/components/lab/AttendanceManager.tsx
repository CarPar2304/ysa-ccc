import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, UserX, CheckCircle2, ClipboardList, UserPlus } from "lucide-react";

interface ValidatedUser {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  emprendimiento: string | null;
  alreadyRegistered: boolean;
  selected: boolean;
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

const AttendanceManager = ({ claseId, moduloId, cohortes = [1], nivelModulo }: AttendanceManagerProps) => {
  const [rawEmails, setRawEmails] = useState("");
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatedUsers, setValidatedUsers] = useState<ValidatedUser[]>([]);
  const [notFoundEmails, setNotFoundEmails] = useState<string[]>([]);
  const [cohortStudents, setCohortStudents] = useState<CohortStudent[]>([]);
  const [existingAttendees, setExistingAttendees] = useState<{ id: string; nombres: string | null; apellidos: string | null; emprendimiento: string | null }[]>([]);
  const [showResults, setShowResults] = useState(false);
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

      if (!progreso || progreso.length === 0) {
        setExistingAttendees([]);
        return;
      }

      const userIds = progreso.map((p) => p.user_id);

      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("id, nombres, apellidos")
        .in("id", userIds);

      const { data: emprendimientos } = await supabase
        .from("emprendimientos")
        .select("user_id, nombre")
        .in("user_id", userIds);

      const empMap = new Map(emprendimientos?.map((e) => [e.user_id, e.nombre]) || []);

      setExistingAttendees(
        (usuarios || []).map((u) => ({
          id: u.id,
          nombres: u.nombres,
          apellidos: u.apellidos,
          emprendimiento: empMap.get(u.id) || null,
        }))
      );
    } catch (error) {
      console.error("Error fetching existing attendance:", error);
    }
  };

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[,;\n\r]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes("@"));
  };

  const fetchCohortStudents = async (excludeUserIds: Set<string>, alreadyRegisteredIds: Set<string>) => {
    if (!nivelModulo) return;

    try {
      // Get all students from the level+cohort via asignacion_cupos
      const { data: cupos } = await supabase
        .from("asignacion_cupos")
        .select("emprendimiento_id, cohorte")
        .eq("estado", "aprobado")
        .eq("nivel", nivelModulo as any);

      if (!cupos || cupos.length === 0) {
        setCohortStudents([]);
        return;
      }

      // Filter by cohortes
      const filteredCupos = cupos.filter(c => cohortes.includes(c.cohorte));
      const empIds = filteredCupos.map(c => c.emprendimiento_id);

      if (empIds.length === 0) {
        setCohortStudents([]);
        return;
      }

      const { data: emps } = await supabase
        .from("emprendimientos")
        .select("id, user_id, nombre")
        .in("id", empIds);

      if (!emps || emps.length === 0) {
        setCohortStudents([]);
        return;
      }

      const empUserIds = emps.map(e => e.user_id);
      // Exclude those already validated or already registered
      const remainingUserIds = empUserIds.filter(uid => !excludeUserIds.has(uid) && !alreadyRegisteredIds.has(uid));

      if (remainingUserIds.length === 0) {
        setCohortStudents([]);
        return;
      }

      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("id, email, nombres, apellidos")
        .in("id", remainingUserIds);

      const empMap = new Map(emps.map(e => [e.user_id, e.nombre]));

      setCohortStudents(
        (usuarios || []).map(u => ({
          id: u.id,
          email: u.email,
          nombres: u.nombres,
          apellidos: u.apellidos,
          emprendimiento: empMap.get(u.id) || null,
          selected: false,
        }))
      );
    } catch (error) {
      console.error("Error fetching cohort students:", error);
    }
  };

  const handleValidate = async () => {
    const emails = parseEmails(rawEmails);
    if (emails.length === 0) {
      toast({ title: "No se encontraron correos válidos", variant: "destructive" });
      return;
    }

    setValidating(true);
    try {
      const { data: usuarios, error } = await supabase
        .from("usuarios")
        .select("id, email, nombres, apellidos")
        .in("email", emails);

      if (error) throw error;

      const foundEmails = new Set((usuarios || []).map((u) => u.email?.toLowerCase()));
      const notFound = emails.filter((e) => !foundEmails.has(e));

      const userIds = (usuarios || []).map((u) => u.id);
      const { data: emprendimientos } = await supabase
        .from("emprendimientos")
        .select("user_id, nombre")
        .in("user_id", userIds);

      const empMap = new Map(emprendimientos?.map((e) => [e.user_id, e.nombre]) || []);

      const { data: existingProgress } = await supabase
        .from("progreso_usuario")
        .select("user_id")
        .eq("clase_id", claseId)
        .eq("completado", true)
        .in("user_id", userIds);

      const alreadySet = new Set(existingProgress?.map((p) => p.user_id) || []);

      const validated: ValidatedUser[] = (usuarios || []).map((u) => ({
        id: u.id,
        email: u.email || "",
        nombres: u.nombres,
        apellidos: u.apellidos,
        emprendimiento: empMap.get(u.id) || null,
        alreadyRegistered: alreadySet.has(u.id),
        selected: !alreadySet.has(u.id),
      }));

      setValidatedUsers(validated);
      setNotFoundEmails(notFound);
      setShowResults(true);

      // Fetch cohort students excluding validated and already registered
      const allExcluded = new Set([...userIds, ...existingAttendees.map(a => a.id)]);
      const allRegistered = new Set([...alreadySet, ...existingAttendees.map(a => a.id)]);
      await fetchCohortStudents(allExcluded, allRegistered);
    } catch (error) {
      console.error("Error validating emails:", error);
      toast({ title: "Error al validar correos", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setValidatedUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, selected: !u.selected } : u))
    );
  };

  const handleToggleCohortStudent = (userId: string) => {
    setCohortStudents((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, selected: !u.selected } : u))
    );
  };

  const handleSave = async () => {
    const fromValidated = validatedUsers.filter((u) => u.selected && !u.alreadyRegistered);
    const fromCohort = cohortStudents.filter((u) => u.selected);
    const toSave = [...fromValidated, ...fromCohort];

    if (toSave.length === 0) {
      toast({ title: "No hay nuevas asistencias para guardar" });
      return;
    }

    setSaving(true);
    try {
      const records = toSave.map((u) => ({
        user_id: u.id,
        clase_id: claseId,
        completado: true,
        progreso_porcentaje: 100,
      }));

      const { error } = await supabase.from("progreso_usuario").upsert(records, {
        onConflict: "user_id,clase_id",
      });

      if (error) throw error;

      toast({ title: `Asistencia guardada para ${toSave.length} estudiante(s)` });
      setShowResults(false);
      setRawEmails("");
      setValidatedUsers([]);
      setNotFoundEmails([]);
      setCohortStudents([]);
      fetchExistingAttendance();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({ title: "Error al guardar asistencia", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const newUsersCount = validatedUsers.filter((u) => !u.alreadyRegistered && u.selected).length;
  const manualCount = cohortStudents.filter((u) => u.selected).length;
  const alreadyCount = validatedUsers.filter((u) => u.alreadyRegistered).length;
  const totalToSave = newUsersCount + manualCount;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Registro de Asistencia</h3>
        </div>

        {/* Existing attendees */}
        {existingAttendees.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              Registrados: {existingAttendees.length}
            </p>
            <div className="flex flex-wrap gap-1">
              {existingAttendees.map((a) => (
                <Badge key={a.id} variant="secondary" className="text-[10px]">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  {a.nombres} {a.apellidos}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Email input */}
        <div className="space-y-2">
          <label className="text-xs font-medium">
            Correos de asistentes (separados por coma, ; o salto de línea)
          </label>
          <Textarea
            value={rawEmails}
            onChange={(e) => setRawEmails(e.target.value)}
            placeholder="correo1@ejemplo.com&#10;correo2@ejemplo.com"
            rows={3}
            className="text-xs"
          />
          <Button size="sm" onClick={handleValidate} disabled={validating || !rawEmails.trim()} className="w-full">
            {validating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Validar correos
          </Button>
        </div>

        {/* Validation results */}
        {showResults && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 text-primary">
                <UserCheck className="h-3 w-3" /> {validatedUsers.length} encontrados
              </span>
              {alreadyCount > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" /> {alreadyCount} ya registrados
                </span>
              )}
              {notFoundEmails.length > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <UserX className="h-3 w-3" /> {notFoundEmails.length} no encontrados
                </span>
              )}
            </div>

            {/* Found users */}
            {validatedUsers.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Validados por correo:</p>
                <div className="max-h-40 overflow-y-auto space-y-0.5 border rounded-lg p-1.5">
                  {validatedUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center gap-1.5 p-1.5 rounded text-xs ${
                        u.alreadyRegistered ? "opacity-60 bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={u.selected || u.alreadyRegistered}
                        disabled={u.alreadyRegistered}
                        onCheckedChange={() => handleToggleUser(u.id)}
                      />
                      <span className="flex-1 truncate">
                        {u.nombres} {u.apellidos}
                        {u.emprendimiento && (
                          <span className="text-muted-foreground"> · {u.emprendimiento}</span>
                        )}
                      </span>
                      {u.alreadyRegistered && (
                        <Badge variant="outline" className="text-[10px] px-1">Ya</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Not found emails */}
            {notFoundEmails.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">No encontrados:</p>
                <div className="border border-destructive/30 rounded-lg p-1.5 space-y-0.5">
                  {notFoundEmails.map((email) => (
                    <p key={email} className="text-xs text-muted-foreground">{email}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Manual cohort students */}
            {cohortStudents.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <UserPlus className="h-3 w-3 text-primary" />
                  <p className="text-xs font-medium">Agregar manualmente ({cohortStudents.length} del nivel/cohorte):</p>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5 border rounded-lg p-1.5">
                  {cohortStudents.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-1.5 p-1.5 rounded text-xs hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={u.selected}
                        onCheckedChange={() => handleToggleCohortStudent(u.id)}
                      />
                      <span className="flex-1 truncate">
                        {u.nombres} {u.apellidos}
                        {u.emprendimiento && (
                          <span className="text-muted-foreground"> · {u.emprendimiento}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            {totalToSave > 0 && (
              <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Guardar Asistencia ({totalToSave} nuevos)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceManager;
