import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { useOperadorNiveles } from "@/hooks/useOperadorNiveles";
import { RoleRedirect } from "@/components/RoleRedirect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Download } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { NotificacionesModal } from "@/components/estudiantes/NotificacionesModal";
import { useState } from "react";
import { ExportOptionsModal } from "@/components/candidatos/ExportOptionsModal";
import type { CandidatoData } from "@/pages/Candidatos";

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
  const { isAdmin, isOperador, loading } = useUserRole();
  const { niveles: operadorNiveles } = useOperadorNiveles();
  const [modalOpen, setModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const hasAccess = isAdmin || isOperador;

  // Determine which levels to show
  const allowedNiveles: NivelEmprendimiento[] = isAdmin
    ? ["Starter", "Growth", "Scale"]
    : (operadorNiveles as NivelEmprendimiento[]);

  const { data: modulosData, isLoading } = useQuery({
    queryKey: ["modulos-progreso", allowedNiveles],
    queryFn: async () => {
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
        if (!allowedNiveles.includes(modulo.nivel)) continue;

        const { data: clases } = await supabase
          .from("clases")
          .select("id")
          .eq("modulo_id", modulo.id);

        const totalClases = clases?.length || 0;

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
    enabled: hasAccess,
  });

  // Build export data for operators
  const { data: exportData } = useQuery({
    queryKey: ["estudiantes-export-data", allowedNiveles],
    queryFn: async () => {
      // Fetch students with approved cupo in allowed levels
      const { data: cupos } = await supabase
        .from("asignacion_cupos")
        .select(`
          *,
          emprendimientos (
            *,
            usuarios (*),
            equipos (*),
            proyecciones (*),
            financiamientos (*),
            diagnosticos (*)
          )
        `)
        .eq("estado", "aprobado")
        .in("nivel", allowedNiveles);

      if (!cupos) return [];

      const userIds = cupos.map((c: any) => c.emprendimientos?.user_id).filter(Boolean);
      
      const [{ data: autorizaciones }, { data: evaluaciones }] = await Promise.all([
        supabase.from("autorizaciones").select("*").in("user_id", userIds),
        supabase.from("evaluaciones").select("*").in("emprendimiento_id", cupos.map(c => c.emprendimiento_id)),
      ]);

      // Build progress data
      const allModulos = modulosData || { Starter: [], Growth: [], Scale: [] };

      return cupos.map((cupo: any) => {
        const emp = cupo.emprendimientos;
        if (!emp || !emp.usuarios) return null;
        const usuario = emp.usuarios;
        const autorizacion = autorizaciones?.find((a) => a.user_id === usuario.id);
        const equipo = emp.equipos?.[0];
        const proyeccion = emp.proyecciones?.[0];
        const financiamiento = emp.financiamientos?.[0];
        const diagnostico = emp.diagnosticos?.[0];
        const userEvals = evaluaciones?.filter((e) => e.emprendimiento_id === emp.id) || [];

        // Calculate progress per module
        const nivelModulos = allModulos[cupo.nivel as NivelEmprendimiento] || [];
        const totalModulos = nivelModulos.length;
        const studentInModulos = nivelModulos.map((m) => {
          const st = m.estudiantes.find((s) => s.user_id === usuario.id);
          return st?.progreso_porcentaje || 0;
        });
        const avgProgress = totalModulos > 0
          ? Math.round(studentInModulos.reduce((a, b) => a + b, 0) / totalModulos)
          : 0;

        return {
          id: usuario.id,
          nombres: usuario.nombres || "",
          apellidos: usuario.apellidos || "",
          email: usuario.email || "",
          created_at: usuario.created_at,
          celular: usuario.celular || "",
          numero_identificacion: usuario.numero_identificacion || "",
          departamento: usuario.departamento || "",
          municipio: usuario.municipio || "",
          tipo_documento: usuario.tipo_documento || undefined,
          genero: usuario.genero || undefined,
          direccion: usuario.direccion || undefined,
          ano_nacimiento: usuario.ano_nacimiento || undefined,
          identificacion_etnica: usuario.identificacion_etnica || undefined,
          biografia: usuario.biografia || undefined,
          nivel_ingles: usuario.nivel_ingles || undefined,
          menor_de_edad: usuario.menor_de_edad,
          autorizaciones: autorizacion ? {
            tratamiento_datos: autorizacion.tratamiento_datos,
            datos_sensibles: autorizacion.datos_sensibles,
            correo: autorizacion.correo,
            celular: autorizacion.celular,
          } : undefined,
          emprendimiento: {
            id: emp.id,
            nombre: emp.nombre,
            descripcion: emp.descripcion || "",
            categoria: emp.categoria || "",
            etapa: emp.etapa || "",
            nivel_definitivo: emp.nivel_definitivo || "",
          },
          cupo: {
            id: cupo.id,
            nivel: cupo.nivel,
            cohorte: cupo.cohorte,
            estado: cupo.estado || "pendiente",
            fecha_asignacion: cupo.fecha_asignacion || "",
            notas: cupo.notas || undefined,
          },
          equipo: equipo ? {
            equipo_total: equipo.equipo_total || 0,
            fundadoras: equipo.fundadoras || 0,
            colaboradoras: equipo.colaboradoras || 0,
            equipo_tecnico: equipo.equipo_tecnico || false,
          } : undefined,
          proyecciones: proyeccion ? {
            principales_objetivos: proyeccion.principales_objetivos || "",
            desafios: proyeccion.desafios || "",
            impacto: proyeccion.impacto || "",
          } : undefined,
          financiamiento: financiamiento ? {
            busca_financiamiento: financiamiento.busca_financiamiento || "",
            monto_buscado: financiamiento.monto_buscado || "",
            financiamiento_previo: financiamiento.financiamiento_previo,
          } : undefined,
          diagnostico: diagnostico ? {
            contenido: diagnostico.contenido || "",
            updated_at: diagnostico.updated_at,
          } : undefined,
          evaluaciones: userEvals.length,
          evaluaciones_detalle: userEvals.map((ev) => ({
            id: ev.id,
            tipo_evaluacion: ev.tipo_evaluacion,
            puntaje: Number(ev.puntaje) || 0,
            puntaje_impacto: Number(ev.puntaje_impacto) || 0,
            puntaje_equipo: Number(ev.puntaje_equipo) || 0,
            puntaje_innovacion_tecnologia: Number(ev.puntaje_innovacion_tecnologia) || 0,
            puntaje_ventas: Number(ev.puntaje_ventas) || 0,
            puntaje_referido_regional: Number(ev.puntaje_referido_regional) || 0,
            puntaje_proyeccion_financiacion: Number(ev.puntaje_proyeccion_financiacion) || 0,
            impacto_texto: ev.impacto_texto || "",
            equipo_texto: ev.equipo_texto || "",
            innovacion_tecnologia_texto: ev.innovacion_tecnologia_texto || "",
            ventas_texto: ev.ventas_texto || "",
            proyeccion_financiacion_texto: ev.proyeccion_financiacion_texto || "",
            comentarios_adicionales: ev.comentarios_adicionales || "",
            nivel: ev.nivel || "",
            cumple_ubicacion: ev.cumple_ubicacion ?? true,
            cumple_equipo_minimo: ev.cumple_equipo_minimo ?? false,
            cumple_dedicacion: ev.cumple_dedicacion ?? false,
            cumple_interes: ev.cumple_interes ?? false,
            created_at: ev.created_at,
          })),
          // Extra: progress percentage
          _progreso_promedio: avgProgress,
        } as CandidatoData & { _progreso_promedio?: number };
      }).filter(Boolean) as CandidatoData[];
    },
    enabled: hasAccess && isOperador && !!modulosData,
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

  if (!hasAccess) {
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

  const defaultTab = allowedNiveles[0] || "Starter";

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Progreso de Estudiantes</h1>
            <p className="text-muted-foreground">
              {isOperador && !isAdmin
                ? `Nivel${operadorNiveles.length > 1 ? "es" : ""}: ${operadorNiveles.join(", ")}`
                : "Visualiza el progreso de los estudiantes con cupo aprobado por nivel"
              }
            </p>
          </div>
          <div className="flex gap-2">
            {(isOperador && !isAdmin) && (
              <Button variant="outline" onClick={() => setExportModalOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Estudiantes
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setModalOpen(true)}>
                <Send className="mr-2 h-4 w-4" />
                Enviar Notificaciones
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-${allowedNiveles.length}`}>
            {allowedNiveles.map((nivel) => (
              <TabsTrigger key={nivel} value={nivel}>Nivel {nivel}</TabsTrigger>
            ))}
          </TabsList>

          {allowedNiveles.map((nivel) => (
            <TabsContent key={nivel} value={nivel}>
              {renderNivelContent(nivel)}
            </TabsContent>
          ))}
        </Tabs>

        {isAdmin && (
          <NotificacionesModal open={modalOpen} onOpenChange={setModalOpen} />
        )}

        {isOperador && !isAdmin && (
          <ExportOptionsModal
            candidatos={exportData || []}
            open={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            includeProgress
          />
        )}
      </div>
    </Layout>
  );
};

export default Estudiantes;
