import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEvent, EVENT_COLORS } from "./CalendarMonthView";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Link as LinkIcon, BookOpen } from "lucide-react";

interface CalendarDayCellProps {
  day: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const MAX_VISIBLE = 3;

export function CalendarDayCell({
  day,
  events,
  isCurrentMonth,
  isToday,
  onDayClick,
  onEventClick,
}: CalendarDayCellProps) {
  const visibleEvents = events.slice(0, MAX_VISIBLE);
  const remaining = events.length - MAX_VISIBLE;

  return (
    <div
      className={cn(
        "min-h-[100px] border-b border-r border-border p-1.5 transition-colors relative group",
        isCurrentMonth
          ? "bg-background"
          : "bg-muted/30",
        onDayClick && "cursor-pointer hover:bg-accent/30"
      )}
      onClick={() => onDayClick?.(day)}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
            isToday && "bg-primary text-primary-foreground font-bold",
            !isCurrentMonth && "text-muted-foreground/50"
          )}
        >
          {format(day, "d")}
        </span>
      </div>

      {/* Events */}
      <div className="space-y-0.5">
        {visibleEvents.map((ev) => {
          const colors = EVENT_COLORS[ev.tipo];
          return (
            <HoverCard key={ev.id} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button
                  className={cn(
                    "w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded border-l-2 truncate block transition-all hover:opacity-80",
                    colors.bg,
                    colors.border,
                    colors.text
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(ev);
                  }}
                >
                  {ev.horaInicio && (
                    <span className="font-semibold mr-1">
                      {ev.horaInicio.slice(0, 5)}
                    </span>
                  )}
                  {ev.titulo}
                </button>
              </HoverCardTrigger>
              <HoverCardContent
                side="right"
                align="start"
                className="w-72 p-3 z-[100]"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold leading-tight">
                      {ev.titulo}
                    </h4>
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] shrink-0 capitalize", colors.text)}
                    >
                      {ev.tipo}
                    </Badge>
                  </div>

                  {ev.descripcion && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {ev.descripcion}
                    </p>
                  )}

                  <div className="space-y-1">
                    {ev.horaInicio && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {ev.horaInicio.slice(0, 5)}
                          {ev.horaFin && ` - ${ev.horaFin.slice(0, 5)}`}
                        </span>
                      </div>
                    )}
                    {ev.modalidad && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="capitalize">{ev.modalidad}</span>
                        {ev.lugar && ` — ${ev.lugar}`}
                      </div>
                    )}
                    {ev.linkVirtual && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                        <a
                          href={ev.linkVirtual}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Enlace de la sesión
                        </a>
                      </div>
                    )}
                    {ev.moduloNombre && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        <span>{ev.moduloNombre}</span>
                      </div>
                    )}
                  </div>

                  {(ev.nivelesAcceso?.length || ev.cohortesAcceso?.length) ? (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-border">
                      {ev.nivelesAcceso?.map((n) => (
                        <Badge key={n} variant="outline" className="text-[9px] h-4">
                          {n}
                        </Badge>
                      ))}
                      {ev.cohortesAcceso?.map((c) => (
                        <Badge key={c} variant="outline" className="text-[9px] h-4">
                          Cohorte {c}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
        {remaining > 0 && (
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground pl-1.5 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick?.(day);
            }}
          >
            +{remaining} más
          </button>
        )}
      </div>
    </div>
  );
}
