import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Target, AlertCircle, TrendingUp, Check, X, Globe } from "lucide-react";

interface ProfileProjectionsProps {
  readOnly?: boolean;
}

export const ProfileProjections = ({ readOnly = false }: ProfileProjectionsProps) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    principales_objetivos: "",
    desafios: "",
    acciones_crecimiento: "",
    decisiones_acciones_crecimiento: false,
    intencion_internacionalizacion: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProjections();
  }, []);

  const fetchProjections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: emprendimiento } = await supabase
        .from("emprendimientos")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!emprendimiento) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("proyecciones")
        .select("*")
        .eq("emprendimiento_id", emprendimiento.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          principales_objetivos: data.principales_objetivos || "",
          desafios: data.desafios || "",
          acciones_crecimiento: data.acciones_crecimiento || "",
          decisiones_acciones_crecimiento: data.decisiones_acciones_crecimiento || false,
          intencion_internacionalizacion: data.intencion_internacionalizacion || false,
        });
      }
    } catch (error) {
      console.error("Error fetching projections:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de proyecciones",
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
        <p className="text-base text-foreground break-words whitespace-pre-wrap">{value || "No especificado"}</p>
      </div>
    </div>
  );

  const BooleanItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: boolean }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border">
      {value ? (
        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : (
        <X className="h-5 w-5 text-red-500 flex-shrink-0" />
      )}
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="grid gap-6">
      <Card className="shadow-medium border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Proyecciones y Objetivos
          </CardTitle>
          <CardDescription>Metas y visión a futuro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoItem icon={Target} label="Principales 3 Objetivos" value={formData.principales_objetivos} />
          <InfoItem icon={AlertCircle} label="Desafíos Principales" value={formData.desafios} />
          <InfoItem icon={TrendingUp} label="Acciones de Crecimiento" value={formData.acciones_crecimiento} />
        </CardContent>
      </Card>

      <Card className="shadow-medium border-border">
        <CardHeader>
          <CardTitle>Estrategia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <BooleanItem 
            icon={TrendingUp} 
            label="Decisiones tomadas para acciones de crecimiento" 
            value={formData.decisiones_acciones_crecimiento} 
          />
          <BooleanItem 
            icon={Globe} 
            label="Intención de internacionalizar" 
            value={formData.intencion_internacionalizacion} 
          />
        </CardContent>
      </Card>
    </div>
  );
};