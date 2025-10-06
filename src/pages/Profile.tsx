import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, Briefcase } from "lucide-react";

const Profile = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Administra tu información personal y preferencias</p>
        </div>

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
                  <p className="text-sm text-muted-foreground">Emprendedor</p>
                </div>
                <Button variant="outline" className="w-full">
                  Cambiar foto
                </Button>
              </div>
              
              <div className="mt-6 space-y-3 pt-6 border-t border-border">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">tu@email.com</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">+123 456 7890</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Región Pacífico</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">YSA 2024</span>
                </div>
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
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" placeholder="Tu nombre" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" placeholder="Tu apellido" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" placeholder="tu@email.com" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" type="tel" placeholder="+123 456 7890" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Biografía</Label>
                <Textarea 
                  id="bio" 
                  placeholder="Cuéntanos sobre ti y tu proyecto..."
                  className="min-h-[120px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Empresa/Startup</Label>
                <Input id="company" placeholder="Nombre de tu empresa" />
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
      </div>
    </Layout>
  );
};

export default Profile;
