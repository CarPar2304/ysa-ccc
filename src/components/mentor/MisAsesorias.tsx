import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Edit, X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

export const MisAsesorias = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleEditar = async (reserva: Reserva) => {
    // Por ahora solo enviamos el webhook, la edición real se haría con un modal
    await handleWebhook("editar", reserva);
    toast({
      title: "Solicitud enviada",
      description: "Se ha enviado la solicitud de edición",
    });
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
                  onClick={() => handleEditar(reserva)}
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
    </div>
  );
};
