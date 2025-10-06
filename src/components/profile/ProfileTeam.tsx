import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const ProfileTeam = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emprendimientoId, setEmprendimientoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    equipo_total: 0,
    personas_full_time: 0,
    fundadoras: 0,
    colaboradoras: 0,
    colaboradores_jovenes: 0,
    equipo_tecnico: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
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

      // Obtener información del equipo
      const { data, error } = await supabase
        .from("equipos")
        .select("*")
        .eq("emprendimiento_id", emprendimiento.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          equipo_total: data.equipo_total || 0,
          personas_full_time: data.personas_full_time || 0,
          fundadoras: data.fundadoras || 0,
          colaboradoras: data.colaboradoras || 0,
          colaboradores_jovenes: data.colaboradores_jovenes || 0,
          equipo_tecnico: data.equipo_tecnico || false,
        });
      }
    } catch (error) {
      console.error("Error fetching team:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del equipo",
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
        .from("equipos")
        .upsert(updateData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Información del equipo actualizada correctamente",
      });
    } catch (error) {
      console.error("Error saving team:", error);
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
        <CardTitle>Equipo de Trabajo</CardTitle>
        <CardDescription>Información sobre tu equipo emprendedor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="equipo-total">Equipo Total</Label>
            <Input 
              id="equipo-total" 
              type="number" 
              placeholder="0"
              value={formData.equipo_total}
              onChange={(e) => setFormData({ ...formData, equipo_total: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full-time">Personas Full Time</Label>
            <Input 
              id="full-time" 
              type="number" 
              placeholder="0"
              value={formData.personas_full_time}
              onChange={(e) => setFormData({ ...formData, personas_full_time: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fundadoras">Fundadoras</Label>
            <Input 
              id="fundadoras" 
              type="number" 
              placeholder="0"
              value={formData.fundadoras}
              onChange={(e) => setFormData({ ...formData, fundadoras: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="colaboradoras">Colaboradoras</Label>
            <Input 
              id="colaboradoras" 
              type="number" 
              placeholder="0"
              value={formData.colaboradoras}
              onChange={(e) => setFormData({ ...formData, colaboradoras: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jovenes">Colaboradores Jóvenes</Label>
            <Input 
              id="jovenes" 
              type="number" 
              placeholder="0"
              value={formData.colaboradores_jovenes}
              onChange={(e) => setFormData({ ...formData, colaboradores_jovenes: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="flex items-start space-x-3 pt-4">
          <Checkbox 
            id="equipo-tecnico"
            checked={formData.equipo_tecnico}
            onCheckedChange={(checked) => setFormData({ ...formData, equipo_tecnico: checked as boolean })}
          />
          <div className="space-y-1">
            <Label htmlFor="equipo-tecnico" className="text-sm font-medium">
              ¿Tienes equipo técnico?
            </Label>
            <p className="text-sm text-muted-foreground">
              Marca si cuentas con desarrolladores o equipo técnico especializado
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={fetchTeam}>
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