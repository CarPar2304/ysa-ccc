import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { normalizeMarkdown } from "@/lib/utils";

interface Diagnostico {
  id: string;
  contenido: string;
  created_at: string;
  updated_at: string;
}

export function ProfileDiagnostic() {
  const [loading, setLoading] = useState(true);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);

  useEffect(() => {
    fetchDiagnostico();
  }, []);

  const fetchDiagnostico = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's emprendimiento
      const { data: empData, error: empError } = await supabase
        .from("emprendimientos")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (empError) throw empError;

      // Get diagnostico for this emprendimiento
      const { data: diagData, error: diagError } = await supabase
        .from("diagnosticos")
        .select("id, contenido, created_at, updated_at")
        .eq("emprendimiento_id", empData.id)
        .eq("visible_para_usuario", true)
        .maybeSingle();

      if (diagError) throw diagError;

      setDiagnostico(diagData);
    } catch (error) {
      console.error("Error fetching diagnostico:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!diagnostico) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lock className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Diagnóstico no disponible
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Tu diagnóstico estará disponible próximamente. El equipo está
            trabajando en el análisis de tu emprendimiento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <CardTitle>Diagnóstico de tu Emprendimiento</CardTitle>
        </div>
        <CardDescription>
          Última actualización:{" "}
          {new Date(diagnostico.updated_at).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="prose prose-sm max-w-none dark:prose-invert 
          prose-h2:text-5xl prose-h2:font-bold prose-h2:mt-20 prose-h2:mb-10 prose-h2:text-foreground prose-h2:leading-tight
          prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-foreground
          prose-p:my-6 prose-p:leading-relaxed prose-p:text-foreground/90
          prose-strong:font-bold prose-strong:text-foreground
          prose-li:my-2 prose-li:leading-relaxed prose-li:text-foreground/90
          prose-ul:my-8 prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-2
          prose-ol:my-8 prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-2
          prose-table:my-10 
          prose-hr:my-12 prose-hr:border-t-2 prose-hr:border-border
          [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_table]:w-full
          [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold
          [&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:text-foreground/90">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeRaw]}
          >
            {normalizeMarkdown(diagnostico.contenido)}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
