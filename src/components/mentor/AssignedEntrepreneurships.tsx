import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, FileCheck, Building2, RefreshCw, Search, ArrowUpDown, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EntrepreneurshipCRM } from "./EntrepreneurshipCRM";
import { EvaluationForm } from "./EvaluationForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getNivelFromScore } from "@/hooks/useDashboardFilter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Wrapper para cargar evaluación CCC
const EvaluationFormWithCCC = ({ emprendimientoId, onSuccess }: { emprendimientoId: string, onSuccess: () => void }) => {
  const [cccEvaluation, setCccEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCCC = async () => {
      try {
        const { data, error } = await supabase
          .from("evaluaciones")
          .select("*")
          .eq("emprendimiento_id", emprendimientoId)
          .eq("tipo_evaluacion", "ccc")
          .maybeSingle();
        if (error) throw error;
        setCccEvaluation(data);
      } catch (error) {
        console.error("Error fetching CCC evaluation:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCCC();
  }, [emprendimientoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
  avg_score: number | null;
  nivel: string | null;
}

type SortOption = "alpha-asc" | "alpha-desc" | "score-desc" | "score-asc" | "nivel";

const NIVEL_ORDER: Record<string, number> = { "Scale": 3, "Growth": 2, "Starter": 1 };

const getNivelBadgeVariant = (nivel: string | null) => {
  if (!nivel) return "secondary";
  if (nivel === "Scale") return "default";
  if (nivel === "Growth") return "outline";
  return "secondary";
};

const getNivelColor = (nivel: string | null) => {
  if (!nivel) return "";
  if (nivel === "Scale") return "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700";
  if (nivel === "Growth") return "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700";
  return "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-400 dark:border-slate-700";
};

interface AssignmentCardProps {
  assignment: Assignment;
  onViewDetails: (id: string) => void;
  onEvaluate: (id: string) => void;
}

const AssignmentCard = ({ assignment, onViewDetails, onEvaluate }: AssignmentCardProps) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardHeader className="pb-3">
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
    <CardContent className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Beneficiario:</p>
        <p className="text-sm text-muted-foreground">
          {assignment.emprendimientos.usuarios?.nombres} {assignment.emprendimientos.usuarios?.apellidos}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {assignment.avg_score !== null && (
          <Badge variant="outline" className="font-mono">
            Puntaje: {assignment.avg_score.toFixed(1)}
          </Badge>
        )}
        {assignment.nivel && (
          <Badge className={getNivelColor(assignment.nivel)}>
            {assignment.nivel}
          </Badge>
        )}
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
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onViewDetails(assignment.emprendimiento_id)}>
          Ver Detalles
        </Button>
        {assignment.es_jurado && (
          <Button size="sm" className="flex-1" onClick={() => onEvaluate(assignment.emprendimiento_id)}>
            <FileCheck className="h-4 w-4 mr-2" />
            {assignment.my_evaluation ? 'Ver Evaluación' : 'Evaluar'}
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

interface SectionProps {
  title: string;
  count: number;
  assignments: Assignment[];
  defaultOpen?: boolean;
  onViewDetails: (id: string) => void;
  onEvaluate: (id: string) => void;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const AssignmentSection = ({ title, count, assignments, defaultOpen = true, onViewDetails, onEvaluate, badgeVariant = "secondary" }: SectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
            <span className="font-semibold text-base">{title}</span>
            <Badge variant={badgeVariant}>{count}</Badge>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0">
        {assignments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} onViewDetails={onViewDetails} onEvaluate={onEvaluate} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground px-3 py-2">No hay emprendimientos en esta categoría.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const AssignedEntrepreneurships = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedEmprendimiento, setSelectedEmprendimiento] = useState<string | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("alpha-asc");
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
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
            id, nombre, descripcion, user_id,
            usuarios:user_id ( nombres, apellidos, email )
          )
        `)
        .eq("mentor_id", user.id)
        .eq("activo", true);

      if (error) throw error;

      const validAssignments = (data || []).filter(a => a.emprendimientos !== null);

      const assignmentsWithEvals = await Promise.all(
        validAssignments.map(async (assignment) => {
          const { data: evaluaciones } = await supabase
            .from("evaluaciones")
            .select("*")
            .eq("emprendimiento_id", assignment.emprendimiento_id);

          const myEvaluation = evaluaciones?.find(e => e.mentor_id === user.id);
          const sentEvals = evaluaciones?.filter(e => e.estado === 'enviada') || [];
          const avgScore = sentEvals.length > 0
            ? sentEvals.reduce((sum, e) => sum + (e.puntaje || 0), 0) / sentEvals.length
            : null;
          const nivel = avgScore !== null ? getNivelFromScore(avgScore) : null;

          return {
            ...assignment,
            evaluaciones_count: sentEvals.length,
            my_evaluation: myEvaluation,
            avg_score: avgScore,
            nivel,
          };
        })
      );

      setAssignments(assignmentsWithEvals);
      if (isRefresh) {
        toast({ title: "Actualizado", description: "Datos actualizados correctamente" });
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast({ title: "Error", description: "No se pudieron cargar los emprendimientos asignados", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEvaluate = (id: string) => { setSelectedEmprendimiento(id); setShowEvaluation(true); };
  const handleViewDetails = (id: string) => { setSelectedEmprendimiento(id); setShowEvaluation(false); };

  const filteredAndSorted = useMemo(() => {
    let result = [...assignments];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.emprendimientos.nombre.toLowerCase().includes(q) ||
        (a.emprendimientos.usuarios?.nombres || "").toLowerCase().includes(q) ||
        (a.emprendimientos.usuarios?.apellidos || "").toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "alpha-asc":
          return a.emprendimientos.nombre.localeCompare(b.emprendimientos.nombre);
        case "alpha-desc":
          return b.emprendimientos.nombre.localeCompare(a.emprendimientos.nombre);
        case "score-desc":
          return (b.avg_score ?? -1) - (a.avg_score ?? -1);
        case "score-asc":
          return (a.avg_score ?? Infinity) - (b.avg_score ?? Infinity);
        case "nivel":
          return (NIVEL_ORDER[b.nivel || ""] || 0) - (NIVEL_ORDER[a.nivel || ""] || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [assignments, searchQuery, sortBy]);

  // Group into 3 categories
  const { sinEvaluacion, pendientes, evaluadas } = useMemo(() => {
    const sin: Assignment[] = [];
    const pend: Assignment[] = [];
    const eval_: Assignment[] = [];

    filteredAndSorted.forEach(a => {
      if (!a.my_evaluation) {
        sin.push(a);
      } else if (a.my_evaluation.estado !== 'enviada') {
        pend.push(a);
      } else {
        eval_.push(a);
      }
    });

    return { sinEvaluacion: sin, pendientes: pend, evaluadas: eval_ };
  }, [filteredAndSorted]);

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
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa o beneficiario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alpha-asc">A → Z</SelectItem>
            <SelectItem value="alpha-desc">Z → A</SelectItem>
            <SelectItem value="score-desc">Puntaje (Mayor a menor)</SelectItem>
            <SelectItem value="score-asc">Puntaje (Menor a mayor)</SelectItem>
            <SelectItem value="nivel">Nivel (Scale → Starter)</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchAssignments(true)}
          disabled={refreshing}
          title="Actualizar datos"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {assignments.length === 0 ? (
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
      ) : (
        <div className="space-y-6">
          <AssignmentSection
            title="Sin Evaluación"
            count={sinEvaluacion.length}
            assignments={sinEvaluacion}
            defaultOpen={true}
            onViewDetails={handleViewDetails}
            onEvaluate={handleEvaluate}
            badgeVariant="destructive"
          />
          <AssignmentSection
            title="Evaluación Pendiente (Borrador)"
            count={pendientes.length}
            assignments={pendientes}
            defaultOpen={true}
            onViewDetails={handleViewDetails}
            onEvaluate={handleEvaluate}
            badgeVariant="outline"
          />
          <AssignmentSection
            title="Evaluadas"
            count={evaluadas.length}
            assignments={evaluadas}
            defaultOpen={false}
            onViewDetails={handleViewDetails}
            onEvaluate={handleEvaluate}
            badgeVariant="default"
          />
        </div>
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
                onSuccess={() => { setSelectedEmprendimiento(null); fetchAssignments(); }}
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
