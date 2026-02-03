import { useState } from "react";
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
import { Plus, Pencil, Loader2 } from "lucide-react";

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  num_documentos: number;
  fecha_limite: string;
  activo: boolean;
}

interface TaskEditorProps {
  moduloId: string;
  tarea?: Tarea;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export const TaskEditor = ({ moduloId, tarea, onSuccess, trigger }: TaskEditorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState(tarea?.titulo || "");
  const [descripcion, setDescripcion] = useState(tarea?.descripcion || "");
  const [numDocumentos, setNumDocumentos] = useState(tarea?.num_documentos || 1);
  const [fechaLimite, setFechaLimite] = useState(
    tarea?.fecha_limite ? new Date(tarea.fecha_limite).toISOString().slice(0, 16) : ""
  );
  const [activo, setActivo] = useState(tarea?.activo ?? true);
  const { toast } = useToast();

  const isEditing = !!tarea;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const tareaData = {
        modulo_id: moduloId,
        titulo,
        descripcion: descripcion || null,
        num_documentos: numDocumentos,
        fecha_limite: new Date(fechaLimite).toISOString(),
        activo,
        created_by: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("tareas")
          .update({
            titulo,
            descripcion: descripcion || null,
            num_documentos: numDocumentos,
            fecha_limite: new Date(fechaLimite).toISOString(),
            activo,
          })
          .eq("id", tarea.id);

        if (error) throw error;

        toast({
          title: "Tarea actualizada",
          description: "La tarea se actualizó correctamente",
        });
      } else {
        const { error } = await supabase.from("tareas").insert(tareaData);

        if (error) throw error;

        toast({
          title: "Tarea creada",
          description: "La tarea se creó correctamente",
        });
      }

      setOpen(false);
      resetForm();
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

  const resetForm = () => {
    if (!isEditing) {
      setTitulo("");
      setDescripcion("");
      setNumDocumentos(1);
      setFechaLimite("");
      setActivo(true);
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
      <DialogContent className="sm:max-w-[500px]">
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
              rows={4}
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

            <div className="space-y-2">
              <Label htmlFor="fechaLimite">Fecha límite *</Label>
              <Input
                id="fechaLimite"
                type="datetime-local"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                required
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="rounded border-input"
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
