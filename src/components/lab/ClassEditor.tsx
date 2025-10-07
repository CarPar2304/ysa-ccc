import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

interface ClassEditorProps {
  clase?: {
    id: string;
    titulo: string;
    descripcion: string;
    contenido: string;
    video_url: string;
    duracion_minutos: number;
    orden: number;
    recursos_url: string[];
  };
  moduloId: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export const ClassEditor = ({ clase, moduloId, onSuccess, trigger }: ClassEditorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    contenido: "",
    video_url: "",
    duracion_minutos: 0,
    orden: 0,
    recursos_url: "",
  });

  useEffect(() => {
    if (clase) {
      setFormData({
        titulo: clase.titulo,
        descripcion: clase.descripcion || "",
        contenido: clase.contenido || "",
        video_url: clase.video_url || "",
        duracion_minutos: clase.duracion_minutos || 0,
        orden: clase.orden || 0,
        recursos_url: clase.recursos_url?.join(", ") || "",
      });
    }
  }, [clase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const recursos = formData.recursos_url
        .split(",")
        .map((url) => url.trim())
        .filter((url) => url);

      const dataToSave = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        contenido: formData.contenido,
        video_url: formData.video_url,
        duracion_minutos: formData.duracion_minutos,
        orden: formData.orden,
        recursos_url: recursos,
        modulo_id: moduloId,
      };

      if (clase) {
        // Actualizar clase existente
        const { error } = await supabase
          .from("clases")
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("id", clase.id);

        if (error) throw error;

        toast({
          title: "Clase actualizada",
          description: "La clase se actualizó correctamente",
        });
      } else {
        // Crear nueva clase
        const { error } = await supabase
          .from("clases")
          .insert(dataToSave);

        if (error) throw error;

        toast({
          title: "Clase creada",
          description: "La clase se creó correctamente",
        });
      }

      setOpen(false);
      onSuccess();
      
      if (!clase) {
        setFormData({
          titulo: "",
          descripcion: "",
          contenido: "",
          video_url: "",
          duracion_minutos: 0,
          orden: 0,
          recursos_url: "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Clase
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clase ? "Editar Clase" : "Crear Nueva Clase"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
              placeholder="Título de la clase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción de la clase"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenido">Contenido</Label>
            <Textarea
              id="contenido"
              value={formData.contenido}
              onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
              placeholder="Contenido completo de la clase"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url">URL de Video</Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://youtube.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duracion_minutos">Duración (minutos)</Label>
              <Input
                id="duracion_minutos"
                type="number"
                value={formData.duracion_minutos}
                onChange={(e) => setFormData({ ...formData, duracion_minutos: parseInt(e.target.value) })}
                placeholder="60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orden">Orden</Label>
              <Input
                id="orden"
                type="number"
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recursos_url">URLs de Recursos (separadas por coma)</Label>
            <Textarea
              id="recursos_url"
              value={formData.recursos_url}
              onChange={(e) => setFormData({ ...formData, recursos_url: e.target.value })}
              placeholder="https://recurso1.com, https://recurso2.com"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : clase ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
