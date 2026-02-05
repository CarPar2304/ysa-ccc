import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { FilterType, NivelFilter } from "../DashboardFilters";
import { CHART_COLORS, getColorByIndex } from "@/lib/chartColors";

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface ProyeccionesStatsProps {
  filterType: FilterType;
  nivelFilter: NivelFilter;
}

export const ProyeccionesStats = ({ filterType, nivelFilter }: ProyeccionesStatsProps) => {
  const [internacionalizacionData, setInternacionalizacionData] = useState<ChartData[]>([]);
  const [impactoData, setImpactoData] = useState<ChartData[]>([]);
  const [accionesCrecimientoData, setAccionesCrecimientoData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProyeccionesStats();
  }, [filterType, nivelFilter]);

  const getNivelFromScore = (puntaje: number): string => {
    if (puntaje >= 70) return "Scale";
    if (puntaje >= 40) return "Growth";
    return "Starter";
  };

  const fetchProyeccionesStats = async () => {
    setLoading(true);
    try {
      const { data: beneficiariosIds } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "beneficiario");

      const beneficiariosSet = new Set(beneficiariosIds?.map(b => b.user_id) || []);

      const { data: emprendimientos } = await supabase
        .from("emprendimientos")
        .select("id, user_id");

      const { data: asignaciones } = await supabase
        .from("asignacion_cupos")
        .select("emprendimiento_id, estado, nivel")
        .eq("estado", "aprobado");

      const aprobadosSet = new Set(asignaciones?.map(a => a.emprendimiento_id) || []);

      const { data: evaluaciones } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id, puntaje");

      const evaluacionesMap = new Map();
      evaluaciones?.forEach(ev => {
        if (!evaluacionesMap.has(ev.emprendimiento_id) || (ev.puntaje || 0) > (evaluacionesMap.get(ev.emprendimiento_id)?.puntaje || 0)) {
          evaluacionesMap.set(ev.emprendimiento_id, ev);
        }
      });

      let filteredEmprendimientos = emprendimientos || [];

      if (filterType === "beneficiarios") {
        filteredEmprendimientos = filteredEmprendimientos.filter(e => 
          beneficiariosSet.has(e.user_id) && aprobadosSet.has(e.id)
        );
      } else if (filterType === "candidatos") {
        filteredEmprendimientos = filteredEmprendimientos.filter(e => !aprobadosSet.has(e.id));
      }

      if (nivelFilter !== "todos") {
        if (nivelFilter === "candidatos") {
          filteredEmprendimientos = filteredEmprendimientos.filter(e => !aprobadosSet.has(e.id));
        } else {
          filteredEmprendimientos = filteredEmprendimientos.filter(e => {
            const asignacion = asignaciones?.find(a => a.emprendimiento_id === e.id);
            if (asignacion?.nivel === nivelFilter) return true;
            const evaluacion = evaluacionesMap.get(e.id);
            if (evaluacion?.puntaje) {
              return getNivelFromScore(evaluacion.puntaje) === nivelFilter;
            }
            return false;
          });
        }
      }

      const emprendimientosBenefIds = filteredEmprendimientos.map(e => e.id);

      const { data: allProyecciones } = await supabase
        .from("proyecciones")
        .select("*")
        .in("emprendimiento_id", emprendimientosBenefIds.length > 0 ? emprendimientosBenefIds : ["none"]);

      const proyecciones = allProyecciones || [];
      if (!proyecciones || proyecciones.length === 0) {
        setLoading(false);
        return;
      }
      const total = proyecciones.length || 1;

      const internCounts = proyecciones.reduce((acc: any, p) => {
        const intern = p.intencion_internacionalizacion ? "Sí" : "No";
        acc[intern] = (acc[intern] || 0) + 1;
        return acc;
      }, {});
      setInternacionalizacionData(
        Object.entries(internCounts).map(([name, value]) => ({
          name, value: value as number, percentage: ((value as number) / total) * 100
        }))
      );

      const impactoCounts = proyecciones.reduce((acc: any, p) => {
        const imp = p.impacto || "No especificado";
        acc[imp] = (acc[imp] || 0) + 1;
        return acc;
      }, {});
      setImpactoData(Object.entries(impactoCounts).map(([name, value]) => ({ name, value: value as number })));

      const accCounts = proyecciones.reduce((acc: any, p) => {
        const acc_crec = p.decisiones_acciones_crecimiento ? "Sí" : "No";
        acc[acc_crec] = (acc[acc_crec] || 0) + 1;
        return acc;
      }, {});
      setAccionesCrecimientoData(
        Object.entries(accCounts).map(([name, value]) => ({
          name, value: value as number, percentage: ((value as number) / total) * 100
        }))
      );
    } catch (error) {
      console.error("Error fetching proyecciones stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><p className="text-muted-foreground">Cargando estadísticas...</p></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Intención de Internacionalización</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={internacionalizacionData} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false} 
                  label={(e) => e.percentage > 5 ? `${e.name} (${e.percentage?.toFixed(1)}%)` : null} 
                  outerRadius={90} 
                  innerRadius={40}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {internacionalizacionData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.name === "Sí" ? CHART_COLORS.boolean.positive : CHART_COLORS.boolean.negative} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Impacto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={impactoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }} 
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {impactoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Acciones de Crecimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={accionesCrecimientoData} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false}
                  label={(e) => e.percentage > 5 ? `${e.name} (${e.percentage?.toFixed(1)}%)` : null} 
                  outerRadius={90} 
                  innerRadius={40}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {accionesCrecimientoData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.name === "Sí" ? CHART_COLORS.boolean.positive : CHART_COLORS.boolean.negative} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
