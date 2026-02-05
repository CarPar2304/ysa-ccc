import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, TrendingUp, Lightbulb } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Treemap } from "recharts";
import { FilterType, NivelFilter } from "../DashboardFilters";
import { CHART_COLORS, getColorByIndex } from "@/lib/chartColors";
import { filterEmprendimientos, buildEvaluacionesMap } from "@/hooks/useDashboardFilter";

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface EmprendimientosStatsProps {
  filterType: FilterType;
  nivelFilter: NivelFilter;
}

const PRACTICE_COLORS = {
  "No está en planes": "#ef4444",
  "En planes": "#f59e0b",
  "Ya lo implementa": "#22c55e",
};

// Custom Treemap content component
const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, fill } = props;
  const displayName = width > 60 && height > 30 
    ? (name?.length > 15 ? name.substring(0, 15) + '...' : name) 
    : (width > 40 && height > 20 ? name?.substring(0, 8) + '..' : '');
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={2}
        rx={4}
      />
      {displayName && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={width > 80 ? 11 : 9}
          fontWeight="500"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {displayName}
        </text>
      )}
    </g>
  );
};

export const EmprendimientosStats = ({ filterType, nivelFilter }: EmprendimientosStatsProps) => {
  const [estadoUnidad, setEstadoUnidad] = useState<ChartData[]>([]);
  const [verticalData, setVerticalData] = useState<ChartData[]>([]);
  const [formalizacionData, setFormalizacionData] = useState<ChartData[]>([]);
  const [registroData, setRegistroData] = useState<ChartData[]>([]);
  const [categoriaData, setCategoriaData] = useState<ChartData[]>([]);
  const [alcanceData, setAlcanceData] = useState<ChartData[]>([]);
  const [tipoClienteData, setTipoClienteData] = useState<ChartData[]>([]);
  const [conPlanNegocio, setConPlanNegocio] = useState(0);
  const [etapaData, setEtapaData] = useState<ChartData[]>([]);
  const [innovacionData, setInnovacionData] = useState<ChartData[]>([]);
  const [practicasAmbientales, setPracticasAmbientales] = useState<ChartData[]>([]);
  const [practicasPorTipo, setPracticasPorTipo] = useState<any[]>([]);
  const [participacionesPrevias, setParticipacionesPrevias] = useState(0);
  const [impactoOferta, setImpactoOferta] = useState<ChartData[]>([]);
  const [tecnologiaData, setTecnologiaData] = useState<ChartData[]>([]);
  const [actividadesID, setActividadesID] = useState(0);
  const [ubicacionData, setUbicacionData] = useState<ChartData[]>([]);
  const [ventasData, setVentasData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmprendimientosStats();
  }, [filterType, nivelFilter]);

  const fetchEmprendimientosStats = async () => {
    setLoading(true);
    try {
      const { data: beneficiariosIds } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "beneficiario");

      const beneficiariosSet = new Set(beneficiariosIds?.map(b => b.user_id) || []);

      const { data: allEmprendimientos } = await supabase
        .from("emprendimientos")
        .select("*");

      const { data: asignaciones } = await supabase
        .from("asignacion_cupos")
        .select("emprendimiento_id, estado, nivel")
        .eq("estado", "aprobado");

      const aprobadosSet = new Set(asignaciones?.map(a => a.emprendimiento_id) || []);

      const { data: evaluaciones } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id, puntaje");

      const evaluacionesMap = buildEvaluacionesMap(evaluaciones || []);

      const emprendimientos = filterEmprendimientos(
        allEmprendimientos || [],
        beneficiariosSet,
        aprobadosSet,
        asignaciones || [],
        evaluacionesMap,
        filterType,
        nivelFilter
      );

      if (!emprendimientos || emprendimientos.length === 0) {
        setLoading(false);
        return;
      }

      const total = emprendimientos.length || 1;

      // Estado unidad productiva
      const estadoCounts = emprendimientos.reduce((acc: any, e) => {
        const estado = e.estado_unidad_productiva || "No especificado";
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
      }, {});
      setEstadoUnidad(Object.entries(estadoCounts).map(([name, value]) => ({ name, value: value as number })));

      // Vertical (treemap)
      const verticalCounts = emprendimientos.reduce((acc: any, e) => {
        const vertical = e.industria_vertical || "No especificado";
        acc[vertical] = (acc[vertical] || 0) + 1;
        return acc;
      }, {});
      setVerticalData(Object.entries(verticalCounts).map(([name, value]) => ({ name, value: value as number })));

      // Formalización
      const formalCounts = emprendimientos.reduce((acc: any, e) => {
        const formal = e.formalizacion ? "Formalizado" : "No formalizado";
        acc[formal] = (acc[formal] || 0) + 1;
        return acc;
      }, {});
      setFormalizacionData(
        Object.entries(formalCounts).map(([name, value]) => ({
          name,
          value: value as number,
          percentage: ((value as number) / total) * 100,
        }))
      );

      // Registro
      const registroCounts = emprendimientos.reduce((acc: any, e) => {
        const registro = e.registro || "Sin registro";
        acc[registro] = (acc[registro] || 0) + 1;
        return acc;
      }, {});
      setRegistroData(Object.entries(registroCounts).map(([name, value]) => ({ name, value: value as number })));

      // Categoría
      const catCounts = emprendimientos.reduce((acc: any, e) => {
        const cat = e.categoria || "No especificado";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});
      setCategoriaData(Object.entries(catCounts).map(([name, value]) => ({ name, value: value as number })));

      // Alcance mercado
      const alcanceCounts = emprendimientos.reduce((acc: any, e) => {
        const alcance = e.alcance_mercado || "No especificado";
        acc[alcance] = (acc[alcance] || 0) + 1;
        return acc;
      }, {});
      setAlcanceData(Object.entries(alcanceCounts).map(([name, value]) => ({ name, value: value as number })));

      // Tipo cliente
      const clienteCounts = emprendimientos.reduce((acc: any, e) => {
        const cliente = e.tipo_cliente || "No especificado";
        acc[cliente] = (acc[cliente] || 0) + 1;
        return acc;
      }, {});
      setTipoClienteData(Object.entries(clienteCounts).map(([name, value]) => ({ name, value: value as number })));

      // Plan de negocios
      const conPlan = emprendimientos.filter(e => e.plan_negocios).length;
      setConPlanNegocio(conPlan);

      // Etapa
      const etapaCounts = emprendimientos.reduce((acc: any, e) => {
        const etapa = e.etapa || "No especificado";
        acc[etapa] = (acc[etapa] || 0) + 1;
        return acc;
      }, {});
      setEtapaData(Object.entries(etapaCounts).map(([name, value]) => ({ name, value: value as number })));

      // Nivel innovación
      const innovCounts = emprendimientos.reduce((acc: any, e) => {
        const innov = e.nivel_innovacion || "No especificado";
        acc[innov] = (acc[innov] || 0) + 1;
        return acc;
      }, {});
      setInnovacionData(Object.entries(innovCounts).map(([name, value]) => ({ name, value: value as number })));

      // Prácticas ambientales generales
      const practicasCounts = emprendimientos.reduce((acc: any, e) => {
        const practica = e.practicas_ambientales_general || "No especificado";
        acc[practica] = (acc[practica] || 0) + 1;
        return acc;
      }, {});
      setPracticasAmbientales(
        Object.entries(practicasCounts).map(([name, value]) => ({
          name,
          value: value as number,
          percentage: ((value as number) / total) * 100,
        }))
      );

      // Prácticas por tipo
      const tipos = ["agua", "aire", "residuos", "energia", "suelo"];
      const practicasTipo = tipos.map(tipo => {
        const campo = `practicas_${tipo}` as keyof typeof emprendimientos[0];
        const counts = emprendimientos.reduce((acc: any, e) => {
          const val = String(e[campo] || "No especificado");
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {});

        return {
          tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1),
          "No está en planes": counts["No está en planes"] || 0,
          "En planes": counts["En planes"] || 0,
          "Ya lo implementa": counts["Ya lo implementa"] || 0,
        };
      });
      setPracticasPorTipo(practicasTipo);

      // Participaciones previas
      const previas = emprendimientos.filter(e => Boolean(e.participaciones_previas)).length;
      setParticipacionesPrevias((previas / total) * 100);

      // Impacto oferta
      const impactoCounts = emprendimientos.reduce((acc: any, e) => {
        const impacto = e.impacto_oferta || "No especificado";
        acc[impacto] = (acc[impacto] || 0) + 1;
        return acc;
      }, {});
      setImpactoOferta(Object.entries(impactoCounts).map(([name, value]) => ({ name, value: value as number })));

      // Integración tecnología
      const tecCounts = emprendimientos.reduce((acc: any, e) => {
        const tec = e.integracion_tecnologia || "No especificado";
        acc[tec] = (acc[tec] || 0) + 1;
        return acc;
      }, {});
      setTecnologiaData(Object.entries(tecCounts).map(([name, value]) => ({ name, value: value as number })));

      // Actividades I+D
      const actID = emprendimientos.filter(e => Boolean(e.actividades_id)).length;
      setActividadesID((actID / total) * 100);

      // Ubicación principal
      const ubicCounts = emprendimientos.reduce((acc: any, e) => {
        const ubic = e.ubicacion_principal || "No especificado";
        acc[ubic] = (acc[ubic] || 0) + 1;
        return acc;
      }, {});
      setUbicacionData(Object.entries(ubicCounts).map(([name, value]) => ({ name, value: value as number })));

      // Ventas último año
      const ventasCounts = emprendimientos.reduce((acc: any, e) => {
        const venta = e.ventas_ultimo_ano || "No especificado";
        acc[venta] = (acc[venta] || 0) + 1;
        return acc;
      }, {});
      setVentasData(Object.entries(ventasCounts).map(([name, value]) => ({ name, value: value as number })));
    } catch (error) {
      console.error("Error fetching emprendimientos stats:", error);
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
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Plan de Negocio</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{conPlanNegocio}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Participaciones Previas</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{participacionesPrevias.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Actividades I+D</CardTitle>
            <Lightbulb className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{actividadesID.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado Unidad Productiva</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={estadoUnidad}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {estadoUnidad.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formalización</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={formalizacionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.percentage > 5 ? `${entry.name} (${entry.percentage?.toFixed(1)}%)` : null}
                  outerRadius={80}
                  innerRadius={35}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {formalizacionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === "Formalizado" ? CHART_COLORS.boolean.positive : CHART_COLORS.boolean.negative} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Vertical (Industria)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={verticalData.map((item, index) => ({
                  ...item,
                  fill: getColorByIndex(index),
                }))}
                dataKey="value"
                stroke="hsl(var(--background))"
                content={<CustomTreemapContent />}
              >
                <Tooltip 
                  content={({ payload }: any) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="font-medium text-sm">{data.name}</p>
                          <p className="text-muted-foreground text-xs">{data.value} emprendimientos</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoriaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {categoriaData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alcance de Mercado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={alcanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {alcanceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index + 1)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipo de Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tipoClienteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {tipoClienteData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index + 2)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={etapaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {etapaData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index + 3)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nivel de Innovación</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={innovacionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {innovacionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index + 4)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prácticas Ambientales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={practicasAmbientales}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.percentage > 5 ? `${entry.name} (${entry.percentage?.toFixed(1)}%)` : null}
                  outerRadius={80}
                  innerRadius={35}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {practicasAmbientales.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Prácticas Ambientales por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={practicasPorTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="tipo" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
                <Bar dataKey="No está en planes" fill={PRACTICE_COLORS["No está en planes"]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="En planes" fill={PRACTICE_COLORS["En planes"]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ya lo implementa" fill={PRACTICE_COLORS["Ya lo implementa"]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impacto Oferta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={impactoOferta} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={9} width={120} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {impactoOferta.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integración de Tecnología</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tecnologiaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {tecnologiaData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index + 5)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubicación Principal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ubicacionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {ubicacionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index + 6)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas Último Año</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ventasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-30} textAnchor="end" height={80} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {ventasData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColorByIndex(index + 7)} />
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
