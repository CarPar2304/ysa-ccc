import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const ProfileTeam = () => {
  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle>Equipo de Trabajo</CardTitle>
        <CardDescription>Información sobre tu equipo emprendedor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="equipo-total">Equipo Total</Label>
            <Input id="equipo-total" type="number" placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-time">Personas Full Time</Label>
            <Input id="full-time" type="number" placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fundadoras">Fundadoras</Label>
            <Input id="fundadoras" type="number" placeholder="0" />
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
