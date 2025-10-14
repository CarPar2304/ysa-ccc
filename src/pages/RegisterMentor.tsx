import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ShieldCheck } from "lucide-react";
import { z } from "zod";

const ACCESS_CODE = "YSA-MENTOR-ACCESS";

const mentorSchema = z.object({
  accessCode: z.string().min(1, "El código de acceso es requerido"),
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accessCode: "",
    nombres: "",
    apellidos: "",
    genero: "",
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

      // Call edge function to register mentor
      const response = await fetch(
        `https://aqfpzlrpqszoxbjojavc.supabase.co/functions/v1/register-mentor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validatedData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al registrar mentor");
      }

      toast({
        title: "Mentor registrado exitosamente",
        description: data.message,
      });

      // Limpiar formulario
      setFormData({
        accessCode: "",
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
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Registrar Nuevo Mentor
          </CardTitle>
          <CardDescription>Completa la información para crear una nueva cuenta de mentor</CardDescription>
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
                Este código es requerido para registrar un nuevo mentor
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
            <Label htmlFor="genero">Género *</Label>
            <Select value={formData.genero} onValueChange={(value) => setFormData({ ...formData, genero: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un género" />
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
                Registrar Mentor
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
