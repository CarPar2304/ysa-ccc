import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const ProfileAuthorizations = () => {
  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle>Autorizaciones y Consentimientos</CardTitle>
        <CardDescription>Gestiona tus permisos de datos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start space-x-3">
          <Checkbox id="tratamiento" />
          <div className="space-y-1">
            <Label htmlFor="tratamiento" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tratamiento de datos personales
            </Label>
            <p className="text-sm text-muted-foreground">
              Autorizo el tratamiento de mis datos personales según la política de privacidad
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox id="sensibles" />
          <div className="space-y-1">
            <Label htmlFor="sensibles" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Datos sensibles
            </Label>
            <p className="text-sm text-muted-foreground">
              Autorizo el tratamiento de datos sensibles para fines del programa
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox id="correo" />
          <div className="space-y-1">
            <Label htmlFor="correo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Comunicaciones por correo
            </Label>
            <p className="text-sm text-muted-foreground">
              Acepto recibir comunicaciones sobre el programa por correo electrónico
            </p>
          </div>
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
