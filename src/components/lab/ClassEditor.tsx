import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Upload, X } from "lucide-react";

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
    imagen_url?: string;
  };
  moduloId: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export const ClassEditor = ({ clase, moduloId, onSuccess, trigger }: ClassEditorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    contenido: "",
    video_url: "",
    imagen_url: "",
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
        imagen_url: clase.imagen_url || "",
        duracion_minutos: clase.duracion_minutos || 0,
        orden: clase.orden || 0,
        recursos_url: clase.recursos_url?.join(", ") || "",
      });
      setImagePreview(clase.imagen_url || null);
    }
  }, [clase]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, imagen_url: "" });
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.imagen_url || null;

    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `clases/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lab-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('lab-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: "Error al subir imagen",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Subir imagen si hay una nueva
      const imageUrl = await uploadImage();

      const recursos = formData.recursos_url
        .split(",")
        .map((url) => url.trim())
        .filter((url) => url);

      const dataToSave = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        contenido: formData.contenido,
        video_url: formData.video_url,
        imagen_url: imageUrl || formData.imagen_url,
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
          imagen_url: "",
          duracion_minutos: 0,
          orden: 0,
          recursos_url: "",
        });
        setImageFile(null);
        setImagePreview(null);
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

          {/* Campo de carga de imagen */}
          <div className="space-y-2">
            <Label>Miniatura de la clase</Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-md border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <span className="text-sm text-primary hover:underline">
                    Haz clic para subir una miniatura
                  </span>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WEBP hasta 5MB
                </p>
              </div>
            )}
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
