import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, CalendarDays, Link2, Save } from "lucide-react";

interface Disponibilidad {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

interface DisponibilidadManagerProps {
  perfilAsesoriaId: string;
  tipoDisponibilidad?: string;
  linkCalendarioExterno?: string;
  onTipoChange?: (tipo: string, link?: string) => void;
}

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

export const DisponibilidadManager = ({
  perfilAsesoriaId,
  tipoDisponibilidad: initialTipo,
  linkCalendarioExterno: initialLink,
  onTipoChange,
}: DisponibilidadManagerProps) => {
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [diaSemana, setDiaSemana] = useState<number>(1);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("10:00");
  const [tipo, setTipo] = useState<string>(initialTipo || "slots");
  const [linkExterno, setLinkExterno] = useState(initialLink || "");
  const [savingLink, setSavingLink] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDisponibilidades();
  }, [perfilAsesoriaId]);

  useEffect(() => {
    if (initialTipo) setTipo(initialTipo);
  }, [initialTipo]);

  useEffect(() => {
    if (initialLink) setLinkExterno(initialLink);
  }, [initialLink]);

  const fetchDisponibilidades = async () => {
    try {
      const { data, error } = await supabase
        .from("disponibilidades_mentor")
        .select("*")
        .eq("perfil_asesoria_id", perfilAsesoriaId)
        .order("dia_semana", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (error) throw error;
      setDisponibilidades(data || []);
    } catch (error) {
      console.error("Error fetching disponibilidades:", error);
    }
  };

  const handleTipoChange = async (newTipo: string) => {
    setTipo(newTipo);
    try {
      const { error } = await supabase
        .from("perfiles_asesoria")
        .update({
          tipo_disponibilidad: newTipo,
          link_calendario_externo: newTipo === "slots" ? null : linkExterno || null,
        })
        .eq("id", perfilAsesoriaId);
      if (error) throw error;
      onTipoChange?.(newTipo, linkExterno);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveLink = async () => {
    setSavingLink(true);
    try {
      const { error } = await supabase
        .from("perfiles_asesoria")
        .update({ link_calendario_externo: linkExterno || null })
        .eq("id", perfilAsesoriaId);
      if (error) throw error;
      toast({ title: "Link guardado correctamente" });
      onTipoChange?.(tipo, linkExterno);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingLink(false);
    }
  };

  const handleAdd = async () => {
    try {
      const { error } = await supabase
        .from("disponibilidades_mentor")
        .insert([{
          perfil_asesoria_id: perfilAsesoriaId,
          dia_semana: diaSemana,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
        }]);

      if (error) throw error;
      toast({ title: "Disponibilidad agregada" });
      fetchDisponibilidades();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("disponibilidades_mentor")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Disponibilidad eliminada" });
      fetchDisponibilidades();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de tipo */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Tipo de disponibilidad</Label>
        <RadioGroup value={tipo} onValueChange={handleTipoChange} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label
            htmlFor="tipo-slots"
            className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              tipo === "slots" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="slots" id="tipo-slots" />
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Slots de disponibilidad</p>
                <p className="text-xs text-muted-foreground">Define horarios semanales</p>
              </div>
            </div>
          </label>

          <label
            htmlFor="tipo-externo"
            className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              tipo === "calendario_externo" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="calendario_externo" id="tipo-externo" />
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Calendario externo</p>
                <p className="text-xs text-muted-foreground">Calendly, Cal.com, etc.</p>
              </div>
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* Panel según tipo */}
      {tipo === "calendario_externo" ? (
        <div className="space-y-3 p-4 rounded-lg bg-muted/40 border">
          <Label htmlFor="link-externo">Link del calendario externo</Label>
          <p className="text-xs text-muted-foreground">
            Ingresa el link de tu Calendly, Cal.com u otra herramienta de agendamiento. Los beneficiarios serán redirigidos a este link para agendar.
          </p>
          <div className="flex gap-2">
            <Input
              id="link-externo"
              type="url"
              value={linkExterno}
              onChange={(e) => setLinkExterno(e.target.value)}
              placeholder="https://calendly.com/tu-usuario/mentoria"
            />
            <Button onClick={handleSaveLink} disabled={savingLink || !linkExterno}>
              <Save className="w-4 h-4 mr-2" />
              {savingLink ? "Guardando..." : "Guardar"}
            </Button>
          </div>
          {linkExterno && (
            <a
              href={linkExterno}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline"
            >
              Abrir link para verificar →
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Día de la semana</Label>
              <Select value={diaSemana.toString()} onValueChange={(v) => setDiaSemana(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((dia) => (
                    <SelectItem key={dia.value} value={dia.value.toString()}>
                      {dia.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Hora fin</Label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Disponibilidad
          </Button>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Disponibilidades Configuradas</Label>
            {disponibilidades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay disponibilidades configuradas</p>
            ) : (
              <div className="space-y-2">
                {disponibilidades.map((disp) => (
                  <div
                    key={disp.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        {DIAS_SEMANA.find((d) => d.value === disp.dia_semana)?.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {disp.hora_inicio} - {disp.hora_fin}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(disp.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
