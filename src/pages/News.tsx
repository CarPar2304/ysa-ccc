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
  const { isApproved, loading: quotaLoading, quotaInfo } = useQuotaStatus(userId);
  const navigate = useNavigate();

  const canViewNews = isAdmin || isStakeholder || (isBeneficiario && isApproved);
  const canEditNews = isAdmin;

  const filterByAudience = (noticias: Noticia[]): Noticia[] => {
    if (isAdmin || isStakeholder) return noticias;
    if (!isBeneficiario || !quotaInfo) return noticias;
    return noticias.filter(n => {
      const niv = (n as any).niveles_acceso as string[] | null;
      const coh = (n as any).cohortes_acceso as number[] | null;
      const nivelOk = !niv || niv.length === 0 || (quotaInfo.nivel && niv.includes(quotaInfo.nivel));
      const cohorteOk = !coh || coh.length === 0 || (quotaInfo.cohorte && coh.includes(quotaInfo.cohorte));
      return nivelOk && cohorteOk;
    });
  };

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
      setNoticias(filterByAudience(data || []));
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

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {noticias.map((noticia) => (
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
    </Layout>
  );
};

export default News;
