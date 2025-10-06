import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Noticia {
  id: string;
  titulo: string;
  descripcion: string | null;
  contenido: string | null;
  categoria: string | null;
  created_at: string;
  imagen_url: string | null;
}

const News = () => {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNoticias();
  }, []);

  const fetchNoticias = async () => {
    try {
      const { data, error } = await supabase
        .from("noticias")
        .select("*")
        .eq("publicado", true)
        .order("created_at", { ascending: false });

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
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">YSA Now</h1>
          <p className="text-muted-foreground">Mantente al día con las últimas noticias del programa</p>
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
                className="shadow-medium border-border hover:shadow-strong transition-all cursor-pointer"
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
                      <CardTitle className="text-2xl text-foreground hover:text-primary transition-colors">
                        {noticia.titulo}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(noticia.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </CardDescription>
                    </div>
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
