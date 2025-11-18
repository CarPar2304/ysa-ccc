import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, BookOpen, Pencil, Trash2, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { useQuotaStatus } from "@/hooks/useQuotaStatus";
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
  const { isApproved, loading: quotaLoading } = useQuotaStatus(userId);

  useEffect(() => {
    if (isBeneficiario && userId) {
      fetchUserNivel();
    }
  }, [userId, isBeneficiario]);

  useEffect(() => {
    fetchModulos();
  }, [userId, isAdmin, isBeneficiario, userNivel]);

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

      // Obtener el nivel del cupo aprobado
      const { data: asignacion } = await supabase
        .from("asignacion_cupos")
        .select("nivel")
        .eq("emprendimiento_id", emprendimiento.id)
        .eq("estado", "aprobado")
        .maybeSingle();

      if (asignacion?.nivel) {
        setUserNivel(asignacion.nivel);
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

      // Si no es admin, solo mostrar módulos activos y del nivel del usuario
      if (!isAdmin) {
        query = query.eq("activo", true);
        
        // Filtrar por nivel si el usuario tiene un nivel asignado
        if (userNivel) {
          query = query.or(`nivel.eq.${userNivel},nivel.is.null`);
        }
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

  if (loading || quotaLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Verificar cupo aprobado solo para beneficiarios
  if (isBeneficiario && !isApproved) {
    return (
      <Layout>
        <div className="mx-auto max-w-5xl p-6">
          <Card className="shadow-soft border-border">
            <CardContent className="p-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-muted rounded-full">
                  <Lock className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Acceso Restringido</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Tu cupo aún no ha sido aprobado. Una vez que el equipo administrativo apruebe tu solicitud, 
                podrás acceder a YSA Lab para explorar los módulos y clases del programa.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">YSA Lab</h1>
              {userNivel && (
                <Badge variant="secondary" className="text-sm">
                  Nivel {userNivel}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Descubre los módulos del programa de incubación y desarrolla tu emprendimiento
            </p>
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo) => (
              <Card
                key={modulo.id}
                className="group overflow-hidden shadow-medium border-border hover:shadow-strong transition-all cursor-pointer"
                onClick={() => handleModuloClick(modulo)}
              >
                {/* Imagen del módulo */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {modulo.imagen_url ? (
                    <img
                      src={modulo.imagen_url}
                      alt={modulo.titulo}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <BookOpen className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  {/* Badge de estado */}
                  <div className="absolute top-3 left-3">
                    <Badge 
                      className={modulo.activo 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "bg-muted text-muted-foreground shadow-md"
                      }
                    >
                      {modulo.activo ? "Disponible" : "Inactivo"}
                    </Badge>
                  </div>
                  {/* Badge de nivel */}
                  {modulo.nivel && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="bg-background/90 backdrop-blur-sm shadow-md">
                        {modulo.nivel}
                      </Badge>
                    </div>
                  )}
                  {/* Botones de admin */}
                  {isAdmin && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <ModuleEditor
                        modulo={modulo}
                        onSuccess={fetchModulos}
                        trigger={
                          <Button variant="secondary" size="sm" className="shadow-md">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="secondary" size="sm" className="shadow-md">
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

                {/* Contenido de la card */}
                <CardHeader className="space-y-3">
                  <CardTitle className="text-lg line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                    {modulo.titulo}
                  </CardTitle>
                  <CardDescription className="text-sm line-clamp-2 text-muted-foreground">
                    {modulo.descripcion || "Explora este módulo para aprender más"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {modulo.duracion && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{modulo.duracion}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      <span>Ver clases</span>
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
