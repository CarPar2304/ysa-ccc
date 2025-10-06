import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const ProfileGuardian = () => {
  // TODO: Verificar si el usuario es menor de edad desde la base de datos
  const esMenor = false;

  if (!esMenor) {
    return (
      <Card className="shadow-medium border-border">
        <CardContent className="pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta sección solo es visible para usuarios menores de edad.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle>Información del Acudiente</CardTitle>
        <CardDescription>Datos del responsable o acudiente</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="acudiente-nombres">Nombres</Label>
            <Input id="acudiente-nombres" placeholder="Nombres del acudiente" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acudiente-apellidos">Apellidos</Label>
            <Input id="acudiente-apellidos" placeholder="Apellidos del acudiente" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="acudiente-email">Email</Label>
            <Input id="acudiente-email" type="email" placeholder="email@ejemplo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acudiente-celular">Celular</Label>
            <Input id="acudiente-celular" placeholder="+57 300 123 4567" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="acudiente-relacion">Relación con el menor</Label>
          <Input id="acudiente-relacion" placeholder="Ej: Padre, Madre, Tutor legal" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline">Cancelar</Button>
          <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
            Guardar cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
