import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ShieldCheck } from "lucide-react";
import { z } from "zod";

const mentorSchema = z.object({
  accessCode: z.string().min(1, "El código de acceso es requerido"),
  nombres: z.string().trim().min(2, "Los nombres deben tener al menos 2 caracteres").max(100, "Los nombres no pueden exceder 100 caracteres"),
  apellidos: z.string().trim().min(2, "Los apellidos deben tener al menos 2 caracteres").max(100, "Los apellidos no pueden exceder 100 caracteres"),
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accessCode: "",
    nombres: "",
    apellidos: "",
    email: "",
    celular: "",
    password: "",
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data with Zod schema
      const validatedData = mentorSchema.parse(formData);

      // Invoke edge function securely via Supabase client
      const { data, error } = await supabase.functions.invoke('register-mentor', {
        body: validatedData,
      });

      if (error) throw new Error(error.message || 'Error al registrar usuario');
      if (data?.error) throw new Error(data.error);

      const roleLabel = data?.role === "stakeholder" ? "stakeholder" : "mentor";

      toast({
        title: `${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)} registrado exitosamente`,
        description: data?.message || `Se ha creado el ${roleLabel} ${validatedData.nombres} ${validatedData.apellidos}. Puede iniciar sesión con su email y contraseña.`,
      });

      // Redirigir al login
      navigate("/login");
    } catch (error: any) {
      console.error("Error registrando mentor:", error);
      
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((err: any) => err.message).join(", ");
        toast({
          title: "Error de validación",
          description: errorMessages,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error al registrar",
          description: error?.message || 'Error desconocido al invocar la función',
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Registro de Usuarios YSA
          </CardTitle>
          <CardDescription>Completa la información para crear una nueva cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Código de Acceso */}
            <div className="space-y-2 bg-muted/50 p-4 rounded-lg border-2 border-primary/20">
              <Label htmlFor="accessCode" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Código de Acceso *
              </Label>
              <Input
                id="accessCode"
                type="text"
                value={formData.accessCode}
                onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                required
                placeholder="Ingresa el código de acceso"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Este código determina el tipo de cuenta que se creará
              </p>
            </div>

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
              placeholder="3001234567"
            />
            <p className="text-xs text-muted-foreground">
              Debe ser un número colombiano de 10 dígitos comenzando con 3
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
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
                Registrar Usuario
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
  );
};

export default RegisterMentor;
