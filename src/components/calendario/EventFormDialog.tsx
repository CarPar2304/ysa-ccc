import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialDate?: Date;
  editEvent?: any;
}

const NIVELES = ["Starter", "Growth", "Scale"];
const COHORTES = [1, 2];

export function EventFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialDate,
  editEvent,
}: EventFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<string>("clase");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [modalidad, setModalidad] = useState<string>("virtual");
  const [lugar, setLugar] = useState("");
  const [linkVirtual, setLinkVirtual] = useState("");
  const [moduloId, setModuloId] = useState<string>("");
  const [nivelesAcceso, setNivelesAcceso] = useState<string[]>([]);
  const [cohortesAcceso, setCohortesAcceso] = useState<number[]>([]);
  const [modulos, setModulos] = useState<any[]>([]);
  const { toast } = useToast();

  const isEditing = !!editEvent;

  useEffect(() => {
    if (open) {
      fetchModulos();
      if (editEvent) {
        setTipo(editEvent.tipo);
        setTitulo(editEvent.titulo);
        setDescripcion(editEvent.descripcion || "");
        setFecha(editEvent.fecha);
        setHoraInicio(editEvent.hora_inicio || "");
        setHoraFin(editEvent.hora_fin || "");
        setModalidad(editEvent.modalidad || "virtual");
        setLugar(editEvent.lugar || "");
        setLinkVirtual(editEvent.link_virtual || "");
        setModuloId(editEvent.modulo_id || "");
        setNivelesAcceso(editEvent.niveles_acceso || []);
        setCohortesAcceso(editEvent.cohortes_acceso || []);
      } else {
        resetForm();
        if (initialDate) {
          setFecha(format(initialDate, "yyyy-MM-dd"));
        }
      }
    }
  }, [open, editEvent, initialDate]);

  const fetchModulos = async () => {
    const { data } = await supabase
      .from("modulos")
      .select("id, titulo, nivel")
      .order("orden");
    if (data) setModulos(data);
  };

  const resetForm = () => {
    setTipo("clase");
    setTitulo("");
    setDescripcion("");
    setFecha("");
    setHoraInicio("");
    setHoraFin("");
    setModalidad("virtual");
    setLugar("");
    setLinkVirtual("");
    setModuloId("");
    setNivelesAcceso([]);
    setCohortesAcceso([]);
  };

  const toggleNivel = (nivel: string) => {
    setNivelesAcceso((prev) =>
      prev.includes(nivel) ? prev.filter((n) => n !== nivel) : [...prev, nivel]
    );
  };

  const toggleCohorte = (cohorte: number) => {
    setCohortesAcceso((prev) =>
      prev.includes(cohorte) ? prev.filter((c) => c !== cohorte) : [...prev, cohorte]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const eventData = {
        tipo,
        titulo,
        descripcion: descripcion || null,
        fecha,
        hora_inicio: horaInicio || null,
        hora_fin: horaFin || null,
        modalidad: modalidad || null,
        lugar: (modalidad === "presencial" || modalidad === "hibrido") ? lugar || null : null,
        link_virtual: (modalidad === "virtual" || modalidad === "hibrido") ? linkVirtual || null : null,
        modulo_id: tipo === "clase" && moduloId ? moduloId : null,
        niveles_acceso: tipo === "evento" ? [] : nivelesAcceso,
        cohortes_acceso: tipo === "evento" ? [] : cohortesAcceso,
        created_by: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("eventos_calendario")
          .update(eventData)
          .eq("id", editEvent.id);
        if (error) throw error;
        toast({ title: "Evento actualizado" });
      } else {
        const { error } = await supabase
          .from("eventos_calendario")
          .insert(eventData);
        if (error) throw error;
        toast({ title: "Evento creado", description: `"${titulo}" se añadió al calendario` });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Evento" : "Nuevo Evento"}</DialogTitle>
          <DialogDescription>
            Crea una clase, entregable o evento para el calendario
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de evento</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clase">Clase</SelectItem>
                <SelectItem value="evento">Evento General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nombre del evento"
              required
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles del evento..."
              rows={3}
            />
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora fin</Label>
              <Input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
              />
            </div>
          </div>

          {/* Modalidad */}
          <div className="space-y-2">
            <Label>Modalidad</Label>
            <Select value={modalidad} onValueChange={setModalidad}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lugar / Link */}
          {(modalidad === "presencial" || modalidad === "hibrido") && (
            <div className="space-y-2">
              <Label>Lugar</Label>
              <Input
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Dirección o nombre del lugar"
              />
            </div>
          )}
          {(modalidad === "virtual" || modalidad === "hibrido") && (
            <div className="space-y-2">
              <Label>Link virtual</Label>
              <Input
                value={linkVirtual}
                onChange={(e) => setLinkVirtual(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}

          {/* Módulo (solo clase) */}
          {tipo === "clase" && (
            <div className="space-y-2">
              <Label>Vincular a módulo (opcional)</Label>
              <Select value={moduloId} onValueChange={setModuloId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin módulo</SelectItem>
                  {modulos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.titulo} {m.nivel && `(${m.nivel})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Niveles y Cohortes (solo clase) */}
          {tipo === "clase" && (
            <>
              <div className="space-y-2">
                <Label>Niveles de acceso *</Label>
                <div className="flex gap-3">
                  {NIVELES.map((nivel) => (
                    <label key={nivel} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={nivelesAcceso.includes(nivel)}
                        onCheckedChange={() => toggleNivel(nivel)}
                      />
                      {nivel}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cohortes de acceso</Label>
                <div className="flex gap-3">
                  {COHORTES.map((cohorte) => (
                    <label key={cohorte} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={cohortesAcceso.includes(cohorte)}
                        onCheckedChange={() => toggleCohorte(cohorte)}
                      />
                      Cohorte {cohorte}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {tipo === "evento" && (
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              Los eventos generales son visibles para todos los usuarios de la plataforma.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
