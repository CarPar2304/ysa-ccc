import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FilterType, NivelFilter } from "../DashboardFilters";
import { CHART_COLORS, getColorByIndex } from "@/lib/chartColors";
import { filterEmprendimientos, buildEvaluacionesMap } from "@/hooks/useDashboardFilter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [redSocialData, setRedSocialData] = useState<ChartData[]>([]);
  const [creadorContenidoData, setCreadorContenidoData] = useState<ChartData[]>([]);
  const [camaraAliadaData, setCamaraAliadaData] = useState<ChartData[]>([]);
  const [institucionesData, setInstitucionesData] = useState<ChartData[]>([]);

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

      const countValidField = (field: string, excludeVals: string[] = []) => {
        const counts: Record<string, number> = {};
        let totalValidos = 0;
        (usuarios || []).forEach((u: any) => {
          const val = u[field];
          if (val && val !== "Sin especificar" && val.trim() !== "" && !excludeVals.includes(val)) {
            counts[val] = (counts[val] || 0) + 1;
            totalValidos++;
          }
        });
        const total = totalValidos || 1;
        return Object.entries(counts)
          .map(([name, value]) => ({ name, value, percentage: (value / total) * 100 }))
          .sort((a, b) => b.value - a.value);
      };

      const countValidCombinedFields = (fields: string[], excludeVals: string[] = []) => {
        const counts: Record<string, number> = {};
        let totalValidos = 0;
        (usuarios || []).forEach((u: any) => {
          fields.forEach(field => {
            const val = u[field];
            if (val && val !== "Sin especificar" && val.trim() !== "" && !excludeVals.includes(val)) {
              counts[val] = (counts[val] || 0) + 1;
              totalValidos++;
            }
          });
        });
        const total = totalValidos || 1;
        return Object.entries(counts)
          .map(([name, value]) => ({ name, value, percentage: (value / total) * 100 }))
          .sort((a, b) => b.value - a.value);
      };

      setComoSeEnteroData(countValidField("como_se_entero"));
      setRedSocialData(countValidField("red_social"));
      setCreadorContenidoData(countValidField("creador_contenido"));
      setCamaraAliadaData(countValidField("camara_aliada"));
      setInstitucionesData(countValidCombinedFields(["universidad", "otra_institucion"], ["Otra universidad o institución educativa"]));

    } catch (error) {
      console.error("Error fetching convocatoria stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse col-span-1 md:col-span-2">
            <CardHeader><div className="h-5 bg-muted rounded w-40" /></CardHeader>
            <CardContent><div className="h-64 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const renderChartWithTable = (data: ChartData[], title: string, type: 'donut' | 'bar' = 'donut') => (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Sin datos disponibles</div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={type === 'donut' ? 300 : Math.max(280, data.length * 40)}>
              {type === 'donut' ? (
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
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
                </PieChart>
              ) : (
                <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [value, "Usuarios"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={getColorByIndex(index)} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="data" className="border-b-0">
                <AccordionTrigger className="text-sm py-2 hover:no-underline">
                  <div className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
                    Ver datos detallados
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-md border mt-2 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Categoría</TableHead>
                          <TableHead className="text-right">Recuento</TableHead>
                          <TableHead className="text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full shrink-0" 
                                style={{ backgroundColor: getColorByIndex(index) }} 
                              />
                              {item.name}
                            </TableCell>
                            <TableCell className="text-right">{item.value}</TableCell>
                            <TableCell className="text-right">{item.percentage?.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
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
        {renderChartWithTable(comoSeEnteroData, "¿Por dónde se enteró?", "donut")}
        {renderChartWithTable(redSocialData, "Red Social", "donut")}
        {renderChartWithTable(creadorContenidoData, "Creador de Contenido", "donut")}
        {renderChartWithTable(camaraAliadaData, "Cámara Aliada", "donut")}
        {renderChartWithTable(institucionesData, "Institución Educativa (Universidad u otra)", "bar")}
      </div>
    </div>
  );
};
