import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, FileText } from "lucide-react";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";

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
        <MarkdownRenderer content={diagnostico.contenido} />
      </CardContent>
    </Card>
  );
}
