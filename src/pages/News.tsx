import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Pencil, Trash2, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { NewsEditor } from "@/components/news/NewsEditor";
import { Button } from "@/components/ui/button";
import { useQuotaStatus } from "@/hooks/useQuotaStatus";
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

interface Noticia {
  id: string;
  titulo: string;
  descripcion: string | null;
  contenido: string | null;
  categoria: string | null;
  created_at: string;
  imagen_url: string | null;
  publicado: boolean;
}

const News = () => {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin, isBeneficiario, isStakeholder, userId } = useUserRole();
  const { isApproved, loading: quotaLoading } = useQuotaStatus(userId);

  // Stakeholders have full view access without quota check
  const canViewNews = isAdmin || isStakeholder || (isBeneficiario && isApproved);
  // Only admins can create/edit news
  const canEditNews = isAdmin;

  useEffect(() => {
    fetchNoticias();
  }, [isAdmin, isStakeholder]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("noticias")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Noticia eliminada",
        description: "La noticia se eliminó correctamente",
      });

      fetchNoticias();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchNoticias = async () => {
    try {
      let query = supabase
        .from("noticias")
        .select("*")
        .order("created_at", { ascending: false });

      // Admins and stakeholders can see all (including drafts for admins)
      // Stakeholders see only published like beneficiaries
      if (!isAdmin) {
        query = query.eq("publicado", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNoticias(data || []);
    } catch (error) {
      console.error("Error fetching news:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las noticias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || (isBeneficiario && quotaLoading)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Stakeholders always have access, beneficiaries need quota approval
  if (isBeneficiario && !isApproved) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl p-6">
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
                podrás acceder a YSA Now para ver las últimas noticias del programa.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">Noticias</h1>
            <p className="text-muted-foreground">Mantente al día con las últimas noticias del programa</p>
          </div>
          {canEditNews && (
            <NewsEditor onSuccess={fetchNoticias} />
          )}
        </div>

        {noticias.length === 0 ? (
          <Card className="shadow-soft border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No hay noticias disponibles en este momento</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {noticias.map((noticia) => (
              <Card
                key={noticia.id}
                className="shadow-medium border-border hover:shadow-strong transition-all"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {noticia.categoria && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-accent text-accent-foreground">
                            {noticia.categoria}
                          </Badge>
                        </div>
                      )}
                      <CardTitle className="text-2xl text-foreground">
                        {noticia.titulo}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(noticia.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </CardDescription>
                    </div>
                    {canEditNews && (
                      <div className="flex items-center gap-2">
                        <Badge variant={noticia.publicado ? "default" : "secondary"}>
                          {noticia.publicado ? "Publicado" : "Borrador"}
                        </Badge>
                        <NewsEditor
                          noticia={noticia}
                          onSuccess={fetchNoticias}
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
                              <AlertDialogTitle>¿Eliminar noticia?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. La noticia será eliminada permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(noticia.id)}>
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
                  {noticia.descripcion && (
                    <p className="text-foreground font-medium">{noticia.descripcion}</p>
                  )}
                  {noticia.contenido && (
                    <p className="text-muted-foreground whitespace-pre-wrap">{noticia.contenido}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default News;
