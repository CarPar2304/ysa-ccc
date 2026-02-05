import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { FilterType, NivelFilter } from "../DashboardFilters";
import { CHART_COLORS, getColorByIndex, getGenderColor, getLevelColor } from "@/lib/chartColors";
import { filterEmprendimientos, buildEvaluacionesMap, getNivelFromScore } from "@/hooks/useDashboardFilter";

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface UsuariosStatsProps {
  filterType: FilterType;
  nivelFilter: NivelFilter;
}

export const UsuariosStats = ({ filterType, nivelFilter }: UsuariosStatsProps) => {
  const [totalBeneficiarios, setTotalBeneficiarios] = useState(0);
  const [nivelData, setNivelData] = useState<ChartData[]>([]);
  const [generoData, setGeneroData] = useState<ChartData[]>([]);
  const [etnicaData, setEtnicaData] = useState<ChartData[]>([]);
  const [edadPromedio, setEdadPromedio] = useState(0);
  const [departamentoData, setDepartamentoData] = useState<ChartData[]>([]);
  const [municipioData, setMunicipioData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsuariosStats();
  }, [filterType, nivelFilter]);


  const fetchUsuariosStats = async () => {
    setLoading(true);
    try {
      // Get beneficiarios
      const { data: beneficiariosIds } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "beneficiario");

      const beneficiariosSet = new Set(beneficiariosIds?.map(b => b.user_id) || []);

      // Get all emprendimientos
      const { data: allEmprendimientos } = await supabase
        .from("emprendimientos")
        .select("id, user_id");

      // Get approved cupos
      const { data: asignaciones } = await supabase
        .from("asignacion_cupos")
        .select("emprendimiento_id, estado, nivel")
        .eq("estado", "aprobado");

      const aprobadosSet = new Set(asignaciones?.map(a => a.emprendimiento_id) || []);

      // Get evaluaciones for score-based level filtering
      const { data: evaluaciones } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id, puntaje, nivel");

      const evaluacionesMap = buildEvaluacionesMap(evaluaciones || []);

      // Use shared filter function
      const filteredEmprendimientos = filterEmprendimientos(
        allEmprendimientos || [],
        beneficiariosSet,
        aprobadosSet,
        asignaciones || [],
        evaluacionesMap,
        filterType,
        nivelFilter
      );

      const filteredUserIds = new Set(filteredEmprendimientos.map(e => e.user_id));
      setTotalBeneficiarios(filteredUserIds.size);

      // Distribución por nivel
      const nivelCounts: Record<string, number> = {};
      filteredEmprendimientos.forEach(e => {
        const asignacion = asignaciones?.find(a => a.emprendimiento_id === e.id);
        let nivel: string | null = asignacion?.nivel || null;
        
        if (!nivel) {
          const evaluacion = evaluacionesMap.get(e.id);
          if (evaluacion?.puntaje) {
            nivel = getNivelFromScore(evaluacion.puntaje);
          }
        }
        
        const nivelLabel = nivel || "Sin nivel";
        nivelCounts[nivelLabel] = (nivelCounts[nivelLabel] || 0) + 1;
      });

      setNivelData(
        Object.entries(nivelCounts).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );

      // Get user data for filtered users
      const { data: usuariosBenef } = await supabase
        .from("usuarios")
        .select("genero, ano_nacimiento, departamento, municipio, identificacion_etnica, id")
        .in("id", Array.from(filteredUserIds));

      const usuarios = usuariosBenef || [];
      const total = usuarios?.length || 1;

      const generoCounts = usuarios?.reduce((acc: any, user) => {
        const genero = user.genero || "No especificado";
        acc[genero] = (acc[genero] || 0) + 1;
        return acc;
      }, {});

      setGeneroData(
        Object.entries(generoCounts || {}).map(([name, value]) => ({
          name,
          value: value as number,
          percentage: ((value as number) / total) * 100,
        }))
      );

      const etnicaCounts = usuarios?.reduce((acc: any, user) => {
        const etnica = user.identificacion_etnica || "No especificado";
        acc[etnica] = (acc[etnica] || 0) + 1;
        return acc;
      }, {});

      setEtnicaData(
        Object.entries(etnicaCounts || {}).map(([name, value]) => ({
          name,
          value: value as number,
          percentage: ((value as number) / total) * 100,
        }))
      );

      const currentYear = new Date().getFullYear();
      const edades = usuarios
        ?.filter(u => u.ano_nacimiento && !isNaN(parseInt(u.ano_nacimiento)))
        .map(u => currentYear - parseInt(u.ano_nacimiento || "0"));

      const promedioEdad = edades?.length
        ? edades.reduce((sum, edad) => sum + edad, 0) / edades.length
        : 0;

      setEdadPromedio(promedioEdad);

      const deptoCounts = usuarios?.reduce((acc: any, user) => {
        const depto = user.departamento || "No especificado";
        acc[depto] = (acc[depto] || 0) + 1;
        return acc;
      }, {});

      setDepartamentoData(
        Object.entries(deptoCounts || {})
          .map(([name, value]) => ({
            name,
            value: value as number,
          }))
          .sort((a, b) => b.value - a.value)
      );

      const municCounts = usuarios?.reduce((acc: any, user) => {
        const munic = user.municipio || "No especificado";
        acc[munic] = (acc[munic] || 0) + 1;
        return acc;
      }, {});

      setMunicipioData(
        Object.entries(municCounts || {})
          .map(([name, value]) => ({
            name,
            value: value as number,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
      );
    } catch (error) {
      console.error("Error fetching usuarios stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground">Cargando estadísticas...</p>
    </div>;
  }

  const renderCustomLabel = ({ name, percentage }: any) => {
    if (percentage < 5) return null;
    return `${name} (${percentage?.toFixed(1)}%)`;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalBeneficiarios}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edad Promedio</CardTitle>
            <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{edadPromedio.toFixed(1)} años</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Nivel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={nivelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {nivelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getLevelColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Género</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={generoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={90}
                  innerRadius={40}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {generoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getGenderColor(entry.name)} />
                  ))}
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [value, "Cantidad"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identificación Étnica</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={etnicaData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={90}
                  innerRadius={40}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {etnicaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                  ))}
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
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
            <CardTitle>Distribución por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departamentoData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {departamentoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top 10 Municipios</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={municipioData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={100} fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {municipioData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.sequential[index % CHART_COLORS.sequential.length]} />
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
