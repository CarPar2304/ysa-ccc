import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Award, Briefcase } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
];

export const EquiposStats = () => {
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
  }, []);

  const fetchEquiposStats = async () => {
    try {
      // Solo equipos de beneficiarios
      const { data: beneficiariosIds } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "beneficiario");

      const beneficiariosSet = new Set(beneficiariosIds?.map(b => b.user_id) || []);

      const { data: emprendimientos } = await supabase
        .from("emprendimientos")
        .select("id, user_id");

      const emprendimientosBenefIds = emprendimientos
        ?.filter(e => beneficiariosSet.has(e.user_id))
        .map(e => e.id) || [];

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

      // Promedios
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

      // Distribución equipo técnico
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

      // Distribución organigrama
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

      // Distribución tipo decisiones
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
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Equipo Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedioTotal.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Full Time</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedioFullTime.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Colaboradoras</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedioColaboradoras.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Fundadoras</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedioFundadoras.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Jóvenes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedioJovenes.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
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
                  label={(entry) => `${entry.name} (${entry.percentage?.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {equipoTecnicoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
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
              <BarChart data={tipoDecisionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="value" fill="hsl(220, 60%, 65%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
