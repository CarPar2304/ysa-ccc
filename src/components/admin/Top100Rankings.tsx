import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface RankingItem {
  posicion: number;
  emprendimiento_id: string;
  nombre: string;
  beneficiario: string;
  email: string;
  puntaje_promedio: number;
  evaluaciones_completadas: number;
}

export const Top100Rankings = () => {
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los emprendimientos con sus evaluaciones
      const { data: emprendimientos, error: empError } = await supabase
        .from("emprendimientos")
        .select(`
          id,
          nombre,
          user_id,
          usuarios:user_id (
            nombres,
            apellidos,
            email
          )
        `);

      if (empError) throw empError;

      // Obtener todas las evaluaciones (CCC + jurados enviados)
      const { data: evaluaciones, error: evalError } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id, puntaje, estado, tipo_evaluacion");

      if (evalError) throw evalError;

      // Calcular promedios
      const promedios = emprendimientos?.map(emp => {
        // Incluir evaluaciones CCC (sin importar estado) y jurados enviadas
        const evals = evaluaciones?.filter(
          e => e.emprendimiento_id === emp.id && 
          (e.tipo_evaluacion === 'ccc' || e.estado === 'enviada')
        ) || [];
        const count = evals.length;
        const promedio = count > 0
          ? evals.reduce((sum, e) => sum + (e.puntaje || 0), 0) / count
          : 0;

        return {
          emprendimiento_id: emp.id,
          nombre: emp.nombre,
          beneficiario: `${emp.usuarios?.nombres || ''} ${emp.usuarios?.apellidos || ''}`.trim(),
          email: emp.usuarios?.email || '',
          puntaje_promedio: promedio,
          evaluaciones_completadas: count,
        };
      }) || [];

      // Filtrar emprendimientos con al menos una evaluación
      const filtered = promedios.filter(p => p.evaluaciones_completadas > 0);

      // Ordenar por puntaje promedio descendente
      const sorted = filtered.sort((a, b) => b.puntaje_promedio - a.puntaje_promedio);

      // Tomar top 100
      const top100 = sorted.slice(0, 100).map((item, index) => ({
        ...item,
        posicion: index + 1,
      }));

      setRankings(top100);
    } catch (error) {
      console.error("Error fetching rankings:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los rankings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Posición", "Emprendimiento", "Beneficiario", "Email", "Puntaje Promedio", "Evaluaciones Completadas"];
    const rows = rankings.map(r => [
      r.posicion,
      r.nombre,
      r.beneficiario,
      r.email,
      r.puntaje_promedio.toFixed(2),
      r.evaluaciones_completadas,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `top_100_rankings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Éxito",
      description: "Rankings exportados correctamente",
    });
  };

  const getMedalColor = (posicion: number) => {
    if (posicion === 1) return "text-yellow-500";
    if (posicion === 2) return "text-gray-400";
    if (posicion === 3) return "text-orange-600";
    return "";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Top 100 Rankings
            </CardTitle>
            <CardDescription>
              Los {rankings.length} mejores emprendimientos por puntaje promedio
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rankings.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No hay emprendimientos con evaluaciones
          </p>
        ) : (
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">#</TableHead>
                  <TableHead>Emprendimiento</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead className="text-center">Puntaje Promedio</TableHead>
                  <TableHead className="text-center">Evaluaciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map((item) => (
                  <TableRow key={item.emprendimiento_id}>
                    <TableCell className="text-center font-bold">
                      <div className="flex items-center justify-center">
                        {item.posicion <= 3 ? (
                          <Trophy className={`h-5 w-5 ${getMedalColor(item.posicion)}`} />
                        ) : (
                          item.posicion
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>
                      {item.beneficiario}
                      <br />
                      <span className="text-xs text-muted-foreground">{item.email}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-primary">
                          {item.puntaje_promedio.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">
                        {item.evaluaciones_completadas}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/profile?emprendimiento=${item.emprendimiento_id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
