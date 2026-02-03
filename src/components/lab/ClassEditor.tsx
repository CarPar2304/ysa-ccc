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
    recursos_url: { titulo: string; url: string }[];
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

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [contenido, setContenido] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("");
  const [orden, setOrden] = useState("");
  const [recursos, setRecursos] = useState<{ titulo: string; url: string }[]>([]);

  useEffect(() => {
    if (clase) {
      setTitulo(clase.titulo);
      setDescripcion(clase.descripcion || "");
      setContenido(clase.contenido || "");
      setVideoUrl(clase.video_url || "");
      setImagenUrl(clase.imagen_url || "");
      setDuracionMinutos(clase.duracion_minutos?.toString() || "");
      setOrden(clase.orden?.toString() || "");
      setRecursos(clase.recursos_url || []);
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
    setImagenUrl("");
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imagenUrl || null;

    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `clases/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lab-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('lab-images')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error('No se pudo obtener la URL pública de la imagen');
      }

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
      const finalImagenUrl = await uploadImage();

      if (clase) {
        const { error } = await supabase
          .from("clases")
          .update({
            titulo,
            descripcion: descripcion || null,
            contenido: contenido || null,
            video_url: videoUrl || null,
            duracion_minutos: duracionMinutos ? parseInt(duracionMinutos) : null,
            recursos_url: recursos.length > 0 ? recursos : null,
            imagen_url: finalImagenUrl || null,
            orden: orden ? parseInt(orden) : null,
          })
          .eq("id", clase.id);

        if (error) throw error;

        toast({
          title: "Clase actualizada",
          description: "La clase se actualizó correctamente",
        });
      } else {
        const { data, error } = await supabase
          .from("clases")
          .insert({
            modulo_id: moduloId,
            titulo,
            descripcion: descripcion || null,
            contenido: contenido || null,
            video_url: videoUrl || null,
            duracion_minutos: duracionMinutos ? parseInt(duracionMinutos) : null,
            recursos_url: recursos.length > 0 ? recursos : null,
            imagen_url: finalImagenUrl || null,
            orden: orden ? parseInt(orden) : null,
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Clase creada",
          description: "La clase se creó correctamente",
        });
      }

      setTitulo("");
      setDescripcion("");
      setContenido("");
      setVideoUrl("");
      setImagenUrl("");
      setDuracionMinutos("");
      setOrden("");
      setRecursos([]);
      setImageFile(null);
      setImagePreview(null);
      setOpen(false);
      onSuccess();
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
            <Plus className="mr-2 h-4 w-4" />
            Nueva Clase
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clase ? "Editar Clase" : "Nueva Clase"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenido">Contenido (Markdown)</Label>
            <Textarea
              id="contenido"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url">URL del Video</Label>
            <Input
              id="video_url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/..."
            />
          </div>

          <div className="space-y-2">
            <Label>Imagen/Miniatura</Label>
            <div className="space-y-2">
              {imagePreview && (
                <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
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
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duracion">Duración (minutos)</Label>
              <Input
                id="duracion"
                type="number"
                value={duracionMinutos}
                onChange={(e) => setDuracionMinutos(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orden">Orden</Label>
              <Input
                id="orden"
                type="number"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recursos</Label>
            <div className="space-y-2">
              {recursos.map((recurso, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Título del recurso"
                    value={recurso.titulo}
                    onChange={(e) => {
                      const newRecursos = [...recursos];
                      newRecursos[index].titulo = e.target.value;
                      setRecursos(newRecursos);
                    }}
                  />
                  <Input
                    placeholder="URL del recurso"
                    value={recurso.url}
                    onChange={(e) => {
                      const newRecursos = [...recursos];
                      newRecursos[index].url = e.target.value;
                      setRecursos(newRecursos);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecursos(recursos.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecursos([...recursos, { titulo: "", url: "" }])}
              >
                + Agregar recurso
              </Button>
            </div>
          </div>

          <Button type="submit" disabled={loading || uploading} className="w-full">
            {loading || uploading
              ? "Guardando..."
              : clase
              ? "Actualizar Clase"
              : "Crear Clase"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
