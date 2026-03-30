import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { CalendarMonthView, CalendarEvent } from "@/components/calendario/CalendarMonthView";
import { EventFormDialog } from "@/components/calendario/EventFormDialog";
import { EventDetailDialog } from "@/components/calendario/EventDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuotaStatus } from "@/hooks/useQuotaStatus";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";

const Calendario = () => {
  const { isAdmin, isOperador, isMentor, isBeneficiario, isStakeholder, loading: roleLoading } = useUserRole();
  const { userId } = useUserRole();
  const { quotaInfo, loading: quotaLoading } = useQuotaStatus(userId);
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

  const canManage = isAdmin || isOperador;

  const fetchEvents = useCallback(async () => {
    try {
      // Fetch calendar events
      const { data: calEvents } = await supabase
        .from("eventos_calendario")
        .select("*, modulos(titulo)")
        .order("fecha");

      // Fetch tareas (entregables) with module info
      const { data: tareas } = await supabase
        .from("tareas")
        .select("*, modulos(titulo, nivel)")
        .eq("activo", true);

      const mapped: CalendarEvent[] = [];

      // Map calendar events
      if (calEvents) {
        for (const ev of calEvents) {
          // Visibility filtering for beneficiarios
          if (isBeneficiario && ev.tipo === "clase") {
            const evNiveles = ev.niveles_acceso || [];
            const evCohortes = ev.cohortes_acceso || [];
            if (evNiveles.length > 0 && nivel && !evNiveles.includes(nivel)) continue;
            if (evCohortes.length > 0 && cohorte && !evCohortes.includes(cohorte)) continue;
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

      // Map tareas as entregables
      if (tareas) {
        for (const t of tareas) {
          const modulo = t.modulos as any;
          // For beneficiarios, filter by module nivel
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
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isBeneficiario, nivel, cohorte]);

  useEffect(() => {
    if (!roleLoading && !quotaLoading) {
      fetchEvents();
    }
  }, [roleLoading, quotaLoading, fetchEvents]);

  const handleDayClick = (date: Date) => {
    if (!canManage) return;
    setCreateDate(date);
    setEditEvent(null);
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setDetailEvent(event);
    setDetailOpen(true);
  };

  const handleEditFromDetail = (event: CalendarEvent) => {
    // Need to fetch the raw event to edit
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
          <CalendarMonthView
            events={events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            canCreate={canManage}
          />
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
      </div>
    </Layout>
  );
};

export default Calendario;
