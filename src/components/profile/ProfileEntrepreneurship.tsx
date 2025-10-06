import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const ProfileEntrepreneurship = () => {
  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle>Información del Emprendimiento</CardTitle>
        <CardDescription>Detalles sobre tu proyecto o startup</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre-emprendimiento">Nombre del Emprendimiento</Label>
          <Input id="nombre-emprendimiento" placeholder="Nombre de tu proyecto" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea 
            id="descripcion" 
            placeholder="Describe tu emprendimiento..."
            className="min-h-[100px]"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="industria">Industria o Vertical</Label>
            <Input id="industria" placeholder="Ej: Tecnología, Salud" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etapa">Etapa</Label>
            <Input id="etapa" placeholder="Ej: Idea, MVP" />
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
