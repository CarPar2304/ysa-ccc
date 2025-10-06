import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Unlock, Loader2, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const AdminEvaluations = () => {
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const { data, error } = await supabase
        .from("evaluaciones")
        .select(`
          *,
          emprendimientos:emprendimiento_id (
            nombre,
            user_id,
            usuarios:user_id (
              nombres,
              apellidos,
              email
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las evaluaciones",
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
        description: `Evaluación ${!currentVisibility ? 'desbloqueada' : 'bloqueada'} correctamente`,
      });

      await fetchEvaluations();
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
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
            <CardTitle>Gestión de Evaluaciones</CardTitle>
            <CardDescription>Desbloquea evaluaciones para beneficiarios</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {evaluations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No hay evaluaciones registradas
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiario</TableHead>
                <TableHead>Emprendimiento</TableHead>
                <TableHead>Puntaje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((evaluation) => (
                <TableRow key={evaluation.id}>
                  <TableCell>
                    {evaluation.emprendimientos?.usuarios?.nombres} {evaluation.emprendimientos?.usuarios?.apellidos}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {evaluation.emprendimientos?.usuarios?.email}
                    </span>
                  </TableCell>
                  <TableCell>{evaluation.emprendimientos?.nombre || "Sin nombre"}</TableCell>
                  <TableCell>
                    {evaluation.puntaje ? `${evaluation.puntaje}/100` : "N/A"}
                  </TableCell>
                  <TableCell>
                    {evaluation.visible_para_usuario ? (
                      <Badge variant="default" className="bg-green-500">
                        <Eye className="h-3 w-3 mr-1" />
                        Visible
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Bloqueada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={evaluation.visible_para_usuario ? "outline" : "default"}
                      onClick={() => toggleVisibility(evaluation.id, evaluation.visible_para_usuario)}
                      disabled={toggling === evaluation.id}
                    >
                      {toggling === evaluation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : evaluation.visible_para_usuario ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Bloquear
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4 mr-2" />
                          Desbloquear
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
