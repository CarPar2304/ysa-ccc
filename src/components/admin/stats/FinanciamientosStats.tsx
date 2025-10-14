import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartData {
  name: string;
  value: number;
}

export const FinanciamientosStats = () => {
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
  }, []);

  const fetchFinanciamientosStats = async () => {
    try {
      const { data: financiamientos } = await supabase
        .from("financiamientos")
        .select("*");

      if (!financiamientos) {
        setLoading(false);
        return;
      }

      // Financiamiento previo
      const conPrevio = financiamientos.filter(f => f.financiamiento_previo === true);
      setConFinanciamientoPrevio(conPrevio.length);

      // Tipo de actor (solo con financiamiento previo)
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

      // Etapa (solo con financiamiento previo)
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

      // Promedio monto recibido
      const montosRecibidos = conPrevio
        .filter(f => f.monto_recibido)
        .map(f => f.monto_recibido || 0);

      const promedioRec = montosRecibidos.length
        ? montosRecibidos.reduce((sum, m) => sum + m, 0) / montosRecibidos.length
        : 0;

      setPromedioRecibido(promedioRec);

      // Buscan inversión
      const buscan = financiamientos.filter(f => f.busca_financiamiento && f.busca_financiamiento !== "No");
      setBuscanInversion(buscan.length);

      // Promedio monto buscado (convertir texto a número si es posible)
      const montosBuscados = buscan
        .filter(f => f.monto_buscado)
        .map(f => {
          const monto = f.monto_buscado || "";
          // Intentar extraer número del texto
          const numero = parseFloat(monto.replace(/[^0-9.]/g, ""));
          return isNaN(numero) ? 0 : numero;
        })
        .filter(m => m > 0);

      const promedioBusc = montosBuscados.length
        ? montosBuscados.reduce((sum, m) => sum + m, 0) / montosBuscados.length
        : 0;

      setPromedioBuscado(promedioBusc);

      // Tipo de inversión buscada
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
      {/* Sección: Financiamiento Previo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Financiamiento Previo</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Financiamiento Previo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conFinanciamientoPrevio}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio Monto Recibido</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
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
                <BarChart data={tipoActorData}>
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
              <CardTitle>Distribución por Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={etapaData}>
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

      {/* Sección: Búsqueda de Inversión */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Búsqueda de Inversión</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buscan Inversión</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{buscanInversion}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio Monto Buscado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
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
              <BarChart data={tipoInversionData}>
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
      </div>
    </div>
  );
};
