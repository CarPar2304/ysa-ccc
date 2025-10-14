import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, TrendingUp, Lightbulb } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Treemap } from "recharts";

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 60%, 65%)',
  'hsl(220, 50%, 75%)',
  'hsl(220, 40%, 85%)',
  'hsl(var(--secondary))',
];

const PRACTICE_COLORS = {
  "No está en planes": "#ef4444",
  "En planes": "#f59e0b",
  "Ya lo implementa": "#10b981",
};

export const EmprendimientosStats = () => {
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
  const [culturaData, setCulturaData] = useState<any[]>([]);
  const [impactoOferta, setImpactoOferta] = useState<ChartData[]>([]);
  const [tecnologiaData, setTecnologiaData] = useState<ChartData[]>([]);
  const [actividadesID, setActividadesID] = useState(0);
  const [ubicacionData, setUbicacionData] = useState<ChartData[]>([]);
  const [ventasData, setVentasData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmprendimientosStats();
  }, []);

  const fetchEmprendimientosStats = async () => {
    try {
      const { data: emprendimientos } = await supabase
        .from("emprendimientos")
        .select("*");

      if (!emprendimientos) return;

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

      // Registro (treemap)
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
          const val = e[campo] || "No especificado";
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

      // Cultura (promedio de cada item)
      const culturaItems = ["dialogo", "estrategia", "valor_diferencial", "conocimiento_ancestral"];
      const culturaStats = culturaItems.map(item => {
        const campo = `cultura_${item}` as keyof typeof emprendimientos[0];
        const valores = emprendimientos
          .filter(e => e[campo])
          .map(e => {
            const val = e[campo];
            return typeof val === "string" ? parseFloat(val) : 0;
          });

        const promedio = valores.length ? valores.reduce((sum, v) => sum + v, 0) / valores.length : 0;

        return {
          item: item.charAt(0).toUpperCase() + item.slice(1).replace(/_/g, " "),
          promedio: promedio,
        };
      });
      setCulturaData(culturaStats);

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Plan de Negocio</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conPlanNegocio}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Participaciones Previas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participacionesPrevias.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Actividades I+D</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actividadesID.toFixed(1)}%</div>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
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
                  label={(entry) => `${entry.name} (${entry.percentage?.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {formalizacionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" fill="hsl(220, 60%, 65%)" />
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
                  label={(entry) => `${entry.name} (${entry.percentage?.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {practicasAmbientales.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="tipo" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="No está en planes" fill={PRACTICE_COLORS["No está en planes"]} />
                <Bar dataKey="En planes" fill={PRACTICE_COLORS["En planes"]} />
                <Bar dataKey="Ya lo implementa" fill={PRACTICE_COLORS["Ya lo implementa"]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cultura (Promedio 1-5)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={culturaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="item" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 5]} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="promedio" fill="hsl(var(--primary))" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" fill="hsl(220, 50%, 75%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
