import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EvaluationComparison } from "./EvaluationComparison";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const AdminEvaluationApproval = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluaciones, setEvaluaciones] = useState<Array<Record<string, any>>>([]);
  const [emprendimientos, setEmprendimientos] = useState<Array<Record<string, any>>>([]);
  const [mentores, setMentores] = useState<Array<Record<string, any>>>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Record<string, any> | null>(null);
  const [cccEvaluation, setCccEvaluation] = useState<Record<string, any> | null>(null);
  const [filterEmprendimiento, setFilterEmprendimiento] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("pendiente");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: evals } = await supabase
        .from("evaluaciones")
        .select("*")
        .order("created_at", { ascending: false });

      // Filtrar solo evaluaciones tipo jurado
      const juradoEvals = (evals || []).filter((e: any) => e.tipo_evaluacion === 'jurado');
      setEvaluaciones(juradoEvals);

      const { data: emps } = await supabase
        .from("emprendimientos")
        .select("id, nombre");
      setEmprendimientos(emps || []);

      const { data: mentorsData } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          usuarios:user_id (nombres, apellidos)
        `)
        .eq("role", "mentor");
      setMentores(mentorsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (evaluationId: string, visible: boolean) => {
    try {
      const { error } = await supabase
        .from("evaluaciones")
        .update({ 
          aprobada_por_admin: true,
          visible_para_usuario: visible 
        } as any)
        .eq("id", evaluationId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Evaluación aprobada correctamente",
      });

      await fetchData();
      setSelectedEvaluation(null);
    } catch (error) {
      console.error("Error approving evaluation:", error);
      toast({
        title: "Error",
        description: "No se pudo aprobar la evaluación",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (evaluationId: string) => {
    try {
      const { error } = await supabase
        .from("evaluaciones")
        .update({ aprobada_por_admin: false } as any)
        .eq("id", evaluationId);

      if (error) throw error;

      toast({
        title: "Evaluación rechazada",
        description: "El mentor podrá revisar y reenviar la evaluación",
      });

      await fetchData();
      setSelectedEvaluation(null);
    } catch (error) {
      console.error("Error rejecting evaluation:", error);
      toast({
        title: "Error",
        description: "No se pudo rechazar la evaluación",
        variant: "destructive",
      });
    }
  };

  const toggleVisibility = async (evaluationId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from("evaluaciones")
        .update({ visible_para_usuario: !currentVisibility })
        .eq("id", evaluationId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Visibilidad ${!currentVisibility ? 'activada' : 'desactivada'}`,
      });

      await fetchData();
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar la visibilidad",
        variant: "destructive",
      });
    }
  };

  const openComparison = async (evaluation: Record<string, any>) => {
    setSelectedEvaluation(evaluation);
    
    if (evaluation.evaluacion_base_id) {
      const { data: ccc } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("id", evaluation.evaluacion_base_id)
        .single();
      setCccEvaluation(ccc as any);
    } else {
      const { data: ccc } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("emprendimiento_id", evaluation.emprendimiento_id)
        .maybeSingle();
      
      // Filtrar manualmente por tipo_evaluacion
      if (ccc && (ccc as any).tipo_evaluacion === 'ccc') {
        setCccEvaluation(ccc as any);
      }
    }
  };

  const filteredEvaluations = evaluaciones.filter(ev => {
    const matchesEmprendimiento = filterEmprendimiento === "all" || ev.emprendimiento_id === filterEmprendimiento;
    const matchesEstado = 
      filterEstado === "all" ||
      (filterEstado === "pendiente" && ev.aprobada_por_admin === null) ||
      (filterEstado === "aprobada" && ev.aprobada_por_admin === true) ||
      (filterEstado === "rechazada" && ev.aprobada_por_admin === false);
    
    return matchesEmprendimiento && matchesEstado;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Aprobación de Evaluaciones de Jurados</CardTitle>
          <CardDescription>Revisa y aprueba evaluaciones antes de mostrarlas a beneficiarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={filterEmprendimiento} onValueChange={setFilterEmprendimiento}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Emprendimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los emprendimientos</SelectItem>
                {emprendimientos.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="aprobada">Aprobadas</SelectItem>
                <SelectItem value="rechazada">Rechazadas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de evaluaciones */}
          {filteredEvaluations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay evaluaciones {filterEstado !== 'all' ? `en estado: ${filterEstado}` : ''}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredEvaluations.map(evaluation => {
                const emp = emprendimientos.find(e => e.id === evaluation.emprendimiento_id);
                const mentor = mentores.find(m => m.user_id === evaluation.mentor_id);
                
                return (
                  <Card key={evaluation.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold">{emp?.nombre || "Emprendimiento"}</h4>
                          <p className="text-sm text-muted-foreground">
                            Jurado: {mentor?.usuarios?.nombres} {mentor?.usuarios?.apellidos}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Puntaje: <span className="font-semibold text-primary">{evaluation.puntaje || 0} / 100</span>
                          </p>
                        </div>
                        <Badge variant={
                          evaluation.aprobada_por_admin === null ? "outline" :
                          evaluation.aprobada_por_admin ? "default" : "destructive"
                        }>
                          {evaluation.aprobada_por_admin === null ? "Pendiente" :
                           evaluation.aprobada_por_admin ? "Aprobada" : "Rechazada"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={evaluation.visible_para_usuario}
                            onCheckedChange={() => toggleVisibility(evaluation.id, evaluation.visible_para_usuario)}
                            disabled={evaluation.aprobada_por_admin !== true}
                          />
                          <Label className="text-sm">
                            {evaluation.visible_para_usuario ? (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" /> Visible
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <EyeOff className="h-3 w-3" /> Oculta
                              </span>
                            )}
                          </Label>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openComparison(evaluation)}
                          >
                            Ver Comparación
                          </Button>
                          {evaluation.aprobada_por_admin === null && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(evaluation.id, false)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(evaluation.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rechazar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de comparación */}
      <Dialog open={selectedEvaluation !== null} onOpenChange={(open) => !open && setSelectedEvaluation(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comparación de Evaluaciones</DialogTitle>
            <DialogDescription>
              Revisa las diferencias entre la evaluación CCC y la del jurado
            </DialogDescription>
          </DialogHeader>
          {selectedEvaluation && (
            <div className="space-y-6">
              <EvaluationComparison 
                cccEvaluation={cccEvaluation}
                juradoEvaluation={selectedEvaluation}
              />
              
              {selectedEvaluation.aprobada_por_admin === null && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEvaluation(null)}
                  >
                    Cerrar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedEvaluation.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleApprove(selectedEvaluation.id, true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprobar y Hacer Visible
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
