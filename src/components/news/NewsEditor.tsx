import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil } from "lucide-react";

interface NewsEditorProps {
  noticia?: {
    id: string;
    titulo: string;
    descripcion: string;
    contenido: string;
    categoria: string;
    imagen_url: string;
    publicado: boolean;
  };
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export const NewsEditor = ({ noticia, onSuccess, trigger }: NewsEditorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    contenido: "",
    categoria: "",
    imagen_url: "",
    publicado: false,
  });

  useEffect(() => {
    if (noticia) {
      setFormData({
        titulo: noticia.titulo,
        descripcion: noticia.descripcion || "",
        contenido: noticia.contenido || "",
        categoria: noticia.categoria || "",
        imagen_url: noticia.imagen_url || "",
        publicado: noticia.publicado,
      });
    }
  }, [noticia]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "Debes estar autenticado",
          variant: "destructive",
        });
        return;
      }

      if (noticia) {
        // Actualizar noticia existente
        const { error } = await supabase
          .from("noticias")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", noticia.id);

        if (error) throw error;

        toast({
          title: "Noticia actualizada",
          description: "La noticia se actualizó correctamente",
        });
      } else {
        // Crear nueva noticia
        const { error } = await supabase
          .from("noticias")
          .insert({
            ...formData,
            autor_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Noticia creada",
          description: "La noticia se creó correctamente",
        });
      }

      setOpen(false);
      onSuccess();
      
      if (!noticia) {
        setFormData({
          titulo: "",
          descripcion: "",
          contenido: "",
          categoria: "",
          imagen_url: "",
          publicado: false,
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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Noticia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{noticia ? "Editar Noticia" : "Crear Nueva Noticia"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
              placeholder="Título de la noticia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Input
              id="categoria"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              placeholder="Ej: Tecnología, Emprendimiento, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Breve descripción de la noticia"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenido">Contenido</Label>
            <Textarea
              id="contenido"
              value={formData.contenido}
              onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
              placeholder="Contenido completo de la noticia"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagen_url">URL de Imagen</Label>
            <Input
              id="imagen_url"
              type="url"
              value={formData.imagen_url}
              onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="publicado"
              checked={formData.publicado}
              onCheckedChange={(checked) => setFormData({ ...formData, publicado: checked })}
            />
            <Label htmlFor="publicado">Publicar noticia</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : noticia ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
