import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuotaStatus } from "@/hooks/useQuotaStatus";
import { useNavigate } from "react-router-dom";
import { NewsEditor } from "@/components/news/NewsEditor";
import { NewsCard } from "@/components/news/NewsCard";
import { Card, CardContent } from "@/components/ui/card";

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
  const navigate = useNavigate();

  const canViewNews = isAdmin || isStakeholder || (isBeneficiario && isApproved);
  const canEditNews = isAdmin;

  useEffect(() => {
    fetchNoticias();
  }, [isAdmin, isStakeholder]);

  const fetchNoticias = async () => {
    try {
      let query = supabase
        .from("noticias")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("publicado", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNoticias(data || []);
    } catch (error) {
      console.error("Error fetching news:", error);
      toast({ title: "Error", description: "No se pudieron cargar las noticias", variant: "destructive" });
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

  if (isBeneficiario && !isApproved) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl p-6">
          <Card className="shadow-[var(--shadow-soft)] border-border">
            <CardContent className="p-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-muted rounded-full">
                  <Lock className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Acceso Restringido</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Tu cupo aún no ha sido aprobado. Una vez que el equipo administrativo apruebe tu solicitud,
                podrás acceder a las noticias del programa.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Separate featured (latest) from rest
  const featured = noticias[0] || null;
  const rest = noticias.slice(1);

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Noticias</h1>
            <p className="text-muted-foreground mt-1">Las últimas novedades del programa</p>
          </div>
          {canEditNews && <NewsEditor onSuccess={fetchNoticias} />}
        </div>

        {noticias.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No hay noticias disponibles en este momento</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Featured article (hero) */}
            {featured && (
              <article
                onClick={() => navigate(`/news/${featured.id}`)}
                className="group cursor-pointer rounded-xl border border-border bg-card overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-all duration-300"
              >
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto overflow-hidden bg-muted relative">
                    {featured.imagen_url ? (
                      <img
                        src={featured.imagen_url}
                        alt={featured.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[240px] flex items-center justify-center bg-accent/30">
                        <span className="text-5xl font-bold text-muted-foreground/20 select-none">
                          {featured.titulo.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {isAdmin && !featured.publicado && (
                      <Badge variant="secondary" className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm">
                        Borrador
                      </Badge>
                    )}
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col justify-center space-y-3">
                    {featured.categoria && (
                      <Badge variant="outline" className="self-start text-xs uppercase tracking-wider text-primary border-primary/30">
                        {featured.categoria}
                      </Badge>
                    )}
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                      {featured.titulo}
                    </h2>
                    {featured.descripcion && (
                      <p className="text-muted-foreground leading-relaxed line-clamp-3">
                        {featured.descripcion}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground mt-auto pt-2">
                      {new Date(featured.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </article>
            )}

            {/* Grid of remaining articles */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((noticia) => (
                  <NewsCard
                    key={noticia.id}
                    noticia={noticia}
                    isAdmin={isAdmin}
                    onClick={() => navigate(`/news/${noticia.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default News;
