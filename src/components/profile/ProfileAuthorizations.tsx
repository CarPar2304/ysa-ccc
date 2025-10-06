import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const ProfileAuthorizations = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("autorizaciones")
        .upsert({
          user_id: user.id,
          ...formData,
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Autorizaciones actualizadas correctamente",
      });
    } catch (error) {
      console.error("Error saving authorizations:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la información",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle>Autorizaciones y Consentimientos</CardTitle>
        <CardDescription>Gestiona tus permisos de datos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start space-x-3">
          <Checkbox 
            id="tratamiento" 
            checked={formData.tratamiento_datos}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, tratamiento_datos: checked as boolean })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="tratamiento" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tratamiento de datos personales
            </Label>
            <p className="text-sm text-muted-foreground">
              Autorizo el tratamiento de mis datos personales según la política de privacidad
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox 
            id="sensibles" 
            checked={formData.datos_sensibles}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, datos_sensibles: checked as boolean })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="sensibles" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Datos sensibles
            </Label>
            <p className="text-sm text-muted-foreground">
              Autorizo el tratamiento de datos sensibles para fines del programa
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox 
            id="correo" 
            checked={formData.correo}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, correo: checked as boolean })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="correo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Comunicaciones por correo
            </Label>
            <p className="text-sm text-muted-foreground">
              Acepto recibir comunicaciones sobre el programa por correo electrónico
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={fetchAuthorizations}>
            Cancelar
          </Button>
          <Button
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};