import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
  addMonths,
  subMonths,
  differenceInCalendarDays,
  isBefore,
  isAfter,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Link as LinkIcon, BookOpen } from "lucide-react";

export type CalendarEventType = "clase" | "entregable" | "evento";

export interface CalendarEvent {
  id: string;
  tipo: CalendarEventType;
  titulo: string;
  descripcion?: string | null;
  fecha: string; // ISO date
  fechaFin?: string | null; // ISO date for multi-day
  horaInicio?: string | null;
  horaFin?: string | null;
  modalidad?: string | null;
  lugar?: string | null;
  linkVirtual?: string | null;
  moduloId?: string | null;
  moduloNombre?: string | null;
  nivelesAcceso?: string[] | null;
  cohortesAcceso?: number[] | null;
}

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  canCreate?: boolean;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const EVENT_COLORS: Record<CalendarEventType, { bg: string; border: string; text: string; dot: string }> = {
  clase: {
    bg: "bg-primary/10 dark:bg-primary/20",
    border: "border-l-primary",
    text: "text-primary",
    dot: "bg-primary",
  },
  entregable: {
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
    border: "border-l-violet-500",
    text: "text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  evento: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-l-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

export { EVENT_COLORS };

// Represents a visual segment of a multi-day event within a single week row
interface EventSegment {
  event: CalendarEvent;
  startCol: number; // 0-6 column in the week
  span: number; // how many days it spans in this row
  isStart: boolean; // does this segment include the event start date?
  isEnd: boolean; // does this segment include the event end date?
}

function getMondayIndex(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1; // Mon=0, Sun=6
}

export function CalendarMonthView({
  events,
  onDayClick,
  onEventClick,
  canCreate = false,
}: CalendarMonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Separate multi-day and single-day events
  const { multiDayEvents, singleDayEvents } = useMemo(() => {
    const multi: CalendarEvent[] = [];
    const single: CalendarEvent[] = [];
    events.forEach((ev) => {
      if (ev.fechaFin && ev.fechaFin !== ev.fecha) {
        multi.push(ev);
      } else {
        single.push(ev);
      }
    });
    return { multiDayEvents: multi, singleDayEvents: single };
  }, [events]);

  // Get single-day events for a specific day
  const getSingleEventsForDay = useMemo(() => {
    return (day: Date): CalendarEvent[] => {
      return singleDayEvents.filter((ev) => isSameDay(day, parseISO(ev.fecha)));
    };
  }, [singleDayEvents]);

  // Calculate multi-day segments for a given week row
  const getSegmentsForWeek = useMemo(() => {
    return (weekStart: Date, weekEnd: Date): EventSegment[] => {
      const segments: EventSegment[] = [];
      multiDayEvents.forEach((ev) => {
        const evStart = parseISO(ev.fecha);
        const evEnd = parseISO(ev.fechaFin!);
        // Check overlap with week
        if (isAfter(evStart, weekEnd) || isBefore(evEnd, weekStart)) return;

        const segStart = isBefore(evStart, weekStart) ? weekStart : evStart;
        const segEnd = isAfter(evEnd, weekEnd) ? weekEnd : evEnd;
        const startCol = getMondayIndex(segStart);
        const span = differenceInCalendarDays(segEnd, segStart) + 1;

        segments.push({
          event: ev,
          startCol,
          span,
          isStart: isSameDay(segStart, evStart),
          isEnd: isSameDay(segEnd, evEnd),
        });
      });
      // Sort by start col, then by span descending for better layout
      segments.sort((a, b) => a.startCol - b.startCol || b.span - a.span);
      return segments;
    };
  }, [multiDayEvents]);

  const today = new Date();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs mr-2"
          >
            Hoy
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full", EVENT_COLORS.clase.dot)} />
          <span className="text-muted-foreground">Clases</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full", EVENT_COLORS.entregable.dot)} />
          <span className="text-muted-foreground">Entregables</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full", EVENT_COLORS.evento.dot)} />
          <span className="text-muted-foreground">Eventos</span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid by weeks */}
      <div className="flex-1 border border-border rounded-lg overflow-hidden">
        {weeks.map((week, weekIdx) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          const segments = getSegmentsForWeek(weekStart, weekEnd);

          return (
            <div key={weekIdx} className="relative">
              {/* Multi-day event bars overlaid on top */}
              {segments.length > 0 && (
                <div className="absolute top-7 left-0 right-0 z-10 pointer-events-none">
                  {segments.map((seg, segIdx) => {
                    const colors = EVENT_COLORS[seg.event.tipo];
                    const leftPercent = (seg.startCol / 7) * 100;
                    const widthPercent = (seg.span / 7) * 100;

                    return (
                      <HoverCard key={`${seg.event.id}-${weekIdx}`} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <button
                            className={cn(
                              "absolute pointer-events-auto text-[10px] leading-tight px-2 py-1 truncate transition-all hover:opacity-80 cursor-pointer font-medium",
                              colors.bg,
                              colors.text,
                              seg.isStart && seg.isEnd && "rounded",
                              seg.isStart && !seg.isEnd && "rounded-l",
                              !seg.isStart && seg.isEnd && "rounded-r",
                              !seg.isStart && !seg.isEnd && "rounded-none",
                              "border-y border-l",
                              seg.isEnd && "border-r",
                              colors.border.replace("border-l-", "border-")
                            )}
                            style={{
                              left: `calc(${leftPercent}% + 4px)`,
                              width: `calc(${widthPercent}% - 8px)`,
                              top: `${segIdx * 22}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick?.(seg.event);
                            }}
                          >
                            {seg.isStart && seg.event.titulo}
                            {!seg.isStart && "↳ " + seg.event.titulo}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent side="bottom" align="start" className="w-72 p-3 z-[100]">
                          <EventHoverContent event={seg.event} />
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              )}

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {week.map((day, dayIdx) => {
                  const dayEvents = getSingleEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, today);
                  // Reserve space for multi-day bars
                  const multiDaySlots = segments.length;

                  return (
                    <div
                      key={dayIdx}
                      className={cn(
                        "min-h-[100px] border-b border-r border-border p-1.5 transition-colors relative group",
                        isCurrentMonth ? "bg-background" : "bg-muted/30",
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

                      {/* Spacer for multi-day bars */}
                      {multiDaySlots > 0 && (
                        <div style={{ height: `${multiDaySlots * 22 + 4}px` }} />
                      )}

                      {/* Single-day events */}
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => {
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
                              <HoverCardContent side="right" align="start" className="w-72 p-3 z-[100]">
                                <EventHoverContent event={ev} />
                              </HoverCardContent>
                            </HoverCard>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <button
                            className="text-[10px] text-muted-foreground hover:text-foreground pl-1.5 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDayClick?.(day);
                            }}
                          >
                            +{dayEvents.length - 3} más
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Shared hover content for events
function EventHoverContent({ event }: { event: CalendarEvent }) {
  const colors = EVENT_COLORS[event.tipo];
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-tight">{event.titulo}</h4>
        <Badge variant="secondary" className={cn("text-[10px] shrink-0 capitalize", colors.text)}>
          {event.tipo}
        </Badge>
      </div>
      {event.descripcion && (
        <p className="text-xs text-muted-foreground line-clamp-2">{event.descripcion}</p>
      )}
      <div className="space-y-1">
        {event.horaInicio && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {event.horaInicio.slice(0, 5)}
              {event.horaFin && ` - ${event.horaFin.slice(0, 5)}`}
            </span>
          </div>
        )}
        {event.modalidad && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="capitalize">{event.modalidad}</span>
            {event.lugar && ` — ${event.lugar}`}
          </div>
        )}
        {event.linkVirtual && (
          <div className="flex items-center gap-1.5 text-xs">
            <LinkIcon className="h-3 w-3 text-muted-foreground" />
            <a
              href={event.linkVirtual}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              Enlace de la sesión
            </a>
          </div>
        )}
        {event.moduloNombre && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            <span>{event.moduloNombre}</span>
          </div>
        )}
      </div>
      {(event.nivelesAcceso?.length || event.cohortesAcceso?.length) ? (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-border">
          {event.nivelesAcceso?.map((n) => (
            <Badge key={n} variant="outline" className="text-[9px] h-4">{n}</Badge>
          ))}
          {event.cohortesAcceso?.map((c) => (
            <Badge key={c} variant="outline" className="text-[9px] h-4">Cohorte {c}</Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
