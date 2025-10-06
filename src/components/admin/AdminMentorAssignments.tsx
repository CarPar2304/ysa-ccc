import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const AdminMentorAssignments = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Asignaciones de Mentores</CardTitle>
            <CardDescription>Asigna mentores a módulos específicos</CardDescription>
          </div>
          <Button className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Asignación
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Funcionalidad de asignación de mentores en desarrollo
        </p>
      </CardContent>
    </Card>
  );
};
