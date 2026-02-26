import { useState, useEffect } from "react";
import { EntregaFileLink } from "@/components/lab/EntregaFileLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import {
  FileText,
  Loader2,
  Star,
  Save,
  Calendar,
  Filter,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Entrega {
  id: string;
  tarea_id: string;
  user_id: string;
  comentario: string | null;
  archivos_urls: { name: string; url: string }[];
  estado: string;
  feedback: string | null;
  nota: number | null;
  fecha_entrega: string;
  usuario?: { nombres: string | null; apellidos: string | null };
  tarea?: { titulo: string; modulo_id: string; fecha_limite: string };
  modulo_titulo?: string;
}

const estadoMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  entregado: { label: "Entregado", variant: "secondary" },
  revisado: { label: "En revisión", variant: "outline" },
  aprobado: { label: "Aprobado", variant: "default" },
  rechazado: { label: "Rechazado", variant: "destructive" },
};

const EntregaCard = ({
  entrega,
  onSave,
}: {
  entrega: Entrega;
  onSave: (id: string, estado: string, feedback?: string, nota?: number | null) => Promise<void>;
}) => {
  const [estado, setEstado] = useState(entrega.estado);
  const [feedback, setFeedback] = useState(entrega.feedback || "");
  const [nota, setNota] = useState<string>(
    entrega.nota !== null && entrega.nota !== undefined ? String(entrega.nota) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const notaNum = nota !== "" ? parseFloat(nota) : null;
    await onSave(entrega.id, estado, feedback || undefined, notaNum);
    setSaving(false);
  };

  const est = estadoMap[entrega.estado] || estadoMap.entregado;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base">{entrega.tarea?.titulo}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Módulo: <span className="font-medium">{entrega.modulo_titulo}</span>
            </p>
            <p className="text-sm font-medium text-foreground">
              {entrega.usuario?.nombres} {entrega.usuario?.apellidos}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {entrega.nota !== null && entrega.nota !== undefined && (
              <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {entrega.nota}/5
              </Badge>
            )}
            <Badge variant={est.variant}>{est.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Files */}
        <div className="flex flex-wrap gap-2">
          {entrega.archivos_urls.map((archivo, idx) => (
            <EntregaFileLink key={idx} archivo={archivo} />
          ))}
        </div>

        {entrega.comentario && (
          <p className="text-xs text-muted-foreground italic">"{entrega.comentario}"</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Entregado: {format(new Date(entrega.fecha_entrega), "PPP", { locale: es })}
          </span>
          {entrega.tarea?.fecha_limite && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Límite: {format(new Date(entrega.tarea.fecha_limite), "PPP", { locale: es })}
            </span>
          )}
        </div>

        {/* Review controls */}
        <div className="border-t border-border pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Estado</Label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full text-xs border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="entregado">Entregado</option>
                <option value="revisado">En revisión</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Star className="h-3 w-3" /> Nota (0 - 5)
              </Label>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.5}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Sin nota"
                className="text-xs h-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Feedback</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Escribe tu retroalimentación aquí..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>
          <Button size="sm" className="gap-2 w-full" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar calificación
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const MentorEntregas = () => {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroModulo, setFiltroModulo] = useState<string>("todos");
  const { toast } = useToast();
  const { userId, isAdmin } = useUserRole();

  useEffect(() => {
    if (userId) fetchEntregas();
  }, [userId]);

  const fetchEntregas = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // First get modules the mentor can edit (via asignaciones_mentor)
      let moduloIds: string[] = [];

      if (isAdmin) {
        // Admin sees all modules
        const { data: modulos } = await supabase.from("modulos").select("id");
        moduloIds = (modulos || []).map((m) => m.id);
      } else {
        const { data: asignaciones } = await supabase
          .from("asignaciones_mentor")
          .select("modulo_id")
          .eq("mentor_id", userId)
          .eq("puede_editar", true);
        moduloIds = (asignaciones || []).map((a) => a.modulo_id);
      }

      if (moduloIds.length === 0) {
        setEntregas([]);
        setLoading(false);
        return;
      }

      // Get tasks for those modules
      const { data: tareas } = await supabase
        .from("tareas")
        .select("id, titulo, modulo_id, fecha_limite")
        .in("modulo_id", moduloIds);

      if (!tareas || tareas.length === 0) {
        setEntregas([]);
        setLoading(false);
        return;
      }

      const tareaIds = tareas.map((t) => t.id);
      const tareaMap = new Map(tareas.map((t) => [t.id, t]));

      // Get module titles
      const uniqueModuloIds = [...new Set(tareas.map((t) => t.modulo_id))];
      const { data: modulos } = await supabase
        .from("modulos")
        .select("id, titulo")
        .in("id", uniqueModuloIds);
      const moduloMap = new Map((modulos || []).map((m) => [m.id, m.titulo]));

      // Get all submissions for those tasks
      const { data: entregasData, error } = await supabase
        .from("entregas")
        .select("*, usuario:usuarios(nombres, apellidos)")
        .in("tarea_id", tareaIds)
        .order("fecha_entrega", { ascending: false });

      if (error) throw error;

      const mapped: Entrega[] = (entregasData || []).map((e) => {
        const tarea = tareaMap.get(e.tarea_id);
        return {
          ...e,
          nota: e.nota ?? null,
          archivos_urls: (e.archivos_urls as { name: string; url: string }[]) || [],
          tarea: tarea ? { titulo: tarea.titulo, modulo_id: tarea.modulo_id, fecha_limite: tarea.fecha_limite } : undefined,
          modulo_titulo: tarea ? moduloMap.get(tarea.modulo_id) || "—" : "—",
        };
      });

      setEntregas(mapped);
    } catch (error) {
      console.error("Error fetching entregas:", error);
      toast({ title: "Error", description: "No se pudieron cargar las entregas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateEntrega = async (entregaId: string, estado: string, feedback?: string, nota?: number | null) => {
    try {
      const updateData: { estado: string; feedback?: string; nota?: number | null } = { estado };
      if (feedback !== undefined) updateData.feedback = feedback;
      if (nota !== undefined) updateData.nota = nota;

      const { error } = await supabase.from("entregas").update(updateData).eq("id", entregaId);
      if (error) throw error;

      // Update locally without full reload
      setEntregas((prev) =>
        prev.map((e) =>
          e.id === entregaId
            ? { ...e, estado, feedback: feedback ?? e.feedback, nota: nota !== undefined ? nota : e.nota }
            : e
        )
      );

      toast({ title: "Entrega actualizada", description: "Los cambios se guardaron correctamente" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Get unique modules for filter
  const modulosUnicos = [...new Set(entregas.map((e) => e.modulo_titulo || ""))].filter(Boolean);

  const filtered = entregas.filter((e) => {
    if (filtroEstado !== "todos" && e.estado !== filtroEstado) return false;
    if (filtroModulo !== "todos" && e.modulo_titulo !== filtroModulo) return false;
    return true;
  });

  const pendientes = entregas.filter((e) => e.estado === "entregado").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{entregas.length}</p>
            <p className="text-xs text-muted-foreground">Total entregas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
            <p className="text-xs text-muted-foreground">Por revisar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {entregas.filter((e) => e.estado === "aprobado").length}
            </p>
            <p className="text-xs text-muted-foreground">Aprobadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              {entregas.filter((e) => e.estado === "rechazado").length}
            </p>
            <p className="text-xs text-muted-foreground">Rechazadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="revisado">En revisión</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroModulo} onValueChange={setFiltroModulo}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los módulos</SelectItem>
            {modulosUnicos.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filtroEstado !== "todos" || filtroModulo !== "todos") && (
          <Badge variant="secondary">{filtered.length} resultado(s)</Badge>
        )}
      </div>

      {/* Entregas list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {entregas.length === 0
                ? "Aún no hay entregas en tus módulos asignados"
                : "No hay entregas que coincidan con los filtros"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((entrega) => (
            <EntregaCard key={entrega.id} entrega={entrega} onSave={updateEntrega} />
          ))}
        </div>
      )}
    </div>
  );
};
