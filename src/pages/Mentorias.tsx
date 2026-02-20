import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Search, BookMarked, Lock, ExternalLink, CheckCircle, XCircle, Link2 } from "lucide-react";
import { MisAsesorias } from "@/components/mentor/MisAsesorias";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuotaStatus } from "@/hooks/useQuotaStatus";
import { Badge } from "@/components/ui/badge";

interface PerfilAsesoria {
  id: string;
  mentor_id: string;
  titulo: string;
  descripcion: string;
  tematica: string;
  foto_url: string;
  banner_url: string;
  perfil_mentor: string;
  tipo_disponibilidad?: string;
  link_calendario_externo?: string;
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

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Paso del flujo de calendario externo
type ExternalCalendarStep = "link" | "confirm" | "done";

const Mentorias = () => {
  const { userId, isAdmin, isMentor, isStakeholder } = useUserRole();
  const { isApproved, loading: loadingQuota, quotaInfo } = useQuotaStatus(userId);
  
  const hasAccess = isAdmin || isMentor || isStakeholder || isApproved;
  const canSchedule = !isStakeholder;
  const [perfiles, setPerfiles] = useState<PerfilAsesoria[]>([]);
  const [filteredPerfiles, setFilteredPerfiles] = useState<PerfilAsesoria[]>([]);
  const [tematicas, setTematicas] = useState<string[]>([]);
  const [selectedTematica, setSelectedTematica] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerfil, setSelectedPerfil] = useState<PerfilAsesoria | null>(null);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [reservasExistentes, setReservasExistentes] = useState<ReservaExistente[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [isReserving, setIsReserving] = useState(false);

  // Estado para flujo de calendario externo
  const [externalStep, setExternalStep] = useState<ExternalCalendarStep>("link");

  const { toast } = useToast();

  useEffect(() => {
    if (!loadingQuota) {
      fetchPerfiles();
    }
  }, [loadingQuota, isAdmin, isMentor, isStakeholder, quotaInfo?.nivel, quotaInfo?.cohorte]);

  useEffect(() => {
    filterPerfiles();
  }, [perfiles, selectedTematica, searchTerm]);

  const fetchPerfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("perfiles_asesoria")
        .select("*")
        .eq("activo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filtrar por nivel y cohorte del beneficiario (solo aplica a beneficiarios con cupo aprobado)
      // Admins, mentores y stakeholders ven todos
      let filtered = data || [];
      if (!isAdmin && !isMentor && !isStakeholder && quotaInfo) {
        filtered = filtered.filter((p: any) => {
          const sinNivel = !p.niveles_acceso || p.niveles_acceso.length === 0;
          const sinCohorte = !p.cohortes_acceso || p.cohortes_acceso.length === 0;
          const nivelOk = sinNivel || (quotaInfo.nivel && p.niveles_acceso.includes(quotaInfo.nivel));
          const cohorteOk = sinCohorte || (quotaInfo.cohorte && p.cohortes_acceso.includes(quotaInfo.cohorte));
          return nivelOk && cohorteOk;
        });
      }

      setPerfiles(filtered);
      const uniqueTematicas = [...new Set(filtered.map((p: any) => p.tematica))];
      setTematicas(uniqueTematicas);
    } catch (error) {
      console.error("Error fetching perfiles:", error);
    }
  };

  const filterPerfiles = () => {
    let filtered = perfiles;

    if (selectedTematica !== "todas") {
      filtered = filtered.filter(p => p.tematica === selectedTematica);
    }

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPerfiles(filtered);
  };

  const handleOpenPerfil = async (perfil: PerfilAsesoria) => {
    setSelectedPerfil(perfil);
    setSelectedDate(undefined);
    setSelectedSlot("");
    setExternalStep("link");
    
    if (perfil.tipo_disponibilidad !== "calendario_externo") {
      try {
        const { data: disp, error: dispError } = await supabase
          .from("disponibilidades_mentor")
          .select("*")
          .eq("perfil_asesoria_id", perfil.id)
          .order("dia_semana", { ascending: true });

        if (dispError) throw dispError;
        setDisponibilidades(disp || []);

        const { data: reservas, error: reservasError } = await supabase
          .from("reservas_asesoria")
          .select("fecha_reserva")
          .eq("perfil_asesoria_id", perfil.id)
          .neq("estado", "cancelada");

        if (reservasError) throw reservasError;
        setReservasExistentes(reservas || []);
      } catch (error) {
        console.error("Error fetching disponibilidades:", error);
      }
    }
  };

  const getAvailableSlots = () => {
    if (!selectedDate) return [];
    
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

  // ---- Reserva normal ----
  const handleReservar = async () => {
    if (isStakeholder) {
      toast({
        title: "Acceso restringido",
        description: "Tu perfil no cumple con los criterios para agendar mentorías.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPerfil || !selectedDate || !selectedSlot) return;

    setIsReserving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const [hours, minutes] = selectedSlot.split(':');
      const fechaReserva = new Date(selectedDate);
      fechaReserva.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const slotCompleto = availableSlots.find(s => s.hora_inicio === selectedSlot);
      const [hoursEnd, minutesEnd] = slotCompleto!.hora_fin.split(':');
      const fechaFin = new Date(selectedDate);
      fechaFin.setHours(parseInt(hoursEnd), parseInt(minutesEnd), 0, 0);

      const { data: reservaData, error } = await supabase
        .from("reservas_asesoria")
        .insert([{
          perfil_asesoria_id: selectedPerfil.id,
          beneficiario_id: user.id,
          mentor_id: selectedPerfil.mentor_id,
          fecha_reserva: fechaReserva.toISOString(),
          estado: "pendiente",
          tipo_reserva: "normal",
        }])
        .select()
        .single();

      if (error) throw error;

      try {
        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        const webhookData = new URLSearchParams({
          id_beneficiario: user.id,
          id_asesor: selectedPerfil.mentor_id,
          id_asesoria: selectedPerfil.id,
          id_reserva: reservaData.id,
          fecha_agendamiento: formatDate(fechaReserva),
          hora_inicio: formatDate(fechaReserva),
          hora_fin: formatDate(fechaFin),
          titulo: selectedPerfil.titulo,
          tipo_accion: "agendar",
        });

        await fetch("https://n8n-n8n.yajjj6.easypanel.host/webhook/mentorias-ysa-pacifico", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: webhookData.toString(),
        });
      } catch (webhookError) {
        console.error("Error sending webhook:", webhookError);
      }

      toast({ title: "¡Asesoría agendada exitosamente!" });
      setSelectedPerfil(null);
      setSelectedDate(undefined);
      setSelectedSlot("");
    } catch (error: any) {
      toast({ title: "Error al agendar", description: error.message, variant: "destructive" });
    } finally {
      setIsReserving(false);
    }
  };

  // ---- Flujo calendario externo ----
  const handleOpenExternalCalendar = () => {
    if (selectedPerfil?.link_calendario_externo) {
      window.open(selectedPerfil.link_calendario_externo, "_blank");
      setExternalStep("confirm");
    }
  };

  const handleConfirmExternalBooking = async (agendo: boolean) => {
    if (!agendo) {
      setSelectedPerfil(null);
      return;
    }

    setIsReserving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase
        .from("reservas_asesoria")
        .insert([{
          perfil_asesoria_id: selectedPerfil!.id,
          beneficiario_id: user.id,
          mentor_id: selectedPerfil!.mentor_id,
          fecha_reserva: new Date().toISOString(),
          estado: "pendiente",
          tipo_reserva: "calendario_externo",
        }]);

      if (error) throw error;

      setExternalStep("done");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsReserving(false);
    }
  };

  const availableSlots = getAvailableSlots();
  const isExternalCalendar = selectedPerfil?.tipo_disponibilidad === "calendario_externo";

  if (loadingQuota) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Verificando acceso...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl p-6">
          <Card className="border-muted">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Acceso Restringido</CardTitle>
              <CardDescription className="text-base mt-2">
                Para acceder a las mentorías, necesitas tener un cupo aprobado
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                El acceso a las mentorías está disponible únicamente para beneficiarios con cupo aprobado. 
                Por favor, espera a que tu solicitud sea evaluada y aprobada por el equipo administrativo.
              </p>
              <div className="pt-4">
                <Button variant="outline" onClick={() => window.history.back()}>Volver</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Mentorías YSA</h1>
          <p className="text-muted-foreground">Agenda sesiones con nuestros mentores expertos</p>
          {isAdmin && <Badge variant="secondary" className="mt-1">Acceso Administrativo</Badge>}
          {isStakeholder && <Badge variant="outline" className="mt-1">Solo Visualización</Badge>}
          {!isAdmin && !isStakeholder && quotaInfo && (
            <p className="text-sm text-muted-foreground mt-1">
              Nivel {quotaInfo.nivel} • Cohorte {quotaInfo.cohorte}
            </p>
          )}
        </div>

        <Tabs defaultValue="explorar" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="explorar">
              <Search className="w-4 h-4 mr-2" />
              Explorar Mentorías
            </TabsTrigger>
            <TabsTrigger value="mis-asesorias">
              <BookMarked className="w-4 h-4 mr-2" />
              Mis Asesorías
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explorar" className="space-y-6 mt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar mentorías..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedTematica} onValueChange={setSelectedTematica}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Filtrar por temática" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las temáticas</SelectItem>
                  {tematicas.map((tem) => (
                    <SelectItem key={tem} value={tem}>{tem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPerfiles.map((perfil) => (
                <Card
                  key={perfil.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleOpenPerfil(perfil)}
                >
                  {perfil.banner_url && (
                    <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${perfil.banner_url})` }} />
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {perfil.foto_url && (
                        <img src={perfil.foto_url} alt={perfil.titulo} className="w-12 h-12 rounded-full object-cover" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{perfil.titulo}</CardTitle>
                        <CardDescription className="text-xs">{perfil.tematica}</CardDescription>
                      </div>
                    </div>
                    {perfil.tipo_disponibilidad === "calendario_externo" && (
                      <Badge variant="outline" className="w-fit text-xs mt-1">
                        <Link2 className="w-3 h-3 mr-1" />
                        Calendario externo
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{perfil.descripcion}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mis-asesorias" className="mt-6">
            <MisAsesorias />
          </TabsContent>
        </Tabs>

        {/* Dialog principal */}
        <Dialog open={!!selectedPerfil} onOpenChange={() => setSelectedPerfil(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPerfil?.titulo}</DialogTitle>
            </DialogHeader>
            
            {selectedPerfil && (
              <div className="space-y-6">
                {selectedPerfil.banner_url && (
                  <div className="h-48 bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${selectedPerfil.banner_url})` }} />
                )}

                <div className="flex items-center gap-4">
                  {selectedPerfil.foto_url && (
                    <img src={selectedPerfil.foto_url} alt={selectedPerfil.titulo} className="w-20 h-20 rounded-full object-cover" />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{selectedPerfil.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{selectedPerfil.tematica}</p>
                  </div>
                </div>

                {selectedPerfil.descripcion && (
                  <div>
                    <h4 className="font-semibold mb-2">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{selectedPerfil.descripcion}</p>
                  </div>
                )}

                {selectedPerfil.perfil_mentor && (
                  <div>
                    <h4 className="font-semibold mb-2">Sobre el Mentor</h4>
                    <p className="text-sm text-muted-foreground">{selectedPerfil.perfil_mentor}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Agendar Sesión
                  </h4>

                  {/* ---- FLUJO CALENDARIO EXTERNO ---- */}
                  {isExternalCalendar ? (
                    <div className="space-y-4">
                      {externalStep === "link" && (
                        <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-4">
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            <Link2 className="w-7 h-7 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-base">Este mentor usa calendario externo</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Al hacer clic se abrirá el calendario del mentor en una nueva ventana. Agenda tu cita allí y luego confirma aquí.
                            </p>
                          </div>
                          {isStakeholder ? (
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground text-center">
                                Tu perfil no cumple con los criterios para agendar mentorías.
                              </p>
                            </div>
                          ) : (
                            <Button className="w-full sm:w-auto" onClick={handleOpenExternalCalendar}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Abrir calendario y agendar
                            </Button>
                          )}
                        </div>
                      )}

                      {externalStep === "confirm" && (
                        <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-4">
                          <p className="font-semibold text-base">¿Pudiste agendar tu cita en el calendario externo?</p>
                          <p className="text-sm text-muted-foreground">
                            Si ya agendaste, confirma aquí para que quede registrado en "Mis Asesorías".
                          </p>
                          <div className="flex gap-3 justify-center flex-wrap">
                            <Button
                              onClick={() => handleConfirmExternalBooking(true)}
                              disabled={isReserving}
                              className="gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {isReserving ? "Guardando..." : "Sí, agendé mi cita"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleConfirmExternalBooking(false)}
                              disabled={isReserving}
                              className="gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              No pude agendar, cerrar
                            </Button>
                          </div>
                          <button
                            className="text-xs text-primary underline"
                            onClick={handleOpenExternalCalendar}
                          >
                            Volver a abrir el calendario →
                          </button>
                        </div>
                      )}

                      {externalStep === "done" && (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center space-y-4">
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-7 h-7 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-base">¡Reserva registrada!</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Tu asesoría fue agendada a través del calendario externo. Busca en tu correo electrónico la confirmación de la cita — allí encontrarás el <strong>link de acceso a la sesión</strong>.
                            </p>
                          </div>
                          <Button variant="outline" onClick={() => setSelectedPerfil(null)}>
                            Cerrar
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ---- FLUJO SLOTS NORMALES ---- */
                    <div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Selecciona una fecha:</p>
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => {
                              const dayOfWeek = date.getDay();
                              return !disponibilidades.some(d => d.dia_semana === dayOfWeek) || date < new Date();
                            }}
                            className="rounded-md border pointer-events-auto"
                          />
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Horarios disponibles:</p>
                          {!selectedDate ? (
                            <p className="text-sm text-muted-foreground">Selecciona una fecha primero</p>
                          ) : availableSlots.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay horarios disponibles para esta fecha</p>
                          ) : (
                            <div className="space-y-2">
                              {availableSlots.map((slot) => (
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

                      {isStakeholder ? (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground text-center">
                            Tu perfil no cumple con los criterios para agendar mentorías.
                          </p>
                        </div>
                      ) : (
                        <Button
                          className="w-full mt-4"
                          disabled={!selectedDate || !selectedSlot || isReserving}
                          onClick={handleReservar}
                        >
                          {isReserving ? "Agendando..." : "Agendar Mentoría"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Mentorias;
