import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProgressItem {
  emprendimiento_id: string;
  nombre: string;
  beneficiario: string;
  email: string;
  mentores_asignados: number;
  evaluaciones_completadas: number;
  puntaje_promedio: number | null;
  progreso_porcentaje: number;
}

export const EvaluationProgress = () => {
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'progreso' | 'nombre' | 'puntaje'>('progreso');
  const { toast } = useToast();

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);

      // Obtener emprendimientos
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

      // Obtener asignaciones de mentores
      const { data: asignaciones, error: asigError } = await supabase
        .from("mentor_emprendimiento_assignments")
        .select("emprendimiento_id, mentor_id")
        .eq("activo", true);

      if (asigError) throw asigError;

      // Obtener evaluaciones
      const { data: evaluaciones, error: evalError } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id, puntaje, estado");

      if (evalError) throw evalError;

      // Procesar datos
      const progress = emprendimientos?.map(emp => {
        const mentores = asignaciones?.filter(a => a.emprendimiento_id === emp.id).length || 0;
        const evals = evaluaciones?.filter(
          e => e.emprendimiento_id === emp.id && e.estado === 'enviada'
        ) || [];
        const count = evals.length;
        const promedio = count > 0
          ? evals.reduce((sum, e) => sum + (e.puntaje || 0), 0) / count
          : null;
        const progreso = count > 0 ? Math.min((count / mentores) * 100, 100) : 0;

        return {
          emprendimiento_id: emp.id,
          nombre: emp.nombre,
          beneficiario: `${emp.usuarios?.nombres || ''} ${emp.usuarios?.apellidos || ''}`.trim(),
          email: emp.usuarios?.email || '',
          mentores_asignados: mentores,
          evaluaciones_completadas: count,
          puntaje_promedio: promedio,
          progreso_porcentaje: progreso,
        };
      }) || [];

      setProgressData(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el progreso de evaluaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = progressData.filter(item => {
    if (filter === 'pending') {
      return item.evaluaciones_completadas === 0;
    }
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'progreso':
        return a.evaluaciones_completadas - b.evaluaciones_completadas;
      case 'nombre':
        return a.nombre.localeCompare(b.nombre);
      case 'puntaje':
        return (b.puntaje_promedio || 0) - (a.puntaje_promedio || 0);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const totalEmprendimientos = progressData.length;
  const sinEvaluar = progressData.filter(p => p.evaluaciones_completadas === 0).length;
  const conEvaluaciones = progressData.filter(p => p.evaluaciones_completadas > 0).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Progreso de Evaluaciones</CardTitle>
            <CardDescription>
              Estado actual de las evaluaciones por emprendimiento
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Solo Pendientes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="progreso">Menos evaluaciones primero</SelectItem>
                <SelectItem value="nombre">Por nombre</SelectItem>
                <SelectItem value="puntaje">Por puntaje</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estadísticas generales */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{totalEmprendimientos}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-orange-500">{sinEvaluar}</p>
              <p className="text-sm text-muted-foreground">Sin Evaluar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-green-500">{conEvaluaciones}</p>
              <p className="text-sm text-muted-foreground">Con Evaluaciones</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de emprendimientos */}
        <div className="space-y-4">
          {sortedData.map((item) => (
            <Card key={item.emprendimiento_id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{item.nombre}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.beneficiario} • {item.email}
                    </p>
                  </div>
                  <Badge variant={item.evaluaciones_completadas > 0 ? "default" : "secondary"}>
                    {item.evaluaciones_completadas} {item.evaluaciones_completadas === 1 ? 'Evaluación' : 'Evaluaciones'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Progreso de evaluación
                    </span>
                    <span className="font-medium">
                      {item.progreso_porcentaje.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={item.progreso_porcentaje} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Mentores Asignados</p>
                    <p className="font-semibold">{item.mentores_asignados}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Evaluaciones</p>
                    <p className="font-semibold">{item.evaluaciones_completadas}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Puntaje Promedio</p>
                    <p className="font-semibold text-primary">
                      {item.puntaje_promedio !== null
                        ? `${item.puntaje_promedio.toFixed(1)} / 100`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sortedData.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No hay emprendimientos {filter === 'pending' && 'pendientes'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
