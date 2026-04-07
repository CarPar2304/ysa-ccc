import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarEvent, EVENT_COLORS } from "./CalendarMonthView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  MapPin,
  Link as LinkIcon,
  BookOpen,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  CalendarPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: CalendarEvent[];
  entregaStatusMap?: Record<string, boolean>; // tareaId -> delivered
}

export function DayDetailSheet({
  open,
  onOpenChange,
  date,
  events,
  entregaStatusMap = {},
}: DayDetailSheetProps) {
  const navigate = useNavigate();

  if (!date) return null;

  const handleGoToEntregable = (event: CalendarEvent) => {
    // Navigate to lab module to submit
    if (event.moduloId) {
      navigate(`/lab/${event.moduloId}`);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="capitalize">
            {format(date, "EEEE, d 'de' MMMM", { locale: es })}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {events.length === 0
              ? "No hay eventos para este día"
              : `${events.length} evento${events.length > 1 ? "s" : ""}`}
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {events.map((event) => {
            const colors = EVENT_COLORS[event.tipo];
            const isEntregable = event.tipo === "entregable";
            const tareaId = event.id.replace("tarea-", "");
            const isDelivered = isEntregable && entregaStatusMap[tareaId];

            return (
              <div
                key={event.id}
                className={cn(
                  "rounded-lg border border-border p-4 space-y-3",
                  colors.bg
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground leading-tight">
                      {event.titulo}
                    </h4>
                    {event.moduloNombre && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3 shrink-0" />
                        <span className="truncate">{event.moduloNombre}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] capitalize", colors.text, colors.bg)}
                    >
                      {event.tipo}
                    </Badge>
                    {isEntregable && (
                      <Badge
                        variant={isDelivered ? "default" : "outline"}
                        className={cn(
                          "text-[10px]",
                          isDelivered
                            ? "bg-emerald-500 text-white"
                            : "border-destructive text-destructive"
                        )}
                      >
                        {isDelivered ? (
                          <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Entregado</>
                        ) : (
                          <><AlertCircle className="h-3 w-3 mr-0.5" /> Pendiente</>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>

                {event.descripcion && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {event.descripcion}
                  </p>
                )}

                {/* Time & modality details */}
                <div className="space-y-1.5">
                  {event.horaInicio && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {event.horaInicio.slice(0, 5)}
                        {event.horaFin && ` — ${event.horaFin.slice(0, 5)}`}
                      </span>
                    </div>
                  )}

                  {event.fechaFin && event.fechaFin !== event.fecha && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {format(parseISO(event.fecha), "d MMM", { locale: es })} → {format(parseISO(event.fechaFin), "d MMM", { locale: es })}
                      </span>
                    </div>
                  )}

                  {/* Location for presencial or híbrido */}
                  {event.lugar && (event.modalidad === "presencial" || event.modalidad === "hibrido") && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{event.lugar}</span>
                    </div>
                  )}

                  {/* Virtual link for virtual or híbrido */}
                  {event.linkVirtual && (event.modalidad === "virtual" || event.modalidad === "hibrido") && (
                    <div className="flex items-center gap-2 text-xs">
                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={event.linkVirtual}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        Unirse a la sesión
                      </a>
                    </div>
                  )}

                  {event.modalidad && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize font-medium">{event.modalidad}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 flex-wrap">
                  {isEntregable && event.moduloId && (
                    <Button
                      size="sm"
                      variant={isDelivered ? "outline" : "default"}
                      className="gap-1.5 text-xs h-8"
                      onClick={() => handleGoToEntregable(event)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {isDelivered ? "Ver entrega" : "Ir a entregar"}
                    </Button>
                  )}
                  {event.linkVirtual && (event.modalidad === "virtual" || event.modalidad === "hibrido") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8"
                      asChild
                    >
                      <a href={event.linkVirtual} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Enlace virtual
                      </a>
                    </Button>
                  )}
                  {event.archivoIcalUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8"
                      asChild
                    >
                      <a href={event.archivoIcalUrl} download>
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Agregar a mi calendario
                      </a>
                    </Button>
                  )}
                </div>

                {/* Access badges */}
                {(event.nivelesAcceso?.length || event.cohortesAcceso?.length) ? (
                  <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
                    {event.nivelesAcceso?.map((n) => (
                      <Badge key={n} variant="outline" className="text-[9px] h-4">
                        {n}
                      </Badge>
                    ))}
                    {event.cohortesAcceso?.map((c) => (
                      <Badge key={c} variant="outline" className="text-[9px] h-4">
                        Cohorte {c}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
