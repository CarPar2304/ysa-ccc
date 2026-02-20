import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock, X, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DisponibilidadManager } from "./DisponibilidadManager";

const NIVELES = ["Starter", "Growth", "Scale"] as const;
const COHORTES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface PerfilAsesoria {
  id: string;
  titulo: string;
  descripcion: string;
  tematica: string;
  foto_url: string;
  banner_url: string;
  perfil_mentor: string;
  activo: boolean;
  tipo_disponibilidad?: string;
  link_calendario_externo?: string;
  niveles_acceso?: string[] | null;
  cohortes_acceso?: number[] | null;
}

const EMPTY_FORM = {
  titulo: "",
  descripcion: "",
  tematica: "",
  foto_url: "",
  banner_url: "",
  perfil_mentor: "",
  activo: true,
  niveles_acceso: null as string[] | null,
  cohortes_acceso: null as number[] | null,
};

export const AsesoriasManager = () => {
  const [perfiles, setPerfiles] = useState<PerfilAsesoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState<PerfilAsesoria | null>(null);
  const { toast } = useToast();
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const toggleNivel = (nivel: string) => {
    const current = formData.niveles_acceso ?? [];
    const updated = current.includes(nivel)
      ? current.filter((n) => n !== nivel)
      : [...current, nivel];
    setFormData((prev) => ({ ...prev, niveles_acceso: updated.length === 0 ? null : updated }));
  };

  const toggleCohorte = (cohorte: number) => {
    const current = formData.cohortes_acceso ?? [];
    const updated = current.includes(cohorte)
      ? current.filter((c) => c !== cohorte)
      : [...current, cohorte];
    setFormData((prev) => ({ ...prev, cohortes_acceso: updated.length === 0 ? null : updated }));
  };

  useEffect(() => {
    fetchPerfiles();
  }, []);

  const fetchPerfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("perfiles_asesoria")
        .select("*")
        .eq("mentor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPerfiles(data || []);
    } catch (error) {
      console.error("Error fetching perfiles:", error);
    }
  };

  const handleImageUpload = async (file: File, type: "foto" | "banner") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      if (type === "foto") setUploadingFoto(true);
      else setUploadingBanner(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${type}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("mentoria-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("mentoria-images")
        .getPublicUrl(fileName);

      if (type === "foto") {
        setFormData((prev) => ({ ...prev, foto_url: publicUrl }));
      } else {
        setFormData((prev) => ({ ...prev, banner_url: publicUrl }));
      }

      toast({ title: "Imagen subida exitosamente" });
    } catch (error: any) {
      toast({ title: "Error al subir imagen", description: error.message, variant: "destructive" });
    } finally {
      if (type === "foto") setUploadingFoto(false);
      else setUploadingBanner(false);
    }
  };

  const handleRemoveImage = (type: "foto" | "banner") => {
    if (type === "foto") {
      setFormData((prev) => ({ ...prev, foto_url: "" }));
    } else {
      setFormData((prev) => ({ ...prev, banner_url: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      if (editingPerfil) {
        const { error } = await supabase
          .from("perfiles_asesoria")
          .update(formData)
          .eq("id", editingPerfil.id);

        if (error) throw error;
        toast({ title: "Perfil actualizado exitosamente" });
      } else {
        const { error } = await supabase
          .from("perfiles_asesoria")
          .insert([{ ...formData, mentor_id: user.id }]);

        if (error) throw error;
        toast({ title: "Perfil de asesoría creado exitosamente" });
      }

      setFormData({ ...EMPTY_FORM });
      setEditingPerfil(null);
      fetchPerfiles();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (perfil: PerfilAsesoria) => {
    setEditingPerfil(perfil);
    setFormData({
      titulo: perfil.titulo,
      descripcion: perfil.descripcion || "",
      tematica: perfil.tematica,
      foto_url: perfil.foto_url || "",
      banner_url: perfil.banner_url || "",
      perfil_mentor: perfil.perfil_mentor || "",
      activo: perfil.activo,
      niveles_acceso: perfil.niveles_acceso ?? null,
      cohortes_acceso: perfil.cohortes_acceso ?? null,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este perfil de asesoría?")) return;

    try {
      const { error } = await supabase
        .from("perfiles_asesoria")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Perfil eliminado exitosamente" });
      fetchPerfiles();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingPerfil ? "Editar" : "Crear"} Perfil de Asesoría</CardTitle>
          <CardDescription>
            Configura tu perfil de mentorías para que los beneficiarios puedan agendar sesiones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
                  required
                  placeholder="Ej: Mentoría en Marketing Digital"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tematica">Temática *</Label>
                <Input
                  id="tematica"
                  value={formData.tematica}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tematica: e.target.value }))}
                  required
                  placeholder="Ej: Marketing, Finanzas, Tecnología"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Describe de qué trata tu mentoría"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="perfil_mentor">Tu Perfil como Mentor</Label>
              <Textarea
                id="perfil_mentor"
                value={formData.perfil_mentor}
                onChange={(e) => setFormData((prev) => ({ ...prev, perfil_mentor: e.target.value }))}
                placeholder="Cuéntales a los beneficiarios sobre tu experiencia"
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                {formData.foto_url ? (
                  <div className="relative">
                    <img src={formData.foto_url} alt="Vista previa foto" className="w-full h-32 object-cover rounded-md" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => handleRemoveImage("foto")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "foto"); }} disabled={uploadingFoto} />
                    {uploadingFoto && <span className="text-sm text-muted-foreground">Subiendo...</span>}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Banner</Label>
                {formData.banner_url ? (
                  <div className="relative">
                    <img src={formData.banner_url} alt="Vista previa banner" className="w-full h-32 object-cover rounded-md" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => handleRemoveImage("banner")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "banner"); }} disabled={uploadingBanner} />
                    {uploadingBanner && <span className="text-sm text-muted-foreground">Subiendo...</span>}
                  </div>
                )}
              </div>
            </div>

            {/* ---- Público objetivo (solo beneficiarios) ---- */}
            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Público objetivo (beneficiarios)</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Selecciona los niveles y cohortes que podrán ver este perfil. Si no seleccionas ninguno, <strong>todos los beneficiarios con cupo aprobado</strong> podrán verlo.
              </p>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Niveles</Label>
                <div className="flex flex-wrap gap-3">
                  {NIVELES.map((nivel) => {
                    const checked = formData.niveles_acceso?.includes(nivel) ?? false;
                    return (
                      <label key={nivel} className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors ${checked ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleNivel(nivel)}
                        />
                        {nivel}
                      </label>
                    );
                  })}
                </div>
                {!formData.niveles_acceso && (
                  <p className="text-xs text-muted-foreground">Sin restricción — todos los niveles</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cohortes</Label>
                <div className="flex flex-wrap gap-2">
                  {COHORTES.map((c) => {
                    const checked = formData.cohortes_acceso?.includes(c) ?? false;
                    return (
                      <label key={c} className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors ${checked ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleCohorte(c)}
                        />
                        Cohorte {c}
                      </label>
                    );
                  })}
                </div>
                {!formData.cohortes_acceso && (
                  <p className="text-xs text-muted-foreground">Sin restricción — todas las cohortes</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, activo: checked }))}
                />
                <Label htmlFor="activo">Visible para beneficiarios</Label>
              </div>
              <p className="text-xs text-muted-foreground ml-8">
                {formData.activo
                  ? "Los beneficiarios podrán ver y agendar este perfil de asesoría"
                  : "Este perfil estará oculto para los beneficiarios hasta que lo actives"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                {editingPerfil ? "Actualizar" : "Crear"} Perfil
              </Button>
              {editingPerfil && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingPerfil(null);
                    setFormData({ ...EMPTY_FORM });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {perfiles.map((perfil) => (
          <Card key={perfil.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{perfil.titulo}</CardTitle>
                  <CardDescription>{perfil.tematica}</CardDescription>
                  {/* Badges de audiencia */}
                  {(perfil.niveles_acceso?.length || perfil.cohortes_acceso?.length) ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {perfil.niveles_acceso?.map((n) => (
                        <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
                      ))}
                      {perfil.cohortes_acceso?.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">Cohorte {c}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Todos los niveles y cohortes</p>
                  )}
                </div>
                <div className="flex gap-2 ml-2 shrink-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Clock className="w-4 h-4 mr-2" />
                        Disponibilidad
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Gestionar Disponibilidad - {perfil.titulo}</DialogTitle>
                      </DialogHeader>
                      <DisponibilidadManager
                        perfilAsesoriaId={perfil.id}
                        tipoDisponibilidad={perfil.tipo_disponibilidad}
                        linkCalendarioExterno={perfil.link_calendario_externo ?? undefined}
                        onTipoChange={() => fetchPerfiles()}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(perfil)}>
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(perfil.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{perfil.descripcion}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${perfil.activo ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-xs text-muted-foreground">
                  {perfil.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
