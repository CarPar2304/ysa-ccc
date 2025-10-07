import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, TrendingUp, Banknote, Check, X } from "lucide-react";

interface ProfileFinancingProps {
  readOnly?: boolean;
}

export const ProfileFinancing = ({ readOnly = false }: ProfileFinancingProps) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    financiamiento_previo: false,
    tipo_actor: "",
    monto_recibido: 0,
    tipo_inversion: "",
    busca_financiamiento: "",
    monto_buscado: "",
    etapa: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFinancing();
  }, []);

  const fetchFinancing = async () => {
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
        .from("financiamientos")
        .select("*")
        .eq("emprendimiento_id", emprendimiento.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          financiamiento_previo: data.financiamiento_previo || false,
          tipo_actor: data.tipo_actor || "",
          monto_recibido: data.monto_recibido || 0,
          tipo_inversion: data.tipo_inversion || "",
          busca_financiamiento: data.busca_financiamiento || "",
          monto_buscado: data.monto_buscado || "",
          etapa: data.etapa || "",
        });
      }
    } catch (error) {
      console.error("Error fetching financing:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de financiamiento",
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

  const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) => (
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
            <DollarSign className="h-5 w-5" />
            Financiamiento
          </CardTitle>
          <CardDescription>Historial y búsqueda de financiamiento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border">
            {formData.financiamiento_previo ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
            <p className="text-base font-medium">
              {formData.financiamiento_previo ? "Ha recibido financiamiento previo" : "No ha recibido financiamiento previo"}
            </p>
          </div>

          {formData.financiamiento_previo && (
            <div className="space-y-2 pt-4 border-t">
              <InfoItem icon={Banknote} label="Tipo de Actor" value={formData.tipo_actor} />
              <InfoItem icon={DollarSign} label="Monto Recibido" value={formData.monto_recibido} />
              <InfoItem icon={TrendingUp} label="Tipo de Inversión" value={formData.tipo_inversion} />
              <InfoItem icon={TrendingUp} label="Etapa" value={formData.etapa} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-medium border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Búsqueda Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InfoItem icon={TrendingUp} label="¿Buscando financiamiento?" value={formData.busca_financiamiento} />
          <InfoItem icon={DollarSign} label="Monto Buscado" value={formData.monto_buscado} />
        </CardContent>
      </Card>
    </div>
  );
};