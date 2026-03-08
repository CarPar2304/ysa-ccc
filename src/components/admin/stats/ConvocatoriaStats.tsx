import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { FilterType, NivelFilter } from "../DashboardFilters";
import { CHART_COLORS, getColorByIndex } from "@/lib/chartColors";
import { filterEmprendimientos, buildEvaluacionesMap } from "@/hooks/useDashboardFilter";

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface ConvocatoriaStatsProps {
  filterType: FilterType;
  nivelFilter: NivelFilter;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const ConvocatoriaStats = ({ filterType, nivelFilter }: ConvocatoriaStatsProps) => {
  const [loading, setLoading] = useState(true);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [comoSeEnteroData, setComoSeEnteroData] = useState<ChartData[]>([]);
  const [camaraAliadaData, setCamaraAliadaData] = useState<ChartData[]>([]);
  const [universidadData, setUniversidadData] = useState<ChartData[]>([]);
  const [otraInstitucionData, setOtraInstitucionData] = useState<ChartData[]>([]);
  const [redSocialData, setRedSocialData] = useState<ChartData[]>([]);
  const [creadorContenidoData, setCreadorContenidoData] = useState<ChartData[]>([]);

  useEffect(() => {
    fetchStats();
  }, [filterType, nivelFilter]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: beneficiariosIds } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "beneficiario");

      const beneficiariosSet = new Set(beneficiariosIds?.map(b => b.user_id) || []);

      const { data: allEmprendimientos } = await supabase
        .from("emprendimientos")
        .select("id, user_id");

      const { data: asignaciones } = await supabase
        .from("asignacion_cupos")
        .select("emprendimiento_id, estado, nivel")
        .eq("estado", "aprobado");

      const aprobadosSet = new Set(asignaciones?.map(a => a.emprendimiento_id) || []);

      const { data: evaluaciones } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id, puntaje, nivel");

      const evaluacionesMap = buildEvaluacionesMap(evaluaciones || []);

      const filteredEmprendimientos = filterEmprendimientos(
        allEmprendimientos || [],
        beneficiariosSet,
        aprobadosSet,
        asignaciones || [],
        evaluacionesMap,
        filterType,
        nivelFilter
      );

      const filteredUserIds = Array.from(new Set(filteredEmprendimientos.map(e => e.user_id)));
      setTotalUsuarios(filteredUserIds.length);

      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("como_se_entero, camara_aliada, universidad, otra_institucion, red_social, creador_contenido")
        .in("id", filteredUserIds.length > 0 ? filteredUserIds : ["__none__"]);

      const countField = (field: string) => {
        const counts: Record<string, number> = {};
        (usuarios || []).forEach((u: any) => {
          const val = u[field] || "Sin especificar";
          counts[val] = (counts[val] || 0) + 1;
        });
        const total = usuarios?.length || 1;
        return Object.entries(counts)
          .map(([name, value]) => ({ name, value, percentage: (value / total) * 100 }))
          .sort((a, b) => b.value - a.value);
      };

      setComoSeEnteroData(countField("como_se_entero"));
      setCamaraAliadaData(countField("camara_aliada"));
      setUniversidadData(countField("universidad"));
      setOtraInstitucionData(countField("otra_institucion"));
      setRedSocialData(countField("red_social"));
      setCreadorContenidoData(countField("creador_contenido"));
    } catch (error) {
      console.error("Error fetching convocatoria stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-5 bg-muted rounded w-40" /></CardHeader>
            <CardContent><div className="h-64 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const renderDonutChart = (data: ChartData[], title: string) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 || totalUsuarios === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sin datos disponibles</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, "Usuarios"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );

  const renderBarChart = (data: ChartData[], title: string) => (
    <Card className="md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 || (data.length === 1 && data[0].name === "Sin especificar") ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sin datos disponibles</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(280, data.length * 40)}>
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [value, "Usuarios"]} />
              <Bar dataKey="value" fill={CHART_COLORS.categorical[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total usuarios filtrados</p>
              <p className="text-2xl font-bold text-foreground">{totalUsuarios}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderDonutChart(comoSeEnteroData, "¿Por dónde se enteró?")}
        {renderDonutChart(redSocialData, "Red Social")}
        {renderDonutChart(camaraAliadaData, "Cámara Aliada")}
        {renderDonutChart(creadorContenidoData, "Creador de Contenido")}
        {renderBarChart(universidadData, "Universidad")}
        {renderBarChart(otraInstitucionData, "Otra Institución")}
      </div>
    </div>
  );
};
