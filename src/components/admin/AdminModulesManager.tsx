import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const AdminModulesManager = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestión de Módulos y Clases</CardTitle>
            <CardDescription>Crea y organiza el contenido educativo de YSA Lab</CardDescription>
          </div>
          <Button className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Módulo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Funcionalidad de gestión de módulos en desarrollo
        </p>
      </CardContent>
    </Card>
  );
};
