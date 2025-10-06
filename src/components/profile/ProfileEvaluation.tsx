import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const ProfileEvaluation = () => {
  // TODO: Verificar desde la BD si la evaluación está visible
  const evaluacionVisible = false;

  if (!evaluacionVisible) {
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
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Puntaje General</h3>
          <p className="text-2xl font-bold text-primary">85/100</p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Diagnóstico Completo</h3>
          <p className="text-muted-foreground">
            Tu evaluación detallada aparecerá aquí una vez desbloqueada por el administrador.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
