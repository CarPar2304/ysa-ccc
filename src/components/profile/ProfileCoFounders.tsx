import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Users, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Thumb } from "@/lib/imageUrl";

interface CoFounder {
  id: string;
  user_id: string;
  rol: string;
  created_at: string;
  usuario?: {
    nombres: string;
    apellidos: string;
    email: string;
    avatar_url: string | null;
    celular: string | null;
  };
}

interface ProfileCoFoundersProps {
  emprendimientoId: string;
  emprendimientoNombre: string;
  isOwner: boolean;
}

const tipoDocOptions = [
  { value: "Cédula de ciudadanía", label: "Cédula de Ciudadanía" },
  { value: "Cédula de extranjería", label: "Cédula de Extranjería" },
  { value: "Tarjeta de identidad", label: "Tarjeta de Identidad" },
  { value: "Pasaporte", label: "Pasaporte" },
  { value: "Permiso por Protección Temporal (PPT)", label: "PPT" },
];

const generoOptions = [
  { value: "Femenino", label: "Femenino" },
  { value: "Masculino", label: "Masculino" },
  { value: "Otro", label: "Otro" },
  { value: "Prefiero no decir", label: "Prefiero no decir" },
];

const identificacionEtnicaOptions = [
  { value: "Ninguna", label: "Ninguna" },
  { value: "Afrodescendiente", label: "Afrodescendiente" },
  { value: "Indígena", label: "Indígena" },
  { value: "Raizal", label: "Raizal" },
  { value: "Palenquero/a", label: "Palenquero/a" },
  { value: "Rom/Gitano", label: "Rom/Gitano" },
];

export const ProfileCoFounders = ({ emprendimientoId, emprendimientoNombre, isOwner }: ProfileCoFoundersProps) => {
  const [coFounders, setCoFounders] = useState<CoFounder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    celular: "",
    tipo_documento: "",
    numero_identificacion: "",
    genero: "",
    departamento: "",
    municipio: "",
    direccion: "",
    ano_nacimiento: "",
    identificacion_etnica: "",
  });

  useEffect(() => {
    fetchCoFounders();
  }, [emprendimientoId]);

  const fetchCoFounders = async () => {
    try {
      const { data, error } = await supabase
        .from("emprendimiento_miembros")
        .select("*")
        .eq("emprendimiento_id", emprendimientoId);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(m => m.user_id);
        const { data: usuarios } = await supabase
          .from("usuarios")
          .select("id, nombres, apellidos, email, avatar_url, celular")
          .in("id", userIds);

        const enriched = data.map(m => ({
          ...m,
          usuario: usuarios?.find(u => u.id === m.user_id) || undefined,
        }));
        setCoFounders(enriched);
      } else {
        setCoFounders([]);
      }
    } catch (error) {
      console.error("Error fetching co-founders:", error);
    } finally {
      setLoading(false);
    }
  };

  const friendlyError = (raw: string): { title: string; description: string } => {
    const msg = (raw || "").toLowerCase();
    if (msg.includes("ya existe") || msg.includes("already") || msg.includes("registrado con este correo")) {
      return { title: "Correo ya registrado", description: "Ya existe una cuenta con este correo electrónico. Pídele al co-fundador que use otro correo o que inicie sesión con el actual." };
    }
    if (msg.includes("permiso") || msg.includes("no tienes permiso") || msg.includes("forbidden")) {
      return { title: "Sin permisos", description: "No tienes permiso para agregar co-fundadores a este emprendimiento." };
    }
    if (msg.includes("emprendimiento no encontrado") || msg.includes("not found")) {
      return { title: "Emprendimiento no encontrado", description: "No pudimos encontrar el emprendimiento. Recarga la página e inténtalo de nuevo." };
    }
    if (msg.includes("datos inválidos") || msg.includes("invalid") || msg.includes("validation")) {
      return { title: "Datos inválidos", description: "Revisa los campos del formulario: el correo debe ser válido y los nombres/identificación son obligatorios." };
    }
    if (msg.includes("password") || msg.includes("contraseña")) {
      return { title: "Identificación inválida", description: "El número de identificación se usa como contraseña y debe tener al menos 6 caracteres." };
    }
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return { title: "Registro duplicado", description: "Este co-fundador ya está vinculado al emprendimiento." };
    }
    if (msg.includes("network") || msg.includes("failed to fetch")) {
      return { title: "Sin conexión", description: "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente." };
    }
    return { title: "No se pudo crear el co-fundador", description: "Ocurrió un problema al registrar al co-fundador. Inténtalo de nuevo en unos segundos." };
  };

  const handleSubmit = async () => {
    if (!form.nombres || !form.apellidos || !form.email || !form.numero_identificacion) {
      toast({ title: "Faltan datos obligatorios", description: "Completa nombres, apellidos, correo y número de identificación.", variant: "destructive" });
      return;
    }
    if (form.numero_identificacion.length < 6) {
      toast({ title: "Identificación muy corta", description: "El número de identificación debe tener al menos 6 caracteres (se usará como contraseña inicial).", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-cofundador", {
        body: {
          ...form,
          emprendimiento_id: emprendimientoId,
        },
      });

      // Extract real server error from FunctionsHttpError context
      let serverError: string | null = null;
      if (error) {
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            serverError = body?.error || body?.message || null;
          } else if (ctx && typeof ctx.text === "function") {
            serverError = await ctx.text();
          }
        } catch {
          // ignore parse errors
        }
        const { title, description } = friendlyError(serverError || error.message || "");
        toast({ title, description, variant: "destructive" });
        return;
      }

      if (data?.error) {
        const { title, description } = friendlyError(data.error);
        toast({ title, description, variant: "destructive" });
        return;
      }

      toast({ title: "Co-fundador creado", description: data?.message || "El co-fundador fue registrado exitosamente." });
      setDialogOpen(false);
      setForm({ nombres: "", apellidos: "", email: "", celular: "", tipo_documento: "", numero_identificacion: "", genero: "", departamento: "", municipio: "", direccion: "", ano_nacimiento: "", identificacion_etnica: "" });
      fetchCoFounders();
    } catch (err: any) {
      const { title, description } = friendlyError(err?.message || "");
      toast({ title, description, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("emprendimiento_miembros")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      toast({ title: "Miembro removido" });
      fetchCoFounders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Equipo Fundador
        </CardTitle>
        <CardDescription>
          Miembros vinculados a <span className="font-medium text-foreground">{emprendimientoNombre}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {coFounders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay co-fundadores vinculados aún.</p>
        ) : (
          <div className="space-y-3">
            {coFounders.map((cf) => (
              <div key={cf.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-accent/30 border border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={Thumb.avatar(cf.usuario?.avatar_url)} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {(cf.usuario?.nombres?.[0] || "")}{(cf.usuario?.apellidos?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{cf.usuario?.nombres} {cf.usuario?.apellidos}</p>
                    <p className="text-xs text-muted-foreground">{cf.usuario?.email}</p>
                    {cf.usuario?.celular && (
                      <p className="text-xs text-muted-foreground">{cf.usuario.celular}</p>
                    )}
                  </div>
                </div>
                {isOwner && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(cf.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <Button variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar Co-fundador
          </Button>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Co-fundador</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">La contraseña del co-fundador será su número de identificación.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombres *</Label>
                  <Input value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Apellidos *</Label>
                  <Input value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <Select value={form.tipo_documento} onValueChange={v => setForm(f => ({ ...f, tipo_documento: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {tipoDocOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número de Identificación *</Label>
                  <Input value={form.numero_identificacion} onChange={e => setForm(f => ({ ...f, numero_identificacion: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input value={form.celular} onChange={e => setForm(f => ({ ...f, celular: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Año de Nacimiento</Label>
                  <Input value={form.ano_nacimiento} onChange={e => setForm(f => ({ ...f, ano_nacimiento: e.target.value }))} placeholder="Ej: 1995" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Género</Label>
                  <Select value={form.genero} onValueChange={v => setForm(f => ({ ...f, genero: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {generoOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Identificación Étnica</Label>
                  <Select value={form.identificacion_etnica} onValueChange={v => setForm(f => ({ ...f, identificacion_etnica: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {identificacionEtnicaOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input value={form.departamento} onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Municipio</Label>
                  <Input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Co-fundador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};