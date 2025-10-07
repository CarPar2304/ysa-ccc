import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Unlock, Loader2, Eye, EyeOff, Edit, Lock, Search, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const AdminEvaluations = () => {
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [emprendimientos, setEmprendimientos] = useState<any[]>([]);
  const [mentores, setMentores] = useState<any[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEmprendimiento, setFilterEmprendimiento] = useState<string>("all");
  const [filterMentor, setFilterMentor] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch evaluations
      const { data: evals, error: evalsError } = await supabase
        .from("evaluaciones")
        .select(`
          *,
          emprendimientos:emprendimiento_id (
            id,
            nombre,
            user_id,
            usuarios:user_id (
              nombres,
              apellidos,
              email
            )
          ),
          mentor:mentor_id (
            nombres,
            apellidos,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (evalsError) throw evalsError;
      setEvaluations(evals || []);

      // Fetch unique emprendimientos
      const { data: emps, error: empsError } = await supabase
        .from("emprendimientos")
        .select("id, nombre");

      if (empsError) throw empsError;
      setEmprendimientos(emps || []);

      // Fetch mentores
      const { data: mentorsData, error: mentorsError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          usuarios:user_id (
            nombres,
            apellidos
          )
        `)
        .eq("role", "mentor");

      if (mentorsError) throw mentorsError;
      setMentores(mentorsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (evaluationId: string, currentVisibility: boolean) => {
    setToggling(evaluationId);
    try {
      const { error } = await supabase
        .from("evaluaciones")
        .update({ visible_para_usuario: !currentVisibility })
        .eq("id", evaluationId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Evaluación ${!currentVisibility ? 'visible' : 'oculta'} para el beneficiario`,
      });

      await fetchData();
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar la visibilidad",
        variant: "destructive",
      });
    } finally {
      setToggling(null);
    }
  };

  const toggleEditPermission = async (evaluationId: string, canEdit: boolean) => {
    try {
      const { error } = await supabase
        .from("evaluaciones")
        .update({ puede_editar: !canEdit })
        .eq("id", evaluationId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Edición ${!canEdit ? 'habilitada' : 'bloqueada'} correctamente`,
      });

      await fetchData();
    } catch (error) {
      console.error("Error toggling edit permission:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el permiso de edición",
        variant: "destructive",
      });
    }
  };

  // Filter evaluations
  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesSearch = 
      evaluation.emprendimientos?.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.emprendimientos?.usuarios?.nombres?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.emprendimientos?.usuarios?.apellidos?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.emprendimientos?.usuarios?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEmprendimiento = 
      filterEmprendimiento === "all" || 
      evaluation.emprendimiento_id === filterEmprendimiento;

    const matchesMentor = 
      filterMentor === "all" || 
      evaluation.mentor_id === filterMentor;

    const matchesEstado = 
      filterEstado === "all" || 
      evaluation.estado === filterEstado;

    return matchesSearch && matchesEmprendimiento && matchesMentor && matchesEstado;
  });

  // Group evaluations by emprendimiento
  const evaluationsByEmprendimiento = filteredEvaluations.reduce((acc: any, evaluation) => {
    const empId = evaluation.emprendimiento_id;
    if (!acc[empId]) {
      acc[empId] = {
        emprendimiento: evaluation.emprendimientos,
        evaluaciones: [],
      };
    }
    acc[empId].evaluaciones.push(evaluation);
    return acc;
  }, {});

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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Gestión de Evaluaciones</CardTitle>
            <CardDescription>Control completo de evaluaciones y visibilidad</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtros y búsqueda */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar beneficiario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterEmprendimiento} onValueChange={setFilterEmprendimiento}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Emprendimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los emprendimientos</SelectItem>
              {emprendimientos.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMentor} onValueChange={setFilterMentor}>
            <SelectTrigger>
              <SelectValue placeholder="Mentor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los mentores</SelectItem>
              {mentores.map(mentor => (
                <SelectItem key={mentor.user_id} value={mentor.user_id}>
                  {mentor.usuarios?.nombres} {mentor.usuarios?.apellidos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="enviada">Enviadas</SelectItem>
              <SelectItem value="borrador">Borradores</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabla de evaluaciones agrupadas */}
        {Object.keys(evaluationsByEmprendimiento).length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No hay evaluaciones que coincidan con los filtros
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(evaluationsByEmprendimiento).map(([empId, data]: [string, any]) => (
              <Card key={empId}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{data.emprendimiento?.nombre}</CardTitle>
                      <CardDescription>
                        {data.emprendimiento?.usuarios?.nombres} {data.emprendimiento?.usuarios?.apellidos}
                        {" • "}
                        {data.emprendimiento?.usuarios?.email}
                      </CardDescription>
                    </div>
                    <Badge>
                      {data.evaluaciones.filter((e: any) => e.estado === 'enviada').length} / 3 Evaluaciones
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mentor</TableHead>
                        <TableHead>Puntaje</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Visible</TableHead>
                        <TableHead>Editable</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.evaluaciones.map((evaluation: any) => (
                        <TableRow key={evaluation.id}>
                          <TableCell>
                            {evaluation.mentor?.nombres} {evaluation.mentor?.apellidos}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-primary">
                              {evaluation.puntaje || 0} / 105
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={evaluation.estado === 'enviada' ? 'default' : 'outline'}>
                              {evaluation.estado === 'enviada' ? 'Enviada' : 'Borrador'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={evaluation.visible_para_usuario}
                                onCheckedChange={() => toggleVisibility(evaluation.id, evaluation.visible_para_usuario)}
                                disabled={toggling === evaluation.id}
                              />
                              {evaluation.visible_para_usuario ? (
                                <Eye className="h-4 w-4 text-green-500" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={evaluation.puede_editar}
                                onCheckedChange={() => toggleEditPermission(evaluation.id, evaluation.puede_editar)}
                              />
                              {evaluation.puede_editar ? (
                                <Edit className="h-4 w-4 text-green-500" />
                              ) : (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Abrir modal de edición (a implementar si es necesario)
                                toast({
                                  title: "Próximamente",
                                  description: "Función de edición directa en desarrollo",
                                });
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Ver/Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
