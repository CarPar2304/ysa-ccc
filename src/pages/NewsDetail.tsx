import { Layout } from "@/components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Calendar, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { NewsEditor } from "@/components/news/NewsEditor";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
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

const NewsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [noticia, setNoticia] = useState<Noticia | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

  const fetchNoticia = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("noticias")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setNoticia(data);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la noticia", variant: "destructive" });
      navigate("/news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNoticia(); }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      const { error } = await supabase.from("noticias").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Noticia eliminada" });
      navigate("/news");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!noticia) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        {/* Back + Admin actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/news")} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver a Noticias
          </Button>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <NewsEditor
                noticia={noticia}
                onSuccess={fetchNoticia}
                trigger={<Button variant="outline" size="sm" className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Editar</Button>}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar noticia?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Article layout */}
        <article className="space-y-6">
          {/* Header with meta */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {noticia.categoria && (
                <Badge variant="outline" className="text-xs uppercase tracking-wider text-primary border-primary/30">
                  {noticia.categoria}
                </Badge>
              )}
              {isAdmin && !noticia.publicado && (
                <Badge variant="secondary">Borrador</Badge>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              {noticia.titulo}
            </h1>
            {noticia.descripcion && (
              <p className="text-lg text-muted-foreground leading-relaxed">{noticia.descripcion}</p>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(noticia.created_at), "d 'de' MMMM, yyyy", { locale: es })}
            </div>
          </div>

          {/* Hero image + Content side by side on desktop */}
          <div className={noticia.imagen_url ? "grid grid-cols-1 lg:grid-cols-5 gap-8 items-start" : ""}>
            {noticia.imagen_url && (
              <div className="lg:col-span-2">
                <div className="rounded-xl overflow-hidden border border-border shadow-[var(--shadow-soft)] sticky top-24">
                  <img
                    src={noticia.imagen_url}
                    alt={noticia.titulo}
                    className="w-full object-cover"
                  />
                </div>
              </div>
            )}
            <div className={noticia.imagen_url ? "lg:col-span-3" : "max-w-3xl"}>
              {noticia.contenido ? (
                <MarkdownRenderer content={noticia.contenido} className="text-base" />
              ) : (
                <p className="text-muted-foreground italic">Esta noticia no tiene contenido adicional.</p>
              )}
            </div>
          </div>
        </article>
      </div>
    </Layout>
  );
};

export default NewsDetail;
