import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type NivelEmprendimiento = Database["public"]["Enums"]["nivel_emprendimiento"];

interface NotificacionesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Estudiante {
  user_id: string;
  email: string;
  nombres: string;
  apellidos: string;
}

export const NotificacionesModal = ({ open, onOpenChange }: NotificacionesModalProps) => {
  const [tipoNotificacion, setTipoNotificacion] = useState<"nueva_clase" | "anuncio" | "seguimiento">("anuncio");
  const [tipoDestinatario, setTipoDestinatario] = useState<"cohorte_completa" | "estudiantes">("cohorte_completa");
  const [nivelSeleccionado, setNivelSeleccionado] = useState<NivelEmprendimiento | "">("");
  const [cohorteSeleccionada, setCohorteSeleccionada] = useState<number | "">("");
  const [estudiantesSeleccionados, setEstudiantesSeleccionados] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Obtener cohortes disponibles
  const { data: cohortes } = useQuery({
    queryKey: ["cohortes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("asignacion_cupos")
        .select("cohorte")
        .order("cohorte");
      
      const cohortesUnicas = [...new Set(data?.map(d => d.cohorte) || [])];
      return cohortesUnicas;
    },
  });

  // Obtener estudiantes según nivel y cohorte seleccionados
  const { data: estudiantes } = useQuery({
    queryKey: ["estudiantes-notificaciones", nivelSeleccionado, cohorteSeleccionada],
    queryFn: async () => {
      if (!nivelSeleccionado || !cohorteSeleccionada) return [];

      const { data: asignaciones } = await supabase
        .from("asignacion_cupos")
        .select(`
          emprendimiento_id,
          emprendimientos (
            user_id,
            usuarios (
              id,
              email,
              nombres,
              apellidos
            )
          )
        `)
        .eq("nivel", nivelSeleccionado)
        .eq("cohorte", cohorteSeleccionada)
        .eq("estado", "aprobado");

      const estudiantesData: Estudiante[] = [];
      if (asignaciones) {
        for (const asignacion of asignaciones) {
          const emp = asignacion.emprendimientos as any;
          if (emp?.usuarios) {
            estudiantesData.push({
              user_id: emp.usuarios.id,
              email: emp.usuarios.email,
              nombres: emp.usuarios.nombres || "",
              apellidos: emp.usuarios.apellidos || "",
            });
          }
        }
      }

      return estudiantesData;
    },
    enabled: !!nivelSeleccionado && !!cohorteSeleccionada && tipoDestinatario === "estudiantes",
  });

  const handleEnviar = async () => {
    if (!tipoNotificacion || !mensaje.trim()) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (tipoDestinatario === "cohorte_completa") {
      if (!nivelSeleccionado || !cohorteSeleccionada) {
        toast.error("Por favor selecciona nivel y cohorte");
        return;
      }
    } else {
      if (estudiantesSeleccionados.length === 0) {
        toast.error("Por favor selecciona al menos un estudiante");
        return;
      }
    }

    setEnviando(true);

    try {
      const payload = {
        tipo_notificacion: tipoNotificacion,
        tipo_destinatario: tipoDestinatario,
        nivel: tipoDestinatario === "cohorte_completa" ? nivelSeleccionado : "",
        cohorte: tipoDestinatario === "cohorte_completa" ? cohorteSeleccionada : "",
        emails: tipoDestinatario === "estudiantes" ? estudiantesSeleccionados.join(",") : "",
        mensaje: mensaje,
      };

      const response = await fetch("https://n8n-n8n.yajjj6.easypanel.host/webhook/ysa-notificaciones-estudiantes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Error al enviar notificaciones");
      }

      toast.success("Notificaciones enviadas correctamente");
      
      // Reset form
      setTipoNotificacion("anuncio");
      setTipoDestinatario("cohorte_completa");
      setNivelSeleccionado("");
      setCohorteSeleccionada("");
      setEstudiantesSeleccionados([]);
      setMensaje("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al enviar notificaciones");
    } finally {
      setEnviando(false);
    }
  };

  const toggleEstudiante = (email: string) => {
    setEstudiantesSeleccionados(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const seleccionarTodosEstudiantes = () => {
    if (estudiantes) {
      setEstudiantesSeleccionados(estudiantes.map(e => e.email));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Notificaciones</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipo de notificación */}
          <div className="space-y-2">
            <Label>Tipo de Notificación</Label>
            <Select value={tipoNotificacion} onValueChange={(value: any) => setTipoNotificacion(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nueva_clase">Nueva Clase</SelectItem>
                <SelectItem value="anuncio">Anuncio</SelectItem>
                <SelectItem value="seguimiento">Seguimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de destinatario */}
          <div className="space-y-2">
            <Label>Destinatarios</Label>
            <RadioGroup value={tipoDestinatario} onValueChange={(value: any) => {
              setTipoDestinatario(value);
              setEstudiantesSeleccionados([]);
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cohorte_completa" id="cohorte" />
                <Label htmlFor="cohorte" className="font-normal cursor-pointer">Cohorte Completa</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="estudiantes" id="estudiantes" />
                <Label htmlFor="estudiantes" className="font-normal cursor-pointer">Estudiantes Específicos</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Selección de nivel */}
          <div className="space-y-2">
            <Label>Nivel</Label>
            <Select 
              value={nivelSeleccionado} 
              onValueChange={(value: any) => {
                setNivelSeleccionado(value);
                setCohorteSeleccionada("");
                setEstudiantesSeleccionados([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Starter">Starter</SelectItem>
                <SelectItem value="Growth">Growth</SelectItem>
                <SelectItem value="Scale">Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selección de cohorte */}
          {nivelSeleccionado && (
            <div className="space-y-2">
              <Label>Cohorte</Label>
              <Select 
                value={cohorteSeleccionada.toString()} 
                onValueChange={(value) => {
                  setCohorteSeleccionada(parseInt(value));
                  setEstudiantesSeleccionados([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cohorte" />
                </SelectTrigger>
                <SelectContent>
                  {cohortes?.map((cohorte) => (
                    <SelectItem key={cohorte} value={cohorte.toString()}>
                      Cohorte {cohorte}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Lista de estudiantes específicos */}
          {tipoDestinatario === "estudiantes" && nivelSeleccionado && cohorteSeleccionada && estudiantes && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Estudiantes</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={seleccionarTodosEstudiantes}
                >
                  Seleccionar Todos
                </Button>
              </div>
              <div className="border border-border rounded-md p-4 max-h-60 overflow-y-auto space-y-3">
                {estudiantes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay estudiantes en esta cohorte
                  </p>
                ) : (
                  estudiantes.map((estudiante) => (
                    <div key={estudiante.user_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={estudiante.user_id}
                        checked={estudiantesSeleccionados.includes(estudiante.email)}
                        onCheckedChange={() => toggleEstudiante(estudiante.email)}
                      />
                      <Label 
                        htmlFor={estudiante.user_id} 
                        className="font-normal cursor-pointer flex-1"
                      >
                        {estudiante.nombres} {estudiante.apellidos} ({estudiante.email})
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Mensaje */}
          <div className="space-y-2">
            <Label>Mensaje</Label>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="min-h-[150px]"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEnviar}
              disabled={enviando}
            >
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Notificaciones"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
