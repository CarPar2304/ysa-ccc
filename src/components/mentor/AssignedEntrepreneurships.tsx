import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCheck, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntrepreneurshipCRM } from "./EntrepreneurshipCRM";
import { EvaluationForm } from "./EvaluationForm";

// Wrapper para cargar evaluación CCC
const EvaluationFormWithCCC = ({ emprendimientoId, onSuccess }: { emprendimientoId: string, onSuccess: () => void }) => {
  const [cccEvaluation, setCccEvaluation] = useState<any>(null);

  useEffect(() => {
    const fetchCCC = async () => {
      const { data } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("emprendimiento_id", emprendimientoId)
        .maybeSingle();
      
      if (data && (data as any).tipo_evaluacion === 'ccc') {
        setCccEvaluation(data);
      }
    };
    fetchCCC();
  }, [emprendimientoId]);

  return <EvaluationForm emprendimientoId={emprendimientoId} cccEvaluation={cccEvaluation} onSuccess={onSuccess} />;
};

interface Assignment {
  id: string;
  emprendimiento_id: string;
  es_jurado: boolean;
  emprendimientos: {
    id: string;
    nombre: string;
    descripcion: string;
    user_id: string;
    usuarios: {
      nombres: string;
      apellidos: string;
      email: string;
    };
  };
  evaluaciones_count: number;
  my_evaluation: any;
}

export const AssignedEntrepreneurships = () => {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedEmprendimiento, setSelectedEmprendimiento] = useState<string | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("mentor_emprendimiento_assignments")
        .select(`
          id,
          emprendimiento_id,
          es_jurado,
          emprendimientos:emprendimiento_id (
            id,
            nombre,
            descripcion,
            user_id,
            usuarios:user_id (
              nombres,
              apellidos,
              email
            )
          )
        `)
        .eq("mentor_id", user.id)
        .eq("activo", true);

      if (error) throw error;

      // Filtrar solo asignaciones con emprendimientos válidos
      const validAssignments = (data || []).filter(assignment => assignment.emprendimientos !== null);

      // Obtener evaluaciones para cada emprendimiento
      const assignmentsWithEvals = await Promise.all(
        validAssignments.map(async (assignment) => {
          const { data: evaluaciones } = await supabase
            .from("evaluaciones")
            .select("*")
            .eq("emprendimiento_id", assignment.emprendimiento_id);

          const myEvaluation = evaluaciones?.find(e => e.mentor_id === user.id);

          return {
            ...assignment,
            evaluaciones_count: evaluaciones?.filter(e => e.estado === 'enviada').length || 0,
            my_evaluation: myEvaluation,
          };
        })
      );

      setAssignments(assignmentsWithEvals);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los emprendimientos asignados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = (emprendimientoId: string) => {
    setSelectedEmprendimiento(emprendimientoId);
    setShowEvaluation(true);
  };

  const handleViewDetails = (emprendimientoId: string) => {
    setSelectedEmprendimiento(emprendimientoId);
    setShowEvaluation(false);
  };

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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {assignment.emprendimientos.nombre}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {assignment.emprendimientos.descripcion || "Sin descripción"}
                  </CardDescription>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground ml-2 flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Beneficiario:</p>
                <p className="text-sm text-muted-foreground">
                  {assignment.emprendimientos.usuarios?.nombres} {assignment.emprendimientos.usuarios?.apellidos}
                </p>
                <p className="text-xs text-muted-foreground">
                  {assignment.emprendimientos.usuarios?.email}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Evaluaciones:</span>
                <Badge variant={assignment.evaluaciones_count === 3 ? "default" : "secondary"}>
                  {assignment.evaluaciones_count} / 3
                </Badge>
              </div>

              {assignment.my_evaluation && (
                <Badge 
                  variant={assignment.my_evaluation.estado === 'enviada' ? 'default' : 'outline'}
                  className="w-full justify-center"
                >
                  {assignment.my_evaluation.estado === 'enviada' ? '✓ Evaluación Enviada' : 'Borrador Guardado'}
                </Badge>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewDetails(assignment.emprendimiento_id)}
                >
                  Ver Detalles
                </Button>
                {assignment.es_jurado && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEvaluate(assignment.emprendimiento_id)}
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    {assignment.my_evaluation ? 'Ver Evaluación' : 'Evaluar'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No tienes emprendimientos asignados aún.
              <br />
              Contacta al administrador para obtener asignaciones.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={selectedEmprendimiento !== null} onOpenChange={(open) => !open && setSelectedEmprendimiento(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEvaluation ? 'Evaluación del Emprendimiento' : 'Detalles del Emprendimiento'}
            </DialogTitle>
          </DialogHeader>
          {selectedEmprendimiento && (
            showEvaluation ? (
              <EvaluationFormWithCCC 
                emprendimientoId={selectedEmprendimiento} 
                onSuccess={() => {
                  setSelectedEmprendimiento(null);
                  fetchAssignments();
                }}
              />
            ) : (
              <EntrepreneurshipCRM 
                emprendimientoId={selectedEmprendimiento}
                isJurado={assignments.find(a => a.emprendimiento_id === selectedEmprendimiento)?.es_jurado || false}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
