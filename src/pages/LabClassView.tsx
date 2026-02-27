import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, List, FileDown, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import AttendanceManager from "@/components/lab/AttendanceManager";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";

interface Clase {
  id: string;
  titulo: string;
  descripcion: string | null;
  contenido: string | null;
  video_url: string | null;
  duracion_minutos: number | null;
  orden: number | null;
  recursos_url: { titulo: string; url: string; tipo?: "link" | "archivo" }[] | null;
  modulo_id: string;
}

interface Modulo {
  id: string;
  titulo: string;
}

const LabClassView = () => {
  const { moduloId, claseId } = useParams<{ moduloId: string; claseId: string }>();
  const navigate = useNavigate();
  const [clase, setClase] = useState<Clase | null>(null);
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin, isOperador } = useUserRole();

  useEffect(() => {
    if (claseId && moduloId) {
      fetchData();
    }
  }, [claseId, moduloId]);

  const fetchData = async () => {
    try {
      // Fetch clase actual
      const { data: claseData, error: claseError } = await supabase
        .from("clases")
        .select("*")
        .eq("id", claseId)
        .single();

      if (claseError) throw claseError;
      setClase(claseData as unknown as Clase);

      // Fetch modulo
      const { data: moduloData, error: moduloError } = await supabase
        .from("modulos")
        .select("id, titulo")
        .eq("id", moduloId)
        .single();

      if (moduloError) throw moduloError;
      setModulo(moduloData);

      // Fetch todas las clases del módulo
      const { data: clasesData, error: clasesError } = await supabase
        .from("clases")
        .select("*")
        .eq("modulo_id", moduloId)
        .order("orden", { ascending: true });

      if (clasesError) throw clasesError;
      setClases((clasesData || []) as unknown as Clase[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la clase",
        variant: "destructive",
      });
      navigate(`/lab/${moduloId}`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentIndex = () => {
    return clases.findIndex((c) => c.id === claseId);
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex > 0) {
      navigate(`/lab/${moduloId}/${clases[currentIndex - 1].id}`);
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex < clases.length - 1) {
      navigate(`/lab/${moduloId}/${clases[currentIndex + 1].id}`);
    }
  };

  if (loading || !clase || !modulo) {
    return <Layout><div className="flex items-center justify-center min-h-screen">Cargando...</div></Layout>;
  }

  const currentIndex = getCurrentIndex();
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < clases.length - 1;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl">
        {/* Header Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background">
          <Button
            variant="ghost"
            onClick={() => navigate(`/lab/${moduloId}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Clase anterior
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Clase {currentIndex + 1} de {clases.length} · {modulo.titulo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate(`/lab/${moduloId}`)}
            >
              <List className="h-4 w-4 mr-2" />
              Ver clases
            </Button>
            <Button
              variant="ghost"
              onClick={handleNext}
              disabled={!hasNext}
            >
              Siguiente clase
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            {clase.video_url && (
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={clase.video_url}
                      className="w-full h-full"
                      allowFullScreen
                      title={clase.titulo}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={!hasPrevious}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Clase {currentIndex + 1} de {clases.length}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={!hasNext}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Class Details */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h1 className="text-3xl font-bold text-foreground">{clase.titulo}</h1>
                {clase.descripcion && (
                  <p className="text-muted-foreground text-lg">{clase.descripcion}</p>
                )}
                {clase.contenido && (
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={clase.contenido} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resources */}
            {clase.recursos_url && clase.recursos_url.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Recursos</h2>
                  <div className="space-y-2">
                    {clase.recursos_url.map((recurso, index) => {
                      const isArchivo = recurso.tipo === "archivo";
                      
                      const handleClick = async (e: React.MouseEvent) => {
                        if (!isArchivo) return; // let default <a> behavior handle links
                        e.preventDefault();
                        try {
                          // Extract storage path from public URL
                          const url = new URL(recurso.url);
                          const pathMatch = url.pathname.match(/\/object\/public\/lab-images\/(.+)$/);
                          if (!pathMatch) {
                            window.open(recurso.url, '_blank');
                            return;
                          }
                          const storagePath = decodeURIComponent(pathMatch[1]);
                          const { data, error } = await supabase.storage
                            .from('lab-images')
                            .download(storagePath);
                          if (error) throw error;
                          
                          const blobUrl = URL.createObjectURL(data);
                          const a = document.createElement('a');
                          a.href = blobUrl;
                          a.download = recurso.titulo || storagePath.split('/').pop() || 'archivo';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(blobUrl);
                        } catch (err) {
                          console.error("Error downloading file:", err);
                          window.open(recurso.url, '_blank');
                        }
                      };

                      return (
                        <a
                          key={index}
                          href={recurso.url}
                          target={isArchivo ? undefined : "_blank"}
                          rel={isArchivo ? undefined : "noopener noreferrer"}
                          onClick={isArchivo ? handleClick : undefined}
                          className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                        >
                          {isArchivo ? (
                            <FileDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-foreground flex-1">{recurso.titulo}</span>
                          {isArchivo && (
                            <span className="text-xs text-muted-foreground">Descargar</span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendance Manager - only for admin/operators */}
            {(isAdmin || isOperador) && claseId && moduloId && (
              <AttendanceManager claseId={claseId} moduloId={moduloId} />
            )}
          </div>

          {/* Sidebar - Class List */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-4">Contenido del curso</h3>
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {clases.map((c, index) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/lab/${moduloId}/${c.id}`)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        c.id === claseId
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">
                            {c.titulo}
                          </p>
                          {c.duracion_minutos && (
                            <p className="text-xs opacity-80 mt-1">
                              {c.duracion_minutos} min
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LabClassView;
