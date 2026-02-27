import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock, Loader2, Pencil, Trash2, BookOpen, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
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
import { ClassEditor } from "@/components/lab/ClassEditor";
import { ModuleDeliverables } from "@/components/lab/ModuleDeliverables";

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
  imagen_url: string | null;
  duracion_minutos: number | null;
  orden: number | null;
  recursos_url: { titulo: string; url: string }[] | null;
  cohorte: number[] | null;
}

const LabModuleView = () => {
  const { moduloId } = useParams<{ moduloId: string }>();
  const navigate = useNavigate();
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const { toast } = useToast();
  const { isAdmin, userId } = useUserRole();

  useEffect(() => {
    if (moduloId) {
      fetchModulo();
      fetchClases();
      checkEditPermission();
    }
  }, [moduloId, userId]);

  const fetchModulo = async () => {
    try {
      const { data, error } = await supabase
        .from("modulos")
        .select("*")
        .eq("id", moduloId)
        .single();

      if (error) throw error;
      setModulo(data);
    } catch (error) {
      console.error("Error fetching module:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el módulo",
        variant: "destructive",
      });
      navigate("/lab");
    } finally {
      setLoading(false);
    }
  };

  const fetchClases = async () => {
    try {
      const { data, error } = await supabase
        .from("clases")
        .select("*")
        .eq("modulo_id", moduloId)
        .order("orden", { ascending: true });

      if (error) throw error;
      setClases((data || []) as unknown as Clase[]);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las clases",
        variant: "destructive",
      });
    }
  };

  const checkEditPermission = async () => {
    if (!userId || !moduloId) return;
    
    try {
      const { data, error } = await supabase
        .rpc("can_edit_modulo", {
          _user_id: userId,
          _modulo_id: moduloId,
        });

      if (error) throw error;
      setCanEdit(data || false);
    } catch (error) {
      console.error("Error checking edit permission:", error);
      setCanEdit(false);
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

      fetchClases();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  if (!modulo) {
    return null;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header con botón de regreso */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/lab")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a módulos
          </Button>

          {/* Info del módulo */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                  {modulo.titulo}
                </h1>
                {modulo.nivel && (
                  <Badge variant="outline">{modulo.nivel}</Badge>
                )}
                <Badge variant={modulo.activo ? "default" : "secondary"}>
                  {modulo.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              {modulo.descripcion && (
                <p className="text-muted-foreground text-base">
                  {modulo.descripcion}
                </p>
              )}
              {modulo.duracion && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{modulo.duracion}</span>
                </div>
              )}
            </div>
            {canEdit && (
              <ClassEditor
                moduloId={modulo.id}
                nivelModulo={modulo.nivel}
                onSuccess={fetchClases}
              />
            )}
          </div>
        </div>

        {/* Tabs for Classes and Deliverables */}
        <Tabs defaultValue="clases" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clases" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Clases
            </TabsTrigger>
            <TabsTrigger value="entregables" className="gap-2">
              <FileText className="h-4 w-4" />
              Entregables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clases">
            {/* Lista de clases */}
            {clases.length === 0 ? (
              <Card className="shadow-soft border-border">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No hay clases disponibles en este módulo
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Clases del curso
                </h2>
                {clases.map((clase, index) => (
                  <Card 
                    key={clase.id} 
                    className="border-border hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigate(`/lab/${moduloId}/${clase.id}`)}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 p-4">
                        {/* Número de clase */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {index + 1}
                        </div>

                        {/* Miniatura de la clase */}
                        <div className="relative w-24 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
                          {clase.imagen_url ? (
                            <img 
                              src={clase.imagen_url} 
                              alt={clase.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : clase.video_url ? (
                            <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-primary/5">
                              <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-primary border-b-4 border-b-transparent ml-0.5" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full bg-muted">
                              <span className="text-xs text-muted-foreground">Sin imagen</span>
                            </div>
                          )}
                        </div>

                        {/* Info de la clase */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {clase.titulo}
                          </h3>
                          {clase.descripcion && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {clase.descripcion}
                            </p>
                          )}
                          {clase.duracion_minutos && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{clase.duracion_minutos} minutos</span>
                            </div>
                          )}
                        </div>

                        {/* Botones de edición */}
                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <ClassEditor
                              clase={clase}
                              moduloId={modulo.id}
                              nivelModulo={modulo.nivel}
                              onSuccess={fetchClases}
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="entregables">
            <ModuleDeliverables moduloId={modulo.id} canEdit={canEdit} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default LabModuleView;
