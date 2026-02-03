import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Upload, X, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ModuleEditorProps {
  modulo?: {
    id: string;
    titulo: string;
    descripcion: string;
    duracion: string;
    orden: number;
    activo: boolean;
    imagen_url: string;
    nivel: string | null;
  };
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export const ModuleEditor = ({ modulo, onSuccess, trigger }: ModuleEditorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mentores, setMentores] = useState<Array<{ id: string; nombres: string; apellidos: string }>>([]);
  const [selectedMentores, setSelectedMentores] = useState<string[]>([]);
  const [loadingMentores, setLoadingMentores] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    titulo: string;
    descripcion: string;
    duracion: string;
    orden: number;
    activo: boolean;
    imagen_url: string;
    nivel: "Starter" | "Growth" | "Scale";
  }>({
    titulo: "",
    descripcion: "",
    duracion: "",
    orden: 0,
    activo: true,
    imagen_url: "",
    nivel: "Starter",
  });

  useEffect(() => {
    if (modulo) {
      setFormData({
        titulo: modulo.titulo,
        descripcion: modulo.descripcion || "",
        duracion: modulo.duracion || "",
        orden: modulo.orden || 0,
        activo: modulo.activo,
        imagen_url: modulo.imagen_url || "",
        nivel: (modulo.nivel as "Starter" | "Growth" | "Scale") || "Starter",
      });
      setImagePreview(modulo.imagen_url || null);
      loadMentoresAsignados();
    }
  }, [modulo]);

  useEffect(() => {
    loadMentores();
  }, []);

  const loadMentores = async () => {
    setLoadingMentores(true);
    try {
      const { data: mentoresData, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          usuarios!inner(id, nombres, apellidos)
        `)
        .eq("role", "mentor");

      if (error) throw error;

      const mentoresList = mentoresData.map((item: any) => ({
        id: item.usuarios.id,
        nombres: item.usuarios.nombres || "",
        apellidos: item.usuarios.apellidos || "",
      }));

      setMentores(mentoresList);
    } catch (error: any) {
      console.error("Error cargando mentores:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los mentores",
        variant: "destructive",
      });
    } finally {
      setLoadingMentores(false);
    }
  };

  const loadMentoresAsignados = async () => {
    if (!modulo) return;
    
    try {
      const { data, error } = await supabase
        .from("asignaciones_mentor")
        .select("mentor_id")
        .eq("modulo_id", modulo.id)
        .eq("puede_editar", true);

      if (error) throw error;
      
      setSelectedMentores(data.map((item) => item.mentor_id));
    } catch (error: any) {
      console.error("Error cargando mentores asignados:", error);
    }
  };

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
      const filePath = `modulos/${fileName}`;

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
      
      const dataToSave = {
        ...formData,
        imagen_url: imageUrl || formData.imagen_url,
      };

      let moduloId = modulo?.id;

      if (modulo) {
        // Actualizar módulo existente
        const { error } = await supabase
          .from("modulos")
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("id", modulo.id);

        if (error) throw error;
      } else {
        // Crear nuevo módulo
        const { data: newModulo, error } = await supabase
          .from("modulos")
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        moduloId = newModulo.id;
      }

      // Actualizar asignaciones de mentores
      if (moduloId) {
        // Eliminar asignaciones existentes
        await supabase
          .from("asignaciones_mentor")
          .delete()
          .eq("modulo_id", moduloId);

        // Crear nuevas asignaciones
        if (selectedMentores.length > 0) {
          const asignaciones = selectedMentores.map((mentorId) => ({
            modulo_id: moduloId,
            mentor_id: mentorId,
            puede_editar: true,
          }));

          const { error: asignacionError } = await supabase
            .from("asignaciones_mentor")
            .insert(asignaciones);

          if (asignacionError) throw asignacionError;
        }
      }

      toast({
        title: modulo ? "Módulo actualizado" : "Módulo creado",
        description: modulo ? "El módulo se actualizó correctamente" : "El módulo se creó correctamente",
      });

      setOpen(false);
      onSuccess();
      
      if (!modulo) {
        setFormData({
          titulo: "",
          descripcion: "",
          duracion: "",
          orden: 0,
          activo: true,
          imagen_url: "",
          nivel: "Starter",
        });
        setImageFile(null);
        setImagePreview(null);
        setSelectedMentores([]);
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

  const toggleMentor = (mentorId: string) => {
    setSelectedMentores((prev) =>
      prev.includes(mentorId)
        ? prev.filter((id) => id !== mentorId)
        : [...prev, mentorId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Módulo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modulo ? "Editar Módulo" : "Crear Nuevo Módulo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
              placeholder="Título del módulo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción del módulo"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duracion">Duración</Label>
              <Input
                id="duracion"
                value={formData.duracion}
                onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
                placeholder="Ej: 4 semanas"
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

          {/* Campo de carga de imagen */}
          <div className="space-y-2">
            <Label>Imagen del módulo</Label>
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
                    Haz clic para subir una imagen
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

          <div className="space-y-2">
            <Label htmlFor="imagen_url">O URL de imagen</Label>
            <Input
              id="imagen_url"
              type="url"
              value={formData.imagen_url}
              onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nivel">Nivel del Módulo *</Label>
            <Select value={formData.nivel} onValueChange={(value) => setFormData({ ...formData, nivel: value as "Starter" | "Growth" | "Scale" })}>
              <SelectTrigger id="nivel">
                <SelectValue placeholder="Selecciona un nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Starter">Starter</SelectItem>
                <SelectItem value="Growth">Growth</SelectItem>
                <SelectItem value="Scale">Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <Label htmlFor="activo">Visible para beneficiarios</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-8">
              {formData.activo 
                ? "Los beneficiarios con cupo aprobado podrán ver este módulo" 
                : "Este módulo estará oculto para los beneficiarios aunque tengan cupo aprobado"}
            </p>
          </div>

          {/* Sección de Mentores Creadores */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <Label className="text-base font-semibold">Mentores Creadores</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Selecciona los mentores que podrán crear y editar clases en este módulo
            </p>
            
            {loadingMentores ? (
              <div className="text-sm text-muted-foreground">Cargando mentores...</div>
            ) : mentores.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay mentores disponibles</div>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-3">
                <div className="space-y-3">
                  {mentores.map((mentor) => (
                    <div key={mentor.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`mentor-${mentor.id}`}
                        checked={selectedMentores.includes(mentor.id)}
                        onCheckedChange={() => toggleMentor(mentor.id)}
                      />
                      <Label
                        htmlFor={`mentor-${mentor.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {mentor.nombres} {mentor.apellidos}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {selectedMentores.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedMentores.length} mentor{selectedMentores.length > 1 ? "es" : ""} seleccionado{selectedMentores.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : modulo ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
