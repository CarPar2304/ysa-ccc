import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Loader2, Upload, FileText, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  num_documentos: number;
  documentos_obligatorios: boolean;
  fecha_limite: string;
  fecha_inicio?: string | null;
  activo: boolean;
  documento_guia_url?: string | null;
}

interface TaskEditorProps {
  moduloId: string;
  tarea?: Tarea;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

/**
 * Format an ISO date string to a local date string for date input (YYYY-MM-DD).
 */
function toLocalDate(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format an ISO date string to a local time string (HH:MM) or empty if it's the default 23:59.
 */
function toLocalTime(isoString: string): string {
  const d = new Date(isoString);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  // If it's 23:59 (default), return empty to keep time toggle off
  if (hours === 23 && minutes === 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export const TaskEditor = ({ moduloId, tarea, onSuccess, trigger }: TaskEditorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState(tarea?.titulo || "");
  const [descripcion, setDescripcion] = useState(tarea?.descripcion || "");
  const [numDocumentos, setNumDocumentos] = useState(tarea?.num_documentos || 1);
  const [documentosObligatorios, setDocumentosObligatorios] = useState(tarea?.documentos_obligatorios ?? true);

  // Separate date and time for fecha_limite
  const [fechaLimiteDate, setFechaLimiteDate] = useState(
    tarea?.fecha_limite ? toLocalDate(tarea.fecha_limite) : ""
  );
  const [fechaLimiteTime, setFechaLimiteTime] = useState(
    tarea?.fecha_limite ? toLocalTime(tarea.fecha_limite) : ""
  );
  const [useLimiteTime, setUseLimiteTime] = useState(
    tarea?.fecha_limite ? toLocalTime(tarea.fecha_limite) !== "" : false
  );

  // Separate date and time for fecha_inicio
  const [fechaInicioDate, setFechaInicioDate] = useState(
    tarea?.fecha_inicio ? toLocalDate(tarea.fecha_inicio) : ""
  );
  const [fechaInicioTime, setFechaInicioTime] = useState(
    tarea?.fecha_inicio ? toLocalTime(tarea.fecha_inicio) : ""
  );
  const [useInicioTime, setUseInicioTime] = useState(
    tarea?.fecha_inicio ? toLocalTime(tarea.fecha_inicio) !== "" : false
  );

  const [activo, setActivo] = useState(tarea?.activo ?? true);
  const [guiaFile, setGuiaFile] = useState<File | null>(null);
  const [existingGuiaUrl, setExistingGuiaUrl] = useState(tarea?.documento_guia_url || null);
  const [removeGuia, setRemoveGuia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isEditing = !!tarea;

  /**
   * Combine a date string and optional time string into an ISO datetime.
   * If no time is provided, defaults to 23:59.
   */
  function combineDatetime(dateStr: string, timeStr: string, useTime: boolean): string {
    const time = useTime && timeStr ? timeStr : "23:59";
    const [hours, minutes] = time.split(":").map(Number);
    const d = new Date(dateStr);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }

  const uploadGuia = async (): Promise<string | null> => {
    if (!guiaFile) return null;
    const fileExt = guiaFile.name.split(".").pop();
    const fileName = `guias/${moduloId}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("lab-images").upload(fileName, guiaFile);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("lab-images").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      let guiaUrl: string | null | undefined = undefined;
      if (guiaFile) {
        guiaUrl = await uploadGuia();
      } else if (removeGuia) {
        guiaUrl = null;
      }

      const fechaLimiteISO = combineDatetime(fechaLimiteDate, fechaLimiteTime, useLimiteTime);
      const fechaInicioISO = fechaInicioDate
        ? combineDatetime(fechaInicioDate, fechaInicioTime, useInicioTime)
        : null;

      if (isEditing) {
        const updateData: any = {
          titulo,
          descripcion: descripcion || null,
          num_documentos: numDocumentos,
          documentos_obligatorios: documentosObligatorios,
          fecha_limite: fechaLimiteISO,
          fecha_inicio: fechaInicioISO,
          activo,
        };
        if (guiaUrl !== undefined) updateData.documento_guia_url = guiaUrl;

        const { error } = await supabase
          .from("tareas")
          .update(updateData)
          .eq("id", tarea.id);

        if (error) throw error;
        toast({ title: "Tarea actualizada", description: "La tarea se actualizó correctamente" });
      } else {
        const tareaData: any = {
          modulo_id: moduloId,
          titulo,
          descripcion: descripcion || null,
          num_documentos: numDocumentos,
          documentos_obligatorios: documentosObligatorios,
          fecha_limite: fechaLimiteISO,
          fecha_inicio: fechaInicioISO,
          activo,
          created_by: user.id,
        };
        if (guiaUrl) tareaData.documento_guia_url = guiaUrl;

        const { error } = await supabase.from("tareas").insert(tareaData);
        if (error) throw error;
        toast({ title: "Tarea creada", description: "La tarea se creó correctamente" });
      }

      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!isEditing) {
      setTitulo("");
      setDescripcion("");
      setNumDocumentos(1);
      setDocumentosObligatorios(true);
      setFechaLimiteDate("");
      setFechaLimiteTime("");
      setUseLimiteTime(false);
      setFechaInicioDate("");
      setFechaInicioTime("");
      setUseInicioTime(false);
      setActivo(true);
      setGuiaFile(null);
      setExistingGuiaUrl(null);
      setRemoveGuia(false);
    }
  };

  const handleGuiaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "Error", description: "El archivo no debe superar 20MB", variant: "destructive" });
        return;
      }
      setGuiaFile(file);
      setRemoveGuia(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Tarea
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los detalles de la tarea"
              : "Crea una nueva tarea para los beneficiarios del módulo"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título de la tarea"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Instrucciones y detalles de la tarea..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numDocumentos">Documentos requeridos</Label>
              <Input
                id="numDocumentos"
                type="number"
                min={1}
                max={10}
                value={numDocumentos}
                onChange={(e) => setNumDocumentos(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="flex items-center space-x-2 self-end pb-1">
              <input
                type="checkbox"
                id="documentosObligatorios"
                checked={documentosObligatorios}
                onChange={(e) => setDocumentosObligatorios(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="documentosObligatorios" className="text-xs">
                {documentosObligatorios ? "Obligatorio" : "Recomendado"}
              </Label>
            </div>
          </div>

          {/* Fecha de inicio */}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label className="text-sm font-medium">Fecha de inicio (opcional)</Label>
            <Input
              type="date"
              value={fechaInicioDate}
              onChange={(e) => setFechaInicioDate(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={useInicioTime}
                onCheckedChange={(val) => {
                  setUseInicioTime(val);
                  if (!val) setFechaInicioTime("");
                }}
                id="useInicioTime"
              />
              <Label htmlFor="useInicioTime" className="text-xs text-muted-foreground">
                Especificar hora {!useInicioTime && "(por defecto: 11:59 PM)"}
              </Label>
            </div>
            {useInicioTime && (
              <Input
                type="time"
                value={fechaInicioTime}
                onChange={(e) => setFechaInicioTime(e.target.value)}
              />
            )}
          </div>

          {/* Fecha de cierre */}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label className="text-sm font-medium">Fecha de cierre / límite *</Label>
            <Input
              type="date"
              value={fechaLimiteDate}
              onChange={(e) => setFechaLimiteDate(e.target.value)}
              required
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={useLimiteTime}
                onCheckedChange={(val) => {
                  setUseLimiteTime(val);
                  if (!val) setFechaLimiteTime("");
                }}
                id="useLimiteTime"
              />
              <Label htmlFor="useLimiteTime" className="text-xs text-muted-foreground">
                Especificar hora {!useLimiteTime && "(por defecto: 11:59 PM)"}
              </Label>
            </div>
            {useLimiteTime && (
              <Input
                type="time"
                value={fechaLimiteTime}
                onChange={(e) => setFechaLimiteTime(e.target.value)}
              />
            )}
          </div>

          {/* Documento guía */}
          <div className="space-y-2">
            <Label>Documento guía (opcional)</Label>
            {(existingGuiaUrl && !removeGuia && !guiaFile) ? (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md border border-border">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <a
                  href={existingGuiaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate flex-1"
                >
                  Documento guía actual
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => { setRemoveGuia(true); setExistingGuiaUrl(null); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : guiaFile ? (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md border border-border">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm truncate flex-1">{guiaFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => { setGuiaFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleGuiaSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Cargar documento guía
                </Button>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex items-center space-x-2">
              <Switch
                checked={activo}
                onCheckedChange={setActivo}
                id="activo"
              />
              <Label htmlFor="activo">Tarea activa</Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
