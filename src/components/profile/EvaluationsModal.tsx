import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Evaluation {
  id: string;
  puntaje: number;
  puntaje_impacto: number;
  puntaje_equipo: number;
  puntaje_innovacion_tecnologia: number;
  puntaje_ventas: number;
  puntaje_referido_regional: number;
  impacto_texto: string;
  equipo_texto: string;
  innovacion_tecnologia_texto: string;
  ventas_texto: string;
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
  const evaluacionesEnviadas = evaluaciones.filter(e => e.estado === 'enviada');
  const completadas = evaluacionesEnviadas.length;

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
          <DialogTitle className="flex items-center justify-between">
            Mis Evaluaciones
            <Badge variant={completadas === 3 ? "default" : "secondary"}>
              {completadas} / 3 Completadas
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {evaluacionesEnviadas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Aún no tienes evaluaciones disponibles.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="0" className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${evaluacionesEnviadas.length}, 1fr)` }}>
              {evaluacionesEnviadas.map((_, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  Evaluación {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {evaluacionesEnviadas.map((evaluacion, index) => (
              <TabsContent key={evaluacion.id} value={index.toString()} className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Puntaje Total</span>
                      <span className="text-3xl text-primary">{evaluacion.puntaje} / 100</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-5 gap-4">
                      <div className="text-center p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Impacto</p>
                        <p className="text-xl font-bold">{evaluacion.puntaje_impacto}</p>
                        <p className="text-xs text-muted-foreground">/30</p>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Equipo</p>
                        <p className="text-xl font-bold">{evaluacion.puntaje_equipo}</p>
                        <p className="text-xs text-muted-foreground">/25</p>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Innovación</p>
                        <p className="text-xl font-bold">{evaluacion.puntaje_innovacion_tecnologia}</p>
                        <p className="text-xs text-muted-foreground">/25</p>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Ventas</p>
                        <p className="text-xl font-bold">{evaluacion.puntaje_ventas}</p>
                        <p className="text-xs text-muted-foreground">/15</p>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Referido</p>
                        <p className="text-xl font-bold">{evaluacion.puntaje_referido_regional}</p>
                        <p className="text-xs text-muted-foreground">/5</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Evaluación Detallada</h3>
                      
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
                    </div>

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
