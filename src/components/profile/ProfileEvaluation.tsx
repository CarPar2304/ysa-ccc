import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, FileText } from "lucide-react";
import { EvaluationsModal } from "./EvaluationsModal";
import { ProfileDiagnostic } from "./ProfileDiagnostic";

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

      // Obtener evaluaciones visibles
      const { data: evaluacionesData } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("emprendimiento_id", emprendimiento.id)
        .eq("visible_para_usuario", true)
        .order("created_at", { ascending: false });

      setEvaluaciones(evaluacionesData || []);

      // Calcular promedio basado en todas las evaluaciones visibles
      if (evaluacionesData && evaluacionesData.length > 0) {
        const totalPuntaje = evaluacionesData.reduce((sum: number, ev: any) => sum + (ev.puntaje || 0), 0);
        const promedio = totalPuntaje / evaluacionesData.length;
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

  const completadas = evaluaciones.length;
  const hasEvaluaciones = promedioVisible && evaluaciones.length > 0;
  const cccCount = evaluaciones.filter((e: any) => e.tipo_evaluacion === 'ccc').length;
  const juradosCount = evaluaciones.filter((e: any) => e.tipo_evaluacion === 'jurado').length;

  return (
    <Tabs defaultValue="diagnostico" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
        <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
      </TabsList>

      <TabsContent value="diagnostico">
        <ProfileDiagnostic />
      </TabsContent>

      <TabsContent value="evaluaciones">
        {!hasEvaluaciones ? (
          <Card className="shadow-medium border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                Evaluación Pendiente
              </CardTitle>
              <CardDescription>Tu evaluación estará disponible próximamente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="rounded-full bg-muted p-6">
                  <Lock className="h-16 w-16 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">Próximamente</h3>
                  <p className="text-muted-foreground max-w-md">
                    Tu evaluación estará disponible una vez que los mentores completen su revisión.
                    Te notificaremos cuando esté lista.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="shadow-medium border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Evaluación y Diagnóstico</CardTitle>
                    <CardDescription>
                      Basado en {completadas} evaluación{completadas !== 1 ? 'es' : ''} 
                      {cccCount > 0 && ` (CCC${juradosCount > 0 ? ` + ${juradosCount} jurado${juradosCount !== 1 ? 's' : ''}` : ''})`}
                    </CardDescription>
                  </div>
                  <Badge variant="default">
                    {completadas} Evaluación{completadas !== 1 ? 'es' : ''}
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

                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    <strong>Composición del puntaje:</strong> {' '}
                    {cccCount > 0 && `Evaluación preliminar CCC`}
                    {cccCount > 0 && juradosCount > 0 && ` + `}
                    {juradosCount > 0 && `${juradosCount} evaluación${juradosCount !== 1 ? 'es' : ''} de jurado${juradosCount !== 1 ? 's' : ''}`}
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => setShowModal(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Detalles de Evaluaciones ({completadas})
                </Button>
              </CardContent>
            </Card>

            <EvaluationsModal 
              open={showModal}
              onOpenChange={setShowModal}
              evaluaciones={evaluaciones}
            />
          </>
        )}
      </TabsContent>
    </Tabs>
  );
};
