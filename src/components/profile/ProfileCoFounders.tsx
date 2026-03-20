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
  { value: "cc", label: "Cédula de Ciudadanía" },
  { value: "ce", label: "Cédula de Extranjería" },
  { value: "ti", label: "Tarjeta de Identidad" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "pep", label: "PEP" },
  { value: "ppt", label: "PPT" },
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

  const handleSubmit = async () => {
    if (!form.nombres || !form.apellidos || !form.email) {
      toast({ title: "Error", description: "Nombres, apellidos y email son obligatorios", variant: "destructive" });
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

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Co-fundador creado", description: data.message });
      setDialogOpen(false);
      setForm({ nombres: "", apellidos: "", email: "", celular: "", tipo_documento: "", numero_identificacion: "", genero: "", departamento: "", municipio: "", direccion: "", ano_nacimiento: "" });
      fetchCoFounders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
                    <AvatarImage src={cf.usuario?.avatar_url || undefined} />
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
                  <Label>Celular</Label>
                  <Input value={form.celular} onChange={e => setForm(f => ({ ...f, celular: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Año de Nacimiento</Label>
                  <Input value={form.ano_nacimiento} onChange={e => setForm(f => ({ ...f, ano_nacimiento: e.target.value }))} />
                </div>
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
                  <Label>Número de Identificación</Label>
                  <Input value={form.numero_identificacion} onChange={e => setForm(f => ({ ...f, numero_identificacion: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Género</Label>
                  <Select value={form.genero} onValueChange={v => setForm(f => ({ ...f, genero: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                      <SelectItem value="Prefiero no decir">Prefiero no decir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input value={form.departamento} onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Municipio</Label>
                  <Input value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                </div>
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