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
import { Loader2, Video, MapPin, Globe, CalendarPlus, X } from "lucide-react";
import { format } from "date-fns";
import { InlineDatePicker } from "./InlineDatePicker";
import { cn } from "@/lib/utils";

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialDate?: Date;
  editEvent?: any;
}

const NIVELES = ["Starter", "Growth", "Scale"];
const COHORTES = [1, 2];

const MODALIDAD_OPTIONS = [
  { value: "virtual", label: "Virtual", icon: Video },
  { value: "presencial", label: "Presencial", icon: MapPin },
  { value: "hibrido", label: "Híbrido", icon: Globe },
];

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
  const [icalFile, setIcalFile] = useState<File | null>(null);
  const [icalUrl, setIcalUrl] = useState<string>("");
  const [uploadingIcal, setUploadingIcal] = useState(false);
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
        setIcalUrl(editEvent.archivo_ical_url || "");
        setIcalFile(null);
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
    setNivelesAcceso((prev) => {
      const next = prev.includes(nivel) ? prev.filter((n) => n !== nivel) : [...prev, nivel];
      // If only Scale remains, clear cohortes since Scale has a single cohorte
      const hasStarterOrGrowth = next.includes("Starter") || next.includes("Growth");
      if (!hasStarterOrGrowth) {
        setCohortesAcceso([]);
      }
      return next;
    });
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
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Evento" : "Nuevo Evento"}</DialogTitle>
          <DialogDescription>
            Crea una clase, entregable o evento para el calendario
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tipo - pill toggle */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tipo de evento
            </Label>
            <div className="flex gap-2">
              {[
                { value: "clase", label: "📚 Clase" },
                { value: "evento", label: "🎉 Evento General" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTipo(opt.value)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150",
                    tipo === opt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-ring/40 hover:bg-accent/50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nombre del evento"
              required
              className="h-10"
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

          {/* Fecha with inline calendar + times */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fecha y hora
            </Label>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
              <InlineDatePicker
                value={fecha}
                onChange={setFecha}
                label="Fecha del evento *"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Hora inicio
                  </label>
                  <Input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Hora fin
                  </label>
                  <Input
                    type="time"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modalidad - visual selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Modalidad
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {MODALIDAD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setModalidad(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all duration-150",
                      modalidad === opt.value
                        ? "border-primary bg-accent text-accent-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-ring/40 hover:bg-accent/30"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lugar / Link conditional */}
          {(modalidad === "presencial" || modalidad === "hibrido") && (
            <div className="space-y-2">
              <Label>Lugar</Label>
              <Input
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Dirección o nombre del lugar"
                className="h-9"
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
                className="h-9"
              />
            </div>
          )}

          {/* Módulo (solo clase) */}
          {tipo === "clase" && (
            <div className="space-y-2">
              <Label>Vincular a módulo (opcional)</Label>
              <Select value={moduloId} onValueChange={setModuloId}>
                <SelectTrigger className="h-9">
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
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Niveles de acceso *
                </Label>
                <div className="flex gap-2">
                  {NIVELES.map((nivel) => (
                    <button
                      key={nivel}
                      type="button"
                      onClick={() => toggleNivel(nivel)}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-all",
                        nivelesAcceso.includes(nivel)
                          ? "bg-primary/10 text-primary border-primary/40"
                          : "bg-background text-muted-foreground border-border hover:border-ring/30"
                      )}
                    >
                      {nivel}
                    </button>
                  ))}
                </div>
              </div>
              {/* Show cohortes only if Starter or Growth selected (Scale has only 1 cohorte) */}
              {(nivelesAcceso.includes("Starter") || nivelesAcceso.includes("Growth")) && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cohortes de acceso
                  </Label>
                  <div className="flex gap-2">
                    {COHORTES.map((cohorte) => (
                      <button
                        key={cohorte}
                        type="button"
                        onClick={() => toggleCohorte(cohorte)}
                        className={cn(
                          "flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-all",
                          cohortesAcceso.includes(cohorte)
                            ? "bg-primary/10 text-primary border-primary/40"
                            : "bg-background text-muted-foreground border-border hover:border-ring/30"
                        )}
                      >
                        Cohorte {cohorte}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
