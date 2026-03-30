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
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDayCell } from "./CalendarDayCell";

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
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-l-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  evento: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-l-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

export { EVENT_COLORS };

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

  const getEventsForDay = useMemo(() => {
    return (day: Date): CalendarEvent[] => {
      return events.filter((ev) => {
        const eventDate = parseISO(ev.fecha);
        if (ev.fechaFin) {
          const endDate = parseISO(ev.fechaFin);
          return isWithinInterval(day, { start: eventDate, end: endDate });
        }
        return isSameDay(day, eventDate);
      });
    };
  }, [events]);

  const today = new Date();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
        </div>
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

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 border border-border rounded-lg overflow-hidden">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);

          return (
            <CalendarDayCell
              key={idx}
              day={day}
              events={dayEvents}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              onDayClick={canCreate ? onDayClick : undefined}
              onEventClick={onEventClick}
            />
          );
        })}
      </div>
    </div>
  );
}
