import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Check, X } from "lucide-react";

interface ProfileAuthorizationsProps {
  readOnly?: boolean;
}

export const ProfileAuthorizations = ({ readOnly = false }: ProfileAuthorizationsProps) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    tratamiento_datos: false,
    datos_sensibles: false,
    correo: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAuthorizations();
  }, []);

  const fetchAuthorizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("autorizaciones")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          tratamiento_datos: data.tratamiento_datos,
          datos_sensibles: data.datos_sensibles,
          correo: data.correo,
        });
      }
    } catch (error) {
      console.error("Error fetching authorizations:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información",
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

  const AuthItem = ({ label, value }: { label: string, value: boolean }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      {value ? (
        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
      ) : (
        <X className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <p className="text-base text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">
          {value ? "Autorizado" : "No autorizado"}
        </p>
      </div>
    </div>
  );

  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Autorizaciones y Consentimientos
        </CardTitle>
        <CardDescription>Estado de tus permisos de datos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <AuthItem 
          label="Tratamiento de datos personales" 
          value={formData.tratamiento_datos} 
        />
        <AuthItem 
          label="Datos sensibles" 
          value={formData.datos_sensibles} 
        />
        <AuthItem 
          label="Comunicaciones por correo" 
          value={formData.correo} 
        />
      </CardContent>
    </Card>
  );
};