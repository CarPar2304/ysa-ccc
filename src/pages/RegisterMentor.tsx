import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { z } from "zod";

const mentorSchema = z.object({
  nombres: z.string().trim().min(2, "Los nombres deben tener al menos 2 caracteres").max(100, "Los nombres no pueden exceder 100 caracteres"),
  apellidos: z.string().trim().min(2, "Los apellidos deben tener al menos 2 caracteres").max(100, "Los apellidos no pueden exceder 100 caracteres"),
  genero: z.enum(['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'], {
    required_error: "Debe seleccionar un género"
  }),
  email: z.string().email("Correo electrónico inválido").max(255, "El correo no puede exceder 255 caracteres"),
  celular: z.string().regex(/^3\d{9}$/, "Número de celular colombiano inválido (debe ser 10 dígitos comenzando con 3)"),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
});

const RegisterMentor = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    genero: "",
    email: "",
    celular: "",
    password: "",
  });

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data with Zod schema
      const validatedData = mentorSchema.parse(formData);

      // 1. Crear usuario en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            nombres: validatedData.nombres,
            apellidos: validatedData.apellidos,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 2. Actualizar información en tabla usuarios
      const { error: usuarioError } = await supabase
        .from("usuarios")
        .update({
          genero: validatedData.genero,
          celular: validatedData.celular,
        })
        .eq("id", authData.user.id);

      if (usuarioError) throw usuarioError;

      // 3. Asignar rol de mentor
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "mentor",
        });

      if (roleError) throw roleError;

      toast({
        title: "Mentor registrado exitosamente",
        description: `Se ha creado el mentor ${validatedData.nombres} ${validatedData.apellidos}`,
      });

      // Limpiar formulario
      setFormData({
        nombres: "",
        apellidos: "",
        genero: "",
        email: "",
        celular: "",
        password: "",
      });
    } catch (error: any) {
      console.error("Error registrando mentor:", error);
      
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => err.message).join(", ");
        toast({
          title: "Error de validación",
          description: errorMessages,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error al registrar mentor",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-primary" />
              <CardTitle>Registrar Nuevo Mentor</CardTitle>
            </div>
            <CardDescription>
              Complete los datos del mentor que desea registrar en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres *</Label>
                  <Input
                    id="nombres"
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    id="apellidos"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genero">Género *</Label>
                <Select value={formData.genero} onValueChange={(value) => setFormData({ ...formData, genero: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un género" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="No binario">No binario</SelectItem>
                    <SelectItem value="Prefiero no decir">Prefiero no decir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="celular">Celular *</Label>
                <Input
                  id="celular"
                  type="tel"
                  value={formData.celular}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña temporal *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Mínimo 8 caracteres, mayúscula, número y carácter especial"
                />
                <p className="text-xs text-muted-foreground">
                  La contraseña debe contener al menos: 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Registrar Mentor
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RegisterMentor;
