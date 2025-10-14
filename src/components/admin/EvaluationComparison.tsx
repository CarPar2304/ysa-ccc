import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface EvaluationComparisonProps {
  cccEvaluation: any;
  juradoEvaluation: any;
}

export const EvaluationComparison = ({ cccEvaluation, juradoEvaluation }: EvaluationComparisonProps) => {
  const isModified = (field: string) => {
    if (!cccEvaluation || !juradoEvaluation) return false;
    return cccEvaluation[field] !== juradoEvaluation[field];
  };

  const ScoreComparison = ({ label, cccScore, juradoScore, maxScore }: any) => {
    const modified = cccScore !== juradoScore;
    return (
      <div className={`p-3 rounded-lg border ${modified ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{label}</span>
          {modified && <AlertCircle className="h-4 w-4 text-orange-500" />}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">CCC</p>
            <p className="text-lg font-semibold">{cccScore} / {maxScore}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Jurado</p>
            <p className={`text-lg font-semibold ${modified ? 'text-orange-600 dark:text-orange-400' : ''}`}>
              {juradoScore} / {maxScore}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!cccEvaluation && !juradoEvaluation) {
    return <p className="text-muted-foreground">No hay evaluaciones para comparar</p>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Evaluación CCC */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Evaluación CCC (Preliminar)</CardTitle>
            <Badge>Preliminar</Badge>
          </div>
          <CardDescription>Evaluación automática del sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cccEvaluation ? (
            <>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Puntaje Total</p>
                <p className="text-3xl font-bold text-primary">{cccEvaluation.puntaje || 0}</p>
              </div>
              <div className="space-y-2">
                <ScoreItem label="Impacto" score={cccEvaluation.puntaje_impacto} max={30} />
                <ScoreItem label="Equipo" score={cccEvaluation.puntaje_equipo} max={25} />
                <ScoreItem label="Innovación" score={cccEvaluation.puntaje_innovacion_tecnologia} max={25} />
                <ScoreItem label="Ventas" score={cccEvaluation.puntaje_ventas} max={15} />
                <ScoreItem label="Referido Regional" score={cccEvaluation.puntaje_referido_regional} max={5} />
              </div>
              {cccEvaluation.nivel && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">Nivel:</p>
                  <Badge variant="outline" className="capitalize">{cccEvaluation.nivel}</Badge>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay evaluación CCC</p>
          )}
        </CardContent>
      </Card>

      {/* Evaluación del Jurado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Evaluación del Jurado</CardTitle>
            <Badge variant="secondary">Jurado</Badge>
          </div>
          <CardDescription>Evaluación del mentor asignado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {juradoEvaluation ? (
            <>
              <div className="text-center p-4 bg-secondary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Puntaje Total</p>
                <p className="text-3xl font-bold text-secondary-foreground">{juradoEvaluation.puntaje || 0}</p>
              </div>
              <div className="space-y-2">
                <ScoreItem 
                  label="Impacto" 
                  score={juradoEvaluation.puntaje_impacto} 
                  max={30}
                  modified={isModified('puntaje_impacto')}
                />
                <ScoreItem 
                  label="Equipo" 
                  score={juradoEvaluation.puntaje_equipo} 
                  max={25}
                  modified={isModified('puntaje_equipo')}
                />
                <ScoreItem 
                  label="Innovación" 
                  score={juradoEvaluation.puntaje_innovacion_tecnologia} 
                  max={25}
                  modified={isModified('puntaje_innovacion_tecnologia')}
                />
                <ScoreItem 
                  label="Ventas" 
                  score={juradoEvaluation.puntaje_ventas} 
                  max={15}
                  modified={isModified('puntaje_ventas')}
                />
                <ScoreItem 
                  label="Referido Regional" 
                  score={juradoEvaluation.puntaje_referido_regional} 
                  max={5}
                  modified={isModified('puntaje_referido_regional')}
                />
              </div>
              {juradoEvaluation.nivel && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">Nivel:</p>
                  <Badge variant="outline" className="capitalize">{juradoEvaluation.nivel}</Badge>
                </div>
              )}
              {juradoEvaluation.comentarios_adicionales && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-1">Comentarios Adicionales:</p>
                  <p className="text-sm text-muted-foreground">{juradoEvaluation.comentarios_adicionales}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay evaluación del jurado</p>
          )}
        </CardContent>
      </Card>

      {/* Comparison Summary */}
      {cccEvaluation && juradoEvaluation && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Comparación de Puntajes</CardTitle>
            <CardDescription>Diferencias entre evaluación CCC y jurado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <ScoreComparison 
                label="Impacto" 
                cccScore={cccEvaluation.puntaje_impacto || 0}
                juradoScore={juradoEvaluation.puntaje_impacto || 0}
                maxScore={30}
              />
              <ScoreComparison 
                label="Equipo" 
                cccScore={cccEvaluation.puntaje_equipo || 0}
                juradoScore={juradoEvaluation.puntaje_equipo || 0}
                maxScore={25}
              />
              <ScoreComparison 
                label="Innovación" 
                cccScore={cccEvaluation.puntaje_innovacion_tecnologia || 0}
                juradoScore={juradoEvaluation.puntaje_innovacion_tecnologia || 0}
                maxScore={25}
              />
              <ScoreComparison 
                label="Ventas" 
                cccScore={cccEvaluation.puntaje_ventas || 0}
                juradoScore={juradoEvaluation.puntaje_ventas || 0}
                maxScore={15}
              />
              <ScoreComparison 
                label="Referido" 
                cccScore={cccEvaluation.puntaje_referido_regional || 0}
                juradoScore={juradoEvaluation.puntaje_referido_regional || 0}
                maxScore={5}
              />
              <ScoreComparison 
                label="Total" 
                cccScore={cccEvaluation.puntaje || 0}
                juradoScore={juradoEvaluation.puntaje || 0}
                maxScore={100}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ScoreItem = ({ label, score, max, modified = false }: any) => (
  <div className={`flex justify-between items-center p-2 rounded ${modified ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}>
    <span className="text-sm">{label}</span>
    <span className={`font-semibold ${modified ? 'text-orange-600 dark:text-orange-400' : ''}`}>
      {score || 0} / {max}
    </span>
  </div>
);
