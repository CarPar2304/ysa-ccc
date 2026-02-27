import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, UserX, CheckCircle2, ClipboardList } from "lucide-react";

interface ValidatedUser {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  emprendimiento: string | null;
  alreadyRegistered: boolean;
  selected: boolean;
}

interface AttendanceManagerProps {
  claseId: string;
  moduloId: string;
}

const AttendanceManager = ({ claseId, moduloId }: AttendanceManagerProps) => {
  const [rawEmails, setRawEmails] = useState("");
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatedUsers, setValidatedUsers] = useState<ValidatedUser[]>([]);
  const [notFoundEmails, setNotFoundEmails] = useState<string[]>([]);
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

  const handleValidate = async () => {
    const emails = parseEmails(rawEmails);
    if (emails.length === 0) {
      toast({ title: "No se encontraron correos válidos", variant: "destructive" });
      return;
    }

    setValidating(true);
    try {
      // Fetch users matching emails
      const { data: usuarios, error } = await supabase
        .from("usuarios")
        .select("id, email, nombres, apellidos")
        .in("email", emails);

      if (error) throw error;

      const foundEmails = new Set((usuarios || []).map((u) => u.email?.toLowerCase()));
      const notFound = emails.filter((e) => !foundEmails.has(e));

      // Fetch emprendimientos for found users
      const userIds = (usuarios || []).map((u) => u.id);
      const { data: emprendimientos } = await supabase
        .from("emprendimientos")
        .select("user_id, nombre")
        .in("user_id", userIds);

      const empMap = new Map(emprendimientos?.map((e) => [e.user_id, e.nombre]) || []);

      // Check existing progress
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

  const handleSave = async () => {
    const toSave = validatedUsers.filter((u) => u.selected && !u.alreadyRegistered);
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
      fetchExistingAttendance();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({ title: "Error al guardar asistencia", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const newUsersCount = validatedUsers.filter((u) => !u.alreadyRegistered).length;
  const alreadyCount = validatedUsers.filter((u) => u.alreadyRegistered).length;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Registro de Asistencia</h2>
        </div>

        {/* Existing attendees */}
        {existingAttendees.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">
              Asistencias registradas: {existingAttendees.length}
            </p>
            <div className="flex flex-wrap gap-2">
              {existingAttendees.map((a) => (
                <Badge key={a.id} variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {a.nombres} {a.apellidos}
                  {a.emprendimiento && ` · ${a.emprendimiento}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Email input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Pega los correos de los asistentes (separados por coma, punto y coma, o salto de línea)
          </label>
          <Textarea
            value={rawEmails}
            onChange={(e) => setRawEmails(e.target.value)}
            placeholder="correo1@ejemplo.com, correo2@ejemplo.com&#10;correo3@ejemplo.com"
            rows={5}
          />
          <Button onClick={handleValidate} disabled={validating || !rawEmails.trim()}>
            {validating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Validar correos
          </Button>
        </div>

        {/* Validation results */}
        {showResults && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-primary">
                <UserCheck className="h-4 w-4" /> Encontrados: {validatedUsers.length}
              </span>
              {alreadyCount > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" /> Ya registrados: {alreadyCount}
                </span>
              )}
              {notFoundEmails.length > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <UserX className="h-4 w-4" /> No encontrados: {notFoundEmails.length}
                </span>
              )}
            </div>

            {/* Found users */}
            {validatedUsers.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Estudiantes encontrados:</p>
                <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {validatedUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        u.alreadyRegistered ? "opacity-60 bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={u.selected || u.alreadyRegistered}
                        disabled={u.alreadyRegistered}
                        onCheckedChange={() => handleToggleUser(u.id)}
                      />
                      <span className="flex-1">
                        {u.nombres} {u.apellidos}
                        {u.emprendimiento && (
                          <span className="text-muted-foreground"> · {u.emprendimiento}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                      {u.alreadyRegistered && (
                        <Badge variant="outline" className="text-xs">Ya registrado</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Not found emails */}
            {notFoundEmails.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Correos no encontrados:</p>
                <div className="border border-destructive/30 rounded-lg p-2 space-y-1">
                  {notFoundEmails.map((email) => (
                    <p key={email} className="text-sm text-muted-foreground">{email}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            {newUsersCount > 0 && (
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar Asistencia ({validatedUsers.filter((u) => u.selected && !u.alreadyRegistered).length} nuevos)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceManager;
