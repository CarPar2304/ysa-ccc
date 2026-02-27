import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { EntregaFileLink } from "./EntregaFileLink";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, FileText, X, CheckCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  num_documentos: number;
  documentos_obligatorios: boolean;
  fecha_limite: string;
}

interface Entrega {
  id: string;
  comentario: string | null;
  archivos_urls: { name: string; url: string }[];
  estado: string;
  feedback: string | null;
  nota: number | null;
  fecha_entrega: string;
}

interface TaskSubmissionProps {
  tarea: Tarea;
  entregaExistente?: Entrega | null;
  onSuccess: () => void;
}

export const TaskSubmission = ({ tarea, entregaExistente, onSuccess }: TaskSubmissionProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comentario, setComentario] = useState(entregaExistente?.comentario || "");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [archivosExistentes, setArchivosExistentes] = useState<{ name: string; url: string }[]>(
    entregaExistente?.archivos_urls || []
  );
  const { toast } = useToast();

  const isExpired = new Date(tarea.fecha_limite) < new Date();
  const hasSubmission = !!entregaExistente;

  useEffect(() => {
    if (entregaExistente) {
      setComentario(entregaExistente.comentario || "");
      setArchivosExistentes(entregaExistente.archivos_urls || []);
    }
  }, [entregaExistente]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalFiles = archivos.length + archivosExistentes.length + files.length;
    
    if (tarea.documentos_obligatorios && totalFiles > tarea.num_documentos) {
      toast({
        title: "Límite de archivos",
        description: `Solo puedes subir máximo ${tarea.num_documentos} archivo(s)`,
        variant: "destructive",
      });
      return;
    }
    
    setArchivos((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (index: number) => {
    setArchivosExistentes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalFiles = archivos.length + archivosExistentes.length;
    if (totalFiles === 0) {
      toast({
        title: "Error",
        description: "Debes subir al menos un archivo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Upload new files – store the storage path, not a public URL
      const uploadedFiles: { name: string; url: string }[] = [...archivosExistentes];

      for (const archivo of archivos) {
        const fileExt = archivo.name.split(".").pop();
        const fileName = `${user.id}/${tarea.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("entregas")
          .upload(fileName, archivo);

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          name: archivo.name,
          url: fileName, // store path, signed URL generated on access
        });
      }

      const entregaData = {
        tarea_id: tarea.id,
        user_id: user.id,
        comentario: comentario || null,
        archivos_urls: uploadedFiles,
        estado: "entregado",
      };

      if (hasSubmission) {
        const { error } = await supabase
          .from("entregas")
          .update({
            comentario: comentario || null,
            archivos_urls: uploadedFiles,
            fecha_entrega: new Date().toISOString(),
            estado: "entregado",
          })
          .eq("id", entregaExistente!.id);

        if (error) throw error;

        toast({
          title: "Entrega actualizada",
          description: "Tu entrega se actualizó correctamente",
        });
      } else {
        const { error } = await supabase.from("entregas").insert(entregaData);

        if (error) throw error;

        toast({
          title: "Tarea entregada",
          description: "Tu tarea se entregó correctamente",
        });
      }

      setOpen(false);
      setArchivos([]);
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

  const getStatusBadge = (estado: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      entregado: { variant: "secondary", label: "Entregado" },
      revisado: { variant: "outline", label: "En revisión" },
      aprobado: { variant: "default", label: "Aprobado" },
      rechazado: { variant: "destructive", label: "Rechazado" },
    };
    const config = statusConfig[estado] || statusConfig.entregado;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={hasSubmission ? "outline" : "default"} 
          size="sm" 
          className="gap-2"
          disabled={isExpired && !hasSubmission}
        >
          {hasSubmission ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Ver entrega
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Entregar
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{tarea.titulo}</DialogTitle>
          <DialogDescription>
            {hasSubmission ? "Tu entrega actual" : "Sube tus archivos para completar la tarea"}
          </DialogDescription>
        </DialogHeader>

        {hasSubmission && entregaExistente && (
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado:</span>
              {getStatusBadge(entregaExistente.estado)}
            </div>
            {entregaExistente.nota !== null && entregaExistente.nota !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nota:</span>
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" />
                  {entregaExistente.nota} / 5
                </Badge>
              </div>
            )}
            {entregaExistente.feedback && (
              <div className="space-y-1">
                <span className="text-sm font-medium">Feedback del mentor:</span>
                <p className="text-sm text-muted-foreground">{entregaExistente.feedback}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>
              Archivos ({archivosExistentes.length + archivos.length}/{tarea.documentos_obligatorios ? tarea.num_documentos : `${tarea.num_documentos} recomendados`})
            </Label>
            
            {/* Existing files */}
            {archivosExistentes.map((archivo, index) => (
              <div key={`existing-${index}`} className="flex items-center gap-2 p-2 bg-muted rounded">
                <EntregaFileLink
                  archivo={archivo}
                  className="text-sm flex-1 truncate hover:underline flex items-center gap-1.5 text-primary"
                />
                {!isExpired && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExistingFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {/* New files */}
            {archivos.map((archivo, index) => (
              <div key={`new-${index}`} className="flex items-center gap-2 p-2 bg-accent/20 rounded">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm flex-1 truncate">{archivo.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {!isExpired && (!tarea.documentos_obligatorios || archivosExistentes.length + archivos.length < tarea.num_documentos) && (
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="archivos"
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />
                <label
                  htmlFor="archivos"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Haz clic para subir archivos
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario">Comentario (opcional)</Label>
            <Textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Agrega un comentario sobre tu entrega..."
              rows={3}
              disabled={isExpired && hasSubmission}
            />
          </div>

          {isExpired && (
            <p className="text-sm text-destructive">
              La fecha límite ha pasado. No puedes modificar tu entrega.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            {!isExpired && (
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasSubmission ? "Actualizar entrega" : "Entregar tarea"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
