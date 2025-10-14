import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EvaluationSummary } from "@/components/evaluation/EvaluationSummary";

interface Evaluation {
  id: string;
  puntaje: number;
  puntaje_impacto: number;
  puntaje_equipo: number;
  puntaje_innovacion_tecnologia: number;
  puntaje_ventas: number;
  puntaje_referido_regional: number;
  puntaje_proyeccion_financiacion: number;
  impacto_texto: string;
  equipo_texto: string;
  innovacion_tecnologia_texto: string;
  ventas_texto: string;
  proyeccion_financiacion_texto: string;
  comentarios_adicionales: string;
  estado: string;
  created_at: string;
}

interface EvaluationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluaciones: Evaluation[];
}

export const EvaluationsModal = ({ open, onOpenChange, evaluaciones }: EvaluationsModalProps) => {
  // Mostrar evaluaciones enviadas O evaluaciones CCC (que pueden estar en borrador)
  const evaluacionesVisibles = evaluaciones.filter(e => 
    e.estado === 'enviada' || (e as any).tipo_evaluacion === 'ccc'
  );

  const InfoSection = ({ title, score, maxScore, text }: { title: string; score: number; maxScore: number; text: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <Badge>{score} / {maxScore} pts</Badge>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mis Evaluaciones</DialogTitle>
        </DialogHeader>

        {evaluacionesVisibles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Aún no tienes evaluaciones disponibles.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="0" className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${evaluacionesVisibles.length}, 1fr)` }}>
              {evaluacionesVisibles.map((_, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  Evaluación {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {evaluacionesVisibles.map((evaluacion, index) => (
              <TabsContent key={evaluacion.id} value={index.toString()} className="space-y-4 mt-4">
                <EvaluationSummary
                  puntajeImpacto={evaluacion.puntaje_impacto || 0}
                  puntajeEquipo={evaluacion.puntaje_equipo || 0}
                  puntajeInnovacion={evaluacion.puntaje_innovacion_tecnologia || 0}
                  puntajeVentas={evaluacion.puntaje_ventas || 0}
                  puntajeProyeccionFinanciacion={evaluacion.puntaje_proyeccion_financiacion || 0}
                  puntajeReferido={evaluacion.puntaje_referido_regional || 0}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Evaluación Detallada</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    <InfoSection 
                      title="Impacto"
                      score={evaluacion.puntaje_impacto}
                      maxScore={30}
                      text={evaluacion.impacto_texto}
                    />
                    
                    <Separator />
                    
                    <InfoSection 
                      title="Equipo"
                      score={evaluacion.puntaje_equipo}
                      maxScore={25}
                      text={evaluacion.equipo_texto}
                    />
                    
                    <Separator />
                    
                    <InfoSection 
                      title="Innovación y Tecnología"
                      score={evaluacion.puntaje_innovacion_tecnologia}
                      maxScore={25}
                      text={evaluacion.innovacion_tecnologia_texto}
                    />
                    
                    <Separator />
                    
                    <InfoSection 
                      title="Ventas"
                      score={evaluacion.puntaje_ventas}
                      maxScore={15}
                      text={evaluacion.ventas_texto}
                    />

                    <Separator />
                    
                    <InfoSection 
                      title="Proyección y Financiación"
                      score={evaluacion.puntaje_proyeccion_financiacion}
                      maxScore={5}
                      text={evaluacion.proyeccion_financiacion_texto}
                    />

                    {evaluacion.comentarios_adicionales && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="font-semibold">Comentarios Adicionales</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {evaluacion.comentarios_adicionales}
                          </p>
                        </div>
                      </>
                    )}

                    <div className="text-xs text-muted-foreground text-right">
                      Evaluado el {new Date(evaluacion.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
