import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, FileText, Globe, Calendar, Briefcase } from "lucide-react";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";

interface DiagnosticViewProps {
  emprendimientoId: string;
}

interface Diagnostico {
  id: string;
  contenido: string;
  created_at: string;
  updated_at: string;
}

interface Emprendimiento {
  nombre: string;
  pagina_web: string | null;
  ano_fundacion: number | null;
}

export function DiagnosticView({ emprendimientoId }: DiagnosticViewProps) {
  const [loading, setLoading] = useState(true);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [emprendimiento, setEmprendimiento] = useState<Emprendimiento | null>(null);

  useEffect(() => {
    fetchDiagnostico();
  }, [emprendimientoId]);

  const fetchDiagnostico = async () => {
    try {
      setLoading(true);

      const [diagResult, empResult] = await Promise.all([
        supabase
          .from("diagnosticos")
          .select("id, contenido, created_at, updated_at")
          .eq("emprendimiento_id", emprendimientoId)
          .maybeSingle(),
        supabase
          .from("emprendimientos")
          .select("nombre, pagina_web, ano_fundacion")
          .eq("id", emprendimientoId)
          .single()
      ]);

      if (diagResult.error) throw diagResult.error;
      if (empResult.error) throw empResult.error;

      setDiagnostico(diagResult.data);
      setEmprendimiento(empResult.data);
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
            El diagnóstico para este emprendimiento aún no está disponible.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {emprendimiento && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              <CardTitle>{emprendimiento.nombre}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {emprendimiento.pagina_web && (
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <a 
                    href={emprendimiento.pagina_web} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {emprendimiento.pagina_web}
                  </a>
                </div>
              )}
              {emprendimiento.ano_fundacion && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Fundado en {emprendimiento.ano_fundacion}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Diagnóstico del Emprendimiento</CardTitle>
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
        <CardContent className="pt-2">
          <MarkdownRenderer content={diagnostico.contenido} />
        </CardContent>
      </Card>
    </div>
  );
}
