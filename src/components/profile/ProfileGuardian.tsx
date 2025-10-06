import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, User, Mail, Phone, MapPin, Shield, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileGuardianProps {
  readOnly?: boolean;
}

export const ProfileGuardian = ({ readOnly = false }: ProfileGuardianProps) => {
  const [loading, setLoading] = useState(true);
  const [esMenor, setEsMenor] = useState(false);
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    celular: "",
    relacion_con_menor: "",
    tipo_documento: "",
    numero_identificacion: "",
    direccion: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    checkIfMinor();
  }, []);

  const checkIfMinor = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("menor_de_edad")
        .eq("id", user.id)
        .single();

      if (usuario?.menor_de_edad) {
        setEsMenor(true);
        await fetchGuardianData(user.id);
      }
    } catch (error) {
      console.error("Error checking minor status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuardianData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("acudientes")
        .select("*")
        .eq("menor_id", userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          nombres: data.nombres || "",
          apellidos: data.apellidos || "",
          email: data.email || "",
          celular: data.celular || "",
          relacion_con_menor: data.relacion_con_menor || "",
          tipo_documento: data.tipo_documento || "",
          numero_identificacion: data.numero_identificacion || "",
          direccion: data.direccion || "",
        });
      }
    } catch (error) {
      console.error("Error fetching guardian data:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!esMenor) {
    return (
      <Card className="shadow-medium border-border">
        <CardContent className="pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta sección solo es visible para usuarios menores de edad.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <Icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base text-foreground break-words">{value || "No especificado"}</p>
      </div>
    </div>
  );

  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Información del Acudiente
        </CardTitle>
        <CardDescription>Datos del responsable o tutor legal</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <InfoItem icon={User} label="Nombres" value={formData.nombres} />
        <InfoItem icon={User} label="Apellidos" value={formData.apellidos} />
        <InfoItem icon={Heart} label="Relación" value={formData.relacion_con_menor} />
        <InfoItem icon={Shield} label="Tipo de Documento" value={formData.tipo_documento?.toUpperCase()} />
        <InfoItem icon={Shield} label="Número de Documento" value={formData.numero_identificacion} />
        <InfoItem icon={Mail} label="Email" value={formData.email} />
        <InfoItem icon={Phone} label="Celular" value={formData.celular} />
        <InfoItem icon={MapPin} label="Dirección" value={formData.direccion} />
      </CardContent>
    </Card>
  );
};