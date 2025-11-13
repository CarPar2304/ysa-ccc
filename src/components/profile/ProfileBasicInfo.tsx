import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react";

interface ProfileBasicInfoProps {
  readOnly?: boolean;
}

export const ProfileBasicInfo = ({ readOnly = false }: ProfileBasicInfoProps) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    celular: "",
    tipo_documento: "",
    numero_identificacion: "",
    genero: "",
    departamento: "",
    municipio: "",
    direccion: "",
    ano_nacimiento: "",
    identificacion_etnica: "",
    biografia: "",
    nivel_ingles: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          nombres: data.nombres || "",
          apellidos: data.apellidos || "",
          email: data.email || "",
          celular: data.celular || "",
          tipo_documento: data.tipo_documento || "",
          numero_identificacion: data.numero_identificacion || "",
          genero: data.genero || "",
          departamento: data.departamento || "",
          municipio: data.municipio || "",
          direccion: data.direccion || "",
          ano_nacimiento: data.ano_nacimiento || "",
          identificacion_etnica: data.identificacion_etnica || "",
          biografia: data.biografia || "",
          nivel_ingles: data.nivel_ingles || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm sm:text-base text-foreground break-words">{value || "No especificado"}</p>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 sm:gap-6">
      <Card className="shadow-medium border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
            Información Personal
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Datos básicos del perfil</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 md:grid-cols-2 p-4 sm:p-6 pt-0">
          <InfoItem icon={User} label="Nombres" value={formData.nombres} />
          <InfoItem icon={User} label="Apellidos" value={formData.apellidos} />
          <InfoItem icon={Mail} label="Email" value={formData.email} />
          <InfoItem icon={Phone} label="Celular" value={formData.celular} />
          <InfoItem icon={Shield} label="Tipo de Documento" value={formData.tipo_documento?.toUpperCase()} />
          <InfoItem icon={Shield} label="Número de Documento" value={formData.numero_identificacion} />
        </CardContent>
      </Card>

      <Card className="shadow-medium border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 md:grid-cols-2 p-4 sm:p-6 pt-0">
          <InfoItem icon={MapPin} label="Departamento" value={formData.departamento} />
          <InfoItem icon={MapPin} label="Municipio" value={formData.municipio} />
          <InfoItem icon={MapPin} label="Dirección" value={formData.direccion} />
        </CardContent>
      </Card>

      <Card className="shadow-medium border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Información Adicional
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 md:grid-cols-2 p-4 sm:p-6 pt-0">
          <InfoItem icon={User} label="Género" value={formData.genero} />
          <InfoItem icon={Calendar} label="Año de Nacimiento" value={formData.ano_nacimiento} />
          <InfoItem icon={User} label="Identificación Étnica" value={formData.identificacion_etnica} />
          <InfoItem icon={User} label="Nivel de Inglés" value={formData.nivel_ingles} />
          {formData.biografia && (
            <div className="md:col-span-2">
              <InfoItem icon={User} label="Biografía" value={formData.biografia} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
