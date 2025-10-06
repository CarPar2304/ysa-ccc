import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const ProfileBasicInfo = () => {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="shadow-medium border-border md:col-span-1">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                TU
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Tu Nombre</h2>
              <p className="text-sm text-muted-foreground">Beneficiario</p>
            </div>
            <Button variant="outline" className="w-full">
              Cambiar foto
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-medium border-border md:col-span-2">
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>Actualiza tus datos personales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nombres">Nombres</Label>
              <Input id="nombres" placeholder="Tus nombres" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input id="apellidos" placeholder="Tus apellidos" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="genero">Género</Label>
              <Input id="genero" placeholder="Género" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="etnica">Identificación Étnica</Label>
              <Input id="etnica" placeholder="Identificación étnica" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ano">Año de Nacimiento</Label>
              <Input id="ano" placeholder="Ej: 1995" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular">Celular</Label>
              <Input id="celular" placeholder="+57 300 123 4567" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="tu@email.com" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Input id="departamento" placeholder="Departamento" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipio">Municipio</Label>
              <Input id="municipio" placeholder="Municipio" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" placeholder="Tu dirección" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="biografia">Biografía</Label>
            <Textarea 
              id="biografia" 
              placeholder="Cuéntanos sobre ti..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline">Cancelar</Button>
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
