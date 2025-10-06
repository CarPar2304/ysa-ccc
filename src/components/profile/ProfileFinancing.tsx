import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const ProfileFinancing = () => {
  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle>Financiamiento</CardTitle>
        <CardDescription>Historial y búsqueda de financiamiento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start space-x-3">
          <Checkbox id="financiamiento-previo" />
          <div className="space-y-1">
            <Label htmlFor="financiamiento-previo" className="text-sm font-medium">
              ¿Has recibido financiamiento previo?
            </Label>
          </div>
        </div>

        <div className="space-y-4 pl-7">
          <div className="space-y-2">
            <Label htmlFor="tipo-actor">Tipo de Actor</Label>
            <Input id="tipo-actor" placeholder="Ej: Ángel inversionista, Capital semilla" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto-recibido">Monto Recibido</Label>
            <Input id="monto-recibido" placeholder="$" />
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox id="busca-financiamiento" />
          <div className="space-y-1">
            <Label htmlFor="busca-financiamiento" className="text-sm font-medium">
              ¿Estás buscando financiamiento actualmente?
            </Label>
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
