import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export const ProfileEntrepreneurship = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    industria_vertical: "",
    etapa: "",
    categoria: "",
    alcance_mercado: "",
    tipo_cliente: "",
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData: any = {
        user_id: user.id,
        ...formData,
      };

      const { error } = await supabase
        .from("emprendimientos")
        .upsert(updateData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Información del emprendimiento actualizada correctamente",
      });
    } catch (error) {
      console.error("Error saving entrepreneurship:", error);
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
        <CardTitle>Información del Emprendimiento</CardTitle>
        <CardDescription>Detalles sobre tu proyecto o startup</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre-emprendimiento">Nombre del Emprendimiento</Label>
          <Input 
            id="nombre-emprendimiento" 
            placeholder="Nombre de tu proyecto"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea 
            id="descripcion" 
            placeholder="Describe tu emprendimiento..."
            className="min-h-[100px]"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="industria">Industria o Vertical</Label>
            <Input 
              id="industria" 
              placeholder="Ej: Tecnología, Salud"
              value={formData.industria_vertical}
              onChange={(e) => setFormData({ ...formData, industria_vertical: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etapa">Etapa</Label>
            <Select
              value={formData.etapa}
              onValueChange={(value) => setFormData({ ...formData, etapa: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ideacion">Ideación</SelectItem>
                <SelectItem value="validacion">Validación</SelectItem>
                <SelectItem value="escalamiento_temprano">Escalamiento Temprano</SelectItem>
                <SelectItem value="escalamiento">Escalamiento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Select
              value={formData.categoria}
              onValueChange={(value) => setFormData({ ...formData, categoria: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="producto">Producto</SelectItem>
                <SelectItem value="servicio">Servicio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="alcance">Alcance de Mercado</Label>
            <Select
              value={formData.alcance_mercado}
              onValueChange={(value) => setFormData({ ...formData, alcance_mercado: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona alcance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="nacional">Nacional</SelectItem>
                <SelectItem value="internacional">Internacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={fetchEntrepreneurship}>
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