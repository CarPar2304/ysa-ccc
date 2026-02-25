import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar,
  Loader2,
  Pencil,
  Trash2,
  Users,
  CheckCircle,
  AlertCircle,
  Star,
  Save,
} from "lucide-react";
import { TaskEditor } from "./TaskEditor";
import { TaskSubmission } from "./TaskSubmission";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  num_documentos: number;
  fecha_limite: string;
  activo: boolean;
  created_at: string;
  documento_guia_url?: string | null;
}

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
  usuario?: {
    nombres: string | null;
    apellidos: string | null;
  };
}

interface ModuleDeliverablesProps {
  moduloId: string;
  canEdit: boolean;
}

// Sub-component: review card for each submission
const EntregaReviewCard = ({
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

  const getEstadoBadge = (e: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      entregado: { label: "Entregado", variant: "secondary" },
      revisado: { label: "En revisión", variant: "outline" },
      aprobado: { label: "Aprobado", variant: "default" },
      rechazado: { label: "Rechazado", variant: "destructive" },
    };
    const c = map[e] || map.entregado;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <div className="p-4 bg-muted rounded-lg space-y-3 border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-medium text-sm">
          {entrega.usuario?.nombres} {entrega.usuario?.apellidos}
        </span>
        <div className="flex items-center gap-2">
          {entrega.nota !== null && entrega.nota !== undefined && (
            <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {entrega.nota}/5
            </Badge>
          )}
          {getEstadoBadge(entrega.estado)}
        </div>
      </div>

      {/* Files */}
      <div className="flex flex-wrap gap-2">
        {entrega.archivos_urls.map((archivo, idx) => (
          <a
            key={idx}
            href={archivo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 bg-background px-2 py-1 rounded border border-border"
          >
            <FileText className="h-3 w-3" />
            {archivo.name}
          </a>
        ))}
      </div>

      {/* Submission comment */}
      {entrega.comentario && (
        <p className="text-xs text-muted-foreground italic">"{entrega.comentario}"</p>
      )}

      <p className="text-xs text-muted-foreground">
        Entregado: {format(new Date(entrega.fecha_entrega), "PPP 'a las' p", { locale: es })}
      </p>

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
              <Star className="h-3 w-3" />
              Nota (0 - 5)
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
          <Label className="text-xs font-medium">Feedback para el estudiante</Label>
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
    </div>
  );
};

export const ModuleDeliverables = ({ moduloId, canEdit }: ModuleDeliverablesProps) => {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [entregas, setEntregas] = useState<Record<string, Entrega>>({});
  const [allEntregas, setAllEntregas] = useState<Record<string, Entrega[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { userId, isBeneficiario } = useUserRole();

  useEffect(() => {
    fetchTareas();
  }, [moduloId]);

  useEffect(() => {
    if (userId && tareas.length > 0) {
      if (isBeneficiario) {
        fetchMisEntregas();
      } else if (canEdit) {
        fetchAllEntregas();
      }
    }
  }, [userId, tareas, isBeneficiario, canEdit]);

  const fetchTareas = async () => {
    try {
      const { data, error } = await supabase
        .from("tareas")
        .select("*")
        .eq("modulo_id", moduloId)
        .order("fecha_limite", { ascending: true });

      if (error) throw error;
      setTareas(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMisEntregas = async () => {
    if (!userId) return;
    try {
      const tareaIds = tareas.map((t) => t.id);
      const { data, error } = await supabase
        .from("entregas")
        .select("*")
        .eq("user_id", userId)
        .in("tarea_id", tareaIds);

      if (error) throw error;

      const entregasMap: Record<string, Entrega> = {};
      (data || []).forEach((entrega) => {
        entregasMap[entrega.tarea_id] = {
          ...entrega,
          nota: entrega.nota ?? null,
          archivos_urls: (entrega.archivos_urls as { name: string; url: string }[]) || [],
        };
      });
      setEntregas(entregasMap);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const fetchAllEntregas = async () => {
    try {
      const tareaIds = tareas.map((t) => t.id);
      const { data, error } = await supabase
        .from("entregas")
        .select(`*, usuario:usuarios(nombres, apellidos)`)
        .in("tarea_id", tareaIds);

      if (error) throw error;

      const entregasByTarea: Record<string, Entrega[]> = {};
      (data || []).forEach((entrega) => {
        if (!entregasByTarea[entrega.tarea_id]) {
          entregasByTarea[entrega.tarea_id] = [];
        }
        entregasByTarea[entrega.tarea_id].push({
          ...entrega,
          nota: entrega.nota ?? null,
          archivos_urls: (entrega.archivos_urls as { name: string; url: string }[]) || [],
        });
      });
      setAllEntregas(entregasByTarea);
    } catch (error) {
      console.error("Error fetching all submissions:", error);
    }
  };

  const handleDeleteTarea = async (id: string) => {
    try {
      const { error } = await supabase.from("tareas").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Tarea eliminada", description: "La tarea se eliminó correctamente" });
      fetchTareas();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateEntrega = async (entregaId: string, estado: string, feedback?: string, nota?: number | null) => {
    try {
      const updateData: { estado: string; feedback?: string; nota?: number | null } = { estado };
      if (feedback !== undefined) updateData.feedback = feedback;
      if (nota !== undefined) updateData.nota = nota;

      const { error } = await supabase
        .from("entregas")
        .update(updateData)
        .eq("id", entregaId);

      if (error) throw error;

      toast({ title: "Entrega actualizada", description: "Los cambios se guardaron correctamente" });
      fetchAllEntregas();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isExpired = (fecha: string) => new Date(fecha) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Entregables</h2>
          <Badge variant="secondary">{tareas.length}</Badge>
        </div>
        {canEdit && (
          <TaskEditor moduloId={moduloId} onSuccess={fetchTareas} />
        )}
      </div>

      {tareas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No hay tareas asignadas en este módulo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tareas.map((tarea) => {
            const entrega = entregas[tarea.id];
            const tareasEntregas = allEntregas[tarea.id] || [];
            const expired = isExpired(tarea.fecha_limite);

            return (
              <Card key={tarea.id} className={!tarea.activo ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{tarea.titulo}</CardTitle>
                        {!tarea.activo && <Badge variant="secondary">Inactiva</Badge>}
                        {expired && tarea.activo && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Vencida
                          </Badge>
                        )}
                        {entrega && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Entregada
                          </Badge>
                        )}
                        {entrega?.nota !== null && entrega?.nota !== undefined && (
                          <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            Nota: {entrega.nota}/5
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(tarea.fecha_limite), "PPP 'a las' p", { locale: es })}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {tarea.num_documentos} archivo(s)
                        </span>
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {isBeneficiario && tarea.activo && (
                        <TaskSubmission
                          tarea={tarea}
                          entregaExistente={entrega}
                          onSuccess={fetchMisEntregas}
                        />
                      )}

                      {canEdit && (
                        <>
                          <TaskEditor
                            moduloId={moduloId}
                            tarea={tarea}
                            onSuccess={fetchTareas}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará la tarea y todas las entregas asociadas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTarea(tarea.id)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {tarea.descripcion && (
                  <CardContent className="pt-2 pb-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {tarea.descripcion}
                    </p>
                  </CardContent>
                )}

                {/* Guide document link */}
                {tarea.documento_guia_url && (
                  <CardContent className="pt-0 pb-4">
                    <a
                      href={tarea.documento_guia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline bg-muted px-3 py-2 rounded-md border border-border"
                    >
                      <FileText className="h-4 w-4" />
                      Descargar documento guía
                    </a>
                  </CardContent>
                )}

                {isBeneficiario && entrega?.feedback && (
                  <CardContent className="pt-0 pb-4">
                    <div className="p-3 bg-muted rounded-lg space-y-1 border border-border/50">
                      <p className="text-xs font-medium text-foreground">Feedback del mentor:</p>
                      <p className="text-xs text-muted-foreground">{entrega.feedback}</p>
                    </div>
                  </CardContent>
                )}

                {/* Show submissions for editors/mentors */}
                {canEdit && tareasEntregas.length > 0 && (
                  <CardContent className="pt-0">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="entregas" className="border-none">
                        <AccordionTrigger className="py-2 hover:no-underline">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4" />
                            {tareasEntregas.length} entrega(s) recibida(s)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            {tareasEntregas.map((e) => (
                              <EntregaReviewCard
                                key={e.id}
                                entrega={e}
                                onSave={updateEntrega}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
