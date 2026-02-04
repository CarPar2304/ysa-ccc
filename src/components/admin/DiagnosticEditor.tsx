import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus, Pencil } from "lucide-react";
import { DiagnosticExportModal } from "./DiagnosticExportModal";

interface Emprendimiento {
  id: string;
  nombre: string;
  user_id: string;
}

interface Diagnostico {
  id: string;
  emprendimiento_id: string;
  contenido: string;
  visible_para_usuario: boolean;
  created_at: string;
  updated_at: string;
}

export function DiagnosticEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emprendimientos, setEmprendimientos] = useState<Emprendimiento[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [selectedEmprendimiento, setSelectedEmprendimiento] = useState<string>("");
  const [contenido, setContenido] = useState("");
  const [visibleParaUsuario, setVisibleParaUsuario] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch emprendimientos
      const { data: empData, error: empError } = await supabase
        .from("emprendimientos")
        .select("id, nombre, user_id")
        .order("nombre");

      if (empError) throw empError;
      setEmprendimientos(empData || []);

      // Fetch diagnosticos
      const { data: diagData, error: diagError } = await supabase
        .from("diagnosticos")
        .select("*")
        .order("created_at", { ascending: false });

      if (diagError) throw diagError;
      setDiagnosticos(diagData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEmprendimiento || !contenido.trim()) {
      toast({
        title: "Error",
        description: "Selecciona un emprendimiento y escribe el diagnóstico",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("diagnosticos")
          .update({
            contenido,
            visible_para_usuario: visibleParaUsuario,
          })
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Diagnóstico actualizado correctamente",
        });
      } else {
        // Insert new
        const { error } = await supabase.from("diagnosticos").insert({
          emprendimiento_id: selectedEmprendimiento,
          contenido,
          visible_para_usuario: visibleParaUsuario,
        });

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Diagnóstico creado correctamente",
        });
      }

      // Reset form
      setSelectedEmprendimiento("");
      setContenido("");
      setVisibleParaUsuario(true);
      setEditingId(null);

      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (diagnostico: Diagnostico) => {
    setSelectedEmprendimiento(diagnostico.emprendimiento_id);
    setContenido(diagnostico.contenido || "");
    setVisibleParaUsuario(diagnostico.visible_para_usuario);
    setEditingId(diagnostico.id);
  };

  const handleCancel = () => {
    setSelectedEmprendimiento("");
    setContenido("");
    setVisibleParaUsuario(true);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? "Editar Diagnóstico" : "Crear Nuevo Diagnóstico"}
          </CardTitle>
          <CardDescription>
            {editingId
              ? "Modifica el diagnóstico del emprendimiento"
              : "Crea un diagnóstico para un emprendimiento"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emprendimiento">Emprendimiento</Label>
            <Select
              value={selectedEmprendimiento}
              onValueChange={setSelectedEmprendimiento}
              disabled={editingId !== null}
            >
              <SelectTrigger id="emprendimiento">
                <SelectValue placeholder="Selecciona un emprendimiento" />
              </SelectTrigger>
              <SelectContent>
                {emprendimientos.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenido">Diagnóstico</Label>
            <Textarea
              id="contenido"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Escribe el diagnóstico del emprendimiento..."
              rows={10}
              className="resize-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="visible"
              checked={visibleParaUsuario}
              onCheckedChange={setVisibleParaUsuario}
            />
            <Label htmlFor="visible">Visible para el usuario</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : editingId ? (
                <Save className="h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {editingId ? "Actualizar" : "Crear"} Diagnóstico
            </Button>
            {editingId && (
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Diagnósticos Existentes</CardTitle>
              <CardDescription>
                Lista de todos los diagnósticos creados
              </CardDescription>
            </div>
            <DiagnosticExportModal 
              diagnosticos={diagnosticos} 
              emprendimientos={emprendimientos} 
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {diagnosticos.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay diagnósticos creados aún
              </p>
            ) : (
              diagnosticos.map((diag) => {
                const emp = emprendimientos.find(
                  (e) => e.id === diag.emprendimiento_id
                );
                return (
                  <Card key={diag.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{emp?.nombre}</h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {diag.contenido}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              Creado:{" "}
                              {new Date(diag.created_at).toLocaleDateString()}
                            </span>
                            <span>
                              {diag.visible_para_usuario
                                ? "✓ Visible"
                                : "✗ Oculto"}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(diag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
