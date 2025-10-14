import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, TrendingUp, Download } from "lucide-react";
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

      // Obtener evaluaciones aprobadas para cada emprendimiento
      const empIds = empData?.map(e => e.id) || [];
      
      const { data: evalData, error: evalError } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id, puntaje")
        .in("emprendimiento_id", empIds)
        .not("puntaje", "is", null)
        .or(`tipo_evaluacion.eq.ccc,and(tipo_evaluacion.eq.jurado,aprobada_por_admin.eq.true)`);

      if (evalError) throw evalError;

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
        const puntaje_promedio = evaluaciones.length > 0
          ? evaluaciones.reduce((sum, e) => sum + (e.puntaje || 0), 0) / evaluaciones.length
          : 0;

        const asignacion = asignaciones?.find(a => a.emprendimiento_id === emp.id);
        
        return {
          id: emp.id,
          nombre: emp.nombre,
          user_id: emp.user_id,
          beneficiario_nombre: emp.usuarios?.nombres || "",
          beneficiario_apellido: emp.usuarios?.apellidos || "",
          puntaje_promedio: Math.round(puntaje_promedio * 100) / 100,
          total_evaluaciones: evaluaciones.length,
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

  const handleAprobar = async (emprendimiento: EmprendimientoElegible) => {
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

      toast({
        title: "Cupo aprobado",
        description: `${emprendimiento.nombre} ha sido aprobado para ${nivel} - Cohorte ${cohorte}`
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
            cohorte: 1,
            estado: "rechazado",
            aprobado_por: user?.id
          });

        if (error) throw error;
      }

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

  const exportToCSV = (estado?: string) => {
    let dataToExport = emprendimientos;
    
    if (estado) {
      dataToExport = emprendimientos.filter(e => e.asignacion_estado === estado);
    }

    const headers = tieneCohorts 
      ? ["Emprendimiento", "Beneficiario", "Puntaje Promedio", "Evaluaciones", "Estado", "Cohorte"]
      : ["Emprendimiento", "Beneficiario", "Puntaje Promedio", "Evaluaciones", "Estado"];
    
    const rows = dataToExport.map(emp => {
      const baseRow = [
        emp.nombre,
        `${emp.beneficiario_nombre} ${emp.beneficiario_apellido}`,
        emp.puntaje_promedio.toString(),
        emp.total_evaluaciones.toString(),
        emp.asignacion_estado || "Pendiente"
      ];
      
      if (tieneCohorts) {
        baseRow.push(emp.asignacion_cohorte?.toString() || "-");
      }
      
      return baseRow;
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const filename = estado 
      ? `${nivel}_${estado}_${new Date().toISOString().split('T')[0]}.csv`
      : `${nivel}_todos_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportado exitosamente",
      description: `Se han exportado ${dataToExport.length} registros`
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
                {emprendimientos.length} emprendimiento(s) con evaluaciones aprobadas
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV()}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV("aprobado")}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Aprobados
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV("rechazado")}
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
                  <TableHead className="text-center">Puntaje Promedio</TableHead>
                  <TableHead className="text-center">Evaluaciones</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  {tieneCohorts && <TableHead className="text-center">Cohorte</TableHead>}
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emprendimientos.map((emp) => (
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
                          >
                            <CheckCircle className="h-4 w-4" />
                            Aprobar
                          </Button>
                        )}
                        {emp.asignacion_estado !== "rechazado" && (
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
