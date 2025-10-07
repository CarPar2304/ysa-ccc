import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Briefcase, TrendingUp, DollarSign, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Stats {
  totalBeneficiarios: number;
  totalEmprendimientos: number;
  emprendimientosConFinanciamiento: number;
  emprendimientosConEquipo: number;
  emprendimientosConProyecciones: number;
}

interface ChartData {
  name: string;
  value: number;
}

interface RecentUser {
  nombres: string;
  apellidos: string;
  email: string;
  created_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalBeneficiarios: 0,
    totalEmprendimientos: 0,
    emprendimientosConFinanciamiento: 0,
    emprendimientosConEquipo: 0,
    emprendimientosConProyecciones: 0,
  });
  const [categoriaData, setCategoriaData] = useState<ChartData[]>([]);
  const [etapaData, setEtapaData] = useState<ChartData[]>([]);
  const [ventasData, setVentasData] = useState<ChartData[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Obtener total de beneficiarios (usuarios sin rol mentor)
      const { count: totalBeneficiarios } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "beneficiario");

      // Obtener total de emprendimientos
      const { count: totalEmprendimientos } = await supabase
        .from("emprendimientos")
        .select("*", { count: "exact", head: true });

      // Emprendimientos con financiamiento
      const { count: emprendimientosConFinanciamiento } = await supabase
        .from("financiamientos")
        .select("emprendimiento_id", { count: "exact", head: true });

      // Emprendimientos con equipo
      const { count: emprendimientosConEquipo } = await supabase
        .from("equipos")
        .select("emprendimiento_id", { count: "exact", head: true });

      // Emprendimientos con proyecciones
      const { count: emprendimientosConProyecciones } = await supabase
        .from("proyecciones")
        .select("emprendimiento_id", { count: "exact", head: true });

      setStats({
        totalBeneficiarios: totalBeneficiarios || 0,
        totalEmprendimientos: totalEmprendimientos || 0,
        emprendimientosConFinanciamiento: emprendimientosConFinanciamiento || 0,
        emprendimientosConEquipo: emprendimientosConEquipo || 0,
        emprendimientosConProyecciones: emprendimientosConProyecciones || 0,
      });

      // Datos de emprendimientos por categoría
      const { data: categorias } = await supabase
        .from("emprendimientos")
        .select("categoria");

      const categoriaCounts = categorias?.reduce((acc: any, emp) => {
        const cat = emp.categoria || "Sin categoría";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});

      setCategoriaData(
        Object.entries(categoriaCounts || {}).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );

      // Datos de emprendimientos por etapa
      const { data: etapas } = await supabase
        .from("emprendimientos")
        .select("etapa");

      const etapaCounts = etapas?.reduce((acc: any, emp) => {
        const etapa = emp.etapa || "Sin etapa";
        acc[etapa] = (acc[etapa] || 0) + 1;
        return acc;
      }, {});

      setEtapaData(
        Object.entries(etapaCounts || {}).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );

      // Datos de emprendimientos por ventas
      const { data: ventas } = await supabase
        .from("emprendimientos")
        .select("ventas_ultimo_ano");

      const ventasCounts = ventas?.reduce((acc: any, emp) => {
        const venta = emp.ventas_ultimo_ano || "Sin datos";
        acc[venta] = (acc[venta] || 0) + 1;
        return acc;
      }, {});

      setVentasData(
        Object.entries(ventasCounts || {}).map(([name, value]) => ({
          name,
          value: value as number,
        }))
      );

      // Últimos usuarios registrados
      const { data: users } = await supabase
        .from("usuarios")
        .select("nombres, apellidos, email, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentUsers(users || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficiarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBeneficiarios}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emprendimientos</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmprendimientos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Financiamiento</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emprendimientosConFinanciamiento}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Equipo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emprendimientosConEquipo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Proyecciones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emprendimientosConProyecciones}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Emprendimientos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoriaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={etapaData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {etapaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas Último Año</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ventasData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos Usuarios Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell>{user.nombres} {user.apellidos}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{format(new Date(user.created_at), "dd/MM/yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
