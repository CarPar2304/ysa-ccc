import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent, EVENT_COLORS } from "./CalendarMonthView";
import { cn } from "@/lib/utils";
import {
  Clock,
  MapPin,
  Link as LinkIcon,
  BookOpen,
  Pencil,
  Trash2,
  Calendar,
  CalendarPlus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface EventDetailDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: () => void;
  canManage?: boolean;
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  canManage = false,
}: EventDetailDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  if (!event) return null;

  const colors = EVENT_COLORS[event.tipo];
  const isFromClasesTable = event.id.startsWith("clase-");

  const handleDelete = async () => {
    if (event.tipo === "entregable") return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("eventos_calendario")
        .delete()
        .eq("id", event.id);
      if (error) throw error;
      toast({ title: "Evento eliminado" });
      onOpenChange(false);
      onDelete?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-lg leading-tight pr-8">
              {event.titulo}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Badge
            variant="secondary"
            className={cn("capitalize", colors.text, colors.bg)}
          >
            {event.tipo}
          </Badge>

          {event.descripcion && (
            <p className="text-sm text-muted-foreground">{event.descripcion}</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(parseISO(event.fecha), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                {event.fechaFin && event.fechaFin !== event.fecha && (
                  <span className="text-muted-foreground">
                    {" → "}
                    {format(parseISO(event.fechaFin), "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                )}
              </span>
            </div>

            {event.horaInicio && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.horaInicio.slice(0, 5)}
                  {event.horaFin && ` — ${event.horaFin.slice(0, 5)}`}
                </span>
              </div>
            )}

            {event.modalidad && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{event.modalidad}</span>
                {event.lugar && <span>— {event.lugar}</span>}
              </div>
            )}

            {event.linkVirtual && (
              <div className="flex items-center gap-2 text-sm">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  href={event.linkVirtual}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Enlace de la sesión
                </a>
              </div>
            )}

            {event.moduloNombre && (
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>{event.moduloNombre}</span>
              </div>
            )}
          </div>

          {/* Add to calendar button */}
          {event.archivoIcalUrl && (
            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 w-full"
                asChild
              >
                <a href={event.archivoIcalUrl} download>
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Agregar a mi calendario
                </a>
              </Button>
            </div>
          )}

          {(event.nivelesAcceso?.length || event.cohortesAcceso?.length) ? (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
              {event.nivelesAcceso?.map((n) => (
                <Badge key={n} variant="outline" className="text-xs">
                  {n}
                </Badge>
              ))}
              {event.cohortesAcceso?.map((c) => (
                <Badge key={c} variant="outline" className="text-xs">
                  Cohorte {c}
                </Badge>
              ))}
            </div>
          ) : null}

          {canManage && event.tipo !== "entregable" && !isFromClasesTable && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onEdit?.(event);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                disabled={deleting}
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
