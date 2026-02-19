import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Briefcase, FileText, TrendingUp, Target, Globe, Calendar, Building2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    afiliacion_comfandi: "",
  });
  const [editingComfandi, setEditingComfandi] = useState(false);
  const [comfandiValue, setComfandiValue] = useState("");
  const [savingComfandi, setSavingComfandi] = useState(false);
  const [emprendimientoId, setEmprendimientoId] = useState<string | null>(null);
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
        setEmprendimientoId(data.id);
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
          afiliacion_comfandi: data.afiliacion_comfandi || "",
        });
        setComfandiValue(data.afiliacion_comfandi || "");
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

  const COMFANDI_OPTIONS = [
    "Afiliada como empresa",
    "En proceso o con interés",
    "Afiliado a otra caja",
    "Afiliado como independiente",
  ];

  const COMFANDI_LABELS: Record<string, string> = {
    "Afiliada como empresa": "Si, Mi empresa está registrada como afiliada a la caja de compensación",
    "En proceso o con interés": "No, pero estoy en proceso o tengo interés en afiliarme",
    "Afiliado a otra caja": "No, me encuentro afiliado a otra caja de compensación",
    "Afiliado como independiente": "Sí, me encuentro afiliado, pero como independiente",
  };

  const handleSaveComfandi = async () => {
    if (!emprendimientoId) return;
    setSavingComfandi(true);
    try {
      const { error } = await supabase
        .from("emprendimientos")
        .update({ afiliacion_comfandi: comfandiValue as any })
        .eq("id", emprendimientoId);

      if (error) throw error;

      setFormData(prev => ({ ...prev, afiliacion_comfandi: comfandiValue }));
      setEditingComfandi(false);
      toast({ title: "Actualizado", description: "Afiliación Comfandi actualizada correctamente" });
    } catch (error) {
      console.error("Error updating comfandi:", error);
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    } finally {
      setSavingComfandi(false);
    }
  };

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
            <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
            Información del Emprendimiento
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Detalles sobre tu proyecto o startup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
          <InfoItem icon={Briefcase} label="Nombre" value={formData.nombre} />
          {formData.descripcion && (
            <InfoItem icon={FileText} label="Descripción" value={formData.descripcion} />
          )}
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <InfoItem icon={Globe} label="Página Web" value={formData.pagina_web} />
            <InfoItem icon={Calendar} label="Año de Fundación" value={formData.ano_fundacion} />
          </div>

          {/* Afiliación Comfandi */}
          <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-accent/50 transition-colors">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Afiliación Comfandi</p>
              {editingComfandi ? (
                <div className="flex items-center gap-2 mt-1">
                  <Select value={comfandiValue} onValueChange={setComfandiValue}>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMFANDI_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {COMFANDI_LABELS[opt]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={handleSaveComfandi} disabled={savingComfandi}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditingComfandi(false); setComfandiValue(formData.afiliacion_comfandi); }}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base text-foreground break-words">
                    {formData.afiliacion_comfandi ? COMFANDI_LABELS[formData.afiliacion_comfandi] || formData.afiliacion_comfandi : "No especificado"}
                  </p>
                  {!readOnly && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingComfandi(true); setComfandiValue(formData.afiliacion_comfandi); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-medium border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
            <Target className="h-4 w-4 sm:h-5 sm:w-5" />
            Clasificación
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 md:grid-cols-2 p-4 sm:p-6 pt-0">
          <InfoItem icon={Target} label="Industria" value={formData.industria_vertical} />
          <InfoItem icon={TrendingUp} label="Etapa" value={formData.etapa} />
          <InfoItem icon={Briefcase} label="Categoría" value={formData.categoria} />
          <InfoItem icon={Target} label="Alcance de Mercado" value={formData.alcance_mercado} />
        </CardContent>
      </Card>
    </div>
  );
};