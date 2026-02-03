import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  FileText, 
  Calendar, 
  Clock, 
  Loader2, 
  Pencil, 
  Trash2, 
  Users,
  CheckCircle,
  AlertCircle
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
}

interface Entrega {
  id: string;
  tarea_id: string;
  user_id: string;
  comentario: string | null;
  archivos_urls: { name: string; url: string }[];
  estado: string;
  feedback: string | null;
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

export const ModuleDeliverables = ({ moduloId, canEdit }: ModuleDeliverablesProps) => {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [entregas, setEntregas] = useState<Record<string, Entrega>>({});
  const [allEntregas, setAllEntregas] = useState<Record<string, Entrega[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { userId, isBeneficiario, isAdmin, isMentor } = useUserRole();

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
        .select(`
          *,
          usuario:usuarios(nombres, apellidos)
        `)
        .in("tarea_id", tareaIds);

      if (error) throw error;

      const entregasByTarea: Record<string, Entrega[]> = {};
      (data || []).forEach((entrega) => {
        if (!entregasByTarea[entrega.tarea_id]) {
          entregasByTarea[entrega.tarea_id] = [];
        }
        entregasByTarea[entrega.tarea_id].push({
          ...entrega,
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

      toast({
        title: "Tarea eliminada",
        description: "La tarea se eliminó correctamente",
      });

      fetchTareas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateEntregaStatus = async (entregaId: string, estado: string, feedback?: string) => {
    try {
      const updateData: { estado: string; feedback?: string } = { estado };
      if (feedback !== undefined) {
        updateData.feedback = feedback;
      }

      const { error } = await supabase
        .from("entregas")
        .update(updateData)
        .eq("id", entregaId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El estado de la entrega se actualizó",
      });

      fetchAllEntregas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
                        {!tarea.activo && (
                          <Badge variant="secondary">Inactiva</Badge>
                        )}
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
                          onSuccess={() => {
                            fetchMisEntregas();
                          }}
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

                {/* Show submissions for editors */}
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
                          <div className="space-y-3">
                            {tareasEntregas.map((entrega) => (
                              <div
                                key={entrega.id}
                                className="p-3 bg-muted rounded-lg space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">
                                    {entrega.usuario?.nombres} {entrega.usuario?.apellidos}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={entrega.estado}
                                      onChange={(e) => updateEntregaStatus(entrega.id, e.target.value)}
                                      className="text-xs border rounded px-2 py-1 bg-background"
                                    >
                                      <option value="entregado">Entregado</option>
                                      <option value="revisado">En revisión</option>
                                      <option value="aprobado">Aprobado</option>
                                      <option value="rechazado">Rechazado</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {entrega.archivos_urls.map((archivo, idx) => (
                                    <a
                                      key={idx}
                                      href={archivo.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      <FileText className="h-3 w-3" />
                                      {archivo.name}
                                    </a>
                                  ))}
                                </div>
                                {entrega.comentario && (
                                  <p className="text-xs text-muted-foreground">
                                    "{entrega.comentario}"
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Entregado: {format(new Date(entrega.fecha_entrega), "PPP p", { locale: es })}
                                </p>
                              </div>
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
