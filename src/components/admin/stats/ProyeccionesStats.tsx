import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(220, 60%, 65%)'];

export const ProyeccionesStats = () => {
  const [internacionalizacionData, setInternacionalizacionData] = useState<ChartData[]>([]);
  const [impactoData, setImpactoData] = useState<ChartData[]>([]);
  const [accionesCrecimientoData, setAccionesCrecimientoData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProyeccionesStats();
  }, []);

  const fetchProyeccionesStats = async () => {
    try {
      const { data: proyecciones } = await supabase.from("proyecciones").select("*");
      if (!proyecciones) return;
      const total = proyecciones.length || 1;

      const internCounts = proyecciones.reduce((acc: any, p) => {
        const intern = p.intencion_internacionalizacion ? "Sí" : "No";
        acc[intern] = (acc[intern] || 0) + 1;
        return acc;
      }, {});
      setInternacionalizacionData(
        Object.entries(internCounts).map(([name, value]) => ({
          name, value: value as number, percentage: ((value as number) / total) * 100
        }))
      );

      const impactoCounts = proyecciones.reduce((acc: any, p) => {
        const imp = p.impacto || "No especificado";
        acc[imp] = (acc[imp] || 0) + 1;
        return acc;
      }, {});
      setImpactoData(Object.entries(impactoCounts).map(([name, value]) => ({ name, value: value as number })));

      const accCounts = proyecciones.reduce((acc: any, p) => {
        const acc_crec = p.decisiones_acciones_crecimiento ? "Sí" : "No";
        acc[acc_crec] = (acc[acc_crec] || 0) + 1;
        return acc;
      }, {});
      setAccionesCrecimientoData(
        Object.entries(accCounts).map(([name, value]) => ({
          name, value: value as number, percentage: ((value as number) / total) * 100
        }))
      );
    } catch (error) {
      console.error("Error fetching proyecciones stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><p className="text-muted-foreground">Cargando estadísticas...</p></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Intención de Internacionalización</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={300}><PieChart>
            <Pie data={internacionalizacionData} cx="50%" cy="50%" labelLine={false} 
              label={(e) => `${e.name} (${e.percentage?.toFixed(1)}%)`} outerRadius={80} dataKey="value">
              {internacionalizacionData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          </PieChart></ResponsiveContainer></CardContent>
        </Card>

        <Card><CardHeader><CardTitle>Distribución de Impacto</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={impactoData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart></ResponsiveContainer></CardContent>
        </Card>

        <Card className="md:col-span-2"><CardHeader><CardTitle>Acciones de Crecimiento</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={300}><PieChart>
            <Pie data={accionesCrecimientoData} cx="50%" cy="50%" labelLine={false}
              label={(e) => `${e.name} (${e.percentage?.toFixed(1)}%)`} outerRadius={80} dataKey="value">
              {accionesCrecimientoData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          </PieChart></ResponsiveContainer></CardContent>
        </Card>
      </div>
    </div>
  );
};
