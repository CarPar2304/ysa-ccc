import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(220, 60%, 65%)',
  'hsl(220, 50%, 75%)',
  'hsl(220, 40%, 85%)',
];

export const UsuariosStats = () => {
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
  }, []);

  const fetchUsuariosStats = async () => {
    try {
      // Total beneficiarios
      const { count: totalBenef } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "beneficiario");
      setTotalBeneficiarios(totalBenef || 0);

      // Distribución por nivel (de evaluaciones de beneficiarios solamente)
      const { data: beneficiariosIds } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "beneficiario");

      const beneficiariosSet = new Set(beneficiariosIds?.map(b => b.user_id) || []);

      const { data: emprendimientosBenef } = await supabase
        .from("emprendimientos")
        .select("id, user_id");

      const emprendimientosBenefIds = emprendimientosBenef
        ?.filter(e => beneficiariosSet.has(e.user_id))
        .map(e => e.id) || [];

      const { data: evaluaciones } = await supabase
        .from("evaluaciones")
        .select("nivel, emprendimiento_id")
        .in("emprendimiento_id", emprendimientosBenefIds.length > 0 ? emprendimientosBenefIds : ["none"]);

      const nivelCounts = evaluaciones?.reduce((acc: any, ev) => {
        const nivel = ev.nivel || "Sin nivel";
        acc[nivel] = (acc[nivel] || 0) + 1;
        return acc;
      }, {});

      setNivelData(
        Object.entries(nivelCounts || {}).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );

      // Distribución de género (solo beneficiarios)
      const { data: usuariosBenef } = await supabase
        .from("usuarios")
        .select("genero, ano_nacimiento, departamento, municipio, identificacion_etnica, id")
        .in("id", Array.from(beneficiariosSet));

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

      // Identificación étnica
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

      // Edad promedio (año actual 2025)
      const currentYear = 2025;
      const edades = usuarios
        ?.filter(u => u.ano_nacimiento && !isNaN(parseInt(u.ano_nacimiento)))
        .map(u => currentYear - parseInt(u.ano_nacimiento || "0"));

      const promedioEdad = edades?.length
        ? edades.reduce((sum, edad) => sum + edad, 0) / edades.length
        : 0;

      setEdadPromedio(promedioEdad);

      // Distribución por departamento
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

      // Distribución por municipio (top 10)
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beneficiarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeneficiarios}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edad Promedio</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{edadPromedio.toFixed(1)} años</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Nivel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={nivelData}>
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
                  label={(entry) => `${entry.name} (${entry.percentage?.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {generoData.map((entry, index) => (
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
                  label={(entry) => `${entry.name} (${entry.percentage?.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {etnicaData.map((entry, index) => (
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
            <CardTitle>Distribución por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departamentoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={100} />
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
            <CardTitle>Top 10 Municipios</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={municipioData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={100} />
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
