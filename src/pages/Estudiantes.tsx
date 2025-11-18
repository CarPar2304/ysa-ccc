import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleRedirect } from "@/components/RoleRedirect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type NivelEmprendimiento = Database["public"]["Enums"]["nivel_emprendimiento"];

interface StudentProgress {
  user_id: string;
  nombres: string;
  apellidos: string;
  avatar_url: string | null;
  emprendimiento_nombre: string;
  progreso_porcentaje: number;
}

interface ModuleWithProgress {
  id: string;
  titulo: string;
  total_clases: number;
  progreso_promedio: number;
  estudiantes: StudentProgress[];
}

const Estudiantes = () => {
  const { isAdmin, loading } = useUserRole();

  const { data: modulosData, isLoading } = useQuery({
    queryKey: ["modulos-progreso"],
    queryFn: async () => {
      // Obtener todos los módulos
      const { data: modulos } = await supabase
        .from("modulos")
        .select("*")
        .order("orden");

      if (!modulos) return { Starter: [], Growth: [], Scale: [] };

      const resultado: Record<NivelEmprendimiento, ModuleWithProgress[]> = {
        Starter: [],
        Growth: [],
        Scale: [],
      };

      for (const modulo of modulos) {
        if (!modulo.nivel) continue;

        // Obtener clases del módulo
        const { data: clases } = await supabase
          .from("clases")
          .select("id")
          .eq("modulo_id", modulo.id);

        const totalClases = clases?.length || 0;

        // Obtener estudiantes con cupo aprobado en este nivel
        const { data: asignaciones } = await supabase
          .from("asignacion_cupos")
          .select(`
            emprendimiento_id,
            emprendimientos (
              id,
              nombre,
              user_id,
              usuarios (
                id,
                nombres,
                apellidos,
                avatar_url
              )
            )
          `)
          .eq("nivel", modulo.nivel)
          .eq("estado", "aprobado");

        const estudiantes: StudentProgress[] = [];

        if (asignaciones && clases) {
          for (const asignacion of asignaciones) {
            const emp = asignacion.emprendimientos as any;
            if (!emp || !emp.usuarios) continue;

            const usuario = emp.usuarios;

            // Calcular progreso del estudiante en este módulo
            const clasesIds = clases.map((c) => c.id);
            const { data: progreso } = await supabase
              .from("progreso_usuario")
              .select("*")
              .eq("user_id", usuario.id)
              .in("clase_id", clasesIds);

            const clasesCompletadas = progreso?.filter((p) => p.completado).length || 0;
            const progresoTotal = totalClases > 0 ? (clasesCompletadas / totalClases) * 100 : 0;

            estudiantes.push({
              user_id: usuario.id,
              nombres: usuario.nombres || "",
              apellidos: usuario.apellidos || "",
              avatar_url: usuario.avatar_url,
              emprendimiento_nombre: emp.nombre || "",
              progreso_porcentaje: Math.round(progresoTotal),
            });
          }
        }

        const progresoPromedio =
          estudiantes.length > 0
            ? estudiantes.reduce((sum, e) => sum + e.progreso_porcentaje, 0) / estudiantes.length
            : 0;

        resultado[modulo.nivel].push({
          id: modulo.id,
          titulo: modulo.titulo,
          total_clases: totalClases,
          progreso_promedio: Math.round(progresoPromedio),
          estudiantes,
        });
      }

      return resultado;
    },
  });

  if (loading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <RoleRedirect />;
  }

  const renderNivelContent = (nivel: NivelEmprendimiento) => {
    const modulos = modulosData?.[nivel] || [];

    if (modulos.length === 0) {
      return (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No hay módulos creados para este nivel
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {modulos.map((modulo) => (
          <Card key={modulo.id}>
            <CardHeader>
              <CardTitle>{modulo.titulo}</CardTitle>
              <CardDescription>
                {modulo.total_clases} clases • Progreso promedio: {modulo.progreso_promedio}%
              </CardDescription>
              <Progress value={modulo.progreso_promedio} className="mt-2" />
            </CardHeader>
            <CardContent>
              {modulo.estudiantes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay estudiantes asignados a este nivel
                </p>
              ) : (
                <div className="space-y-4">
                  {modulo.estudiantes.map((estudiante) => (
                    <div
                      key={estudiante.user_id}
                      className="flex items-center gap-4 p-4 border border-border rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        {estudiante.avatar_url ? (
                          <img
                            src={estudiante.avatar_url}
                            alt={`${estudiante.nombres} ${estudiante.apellidos}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {estudiante.nombres.charAt(0)}
                              {estudiante.apellidos.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {estudiante.nombres} {estudiante.apellidos}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {estudiante.emprendimiento_nombre}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <Progress
                            value={estudiante.progreso_porcentaje}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium text-foreground min-w-[3rem] text-right">
                            {estudiante.progreso_porcentaje}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Progreso de Estudiantes</h1>
          <p className="text-muted-foreground">
            Visualiza el progreso de los estudiantes con cupo aprobado por nivel
          </p>
        </div>

        <Tabs defaultValue="Starter" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="Starter">Nivel Starter</TabsTrigger>
            <TabsTrigger value="Growth">Nivel Growth</TabsTrigger>
            <TabsTrigger value="Scale">Nivel Scale</TabsTrigger>
          </TabsList>

          <TabsContent value="Starter">{renderNivelContent("Starter")}</TabsContent>
          <TabsContent value="Growth">{renderNivelContent("Growth")}</TabsContent>
          <TabsContent value="Scale">{renderNivelContent("Scale")}</TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Estudiantes;
