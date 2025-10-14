import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, BookOpen, Pencil, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ModuleEditor } from "@/components/lab/ModuleEditor";
import { ClassEditor } from "@/components/lab/ClassEditor";

interface Modulo {
  id: string;
  titulo: string;
  descripcion: string | null;
  duracion: string | null;
  orden: number | null;
  activo: boolean;
  imagen_url: string | null;
  nivel: string | null;
}

interface Clase {
  id: string;
  titulo: string;
  descripcion: string | null;
  contenido: string | null;
  video_url: string | null;
  duracion_minutos: number | null;
  orden: number | null;
  recursos_url: string[] | null;
}

const Lab = () => {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModulo, setSelectedModulo] = useState<Modulo | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loadingClases, setLoadingClases] = useState(false);
  const [userNivel, setUserNivel] = useState<string | null>(null);
  const { toast } = useToast();
  const { userId, isAdmin, isBeneficiario } = useUserRole();

  useEffect(() => {
    fetchModulos();
    if (isBeneficiario && userId) {
      fetchUserNivel();
    }
  }, [userId, isBeneficiario]);

  const fetchUserNivel = async () => {
    if (!userId) return;
    
    try {
      // Obtener el emprendimiento del usuario
      const { data: emprendimiento } = await supabase
        .from("emprendimientos")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!emprendimiento) return;

      // Obtener la evaluación más reciente con nivel
      const { data: evaluacion } = await supabase
        .from("evaluaciones")
        .select("nivel")
        .eq("emprendimiento_id", emprendimiento.id)
        .not("nivel", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (evaluacion?.nivel) {
        setUserNivel(evaluacion.nivel);
      }
    } catch (error) {
      console.error("Error fetching user nivel:", error);
    }
  };

  const fetchModulos = async () => {
    try {
      let query = supabase
        .from("modulos")
        .select("*")
        .order("orden", { ascending: true });

      // Si no es admin, solo mostrar módulos activos
      if (!isAdmin) {
        query = query.eq("activo", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setModulos(data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los módulos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClases = async (moduloId: string) => {
    setLoadingClases(true);
    try {
      const { data, error } = await supabase
        .from("clases")
        .select("*")
        .eq("modulo_id", moduloId)
        .order("orden", { ascending: true });

      if (error) throw error;
      setClases(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las clases",
        variant: "destructive",
      });
    } finally {
      setLoadingClases(false);
    }
  };

  const handleModuloClick = (modulo: Modulo) => {
    setSelectedModulo(modulo);
    fetchClases(modulo.id);
  };

  const handleDeleteModulo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("modulos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Módulo eliminado",
        description: "El módulo se eliminó correctamente",
      });

      fetchModulos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClase = async (id: string) => {
    try {
      const { error } = await supabase
        .from("clases")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Clase eliminada",
        description: "La clase se eliminó correctamente",
      });

      if (selectedModulo) {
        fetchClases(selectedModulo.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getProgreso = async (moduloId: string) => {
    if (!userId) return 0;

    try {
      const { data: clasesData } = await supabase
        .from("clases")
        .select("id")
        .eq("modulo_id", moduloId);

      if (!clasesData || clasesData.length === 0) return 0;

      const { data: progresoData } = await supabase
        .from("progreso_usuario")
        .select("*")
        .eq("user_id", userId)
        .eq("completado", true)
        .in(
          "clase_id",
          clasesData.map((c) => c.id)
        );

      return ((progresoData?.length || 0) / clasesData.length) * 100;
    } catch (error) {
      console.error("Error calculating progress:", error);
      return 0;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground mb-2">YSA Lab</h1>
              {userNivel && (
                <Badge variant="outline" className="mb-2">
                  Nivel: {userNivel}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Accede a módulos y clases del programa de incubación</p>
          </div>
          {isAdmin && (
            <ModuleEditor onSuccess={fetchModulos} />
          )}
        </div>

        {modulos.length === 0 ? (
          <Card className="shadow-soft border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No hay módulos disponibles en este momento</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {modulos.map((modulo) => (
              <Card
                key={modulo.id}
                className="shadow-medium border-border hover:shadow-strong transition-all cursor-pointer"
                onClick={() => handleModuloClick(modulo)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <Badge className="bg-primary text-primary-foreground">
                        {modulo.activo ? "Disponible" : "Inactivo"}
                      </Badge>
                      <CardTitle className="text-xl text-foreground hover:text-primary transition-colors">
                        {modulo.titulo}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {modulo.descripcion || "Sin descripción"}
                      </CardDescription>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <ModuleEditor
                          modulo={modulo}
                          onSuccess={fetchModulos}
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
                              <AlertDialogTitle>¿Eliminar módulo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. El módulo y todas sus clases serán eliminados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={(e) => handleDeleteModulo(modulo.id, e)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
                    {modulo.duracion && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {modulo.duracion}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Ver clases
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedModulo} onOpenChange={() => setSelectedModulo(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-2xl">{selectedModulo?.titulo}</DialogTitle>
                  <DialogDescription>{selectedModulo?.descripcion}</DialogDescription>
                </div>
                {isAdmin && selectedModulo && (
                  <ClassEditor
                    moduloId={selectedModulo.id}
                    onSuccess={() => fetchClases(selectedModulo.id)}
                  />
                )}
              </div>
            </DialogHeader>

            {loadingClases ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clases.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No hay clases disponibles en este módulo
              </div>
            ) : (
              <div className="space-y-4">
                {clases.map((clase, index) => (
                  <Card key={clase.id} className="border-border">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{clase.titulo}</CardTitle>
                          {clase.descripcion && (
                            <CardDescription className="mt-1">{clase.descripcion}</CardDescription>
                          )}
                          {clase.duracion_minutos && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {clase.duracion_minutos} minutos
                            </div>
                          )}
                        </div>
                        {isAdmin && selectedModulo && (
                          <div className="flex items-center gap-1">
                            <ClassEditor
                              clase={clase}
                              moduloId={selectedModulo.id}
                              onSuccess={() => fetchClases(selectedModulo.id)}
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
                                  <AlertDialogTitle>¿Eliminar clase?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. La clase será eliminada permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteClase(clase.id)}>
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    {clase.contenido && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {clase.contenido}
                        </p>
                        {clase.video_url && (
                          <Button variant="outline" className="mt-4" asChild>
                            <a href={clase.video_url} target="_blank" rel="noopener noreferrer">
                              Ver video
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Lab;
