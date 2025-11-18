import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
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

const LabModuleView = () => {
  const { moduloId } = useParams<{ moduloId: string }>();
  const navigate = useNavigate();
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (moduloId) {
      fetchModulo();
      fetchClases();
    }
  }, [moduloId]);

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
      setClases(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las clases",
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
            {isAdmin && (
              <ClassEditor
                moduloId={modulo.id}
                onSuccess={fetchClases}
              />
            )}
          </div>
        </div>

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
          <div className="space-y-4">
            {clases.map((clase, index) => (
              <Card key={clase.id} className="border-border shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl">{clase.titulo}</CardTitle>
                      {clase.descripcion && (
                        <CardDescription className="mt-2">
                          {clase.descripcion}
                        </CardDescription>
                      )}
                      {clase.duracion_minutos && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {clase.duracion_minutos} minutos
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <ClassEditor
                          clase={clase}
                          moduloId={modulo.id}
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
      </div>
    </Layout>
  );
};

export default LabModuleView;
