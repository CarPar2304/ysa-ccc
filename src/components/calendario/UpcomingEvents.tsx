import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, MapPin, BookOpen, Calendar, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarEvent, EVENT_COLORS } from "./CalendarMonthView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, isAfter, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UpcomingEventsProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

const ImpactIndicator = ({ tipo }: { tipo: CalendarEvent["tipo"] }) => {
  const colors = EVENT_COLORS[tipo];
  const barCount = tipo === "entregable" ? 3 : tipo === "clase" ? 2 : 1;
  return (
    <div className="flex items-end gap-[2px] h-3.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-colors",
            i < barCount ? colors.dot : "bg-muted"
          )}
          style={{ height: `${((i + 1) / 3) * 100}%` }}
        />
      ))}
    </div>
  );
};

export function UpcomingEvents({ events, onEventClick, className }: UpcomingEventsProps) {
  const navigate = useNavigate();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [showAllDialog, setShowAllDialog] = React.useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = React.useMemo(() => {
    return events
      .filter((ev) => {
        const evDate = parseISO(ev.fechaFin || ev.fecha);
        return isAfter(evDate, today) || isSameDay(evDate, today);
      })
      .sort((a, b) => parseISO(a.fecha).getTime() - parseISO(b.fecha).getTime());
  }, [events]);

  const visibleEvents = upcomingEvents.slice(0, 12);
  const hasMore = upcomingEvents.length > 12;

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1
      );
    }
  };

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [upcomingEvents]);

  if (upcomingEvents.length === 0) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 120, damping: 16 },
    },
  };

  const handleEntregableClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.moduloId) {
      navigate(`/lab/modulo/${event.moduloId}`);
    }
  };

  const renderEventCard = (event: CalendarEvent, isCompact = false) => {
    const colors = EVENT_COLORS[event.tipo];
    const eventDate = parseISO(event.fecha);
    const isToday = isSameDay(eventDate, new Date());

    return (
      <div
        key={event.id}
        className={cn(
          "rounded-lg border border-border bg-background p-3.5 cursor-pointer",
          "hover:shadow-md hover:border-primary/30 transition-all duration-200",
          "flex flex-col gap-2.5",
          isCompact ? "w-full" : "flex-shrink-0 w-[230px]"
        )}
        onClick={() => onEventClick?.(event)}
      >
        {/* Top row: date + impact */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                isToday
                  ? "bg-primary text-primary-foreground"
                  : colors.bg + " " + colors.text
              )}
            >
              {isToday ? "Hoy" : format(eventDate, "dd MMM", { locale: es })}
            </div>
            {event.horaInicio && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {event.horaInicio.slice(0, 5)}
              </span>
            )}
          </div>
          <ImpactIndicator tipo={event.tipo} />
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Event name */}
        <div className="flex items-start gap-2">
          <div className={cn("w-1 h-full min-h-[24px] rounded-full shrink-0", colors.dot)} />
          <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
            {event.titulo}
          </p>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-1">
          {event.moduloNombre && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <BookOpen className="h-2.5 w-2.5" />
              <span className="truncate">{event.moduloNombre}</span>
            </div>
          )}
          {event.modalidad && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              <span className="capitalize">{event.modalidad}</span>
            </div>
          )}
          {event.fechaFin && event.fechaFin !== event.fecha && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              <span>
                Hasta {format(parseISO(event.fechaFin), "dd MMM", { locale: es })}
              </span>
            </div>
          )}
        </div>

        {/* Bottom: badge + action */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <Badge
            variant="secondary"
            className={cn("text-[9px] h-4 px-1.5 capitalize", colors.text, colors.bg)}
          >
            {event.tipo}
          </Badge>
          {event.tipo === "entregable" && event.moduloId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[10px] gap-1 text-violet-600 dark:text-violet-400 hover:text-violet-700"
              onClick={(e) => handleEntregableClick(event, e)}
            >
              <FileText className="h-3 w-3" />
              Entregar
            </Button>
          )}
          {event.linkVirtual && (event.modalidad === "virtual" || event.modalidad === "hibrido") && event.tipo !== "entregable" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[10px] gap-1 text-primary"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a href={event.linkVirtual} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Unirse
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-border bg-card",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-foreground">
              Próximos Eventos
            </span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
              {upcomingEvents.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllDialog(true)}
              >
                Ver todos
              </Button>
            )}
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="p-1 rounded-full bg-background border border-border hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="p-1 rounded-full bg-background border border-border hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Events */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <motion.div
            className="flex gap-3 px-4 py-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {visibleEvents.map((event) => (
              <motion.div key={event.id} variants={itemVariants}>
                {renderEventCard(event)}
              </motion.div>
            ))}
            {hasMore && (
              <motion.div variants={itemVariants}>
                <button
                  onClick={() => setShowAllDialog(true)}
                  className="flex-shrink-0 w-[120px] rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground font-medium">
                    +{upcomingEvents.length - 12} más
                  </span>
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* All events dialog */}
      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Todos los próximos eventos ({upcomingEvents.length})</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingEvents.map((event) => renderEventCard(event, true))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
