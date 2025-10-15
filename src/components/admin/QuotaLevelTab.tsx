import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, TrendingUp, Download, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type NivelEmprendimiento = Database["public"]["Enums"]["nivel_emprendimiento"];

interface EmprendimientoElegible {
  id: string;
  nombre: string;
  user_id: string;
  beneficiario_nombre: string;
  beneficiario_apellido: string;
  puntaje_promedio: number;
  total_evaluaciones: number;
  mentores_asignados: number;
  evaluaciones_completadas: number;
  asignacion_id?: string;
  asignacion_estado?: string;
  asignacion_cohorte?: number;
}

interface QuotaLevelTabProps {
  nivel: NivelEmprendimiento;
  maxCupos: number;
  tieneCohorts: boolean;
  maxPorCohorte?: number;
}

export const QuotaLevelTab = ({ nivel, maxCupos, tieneCohorts, maxPorCohorte }: QuotaLevelTabProps) => {
  const [loading, setLoading] = useState(true);
  const [emprendimientos, setEmprendimientos] = useState<EmprendimientoElegible[]>([]);
  const [cuposUsados, setCuposUsados] = useState(0);
  const [cuposPorCohorte, setCuposPorCohorte] = useState({ 1: 0, 2: 0 });
  const [selectedCohortes, setSelectedCohortes] = useState<Record<string, number>>({});
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);

      // Obtener emprendimientos elegibles con su nivel definitivo
      const { data: empData, error: empError } = await supabase
        .from("emprendimientos")
        .select(`
          id,
          nombre,
          user_id,
          nivel_definitivo,
          usuarios!inner(nombres, apellidos)
        `)
        .eq("nivel_definitivo", nivel);

      if (empError) throw empError;

      // Obtener evaluaciones para cada emprendimiento
      const empIds = empData?.map(e => e.id) || [];
      
      const { data: evalData, error: evalError } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id, puntaje, estado")
        .in("emprendimiento_id", empIds)
        .not("puntaje", "is", null);

      if (evalError) throw evalError;

      // Obtener asignaciones de mentores
      const { data: mentorAssignments, error: mentorError } = await supabase
        .from("mentor_emprendimiento_assignments")
        .select("emprendimiento_id, mentor_id")
        .in("emprendimiento_id", empIds)
        .eq("activo", true);

      if (mentorError) throw mentorError;

      // Obtener asignaciones existentes
      const { data: asignaciones, error: asigError } = await supabase
        .from("asignacion_cupos")
        .select("*")
        .eq("nivel", nivel);

      if (asigError) throw asigError;

      // Calcular cupos usados
      const aprobados = asignaciones?.filter(a => a.estado === "aprobado") || [];
      setCuposUsados(aprobados.length);

      // Calcular cupos por cohorte
      const cohorte1 = aprobados.filter(a => a.cohorte === 1).length;
      const cohorte2 = aprobados.filter(a => a.cohorte === 2).length;
      setCuposPorCohorte({ 1: cohorte1, 2: cohorte2 });

      // Procesar datos
      const empConEvaluaciones = empData?.map(emp => {
        const evaluaciones = evalData?.filter(e => e.emprendimiento_id === emp.id) || [];
        const evaluacionesCompletadas = evaluaciones.filter(e => e.estado === 'enviada').length;
        const puntaje_promedio = evaluaciones.length > 0
          ? evaluaciones.reduce((sum, e) => sum + (e.puntaje || 0), 0) / evaluaciones.length
          : 0;

        const mentoresAsignados = mentorAssignments?.filter(m => m.emprendimiento_id === emp.id).length || 0;
        const asignacion = asignaciones?.find(a => a.emprendimiento_id === emp.id);
        
        return {
          id: emp.id,
          nombre: emp.nombre,
          user_id: emp.user_id,
          beneficiario_nombre: emp.usuarios?.nombres || "",
          beneficiario_apellido: emp.usuarios?.apellidos || "",
          puntaje_promedio: Math.round(puntaje_promedio * 100) / 100,
          total_evaluaciones: evaluaciones.length,
          mentores_asignados: mentoresAsignados,
          evaluaciones_completadas: evaluacionesCompletadas,
          asignacion_id: asignacion?.id,
          asignacion_estado: asignacion?.estado,
          asignacion_cohorte: asignacion?.cohorte
        };
      }) || [];

      // Filtrar solo los que tienen evaluaciones
      const elegibles = empConEvaluaciones.filter(e => e.total_evaluaciones > 0);
      
      setEmprendimientos(elegibles);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [nivel]);

  const sendWebhookNotification = async (
    accion: "Aprobada" | "Rechazada",
    emprendimiento: EmprendimientoElegible,
    cohorte: number
  ) => {
    try {
      // Obtener email y celular del usuario
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("email, celular")
        .eq("id", emprendimiento.user_id)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
        return;
      }

      // Enviar al webhook
      await fetch("https://n8n-n8n.5cj84u.easypanel.host/webhook/088e775b-34e3-46e8-bb2c-e7b0ec381ab8", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion,
          emprendimiento: emprendimiento.nombre,
          nombre: `${emprendimiento.beneficiario_nombre} ${emprendimiento.beneficiario_apellido}`,
          email: userData?.email || "",
          celular: userData?.celular || "",
          nivel,
          cohorte,
        }),
      });
    } catch (error) {
      console.error("Error sending webhook notification:", error);
    }
  };

  const handleAprobar = async (emprendimiento: EmprendimientoElegible) => {
    // Validar que todas las evaluaciones de mentores asignados estén completadas
    if (emprendimiento.mentores_asignados > emprendimiento.evaluaciones_completadas) {
      toast({
        title: "Evaluaciones pendientes",
        description: `Este emprendimiento tiene ${emprendimiento.mentores_asignados} mentor(es) asignado(s) pero solo ${emprendimiento.evaluaciones_completadas} evaluación(es) completada(s). Todas las evaluaciones deben estar completadas antes de aprobar el cupo.`,
        variant: "destructive"
      });
      return;
    }

    const cohorte = selectedCohortes[emprendimiento.id] || 1;

    // Validar límites de cupos
    if (cuposUsados >= maxCupos) {
      toast({
        title: "Límite alcanzado",
        description: `Ya se han asignado los ${maxCupos} cupos disponibles para ${nivel}`,
        variant: "destructive"
      });
      return;
    }

    if (tieneCohorts && maxPorCohorte) {
      if (cuposPorCohorte[cohorte as 1 | 2] >= maxPorCohorte) {
        toast({
          title: "Límite de cohorte alcanzado",
          description: `Ya se han asignado los ${maxPorCohorte} cupos de la cohorte ${cohorte}`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (emprendimiento.asignacion_id) {
        // Actualizar asignación existente
        const { error } = await supabase
          .from("asignacion_cupos")
          .update({
            estado: "aprobado",
            cohorte,
            aprobado_por: user?.id,
            fecha_asignacion: new Date().toISOString()
          })
          .eq("id", emprendimiento.asignacion_id);

        if (error) throw error;
      } else {
        // Crear nueva asignación
        const { error } = await supabase
          .from("asignacion_cupos")
          .insert({
            emprendimiento_id: emprendimiento.id,
            nivel,
            cohorte,
            estado: "aprobado",
            aprobado_por: user?.id
          });

        if (error) throw error;
      }

      // Activar visualización de evaluaciones al aprobar
      const { error: evalError } = await supabase
        .from("evaluaciones")
        .update({ visible_para_usuario: true })
        .eq("emprendimiento_id", emprendimiento.id);

      if (evalError) throw evalError;

      // Enviar notificación al webhook
      sendWebhookNotification("Aprobada", emprendimiento, cohorte);

      toast({
        title: "Cupo aprobado",
        description: `${emprendimiento.nombre} ha sido aprobado para ${nivel} - Cohorte ${cohorte}. Las evaluaciones ahora son visibles para el usuario.`
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRevertir = async (emprendimiento: EmprendimientoElegible) => {
    try {
      if (!emprendimiento.asignacion_id) return;

      const { error } = await supabase
        .from("asignacion_cupos")
        .delete()
        .eq("id", emprendimiento.asignacion_id);

      if (error) throw error;

      toast({
        title: "Cupo revertido",
        description: `${emprendimiento.nombre} ha vuelto al estado pendiente`
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRechazar = async (emprendimiento: EmprendimientoElegible) => {
    try {
      const cohorte = selectedCohortes[emprendimiento.id] || 1;
      
      if (emprendimiento.asignacion_id) {
        const { error } = await supabase
          .from("asignacion_cupos")
          .update({ estado: "rechazado" })
          .eq("id", emprendimiento.asignacion_id);

        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from("asignacion_cupos")
          .insert({
            emprendimiento_id: emprendimiento.id,
            nivel,
            cohorte,
            estado: "rechazado",
            aprobado_por: user?.id
          });

        if (error) throw error;
      }

      // Enviar notificación al webhook
      sendWebhookNotification("Rechazada", emprendimiento, cohorte);

      toast({
        title: "Cupo rechazado",
        description: `La solicitud de ${emprendimiento.nombre} ha sido rechazada`
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  };

  const sortedEmprendimientos = [...emprendimientos].sort((a, b) => {
    if (sortOrder === "desc") {
      return b.puntaje_promedio - a.puntaje_promedio;
    } else {
      return a.puntaje_promedio - b.puntaje_promedio;
    }
  });

  const exportToExcel = (estado?: string) => {
    let dataToExport = sortedEmprendimientos;
    
    if (estado) {
      dataToExport = sortedEmprendimientos.filter(e => e.asignacion_estado === estado);
    }

    const worksheetData = dataToExport.map(emp => {
      const baseData = {
        "Emprendimiento": emp.nombre,
        "Beneficiario": `${emp.beneficiario_nombre} ${emp.beneficiario_apellido}`,
        "Puntaje Promedio": emp.puntaje_promedio,
        "Evaluaciones": emp.total_evaluaciones,
        "Mentores Asignados": emp.mentores_asignados,
        "Evaluaciones Completadas": emp.evaluaciones_completadas,
        "Estado": emp.asignacion_estado || "Pendiente"
      };
      
      if (tieneCohorts) {
        return {
          ...baseData,
          "Cohorte": emp.asignacion_cohorte || "-"
        };
      }
      
      return baseData;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    
    const sheetName = estado 
      ? `${nivel} - ${estado.charAt(0).toUpperCase() + estado.slice(1)}`
      : `${nivel} - Todos`;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const filename = estado 
      ? `${nivel}_${estado}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `${nivel}_todos_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(workbook, filename);

    toast({
      title: "Exportado exitosamente",
      description: `Se han exportado ${dataToExport.length} registros a Excel`
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const cuposDisponibles = maxCupos - cuposUsados;
  const porcentajeUsado = (cuposUsados / maxCupos) * 100;

  return (
    <div className="space-y-4">
      {/* Tarjeta de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cupos Totales</CardDescription>
            <CardTitle className="text-3xl">{maxCupos}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cupos Usados</CardDescription>
            <CardTitle className="text-3xl text-primary">{cuposUsados}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${porcentajeUsado}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cupos Disponibles</CardDescription>
            <CardTitle className="text-3xl text-green-600">{cuposDisponibles}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {tieneCohorts && maxPorCohorte && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cohorte 1</CardDescription>
              <CardTitle className="text-2xl">{cuposPorCohorte[1]} / {maxPorCohorte}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cohorte 2</CardDescription>
              <CardTitle className="text-2xl">{cuposPorCohorte[2]} / {maxPorCohorte}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Tabla de emprendimientos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Emprendimientos Elegibles - Nivel {nivel}</CardTitle>
              <CardDescription>
                {emprendimientos.length} emprendimiento(s) con evaluaciones completadas
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToExcel()}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToExcel("aprobado")}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Aprobados
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToExcel("rechazado")}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Rechazados
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {emprendimientos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay emprendimientos elegibles para este nivel
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emprendimiento</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead className="text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={toggleSort}
                      className="gap-1 hover:bg-muted"
                    >
                      Puntaje Promedio
                      {sortOrder === "desc" ? (
                        <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Evaluaciones</TableHead>
                  <TableHead className="text-center">Mentores</TableHead>
                  <TableHead className="text-center">Completadas</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  {tieneCohorts && <TableHead className="text-center">Cohorte</TableHead>}
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEmprendimientos.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.nombre}</TableCell>
                    <TableCell>
                      {emp.beneficiario_nombre} {emp.beneficiario_apellido}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{emp.puntaje_promedio}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{emp.total_evaluaciones}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{emp.mentores_asignados}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={emp.mentores_asignados === emp.evaluaciones_completadas ? "default" : "destructive"}
                      >
                        {emp.evaluaciones_completadas}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.asignacion_estado === "aprobado" && (
                        <Badge className="bg-green-500">Aprobado</Badge>
                      )}
                      {emp.asignacion_estado === "rechazado" && (
                        <Badge variant="destructive">Rechazado</Badge>
                      )}
                      {!emp.asignacion_estado && (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </TableCell>
                    {tieneCohorts && (
                      <TableCell className="text-center">
                        {emp.asignacion_estado === "aprobado" ? (
                          <Badge>{emp.asignacion_cohorte}</Badge>
                        ) : (
                          <Select
                            value={selectedCohortes[emp.id]?.toString() || "1"}
                            onValueChange={(value) =>
                              setSelectedCohortes(prev => ({
                                ...prev,
                                [emp.id]: parseInt(value)
                              }))
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        {emp.asignacion_estado !== "aprobado" && (
                          <Button
                            size="sm"
                            onClick={() => handleAprobar(emp)}
                            className="gap-1"
                            disabled={emp.mentores_asignados > emp.evaluaciones_completadas}
                            title={emp.mentores_asignados > emp.evaluaciones_completadas 
                              ? "Faltan evaluaciones por completar" 
                              : "Aprobar cupo"}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Aprobar
                          </Button>
                        )}
                        {emp.asignacion_estado !== "rechazado" && emp.asignacion_estado !== "aprobado" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRechazar(emp)}
                            className="gap-1"
                          >
                            <XCircle className="h-4 w-4" />
                            Rechazar
                          </Button>
                        )}
                        {(emp.asignacion_estado === "aprobado" || emp.asignacion_estado === "rechazado") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevertir(emp)}
                            className="gap-1"
                            title="Volver al estado pendiente"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Revertir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
