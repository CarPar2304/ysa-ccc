import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Unlock } from "lucide-react";

export const AdminEvaluations = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestión de Evaluaciones</CardTitle>
            <CardDescription>Desbloquea evaluaciones para beneficiarios</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Funcionalidad de gestión de evaluaciones en desarrollo
        </p>
      </CardContent>
    </Card>
  );
};
