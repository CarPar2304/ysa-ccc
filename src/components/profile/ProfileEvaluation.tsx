import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ProfileEvaluation = () => {
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<any>(null);

  useEffect(() => {
    fetchEvaluation();
  }, []);

  const fetchEvaluation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el emprendimiento del usuario
      const { data: emprendimiento } = await supabase
        .from("emprendimientos")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!emprendimiento) {
        setLoading(false);
        return;
      }

      // Obtener la evaluación visible
      const { data: evaluacion } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("emprendimiento_id", emprendimiento.id)
        .eq("visible_para_usuario", true)
        .maybeSingle();

      setEvaluation(evaluacion);
    } catch (error) {
      console.error("Error fetching evaluation:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <Card className="shadow-medium border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Evaluación y Diagnóstico
          </CardTitle>
          <CardDescription>Tu diagnóstico personalizado</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-muted border-border">
            <Lock className="h-4 w-4" />
            <AlertTitle>Próximamente</AlertTitle>
            <AlertDescription>
              Podrás conocer tu evaluación una vez que el equipo de YSA complete tu diagnóstico.
              Te notificaremos cuando esté disponible.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle>Evaluación y Diagnóstico</CardTitle>
        <CardDescription>Resultados de tu evaluación</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {evaluation.puntaje && (
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Puntaje General</h3>
            <p className="text-2xl font-bold text-primary">{evaluation.puntaje}/100</p>
          </div>
        )}

        {evaluation.diagnostico_completo && (
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Diagnóstico Completo</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {evaluation.diagnostico_completo}
            </p>
          </div>
        )}

        {evaluation.impacto_texto && (
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Impacto</h3>
            <p className="text-muted-foreground">{evaluation.impacto_texto}</p>
          </div>
        )}

        {evaluation.equipo_texto && (
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Equipo</h3>
            <p className="text-muted-foreground">{evaluation.equipo_texto}</p>
          </div>
        )}

        {evaluation.innovacion_tecnologia_texto && (
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Innovación y Tecnología</h3>
            <p className="text-muted-foreground">{evaluation.innovacion_tecnologia_texto}</p>
          </div>
        )}

        {evaluation.ventas_texto && (
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Ventas</h3>
            <p className="text-muted-foreground">{evaluation.ventas_texto}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};