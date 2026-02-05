import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Award, Briefcase } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { FilterType, NivelFilter } from "../DashboardFilters";
import { CHART_COLORS, getColorByIndex } from "@/lib/chartColors";
import { filterEmprendimientos, buildEvaluacionesMap } from "@/hooks/useDashboardFilter";

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface EquiposStatsProps {
  filterType: FilterType;
  nivelFilter: NivelFilter;
}

export const EquiposStats = ({ filterType, nivelFilter }: EquiposStatsProps) => {
  const [promedioTotal, setPromedioTotal] = useState(0);
  const [promedioFullTime, setPromedioFullTime] = useState(0);
  const [promedioColaboradoras, setPromedioColaboradoras] = useState(0);
  const [promedioFundadoras, setPromedioFundadoras] = useState(0);
  const [promedioJovenes, setPromedioJovenes] = useState(0);
  const [equipoTecnicoData, setEquipoTecnicoData] = useState<ChartData[]>([]);
  const [organigramaData, setOrganigramaData] = useState<ChartData[]>([]);
  const [tipoDecisionData, setTipoDecisionData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEquiposStats();
  }, [filterType, nivelFilter]);

  const fetchEquiposStats = async () => {
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

      const evaluacionesMap = buildEvaluacionesMap(evaluaciones || []);

      const filteredEmprendimientos = filterEmprendimientos(
        emprendimientos || [],
        beneficiariosSet,
        aprobadosSet,
        asignaciones || [],
        evaluacionesMap,
        filterType,
        nivelFilter
      );

      const emprendimientosBenefIds = filteredEmprendimientos.map(e => e.id);

      const { data: allEquipos } = await supabase
        .from("equipos")
        .select("*")
        .in("emprendimiento_id", emprendimientosBenefIds.length > 0 ? emprendimientosBenefIds : ["none"]);

      const equipos = allEquipos || [];
      if (!equipos || equipos.length === 0) {
        setLoading(false);
        return;
      }

      const total = equipos.length;

      const sumTotal = equipos.reduce((sum, e) => sum + (e.equipo_total || 0), 0);
      setPromedioTotal(sumTotal / total);

      const sumFullTime = equipos.reduce((sum, e) => sum + (e.personas_full_time || 0), 0);
      setPromedioFullTime(sumFullTime / total);

      const sumColaboradoras = equipos.reduce((sum, e) => sum + (e.colaboradoras || 0), 0);
      setPromedioColaboradoras(sumColaboradoras / total);

      const sumFundadoras = equipos.reduce((sum, e) => sum + (e.fundadoras || 0), 0);
      setPromedioFundadoras(sumFundadoras / total);

      const sumJovenes = equipos.reduce((sum, e) => sum + (e.colaboradores_jovenes || 0), 0);
      setPromedioJovenes(sumJovenes / total);

      const tecnicoCounts = equipos.reduce((acc: any, e) => {
        const tecnico = e.equipo_tecnico ? "Tiene equipo técnico" : "No tiene equipo técnico";
        acc[tecnico] = (acc[tecnico] || 0) + 1;
        return acc;
      }, {});

      setEquipoTecnicoData(
        Object.entries(tecnicoCounts).map(([name, value]) => ({
          name,
          value: value as number,
          percentage: ((value as number) / total) * 100,
        }))
      );

      const orgCounts = equipos.reduce((acc: any, e) => {
        const org = e.organigrama || "No especificado";
        acc[org] = (acc[org] || 0) + 1;
        return acc;
      }, {});

      setOrganigramaData(
        Object.entries(orgCounts).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );

      const decCounts = equipos.reduce((acc: any, e) => {
        const dec = e.tipo_decisiones || "No especificado";
        acc[dec] = (acc[dec] || 0) + 1;
        return acc;
      }, {});

      setTipoDecisionData(
        Object.entries(decCounts).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );
    } catch (error) {
      console.error("Error fetching equipos stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground">Cargando estadísticas...</p>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Equipo Total</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{promedioTotal.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Full Time</CardTitle>
            <Briefcase className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{promedioFullTime.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/30 border-pink-200 dark:border-pink-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Colaboradoras</CardTitle>
            <Users className="h-4 w-4 text-pink-600 dark:text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">{promedioColaboradoras.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Fundadoras</CardTitle>
            <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{promedioFundadoras.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Jóvenes</CardTitle>
            <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{promedioJovenes.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución Equipo Técnico</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={equipoTecnicoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.percentage > 5 ? `${entry.name.split(' ')[0]} (${entry.percentage?.toFixed(1)}%)` : null}
                  outerRadius={90}
                  innerRadius={40}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {equipoTecnicoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name.includes("Tiene") ? CHART_COLORS.boolean.positive : CHART_COLORS.boolean.negative} />
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
            <CardTitle>Estado Organigrama</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={organigramaData}>
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
                  {organigramaData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tipo de Decisiones</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tipoDecisionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={200} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {tipoDecisionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
