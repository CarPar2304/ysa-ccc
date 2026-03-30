import React, { useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  isBefore,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface InlineDatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (date: string) => void;
  label?: string;
  minDate?: Date;
  className?: string;
}

export function InlineDatePicker({
  value,
  onChange,
  label,
  minDate,
  className,
}: InlineDatePickerProps) {
  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate || new Date()
  );
  const [isOpen, setIsOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

  const handleSelect = (day: Date) => {
    onChange(format(day, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const isDisabled = (day: Date) => {
    if (minDate && isBefore(startOfDay(day), startOfDay(minDate))) return true;
    return false;
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border bg-background px-3 text-sm transition-all",
          "border-input hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring/20",
          !value && "text-muted-foreground"
        )}
      >
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate">
          {selectedDate
            ? format(selectedDate, "EEE, dd MMM yyyy", { locale: es })
            : "Seleccionar fecha"}
        </span>
      </button>

      {/* Inline calendar dropdown */}
      {isOpen && (
        <div className="rounded-lg border border-border bg-card p-3 shadow-md animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-foreground capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((d, i) => (
              <div
                key={i}
                className="text-center text-[10px] font-medium text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const disabled = isDisabled(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(day)}
                  className={cn(
                    "relative h-8 w-full rounded-md text-xs font-medium transition-all duration-100",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-1 focus:ring-ring/30",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isCurrentMonth && "text-foreground",
                    today &&
                      !isSelected &&
                      "bg-accent/60 text-accent-foreground font-bold",
                    isSelected &&
                      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
                    disabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  {format(day, "d")}
                  {today && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-border flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                handleSelect(today);
              }}
              className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Hoy
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
