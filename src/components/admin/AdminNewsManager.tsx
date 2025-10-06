import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const AdminNewsManager = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestión de Noticias</CardTitle>
            <CardDescription>Crea, edita y publica noticias para YSA Now</CardDescription>
          </div>
          <Button className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Noticia
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Funcionalidad de gestión de noticias en desarrollo
        </p>
      </CardContent>
    </Card>
  );
};
