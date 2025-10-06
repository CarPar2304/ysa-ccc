import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ProfileGuardian = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [esMenor, setEsMenor] = useState(false);
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    celular: "",
    relacion_con_menor: "",
    tipo_documento: "",
    numero_identificacion: "",
    genero: "",
    direccion: "",
    ano_nacimiento: "",
    identificacion_etnica: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    checkIfMinor();
  }, []);

  const checkIfMinor = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("menor_de_edad")
        .eq("id", user.id)
        .single();

      if (usuario?.menor_de_edad) {
        setEsMenor(true);
        await fetchGuardianData(user.id);
      }
    } catch (error) {
      console.error("Error checking minor status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuardianData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("acudientes")
        .select("*")
        .eq("menor_id", userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          nombres: data.nombres || "",
          apellidos: data.apellidos || "",
          email: data.email || "",
          celular: data.celular || "",
          relacion_con_menor: data.relacion_con_menor || "",
          tipo_documento: data.tipo_documento || "",
          numero_identificacion: data.numero_identificacion || "",
          genero: data.genero || "",
          direccion: data.direccion || "",
          ano_nacimiento: data.ano_nacimiento || "",
          identificacion_etnica: data.identificacion_etnica || "",
        });
      }
    } catch (error) {
      console.error("Error fetching guardian data:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData: any = {
        menor_id: user.id,
        ...formData,
      };

      const { error } = await supabase
        .from("acudientes")
        .upsert(updateData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Información del acudiente actualizada correctamente",
      });
    } catch (error) {
      console.error("Error saving guardian data:", error);
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

  if (!esMenor) {
    return (
      <Card className="shadow-medium border-border">
        <CardContent className="pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta sección solo es visible para usuarios menores de edad.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle>Información del Acudiente</CardTitle>
        <CardDescription>Datos del responsable o acudiente</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="acudiente-nombres">Nombres</Label>
            <Input 
              id="acudiente-nombres" 
              placeholder="Nombres del acudiente"
              value={formData.nombres}
              onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acudiente-apellidos">Apellidos</Label>
            <Input 
              id="acudiente-apellidos" 
              placeholder="Apellidos del acudiente"
              value={formData.apellidos}
              onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tipo-documento">Tipo de Documento</Label>
            <Select
              value={formData.tipo_documento}
              onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cc">Cédula de Ciudadanía</SelectItem>
                <SelectItem value="ti">Tarjeta de Identidad</SelectItem>
                <SelectItem value="ce">Cédula de Extranjería</SelectItem>
                <SelectItem value="pasaporte">Pasaporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero-documento">Número de Documento</Label>
            <Input 
              id="numero-documento"
              value={formData.numero_identificacion}
              onChange={(e) => setFormData({ ...formData, numero_identificacion: e.target.value })}
              placeholder="123456789"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="acudiente-email">Email</Label>
            <Input 
              id="acudiente-email" 
              type="email" 
              placeholder="email@ejemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acudiente-celular">Celular</Label>
            <Input 
              id="acudiente-celular" 
              placeholder="+57 300 123 4567"
              value={formData.celular}
              onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="acudiente-relacion">Relación con el menor</Label>
          <Input 
            id="acudiente-relacion" 
            placeholder="Ej: Padre, Madre, Tutor legal"
            value={formData.relacion_con_menor}
            onChange={(e) => setFormData({ ...formData, relacion_con_menor: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => checkIfMinor()}>
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