import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const ProfileProjections = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emprendimientoId, setEmprendimientoId] = useState<string | null>(null);
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

      // Obtener emprendimiento del usuario
      const { data: emprendimiento } = await supabase
        .from("emprendimientos")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!emprendimiento) {
        setLoading(false);
        return;
      }

      setEmprendimientoId(emprendimiento.id);

      // Obtener proyecciones
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

  const handleSave = async () => {
    if (!emprendimientoId) {
      toast({
        title: "Error",
        description: "Primero debes crear un emprendimiento",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        emprendimiento_id: emprendimientoId,
        ...formData,
      };

      const { error } = await supabase
        .from("proyecciones")
        .upsert(updateData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Proyecciones actualizadas correctamente",
      });
    } catch (error) {
      console.error("Error saving projections:", error);
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
        <CardTitle>Proyecciones y Objetivos</CardTitle>
        <CardDescription>Metas y visión a futuro de tu emprendimiento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="objetivos">Principales 3 Objetivos</Label>
          <Textarea 
            id="objetivos" 
            placeholder="Describe tus principales objetivos..."
            className="min-h-[120px]"
            value={formData.principales_objetivos}
            onChange={(e) => setFormData({ ...formData, principales_objetivos: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desafios">Desafíos Principales</Label>
          <Textarea 
            id="desafios" 
            placeholder="¿Cuáles son tus mayores desafíos?"
            className="min-h-[100px]"
            value={formData.desafios}
            onChange={(e) => setFormData({ ...formData, desafios: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="acciones">Acciones de Crecimiento</Label>
          <Textarea 
            id="acciones" 
            placeholder="¿Qué acciones planeas para crecer?"
            className="min-h-[100px]"
            value={formData.acciones_crecimiento}
            onChange={(e) => setFormData({ ...formData, acciones_crecimiento: e.target.value })}
          />
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="decisiones"
              checked={formData.decisiones_acciones_crecimiento}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, decisiones_acciones_crecimiento: checked as boolean })
              }
            />
            <div className="space-y-1">
              <Label htmlFor="decisiones" className="text-sm font-medium">
                ¿Has tomado decisiones para acciones de crecimiento?
              </Label>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox 
              id="internacionalizacion"
              checked={formData.intencion_internacionalizacion}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, intencion_internacionalizacion: checked as boolean })
              }
            />
            <div className="space-y-1">
              <Label htmlFor="internacionalizacion" className="text-sm font-medium">
                ¿Tienes intención de internacionalizar tu emprendimiento?
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={fetchProjections}>
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