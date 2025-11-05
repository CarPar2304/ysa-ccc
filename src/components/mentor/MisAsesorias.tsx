import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Edit, X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface Reserva {
  id: string;
  fecha_reserva: string;
  estado: string;
  url_asesoria: string | null;
  mentor_id: string;
  perfil_asesoria_id: string;
  perfiles_asesoria: {
    titulo: string;
    tematica: string;
    mentor_id: string;
  };
}

interface Disponibilidad {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

interface ReservaExistente {
  fecha_reserva: string;
}

export const MisAsesorias = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [reservasExistentes, setReservasExistentes] = useState<ReservaExistente[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchReservas();
  }, []);

  const fetchReservas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reservas_asesoria")
        .select(`
          *,
          perfiles_asesoria:perfil_asesoria_id (
            titulo,
            tematica,
            mentor_id
          )
        `)
        .eq("beneficiario_id", user.id)
        .order("fecha_reserva", { ascending: false });

      if (error) throw error;
      setReservas(data || []);
    } catch (error) {
      console.error("Error fetching reservas:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las asesorías",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWebhook = async (tipo_accion: string, reserva: Reserva) => {
    try {
      const webhookData = new URLSearchParams({
        id_beneficiario: reserva.mentor_id,
        id_asesor: reserva.mentor_id,
        fecha_agendamiento: reserva.fecha_reserva,
        titulo: reserva.perfiles_asesoria.titulo,
        tipo_accion: tipo_accion,
        id_mentoria: reserva.id,
      });

      await fetch("https://n8n-n8n.yajjj6.easypanel.host/webhook/mentorias-ysa-pacifico", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: webhookData.toString(),
      });
    } catch (error) {
      console.error("Error sending webhook:", error);
    }
  };

  const handleOpenEditar = async (reserva: Reserva) => {
    setEditingReserva(reserva);
    setSelectedDate(undefined);
    setSelectedSlot("");
    
    try {
      const { data: disp, error: dispError } = await supabase
        .from("disponibilidades_mentor")
        .select("*")
        .eq("perfil_asesoria_id", reserva.perfil_asesoria_id)
        .order("dia_semana", { ascending: true });

      if (dispError) throw dispError;
      setDisponibilidades(disp || []);

      const { data: reservasData, error: reservasError } = await supabase
        .from("reservas_asesoria")
        .select("fecha_reserva")
        .eq("perfil_asesoria_id", reserva.perfil_asesoria_id)
        .neq("id", reserva.id); // Excluir la reserva actual

      if (reservasError) throw reservasError;
      setReservasExistentes(reservasData || []);
    } catch (error) {
      console.error("Error fetching disponibilidades:", error);
    }
  };

  const getAvailableSlots = () => {
    if (!selectedDate || !editingReserva) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const slotsForDay = disponibilidades.filter(d => d.dia_semana === dayOfWeek);
    
    const reserved = reservasExistentes
      .map(r => new Date(r.fecha_reserva))
      .filter(date => 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()
      )
      .map(date => `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);

    return slotsForDay.filter(slot => !reserved.includes(slot.hora_inicio));
  };

  const handleConfirmarEdicion = async () => {
    if (!editingReserva || !selectedDate || !selectedSlot) return;

    try {
      const [hours, minutes] = selectedSlot.split(':');
      const fechaReserva = new Date(selectedDate);
      fechaReserva.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Encontrar el slot completo para obtener hora_fin
      const availableSlots = getAvailableSlots();
      const slotCompleto = availableSlots.find(s => s.hora_inicio === selectedSlot);
      if (!slotCompleto) return;

      const [hoursEnd, minutesEnd] = slotCompleto.hora_fin.split(':');
      const fechaFin = new Date(selectedDate);
      fechaFin.setHours(parseInt(hoursEnd), parseInt(minutesEnd), 0, 0);

      const { error } = await supabase
        .from("reservas_asesoria")
        .update({ fecha_reserva: fechaReserva.toISOString() })
        .eq("id", editingReserva.id);

      if (error) throw error;

      // Enviar webhook con formato de fecha correcto
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const webhookData = new URLSearchParams({
        id_beneficiario: user.id,
        id_asesor: editingReserva.mentor_id,
        id_asesoria: editingReserva.perfil_asesoria_id,
        fecha_agendamiento: formatDate(fechaReserva),
        hora_inicio: formatDate(fechaReserva),
        hora_fin: formatDate(fechaFin),
        titulo: editingReserva.perfiles_asesoria.titulo,
        tipo_accion: "editar",
        id_mentoria: editingReserva.id,
      });

      await fetch("https://n8n-n8n.yajjj6.easypanel.host/webhook/mentorias-ysa-pacifico", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: webhookData.toString(),
      });

      toast({
        title: "Asesoría reprogramada",
        description: "La asesoría ha sido reprogramada exitosamente",
      });
      
      setEditingReserva(null);
      setSelectedDate(undefined);
      setSelectedSlot("");
      fetchReservas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelar = async (reserva: Reserva) => {
    try {
      const { error } = await supabase
        .from("reservas_asesoria")
        .update({ estado: "cancelada" })
        .eq("id", reserva.id);

      if (error) throw error;

      await handleWebhook("cancelar", reserva);
      
      toast({
        title: "Asesoría cancelada",
        description: "La asesoría ha sido cancelada exitosamente",
      });
      
      fetchReservas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pendiente: "secondary",
      confirmada: "default",
      cancelada: "destructive",
      completada: "outline",
    };
    return (
      <Badge variant={variants[estado] || "secondary"}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  if (reservas.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tienes asesorías agendadas</h3>
        <p className="text-muted-foreground">
          Agenda tu primera asesoría explorando los perfiles disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mis Asesorías Agendadas</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {reservas.map((reserva) => (
          <Card key={reserva.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {reserva.perfiles_asesoria.titulo}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reserva.perfiles_asesoria.tematica}
                  </p>
                </div>
                {getEstadoBadge(reserva.estado)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(reserva.fecha_reserva), "PPPp", { locale: es })}
                </span>
              </div>

              {reserva.url_asesoria && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(reserva.url_asesoria!, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Unirse a la reunión
                </Button>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenEditar(reserva)}
                  disabled={reserva.estado === "cancelada" || reserva.estado === "completada"}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleCancelar(reserva)}
                  disabled={reserva.estado === "cancelada" || reserva.estado === "completada"}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingReserva} onOpenChange={() => setEditingReserva(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reprogramar Asesoría</DialogTitle>
          </DialogHeader>
          
          {editingReserva && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">{editingReserva.perfiles_asesoria.titulo}</h3>
                <p className="text-sm text-muted-foreground">{editingReserva.perfiles_asesoria.tematica}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Fecha actual: {format(new Date(editingReserva.fecha_reserva), "PPPp", { locale: es })}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Seleccionar nueva fecha y hora</h4>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Selecciona una fecha:</p>
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        const dayOfWeek = date.getDay();
                        return !disponibilidades.some(d => d.dia_semana === dayOfWeek) || date < new Date();
                      }}
                      className="rounded-md border"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Horarios disponibles:</p>
                    {!selectedDate ? (
                      <p className="text-sm text-muted-foreground">Selecciona una fecha primero</p>
                    ) : getAvailableSlots().length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay horarios disponibles para esta fecha</p>
                    ) : (
                      <div className="space-y-2">
                        {getAvailableSlots().map((slot) => (
                          <Button
                            key={slot.id}
                            variant={selectedSlot === slot.hora_inicio ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setSelectedSlot(slot.hora_inicio)}
                          >
                            {slot.hora_inicio} - {slot.hora_fin}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full mt-4"
                  disabled={!selectedDate || !selectedSlot}
                  onClick={handleConfirmarEdicion}
                >
                  Confirmar Reprogramación
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
