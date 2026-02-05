import { FilterType, NivelFilter } from "@/components/admin/DashboardFilters";

interface Emprendimiento {
  id: string;
  user_id: string;
  [key: string]: any;
}

interface Asignacion {
  emprendimiento_id: string;
  estado: string | null;
  nivel: string;
}

interface Evaluacion {
  emprendimiento_id: string;
  puntaje: number | null;
}

export const getNivelFromScore = (puntaje: number): string => {
  if (puntaje >= 70) return "Scale";
  if (puntaje >= 40) return "Growth";
  return "Starter";
};

export const filterEmprendimientos = (
  allEmprendimientos: Emprendimiento[],
  beneficiariosSet: Set<string>,
  aprobadosSet: Set<string>,
  asignaciones: Asignacion[],
  evaluacionesMap: Map<string, Evaluacion>,
  filterType: FilterType,
  nivelFilter: NivelFilter
): Emprendimiento[] => {
  let filteredEmprendimientos = [...allEmprendimientos];

  // First filter by type (beneficiarios/candidatos/todos)
  if (filterType === "beneficiarios") {
    filteredEmprendimientos = filteredEmprendimientos.filter(e => 
      beneficiariosSet.has(e.user_id) && aprobadosSet.has(e.id)
    );
  } else if (filterType === "candidatos") {
    filteredEmprendimientos = filteredEmprendimientos.filter(e => 
      !aprobadosSet.has(e.id)
    );
  }

  // Then filter by nivel - logic depends on filterType context
  if (nivelFilter !== "todos") {
    if (nivelFilter === "candidatos") {
      // Show only candidatos (not approved)
      filteredEmprendimientos = filteredEmprendimientos.filter(e => !aprobadosSet.has(e.id));
    } else {
      filteredEmprendimientos = filteredEmprendimientos.filter(e => {
        const asignacion = asignaciones?.find(a => a.emprendimiento_id === e.id);
        const isApproved = aprobadosSet.has(e.id);
        
        if (filterType === "beneficiarios") {
          // For beneficiarios, only use assigned level from cupo
          return asignacion?.nivel === nivelFilter;
        } else if (filterType === "candidatos") {
          // For candidatos, only use score-based level (no approved cupo)
          if (isApproved) return false;
          const evaluacion = evaluacionesMap.get(e.id);
          if (evaluacion?.puntaje) {
            return getNivelFromScore(evaluacion.puntaje) === nivelFilter;
          }
          return false;
        } else {
          // For "todos": approved users use their assigned level, non-approved use score
          if (isApproved) {
            return asignacion?.nivel === nivelFilter;
          } else {
            const evaluacion = evaluacionesMap.get(e.id);
            if (evaluacion?.puntaje) {
              return getNivelFromScore(evaluacion.puntaje) === nivelFilter;
            }
            return false;
          }
        }
      });
    }
  }

  return filteredEmprendimientos;
};

export const buildEvaluacionesMap = (evaluaciones: Evaluacion[]): Map<string, Evaluacion> => {
  const evaluacionesMap = new Map<string, Evaluacion>();
  evaluaciones?.forEach(ev => {
    if (!evaluacionesMap.has(ev.emprendimiento_id) || (ev.puntaje || 0) > (evaluacionesMap.get(ev.emprendimiento_id)?.puntaje || 0)) {
      evaluacionesMap.set(ev.emprendimiento_id, ev);
    }
  });
  return evaluacionesMap;
};
