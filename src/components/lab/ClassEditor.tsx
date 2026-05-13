import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Plus, Upload, X, Link, FileUp, Video, MapPin, Globe, CalendarPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InlineDatePicker } from "@/components/calendario/InlineDatePicker";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/uploadImage";

interface Recurso {
  titulo: string;
  url: string;
  tipo?: "link" | "archivo";
}

interface ClassEditorProps {
  clase?: {
    id: string;
    titulo: string;
    descripcion: string;
    contenido: string;
    video_url: string;
    duracion_minutos: number;
    orden: number;
    recursos_url: Recurso[];
    imagen_url?: string;
    cohorte?: number[];
    fecha?: string;
    hora_inicio?: string;
    hora_fin?: string;
    modalidad?: string;
    lugar?: string;
    link_virtual?: string;
  };
  moduloId: string;
  nivelModulo?: string | null;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export const ClassEditor = ({ clase, moduloId, nivelModulo, onSuccess, trigger }: ClassEditorProps) => {
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
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [uploadingRecurso, setUploadingRecurso] = useState<number | null>(null);
  const [cohortes, setCohortes] = useState<number[]>([1]);
  const [fechaClase, setFechaClase] = useState("");
  const [horaInicioClase, setHoraInicioClase] = useState("");
  const [horaFinClase, setHoraFinClase] = useState("");
  const [modalidadClase, setModalidadClase] = useState("virtual");
  const [lugarClase, setLugarClase] = useState("");
  const [linkVirtualClase, setLinkVirtualClase] = useState("");
  const [icalFile, setIcalFile] = useState<File | null>(null);
  const [icalUrl, setIcalUrl] = useState<string>("");
  const [uploadingIcal, setUploadingIcal] = useState(false);
  const MODALIDAD_OPTIONS = [
    { value: "virtual", label: "Virtual", icon: Video },
    { value: "presencial", label: "Presencial", icon: MapPin },
    { value: "hibrido", label: "Híbrido", icon: Globe },
  ];

  const isScale = nivelModulo === "Scale";

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
      setCohortes(clase.cohorte || [1]);
      setFechaClase(clase.fecha || "");
      setHoraInicioClase(clase.hora_inicio || "");
      setHoraFinClase(clase.hora_fin || "");
      setModalidadClase(clase.modalidad || "virtual");
      setLugarClase(clase.lugar || "");
      setLinkVirtualClase(clase.link_virtual || "");
      setIcalUrl((clase as any).archivo_ical_url || "");
      setIcalFile(null);
    }
  }, [clase]);

  // For Scale, always force cohorte 1
  useEffect(() => {
    if (isScale) {
      setCohortes([1]);
    }
  }, [isScale]);

  const toggleCohorte = (c: number) => {
    setCohortes(prev => {
      if (prev.includes(c)) {
        const next = prev.filter(x => x !== c);
        return next.length === 0 ? [c] : next; // at least one must be selected
      }
      return [...prev, c].sort();
    });
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
    setImagenUrl("");
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imagenUrl || null;

    setUploading(true);
    try {
      const compressed = await compressImage(imageFile, 1600, 0.82);
      const fileExt = compressed.name.split('.').pop()?.toLowerCase();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `clases/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lab-images')
        .upload(filePath, compressed, {
          cacheControl: '31536000',
          upsert: false,
          contentType: compressed.type,
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

  const uploadIcalFile = async (): Promise<string | null> => {
    if (!icalFile) return icalUrl || null;
    setUploadingIcal(true);
    try {
      const fileName = `${crypto.randomUUID()}.ics`;
      const filePath = `ical/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("General")
        .upload(filePath, icalFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      // Store the path, not a public URL (General bucket is private)
      return filePath;
    } catch (err: any) {
      toast({ title: "Error al subir archivo .ics", description: err.message, variant: "destructive" });
      return icalUrl || null;
    } finally {
      setUploadingIcal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalImagenUrl = await uploadImage();
      const finalIcalUrl = await uploadIcalFile();

      if (clase) {
        const { error } = await supabase
          .from("clases")
          .update({
            titulo,
            descripcion: descripcion || null,
            contenido: contenido || null,
            video_url: videoUrl || null,
            duracion_minutos: duracionMinutos ? parseInt(duracionMinutos) : null,
            recursos_url: recursos.length > 0 ? (recursos as unknown as Json[]) : null,
            imagen_url: finalImagenUrl || null,
            orden: orden ? parseInt(orden) : null,
            cohorte: cohortes,
            fecha: fechaClase || null,
            hora_inicio: horaInicioClase || null,
            hora_fin: horaFinClase || null,
            modalidad: modalidadClase || null,
            lugar: (modalidadClase === "presencial" || modalidadClase === "hibrido") ? lugarClase || null : null,
            link_virtual: (modalidadClase === "virtual" || modalidadClase === "hibrido") ? linkVirtualClase || null : null,
            archivo_ical_url: finalIcalUrl,
          } as any)
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
            recursos_url: recursos.length > 0 ? (recursos as unknown as Json[]) : null,
            imagen_url: finalImagenUrl || null,
            orden: orden ? parseInt(orden) : null,
            cohorte: cohortes,
            fecha: fechaClase || null,
            hora_inicio: horaInicioClase || null,
            hora_fin: horaFinClase || null,
            modalidad: modalidadClase || null,
            lugar: (modalidadClase === "presencial" || modalidadClase === "hibrido") ? lugarClase || null : null,
            link_virtual: (modalidadClase === "virtual" || modalidadClase === "hibrido") ? linkVirtualClase || null : null,
            archivo_ical_url: finalIcalUrl,
          } as any)
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
      setCohortes([1]);
      setFechaClase("");
      setHoraInicioClase("");
      setHoraFinClase("");
      setModalidadClase("virtual");
      setLugarClase("");
      setLinkVirtualClase("");
      setIcalFile(null);
      setIcalUrl("");
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

          {/* Cohorte selector */}
          <div className="space-y-2">
            <Label>Cohorte</Label>
            {isScale ? (
              <p className="text-sm text-muted-foreground">Scale: Cohorte 1 (única)</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cohorte-1"
                    checked={cohortes.includes(1)}
                    onCheckedChange={() => toggleCohorte(1)}
                  />
                  <Label htmlFor="cohorte-1" className="text-sm font-normal">Cohorte 1</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cohorte-2"
                    checked={cohortes.includes(2)}
                    onCheckedChange={() => toggleCohorte(2)}
                  />
                  <Label htmlFor="cohorte-2" className="text-sm font-normal">Cohorte 2</Label>
                </div>
              </div>
            )}
          </div>

          {/* Programación para el calendario */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              📅 Programación (Calendario)
            </Label>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
              <InlineDatePicker
                value={fechaClase}
                onChange={setFechaClase}
                label="Fecha de la clase"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Hora inicio</label>
                  <Input
                    type="time"
                    value={horaInicioClase}
                    onChange={(e) => setHoraInicioClase(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Hora fin</label>
                  <Input
                    type="time"
                    value={horaFinClase}
                    onChange={(e) => setHoraFinClase(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Modalidad */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Modalidad</label>
                <div className="grid grid-cols-3 gap-2">
                  {MODALIDAD_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setModalidadClase(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-all duration-150",
                          modalidadClase === opt.value
                            ? "border-primary bg-accent text-accent-foreground shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-ring/40 hover:bg-accent/30"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(modalidadClase === "presencial" || modalidadClase === "hibrido") && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Lugar</label>
                  <Input
                    value={lugarClase}
                    onChange={(e) => setLugarClase(e.target.value)}
                    placeholder="Dirección o nombre del lugar"
                    className="h-9"
                  />
                </div>
              )}
              {(modalidadClase === "virtual" || modalidadClase === "hibrido") && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Link virtual</label>
                  <Input
                    value={linkVirtualClase}
                    onChange={(e) => setLinkVirtualClase(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="h-9"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recursos</Label>
            <div className="space-y-3">
              {recursos.map((recurso, index) => (
                <div key={index} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Título del recurso"
                      value={recurso.titulo}
                      onChange={(e) => {
                        const newRecursos = [...recursos];
                        newRecursos[index] = { ...newRecursos[index], titulo: e.target.value };
                        setRecursos(newRecursos);
                      }}
                      className="flex-1"
                    />
                    <Select
                      value={recurso.tipo || "link"}
                      onValueChange={(val: "link" | "archivo") => {
                        const newRecursos = [...recursos];
                        newRecursos[index] = { ...newRecursos[index], tipo: val, url: "" };
                        setRecursos(newRecursos);
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">
                          <span className="flex items-center gap-1"><Link className="h-3 w-3" /> Link</span>
                        </SelectItem>
                        <SelectItem value="archivo">
                          <span className="flex items-center gap-1"><FileUp className="h-3 w-3" /> Archivo</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRecursos(recursos.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {(recurso.tipo || "link") === "link" ? (
                    <Input
                      placeholder="https://..."
                      value={recurso.url}
                      onChange={(e) => {
                        const newRecursos = [...recursos];
                        newRecursos[index] = { ...newRecursos[index], url: e.target.value };
                        setRecursos(newRecursos);
                      }}
                    />
                  ) : (
                    <div className="space-y-1">
                      {recurso.url ? (
                        <p className="text-xs text-muted-foreground truncate">✅ Archivo cargado</p>
                      ) : null}
                      <Input
                        type="file"
                        disabled={uploadingRecurso === index}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingRecurso(index);
                          try {
                            const fileExt = file.name.split('.').pop()?.toLowerCase();
                            const fileName = `${crypto.randomUUID()}.${fileExt}`;
                            const filePath = `recursos/${fileName}`;
                            const { error: upErr } = await supabase.storage
                              .from('lab-images')
                              .upload(filePath, file, { cacheControl: '3600', upsert: false });
                            if (upErr) throw upErr;
                            const { data } = supabase.storage.from('lab-images').getPublicUrl(filePath);
                            const newRecursos = [...recursos];
                            newRecursos[index] = {
                              ...newRecursos[index],
                              url: data.publicUrl,
                              titulo: newRecursos[index].titulo || file.name,
                            };
                            setRecursos(newRecursos);
                            toast({ title: "Archivo subido correctamente" });
                          } catch (err: any) {
                            toast({ title: "Error al subir archivo", description: err.message, variant: "destructive" });
                          } finally {
                            setUploadingRecurso(null);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecursos([...recursos, { titulo: "", url: "", tipo: "link" }])}
              >
                + Agregar recurso
              </Button>
            </div>
          </div>

          {/* Archivo .ics */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarPlus className="h-3.5 w-3.5" />
              Archivo de calendario (.ics)
            </Label>
            <p className="text-xs text-muted-foreground">
              Sube un archivo .ics para que los estudiantes puedan agregar esta clase a su calendario.
            </p>
            {icalUrl && !icalFile && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded-md">
                <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1">Archivo .ics cargado</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIcalUrl("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <Input
              type="file"
              accept=".ics,.ical"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setIcalFile(file);
              }}
              className="h-9"
            />
          </div>

          <Button type="submit" disabled={loading || uploading || uploadingIcal} className="w-full">
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
