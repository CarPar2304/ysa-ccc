import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EvaluationSummary } from "@/components/evaluation/EvaluationSummary";

interface EvaluationViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: any;
  emprendimientoNombre?: string;
  mentorNombre?: string;
}

export const EvaluationViewModal = ({ 
  open, 
  onOpenChange, 
  evaluation,
  emprendimientoNombre,
  mentorNombre 
}: EvaluationViewModalProps) => {
  if (!evaluation) return null;

  const InfoSection = ({ 
    title, 
    score, 
    maxScore, 
    text 
  }: { 
    title: string; 
    score: number; 
    maxScore: number; 
    text: string 
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <Badge>{score} / {maxScore} pts</Badge>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{text || 'Sin comentarios'}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Detalles de la Evaluación</span>
              <Badge variant={evaluation.tipo_evaluacion === 'ccc' ? 'default' : 'secondary'}>
                {evaluation.tipo_evaluacion === 'ccc' ? 'CCC' : 'Jurado'}
              </Badge>
            </div>
            <div className="text-sm font-normal text-muted-foreground">
              <p>{emprendimientoNombre}</p>
              <p>Evaluador: {mentorNombre || 'Sistema'}</p>
              {evaluation.nivel && (
                <p className="capitalize">Nivel: {evaluation.nivel}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <EvaluationSummary
            puntajeImpacto={evaluation.puntaje_impacto || 0}
            puntajeEquipo={evaluation.puntaje_equipo || 0}
            puntajeInnovacion={evaluation.puntaje_innovacion_tecnologia || 0}
            puntajeVentas={evaluation.puntaje_ventas || 0}
            puntajeProyeccionFinanciacion={evaluation.puntaje_proyeccion_financiacion || 0}
            puntajeReferido={evaluation.puntaje_referido_regional || 0}
          />

          <Card>
            <CardHeader>
              <CardTitle>Evaluación Detallada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <InfoSection 
                title="Impacto"
                score={evaluation.puntaje_impacto || 0}
                maxScore={30}
                text={evaluation.impacto_texto || ''}
              />
              
              <Separator />
              
              <InfoSection 
                title="Equipo"
                score={evaluation.puntaje_equipo || 0}
                maxScore={25}
                text={evaluation.equipo_texto || ''}
              />
              
              <Separator />
              
              <InfoSection 
                title="Innovación y Tecnología"
                score={evaluation.puntaje_innovacion_tecnologia || 0}
                maxScore={25}
                text={evaluation.innovacion_tecnologia_texto || ''}
              />
              
              <Separator />
              
              <InfoSection 
                title="Ventas"
                score={evaluation.puntaje_ventas || 0}
                maxScore={10}
                text={evaluation.ventas_texto || ''}
              />

              <Separator />
              
              <InfoSection 
                title="Proyección y Financiación"
                score={evaluation.puntaje_proyeccion_financiacion || 0}
                maxScore={5}
                text={evaluation.proyeccion_financiacion_texto || ''}
              />

              {evaluation.puntaje_referido_regional > 0 && (
                <>
                  <Separator />
                  <InfoSection 
                    title="Referido Regional"
                    score={evaluation.puntaje_referido_regional || 0}
                    maxScore={5}
                    text={evaluation.referido_regional || ''}
                  />
                </>
              )}

              {evaluation.comentarios_adicionales && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold">Comentarios Adicionales</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {evaluation.comentarios_adicionales}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Badge variant={evaluation.estado === 'enviada' ? 'default' : 'outline'}>
                    {evaluation.estado === 'enviada' ? 'Enviada' : 'Borrador'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Aprobación</p>
                  {evaluation.tipo_evaluacion === 'jurado' ? (
                    <Badge variant={
                      evaluation.aprobada_por_admin === null ? 'outline' :
                      evaluation.aprobada_por_admin ? 'default' : 'destructive'
                    }>
                      {evaluation.aprobada_por_admin === null ? 'Pendiente' :
                       evaluation.aprobada_por_admin ? 'Aprobada' : 'Rechazada'}
                    </Badge>
                  ) : (
                    <Badge>Auto-aprobada</Badge>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-right">
                Evaluado el {new Date(evaluation.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
