import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Briefcase, FileText, TrendingUp, Target, Globe, Calendar } from "lucide-react";

interface ProfileEntrepreneurshipProps {
  readOnly?: boolean;
}

export const ProfileEntrepreneurship = ({ readOnly = false }: ProfileEntrepreneurshipProps) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    industria_vertical: "",
    etapa: "",
    categoria: "",
    alcance_mercado: "",
    tipo_cliente: "",
    pagina_web: "",
    ano_fundacion: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEntrepreneurship();
  }, []);

  const fetchEntrepreneurship = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("emprendimientos")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          nombre: data.nombre || "",
          descripcion: data.descripcion || "",
          industria_vertical: data.industria_vertical || "",
          etapa: data.etapa || "",
          categoria: data.categoria || "",
          alcance_mercado: data.alcance_mercado || "",
          tipo_cliente: data.tipo_cliente || "",
          pagina_web: data.pagina_web || "",
          ano_fundacion: data.ano_fundacion ? String(data.ano_fundacion) : "",
        });
      }
    } catch (error) {
      console.error("Error fetching entrepreneurship:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del emprendimiento",
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
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <Icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base text-foreground break-words">{value || "No especificado"}</p>
      </div>
    </div>
  );

  return (
    <div className="grid gap-6">
      <Card className="shadow-medium border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Información del Emprendimiento
          </CardTitle>
          <CardDescription>Detalles sobre tu proyecto o startup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoItem icon={Briefcase} label="Nombre" value={formData.nombre} />
          {formData.descripcion && (
            <InfoItem icon={FileText} label="Descripción" value={formData.descripcion} />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem icon={Globe} label="Página Web" value={formData.pagina_web} />
            <InfoItem icon={Calendar} label="Año de Fundación" value={formData.ano_fundacion} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-medium border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Clasificación
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <InfoItem icon={Target} label="Industria" value={formData.industria_vertical} />
          <InfoItem icon={TrendingUp} label="Etapa" value={formData.etapa} />
          <InfoItem icon={Briefcase} label="Categoría" value={formData.categoria} />
          <InfoItem icon={Target} label="Alcance de Mercado" value={formData.alcance_mercado} />
        </CardContent>
      </Card>
    </div>
  );
};