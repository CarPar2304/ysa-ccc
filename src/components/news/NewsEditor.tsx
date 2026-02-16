import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Upload, X, Loader2 as LoaderIcon } from "lucide-react";
import { MarkdownToolbar } from "./MarkdownToolbar";

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
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
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
      setImagePreview(noticia.imagen_url || null);
    }
  }, [noticia]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `noticias/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("lab-images").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("lab-images").getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, imagen_url: publicUrl }));
      setImagePreview(publicUrl);
    } catch (error: any) {
      toast({ title: "Error al subir imagen", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imagen_url: "" }));
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "Debes estar autenticado", variant: "destructive" });
        return;
      }

      if (noticia) {
        const { error } = await supabase
          .from("noticias")
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq("id", noticia.id);
        if (error) throw error;
        toast({ title: "Noticia actualizada" });
      } else {
        const { error } = await supabase
          .from("noticias")
          .insert({ ...formData, autor_id: user.id });
        if (error) throw error;
        toast({ title: "Noticia creada" });
      }

      setOpen(false);
      onSuccess();
      if (!noticia) {
        setFormData({ titulo: "", descripcion: "", contenido: "", categoria: "", imagen_url: "", publicado: false });
        setImagePreview(null);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
              placeholder="Ej: Tecnología, Emprendimiento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción breve</Label>
            <Input
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Resumen corto que aparece en la tarjeta"
            />
          </div>

          {/* Rich content editor */}
          <div className="space-y-1">
            <Label>Contenido</Label>
            <MarkdownToolbar
              textareaRef={contentRef as React.RefObject<HTMLTextAreaElement>}
              value={formData.contenido}
              onChange={(v) => setFormData({ ...formData, contenido: v })}
            />
            <textarea
              ref={contentRef}
              value={formData.contenido}
              onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
              placeholder="Escribe el contenido de la noticia con formato Markdown..."
              rows={10}
              className="flex w-full rounded-b-md border border-t-0 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
            />
            <p className="text-[11px] text-muted-foreground">Usa la barra de herramientas o escribe Markdown directamente.</p>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Imagen de portada</Label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-border" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleRemoveImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                {uploading ? (
                  <LoaderIcon className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Subir imagen de portada</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : noticia ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
