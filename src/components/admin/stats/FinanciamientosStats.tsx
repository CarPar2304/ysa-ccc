import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { FilterType, NivelFilter } from "../DashboardFilters";
import { getColorByIndex } from "@/lib/chartColors";
import { filterEmprendimientos, buildEvaluacionesMap } from "@/hooks/useDashboardFilter";

interface ChartData {
  name: string;
  value: number;
}

interface FinanciamientosStatsProps {
  filterType: FilterType;
  nivelFilter: NivelFilter;
}

export const FinanciamientosStats = ({ filterType, nivelFilter }: FinanciamientosStatsProps) => {
  const [conFinanciamientoPrevio, setConFinanciamientoPrevio] = useState(0);
  const [tipoActorData, setTipoActorData] = useState<ChartData[]>([]);
  const [etapaData, setEtapaData] = useState<ChartData[]>([]);
  const [promedioRecibido, setPromedioRecibido] = useState(0);
  const [buscanInversion, setBuscanInversion] = useState(0);
  const [promedioBuscado, setPromedioBuscado] = useState(0);
  const [tipoInversionData, setTipoInversionData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinanciamientosStats();
  }, [filterType, nivelFilter]);

  const fetchFinanciamientosStats = async () => {
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

      const { data: allFinanciamientos } = await supabase
        .from("financiamientos")
        .select("*")
        .in("emprendimiento_id", emprendimientosBenefIds.length > 0 ? emprendimientosBenefIds : ["none"]);

      const financiamientos = allFinanciamientos || [];
      if (!financiamientos || financiamientos.length === 0) {
        setLoading(false);
        return;
      }

      const conPrevio = financiamientos.filter(f => f.financiamiento_previo === true);
      setConFinanciamientoPrevio(conPrevio.length);

      const actorCounts = conPrevio.reduce((acc: any, f) => {
        const actor = f.tipo_actor || "No especificado";
        acc[actor] = (acc[actor] || 0) + 1;
        return acc;
      }, {});

      setTipoActorData(
        Object.entries(actorCounts).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );

      const etapaCounts = conPrevio.reduce((acc: any, f) => {
        const etapa = f.etapa || "No especificado";
        acc[etapa] = (acc[etapa] || 0) + 1;
        return acc;
      }, {});

      setEtapaData(
        Object.entries(etapaCounts).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );

      const montosRecibidos = conPrevio
        .filter(f => f.monto_recibido)
        .map(f => f.monto_recibido || 0);

      const promedioRec = montosRecibidos.length
        ? montosRecibidos.reduce((sum, m) => sum + m, 0) / montosRecibidos.length
        : 0;

      setPromedioRecibido(promedioRec);

      const buscan = financiamientos.filter(f => f.busca_financiamiento && f.busca_financiamiento !== "No");
      setBuscanInversion(buscan.length);

      const montosBuscados = buscan
        .filter(f => f.monto_buscado)
        .map(f => {
          const monto = f.monto_buscado || "";
          const numero = parseFloat(monto.replace(/[^0-9.]/g, ""));
          return isNaN(numero) ? 0 : numero;
        })
        .filter(m => m > 0);

      const promedioBusc = montosBuscados.length
        ? montosBuscados.reduce((sum, m) => sum + m, 0) / montosBuscados.length
        : 0;

      setPromedioBuscado(promedioBusc);

      const invCounts = buscan.reduce((acc: any, f) => {
        const inv = f.tipo_inversion || "No especificado";
        acc[inv] = (acc[inv] || 0) + 1;
        return acc;
      }, {});

      setTipoInversionData(
        Object.entries(invCounts).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );
    } catch (error) {
      console.error("Error fetching financiamientos stats:", error);
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
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Financiamiento Previo</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Financiamiento Previo</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{conFinanciamientoPrevio}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio Monto Recibido</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                ${promedioRecibido.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribución Tipo de Actor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tipoActorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => {
                      const total = tipoActorData.reduce((s, d) => s + d.value, 0);
                      const pct = ((entry.value / total) * 100).toFixed(1);
                      return `${entry.name} (${pct}%)`;
                    }}
                    outerRadius={80}
                    innerRadius={35}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {tipoActorData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
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
              <CardTitle>Distribución por Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={etapaData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {etapaData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={getColorByIndex(index + 2)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Búsqueda de Inversión</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buscan Inversión</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{buscanInversion}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio Monto Buscado</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                ${promedioBuscado.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tipo de Inversión Buscada</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tipoInversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={150} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {tipoInversionData.map((_, index) => (
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
