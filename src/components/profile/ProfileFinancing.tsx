import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const ProfileFinancing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emprendimientoId, setEmprendimientoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    financiamiento_previo: false,
    tipo_actor: "",
    monto_recibido: "",
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

      // Obtener información de financiamiento
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
          monto_recibido: data.monto_recibido || "",
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
        .from("financiamientos")
        .upsert(updateData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Información de financiamiento actualizada correctamente",
      });
    } catch (error) {
      console.error("Error saving financing:", error);
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
        <CardTitle>Financiamiento</CardTitle>
        <CardDescription>Historial y búsqueda de financiamiento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start space-x-3">
          <Checkbox 
            id="financiamiento-previo"
            checked={formData.financiamiento_previo}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, financiamiento_previo: checked as boolean })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="financiamiento-previo" className="text-sm font-medium">
              ¿Has recibido financiamiento previo?
            </Label>
          </div>
        </div>

        {formData.financiamiento_previo && (
          <div className="space-y-4 pl-7 border-l-2 border-border">
            <div className="space-y-2">
              <Label htmlFor="tipo-actor">Tipo de Actor</Label>
              <Input 
                id="tipo-actor" 
                placeholder="Ej: Ángel inversionista, Capital semilla"
                value={formData.tipo_actor}
                onChange={(e) => setFormData({ ...formData, tipo_actor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto-recibido">Monto Recibido</Label>
              <Input 
                id="monto-recibido" 
                placeholder="$"
                value={formData.monto_recibido}
                onChange={(e) => setFormData({ ...formData, monto_recibido: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-inversion">Tipo de Inversión</Label>
              <Input 
                id="tipo-inversion" 
                placeholder="Ej: Equity, Deuda"
                value={formData.tipo_inversion}
                onChange={(e) => setFormData({ ...formData, tipo_inversion: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="etapa">Etapa del Financiamiento</Label>
              <Input 
                id="etapa" 
                placeholder="Ej: Pre-seed, Seed"
                value={formData.etapa}
                onChange={(e) => setFormData({ ...formData, etapa: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="busca-financiamiento">¿Estás buscando financiamiento actualmente?</Label>
            <Input 
              id="busca-financiamiento" 
              placeholder="Sí / No / En proceso"
              value={formData.busca_financiamiento}
              onChange={(e) => setFormData({ ...formData, busca_financiamiento: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto-buscado">Monto Buscado</Label>
            <Input 
              id="monto-buscado" 
              placeholder="$"
              value={formData.monto_buscado}
              onChange={(e) => setFormData({ ...formData, monto_buscado: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={fetchFinancing}>
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