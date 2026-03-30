import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { CalendarMonthView, CalendarEvent } from "@/components/calendario/CalendarMonthView";
import { UpcomingEvents } from "@/components/calendario/UpcomingEvents";
import { EventFormDialog } from "@/components/calendario/EventFormDialog";
import { EventDetailDialog } from "@/components/calendario/EventDetailDialog";
import { DayDetailSheet } from "@/components/calendario/DayDetailSheet";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuotaStatus } from "@/hooks/useQuotaStatus";
import { useOperadorNiveles } from "@/hooks/useOperadorNiveles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Loader2, Filter } from "lucide-react";
import { format, parseISO, isSameDay, isWithinInterval } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Calendario = () => {
  const { isAdmin, isOperador, isMentor, isBeneficiario, isStakeholder, loading: roleLoading, userId } = useUserRole();
  const { quotaInfo, loading: quotaLoading } = useQuotaStatus(userId);
  const { niveles: operadorNiveles, loading: operadorLoading } = useOperadorNiveles();
  const nivel = quotaInfo?.nivel || null;
  const cohorte = quotaInfo?.cohorte || null;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>();
  const [editEvent, setEditEvent] = useState<any>(null);

  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Day detail sheet for beneficiarios
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [daySheetDate, setDaySheetDate] = useState<Date | null>(null);
  const [daySheetEvents, setDaySheetEvents] = useState<CalendarEvent[]>([]);

  // Entrega status map: tareaId -> boolean (delivered)
  const [entregaStatusMap, setEntregaStatusMap] = useState<Record<string, boolean>>({});

  // Entregable filter
  const [entregableFilter, setEntregableFilter] = useState<"all" | "pending" | "delivered">("all");

  const canManage = isAdmin || isOperador;

  const fetchEvents = useCallback(async () => {
    try {
      const [calRes, tareasRes, clasesRes] = await Promise.all([
        supabase.from("eventos_calendario").select("*, modulos(titulo)").order("fecha"),
        supabase.from("tareas").select("*, modulos(titulo, nivel)").eq("activo", true),
        supabase.from("clases").select("*, modulos(titulo, nivel)").not("fecha", "is", null),
      ]);

      const calEvents = calRes.data;
      const tareas = tareasRes.data;
      const clases = clasesRes.data;

      const mapped: CalendarEvent[] = [];

      if (calEvents) {
        for (const ev of calEvents) {
          if (isBeneficiario && ev.tipo === "clase") {
            const evNiveles = ev.niveles_acceso || [];
            const evCohortes = ev.cohortes_acceso || [];
            if (evNiveles.length > 0 && nivel && !evNiveles.includes(nivel)) continue;
            if (evCohortes.length > 0 && cohorte && !evCohortes.includes(cohorte)) continue;
          }
          // Filter operador by assigned levels
          if (isOperador && !isAdmin) {
            const evNiveles = ev.niveles_acceso || [];
            if (evNiveles.length > 0 && !evNiveles.some((n: string) => operadorNiveles.includes(n))) continue;
          }

          mapped.push({
            id: ev.id,
            tipo: ev.tipo as CalendarEvent["tipo"],
            titulo: ev.titulo,
            descripcion: ev.descripcion,
            fecha: ev.fecha,
            horaInicio: ev.hora_inicio,
            horaFin: ev.hora_fin,
            modalidad: ev.modalidad,
            lugar: ev.lugar,
            linkVirtual: ev.link_virtual,
            moduloId: ev.modulo_id,
            moduloNombre: (ev.modulos as any)?.titulo || null,
            nivelesAcceso: ev.niveles_acceso,
            cohortesAcceso: ev.cohortes_acceso,
          });
        }
      }

      if (clases) {
        for (const cl of clases) {
          const modulo = cl.modulos as any;
          const clCohortes = cl.cohorte || [];

          if (isBeneficiario) {
            if (modulo?.nivel && nivel && modulo.nivel !== nivel) continue;
            if (clCohortes.length > 0 && cohorte && !clCohortes.includes(cohorte)) continue;
          }

          mapped.push({
            id: `clase-${cl.id}`,
            tipo: "clase",
            titulo: cl.titulo,
            descripcion: cl.descripcion,
            fecha: cl.fecha,
            horaInicio: cl.hora_inicio,
            horaFin: cl.hora_fin,
            modalidad: cl.modalidad,
            lugar: cl.lugar,
            linkVirtual: cl.link_virtual,
            moduloId: cl.modulo_id,
            moduloNombre: modulo?.titulo || null,
            nivelesAcceso: modulo?.nivel ? [modulo.nivel] : null,
            cohortesAcceso: clCohortes.length > 0 ? clCohortes : null,
          });
        }
      }

      if (tareas) {
        for (const t of tareas) {
          const modulo = t.modulos as any;
          if (isBeneficiario && modulo?.nivel && nivel && modulo.nivel !== nivel) continue;

          const fechaInicio = t.fecha_inicio
            ? format(new Date(t.fecha_inicio), "yyyy-MM-dd")
            : format(new Date(t.fecha_limite), "yyyy-MM-dd");
          const fechaFin = format(new Date(t.fecha_limite), "yyyy-MM-dd");

          mapped.push({
            id: `tarea-${t.id}`,
            tipo: "entregable",
            titulo: t.titulo,
            descripcion: t.descripcion,
            fecha: fechaInicio,
            fechaFin: fechaFin,
            moduloId: t.modulo_id,
            moduloNombre: modulo?.titulo || null,
            nivelesAcceso: modulo?.nivel ? [modulo.nivel] : null,
          });
        }
      }

      setEvents(mapped);

      // Fetch entrega status for beneficiarios
      if (isBeneficiario && userId && tareas) {
        const tareaIds = tareas.map((t) => t.id);
        if (tareaIds.length > 0) {
          const { data: entregas } = await supabase
            .from("entregas")
            .select("tarea_id")
            .eq("user_id", userId)
            .in("tarea_id", tareaIds);
          
          const statusMap: Record<string, boolean> = {};
          tareaIds.forEach((id) => {
            statusMap[id] = entregas?.some((e) => e.tarea_id === id) || false;
          });
          setEntregaStatusMap(statusMap);
        }
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isBeneficiario, nivel, cohorte, userId]);

  useEffect(() => {
    if (!roleLoading && !quotaLoading) {
      fetchEvents();
    }
  }, [roleLoading, quotaLoading, fetchEvents]);

  // Filter events based on entregable filter
  const filteredEvents = useMemo(() => {
    if (entregableFilter === "all") return events;
    return events.filter((ev) => {
      if (ev.tipo !== "entregable") return true;
      const tareaId = ev.id.replace("tarea-", "");
      const isDelivered = entregaStatusMap[tareaId] || false;
      if (entregableFilter === "delivered") return isDelivered;
      if (entregableFilter === "pending") return !isDelivered;
      return true;
    });
  }, [events, entregableFilter, entregaStatusMap]);

  const handleDayClick = (date: Date) => {
    if (canManage) {
      setCreateDate(date);
      setEditEvent(null);
      setCreateDialogOpen(true);
      return;
    }
    // For beneficiarios and other roles, open day detail sheet
    const dayEvents = filteredEvents.filter((ev) => {
      const eventDate = parseISO(ev.fecha);
      if (ev.fechaFin && ev.fechaFin !== ev.fecha) {
        const endDate = parseISO(ev.fechaFin);
        return isWithinInterval(date, { start: eventDate, end: endDate });
      }
      return isSameDay(date, eventDate);
    });
    setDaySheetDate(date);
    setDaySheetEvents(dayEvents);
    setDaySheetOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (isBeneficiario) {
      // Open day detail sheet with this event's day
      const eventDate = parseISO(event.fecha);
      const dayEvents = filteredEvents.filter((ev) => {
        const evDate = parseISO(ev.fecha);
        if (ev.fechaFin && ev.fechaFin !== ev.fecha) {
          const endDate = parseISO(ev.fechaFin);
          return isWithinInterval(eventDate, { start: evDate, end: endDate });
        }
        return isSameDay(eventDate, evDate);
      });
      setDaySheetDate(eventDate);
      setDaySheetEvents(dayEvents);
      setDaySheetOpen(true);
    } else {
      setDetailEvent(event);
      setDetailOpen(true);
    }
  };

  const handleEditFromDetail = (event: CalendarEvent) => {
    if (event.tipo === "entregable") return;
    supabase
      .from("eventos_calendario")
      .select("*")
      .eq("id", event.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setEditEvent(data);
          setCreateDialogOpen(true);
        }
      });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  if (roleLoading || quotaLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 h-full flex flex-col">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Clases, entregables y eventos del programa
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Entregable filter */}
            {isBeneficiario && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Filter className="h-3.5 w-3.5" />
                    Entregables
                    {entregableFilter !== "all" && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">
                        {entregableFilter === "pending" ? "Pendientes" : "Entregados"}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem
                    checked={entregableFilter === "all"}
                    onCheckedChange={() => setEntregableFilter("all")}
                  >
                    Todos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={entregableFilter === "pending"}
                    onCheckedChange={() => setEntregableFilter("pending")}
                  >
                    Pendientes
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={entregableFilter === "delivered"}
                    onCheckedChange={() => setEntregableFilter("delivered")}
                  >
                    Entregados
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            {canManage && (
              <Button
                className="gap-2"
                onClick={() => {
                  setCreateDate(new Date());
                  setEditEvent(null);
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Nuevo evento
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <UpcomingEvents
              events={filteredEvents}
              onEventClick={handleEventClick}
              className="mb-6"
            />
            <CalendarMonthView
              events={filteredEvents}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
              canCreate={canManage || isBeneficiario || isMentor || isStakeholder}
            />
          </>
        )}

        <EventFormDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={fetchEvents}
          initialDate={createDate}
          editEvent={editEvent}
        />

        <EventDetailDialog
          event={detailEvent}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={handleEditFromDetail}
          onDelete={fetchEvents}
          canManage={canManage}
        />

        <DayDetailSheet
          open={daySheetOpen}
          onOpenChange={setDaySheetOpen}
          date={daySheetDate}
          events={daySheetEvents}
          entregaStatusMap={entregaStatusMap}
        />
      </div>
    </Layout>
  );
};

export default Calendario;
