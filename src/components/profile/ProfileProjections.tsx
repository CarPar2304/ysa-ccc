import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const ProfileProjections = () => {
  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle>Proyecciones y Objetivos</CardTitle>
        <CardDescription>Metas y visión a futuro de tu emprendimiento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="objetivos">Principales 3 Objetivos</Label>
          <Textarea 
            id="objetivos" 
            placeholder="Describe tus principales objetivos..."
            className="min-h-[120px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desafios">Desafíos Principales</Label>
          <Textarea 
            id="desafios" 
            placeholder="¿Cuáles son tus mayores desafíos?"
            className="min-h-[100px]"
          />
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
