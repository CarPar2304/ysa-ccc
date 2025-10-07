import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, FileText } from "lucide-react";
import { EvaluationsModal } from "./EvaluationsModal";

export const ProfileEvaluation = () => {
  const [loading, setLoading] = useState(true);
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [promedioVisible, setPromedioVisible] = useState(false);
  const [puntajePromedio, setPuntajePromedio] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: emprendimiento } = await supabase
        .from("emprendimientos")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!emprendimiento) {
        setLoading(false);
        return;
      }

      const { data: evaluacionesData } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("emprendimiento_id", emprendimiento.id)
        .eq("visible_para_usuario", true)
        .order("created_at", { ascending: false });

      setEvaluaciones(evaluacionesData || []);

      const evaluacionesEnviadas = (evaluacionesData || []).filter(e => e.estado === 'enviada');
      if (evaluacionesEnviadas.length > 0) {
        const totalPuntaje = evaluacionesEnviadas.reduce((sum, ev) => sum + (ev.puntaje || 0), 0);
        const promedio = totalPuntaje / evaluacionesEnviadas.length;
        setPuntajePromedio(promedio);
        setPromedioVisible(true);
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
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

  const evaluacionesEnviadas = evaluaciones.filter(e => e.estado === 'enviada');
  const completadas = evaluacionesEnviadas.length;

  if (!promedioVisible || evaluaciones.length === 0) {
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
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="rounded-full bg-muted p-6">
              <Lock className="h-16 w-16 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-foreground">Próximamente</h3>
              <p className="text-muted-foreground max-w-md">
                Podrás conocer tu evaluación una vez que el equipo de YSA complete tu diagnóstico.
                Te notificaremos cuando esté disponible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-medium border-border">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Evaluación y Diagnóstico</CardTitle>
              <CardDescription>Resultados de la evaluación de tu emprendimiento</CardDescription>
            </div>
            <Badge variant={completadas === 3 ? "default" : "secondary"}>
              {completadas} / 3 Evaluaciones
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
            <p className="text-sm font-medium text-muted-foreground mb-2">Puntaje Promedio</p>
            <p className="text-6xl font-bold text-primary mb-2">{puntajePromedio.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">de 100 puntos posibles</p>
            <div className="mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(puntajePromedio / 100) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {completadas < 3 && (
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> Este es un puntaje parcial basado en {completadas} evaluación{completadas > 1 ? 'es' : ''}.
                El puntaje final se calculará cuando se completen las 3 evaluaciones.
              </p>
            </div>
          )}

          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => setShowModal(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Ver Evaluaciones Individuales ({completadas})
          </Button>
        </CardContent>
      </Card>

      <EvaluationsModal 
        open={showModal}
        onOpenChange={setShowModal}
        evaluaciones={evaluacionesEnviadas}
      />
    </>
  );
};
