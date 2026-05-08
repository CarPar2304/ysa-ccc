import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, TrendingUp, Download, ArrowUp, ArrowDown, RotateCcw, ThumbsUp, ThumbsDown, Search, Filter, ArrowRightLeft, Eye } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { CandidatoFullDetailById } from "@/components/candidatos/CandidatoFullDetailById";

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
  recomendaciones: { si: number; no: number; total: number };
}

interface QuotaLevelTabProps {
  nivel: NivelEmprendimiento;
  maxCupos: number;
  tieneCohorts: boolean;
  maxPorCohorte?: number;
}

type EstadoFilter = "todos" | "pendiente" | "aprobado" | "rechazado";
type RecomendacionFilter = "todos" | "recomendado" | "no_recomendado" | "sin_datos";
type EvalCountFilter = "todos" | "0" | "1" | "2" | "3+";

const ALL_NIVELES: NivelEmprendimiento[] = ["Starter", "Growth", "Scale"];

export const QuotaLevelTab = ({ nivel, maxCupos, tieneCohorts, maxPorCohorte }: QuotaLevelTabProps) => {
  const [loading, setLoading] = useState(true);
  const [emprendimientos, setEmprendimientos] = useState<EmprendimientoElegible[]>([]);
  const [cuposUsados, setCuposUsados] = useState(0);
  const [cuposPorCohorte, setCuposPorCohorte] = useState({ 1: 0, 2: 0 });
  const [selectedCohortes, setSelectedCohortes] = useState<Record<string, number>>({});
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("todos");
  const [cohorteFilter, setCohorteFilter] = useState<string>("todos");
  const [recomendacionFilter, setRecomendacionFilter] = useState<RecomendacionFilter>("todos");
  const [evalCountFilter, setEvalCountFilter] = useState<EvalCountFilter>("todos");

  // Over-quota confirmation dialog
  const [pendingOverQuotaApproval, setPendingOverQuotaApproval] = useState<EmprendimientoElegible | null>(null);
  const [overQuotaCohorte, setOverQuotaCohorte] = useState<number>(1);

  // Move level confirmation dialog
  const [pendingLevelMove, setPendingLevelMove] = useState<{ emp: EmprendimientoElegible; nuevoNivel: NivelEmprendimiento } | null>(null);
  
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);

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

      const empIds = empData?.map(e => e.id) || [];
      
      const [{ data: evalData, error: evalError }, { data: mentorAssignments, error: mentorError }, { data: asignaciones, error: asigError }] = await Promise.all([
        supabase.from("evaluaciones").select("emprendimiento_id, puntaje, estado, recomienda_participacion").in("emprendimiento_id", empIds).not("puntaje", "is", null),
        supabase.from("mentor_emprendimiento_assignments").select("emprendimiento_id, mentor_id").in("emprendimiento_id", empIds).eq("activo", true),
        supabase.from("asignacion_cupos").select("*").eq("nivel", nivel),
      ]);

      if (evalError) throw evalError;
      if (mentorError) throw mentorError;
      if (asigError) throw asigError;

      const aprobados = asignaciones?.filter(a => a.estado === "aprobado") || [];
      setCuposUsados(aprobados.length);
      setCuposPorCohorte({
        1: aprobados.filter(a => a.cohorte === 1).length,
        2: aprobados.filter(a => a.cohorte === 2).length,
      });

      const empConEvaluaciones = empData?.map(emp => {
        const evaluaciones = evalData?.filter(e => e.emprendimiento_id === emp.id) || [];
        const evaluacionesCompletadas = evaluaciones.filter(e => e.estado === 'enviada').length;
        const puntaje_promedio = evaluaciones.length > 0
          ? evaluaciones.reduce((sum, e) => sum + (e.puntaje || 0), 0) / evaluaciones.length
          : 0;

        const mentoresAsignados = mentorAssignments?.filter(m => m.emprendimiento_id === emp.id).length || 0;
        const asignacion = asignaciones?.find(a => a.emprendimiento_id === emp.id);
        
        const recsForEmp = evaluaciones.filter(e => e.recomienda_participacion !== null);
        const recSi = recsForEmp.filter(e => e.recomienda_participacion === true).length;
        const recNo = recsForEmp.filter(e => e.recomienda_participacion === false).length;

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
          asignacion_cohorte: asignacion?.cohorte,
          recomendaciones: { si: recSi, no: recNo, total: recsForEmp.length },
        };
      }) || [];

      const elegibles = empConEvaluaciones.filter(e => e.total_evaluaciones > 0);
      setEmprendimientos(elegibles);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [nivel]);

  // Filtered + sorted list
  const filteredEmprendimientos = useMemo(() => {
    let result = [...emprendimientos];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.nombre.toLowerCase().includes(q) ||
        `${e.beneficiario_nombre} ${e.beneficiario_apellido}`.toLowerCase().includes(q)
      );
    }

    // Estado filter
    if (estadoFilter !== "todos") {
      result = result.filter(e => {
        const estado = e.asignacion_estado || "pendiente";
        return estado === estadoFilter;
      });
    }

    // Cohorte filter
    if (cohorteFilter !== "todos") {
      const cohNum = parseInt(cohorteFilter);
      result = result.filter(e => e.asignacion_cohorte === cohNum);
    }

    // Recomendacion filter
    if (recomendacionFilter !== "todos") {
      if (recomendacionFilter === "sin_datos") {
        result = result.filter(e => e.recomendaciones.total === 0);
      } else if (recomendacionFilter === "recomendado") {
        result = result.filter(e => e.recomendaciones.total > 0 && e.recomendaciones.si > e.recomendaciones.no);
      } else if (recomendacionFilter === "no_recomendado") {
        result = result.filter(e => e.recomendaciones.total > 0 && e.recomendaciones.no >= e.recomendaciones.si);
      }
    }

    // Eval count filter
    if (evalCountFilter !== "todos") {
      if (evalCountFilter === "3+") {
        result = result.filter(e => e.total_evaluaciones >= 3);
      } else {
        const count = parseInt(evalCountFilter);
        result = result.filter(e => e.total_evaluaciones === count);
      }
    }

    // Sort
    result.sort((a, b) => sortOrder === "desc" ? b.puntaje_promedio - a.puntaje_promedio : a.puntaje_promedio - b.puntaje_promedio);

    return result;
  }, [emprendimientos, searchQuery, estadoFilter, cohorteFilter, recomendacionFilter, evalCountFilter, sortOrder]);

  const sendWebhookNotification = async (
    accion: "Aprobada" | "Rechazada",
    emprendimiento: EmprendimientoElegible,
    cohorte: number
  ) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("email")
        .eq("id", emprendimiento.user_id)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
        return;
      }

      const formData = new URLSearchParams();
      formData.append("accion", accion);
      formData.append("nivel", nivel);
      formData.append("email", userData?.email || "");
      formData.append("nombre", `${emprendimiento.beneficiario_nombre} ${emprendimiento.beneficiario_apellido}`);
      formData.append("emprendimiento", emprendimiento.nombre);

      await fetch("https://n8n-n8n.yajjj6.easypanel.host/webhook/1d5d0e38-477d-429c-a848-9b214e49d3e7", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        mode: "no-cors",
        body: formData.toString(),
      });
    } catch (error) {
      console.error("Error sending webhook notification:", error);
    }
  };

  const executeApproval = async (emprendimiento: EmprendimientoElegible, cohorte: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (emprendimiento.asignacion_id) {
        const { error } = await supabase
          .from("asignacion_cupos")
          .update({ estado: "aprobado", cohorte, nivel, aprobado_por: user?.id, fecha_asignacion: new Date().toISOString() })
          .eq("id", emprendimiento.asignacion_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("asignacion_cupos")
          .insert({ emprendimiento_id: emprendimiento.id, nivel, cohorte, estado: "aprobado", aprobado_por: user?.id });
        if (error) throw error;
      }

      // Ensure nivel_definitivo matches the tab's nivel upon approval
      const { error: nivelError } = await supabase
        .from("emprendimientos")
        .update({ nivel_definitivo: nivel })
        .eq("id", emprendimiento.id);
      if (nivelError) throw nivelError;

      const { error: evalError } = await supabase
        .from("evaluaciones")
        .update({ visible_para_usuario: true })
        .eq("emprendimiento_id", emprendimiento.id);
      if (evalError) throw evalError;

      sendWebhookNotification("Aprobada", emprendimiento, cohorte);

      toast({ title: "Cupo aprobado", description: `${emprendimiento.nombre} ha sido aprobado para ${nivel} - Cohorte ${cohorte}. Las evaluaciones ahora son visibles para el usuario.` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAprobar = async (emprendimiento: EmprendimientoElegible) => {
    if (emprendimiento.mentores_asignados > emprendimiento.evaluaciones_completadas) {
      toast({
        title: "Evaluaciones pendientes",
        description: `Este emprendimiento tiene ${emprendimiento.mentores_asignados} mentor(es) asignado(s) pero solo ${emprendimiento.evaluaciones_completadas} evaluación(es) completada(s). Todas las evaluaciones deben estar completadas antes de aprobar el cupo.`,
        variant: "destructive"
      });
      return;
    }

    const cohorte = selectedCohortes[emprendimiento.id] || 1;

    const isOverQuota = cuposUsados >= maxCupos;
    const isOverCohorte = tieneCohorts && maxPorCohorte && cuposPorCohorte[cohorte as 1 | 2] >= maxPorCohorte;

    if (isOverQuota || isOverCohorte) {
      setPendingOverQuotaApproval(emprendimiento);
      setOverQuotaCohorte(cohorte);
      return;
    }

    await executeApproval(emprendimiento, cohorte);
  };

  const confirmOverQuotaApproval = async () => {
    if (!pendingOverQuotaApproval) return;
    await executeApproval(pendingOverQuotaApproval, overQuotaCohorte);
    setPendingOverQuotaApproval(null);
  };

  const handleMoverNivel = async () => {
    if (!pendingLevelMove) return;
    const { emp, nuevoNivel } = pendingLevelMove;

    try {
      // Update emprendimientos.nivel_definitivo
      const { error: empError } = await supabase
        .from("emprendimientos")
        .update({ nivel_definitivo: nuevoNivel })
        .eq("id", emp.id);
      if (empError) throw empError;

      // If there's an existing asignacion_cupos, update its nivel too
      if (emp.asignacion_id) {
        const { error: cupoError } = await supabase
          .from("asignacion_cupos")
          .update({ nivel: nuevoNivel })
          .eq("id", emp.asignacion_id);
        if (cupoError) throw cupoError;
      }

      toast({
        title: "Nivel actualizado",
        description: `${emp.nombre} ha sido movido de ${nivel} a ${nuevoNivel}.`,
      });
      setPendingLevelMove(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRevertir = async (emprendimiento: EmprendimientoElegible) => {
    try {
      if (!emprendimiento.asignacion_id) return;
      const { error } = await supabase.from("asignacion_cupos").delete().eq("id", emprendimiento.asignacion_id);
      if (error) throw error;
      toast({ title: "Cupo revertido", description: `${emprendimiento.nombre} ha vuelto al estado pendiente` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRechazar = async (emprendimiento: EmprendimientoElegible) => {
    try {
      const cohorte = selectedCohortes[emprendimiento.id] || 1;
      if (emprendimiento.asignacion_id) {
        const { error } = await supabase.from("asignacion_cupos").update({ estado: "rechazado" }).eq("id", emprendimiento.asignacion_id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("asignacion_cupos").insert({ emprendimiento_id: emprendimiento.id, nivel, cohorte, estado: "rechazado", aprobado_por: user?.id });
        if (error) throw error;
      }
      sendWebhookNotification("Rechazada", emprendimiento, cohorte);
      toast({ title: "Cupo rechazado", description: `La solicitud de ${emprendimiento.nombre} ha sido rechazada` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleSort = () => setSortOrder(prev => prev === "desc" ? "asc" : "desc");

  const exportToExcel = (estado?: string) => {
    let dataToExport = filteredEmprendimientos;
    if (estado) {
      dataToExport = filteredEmprendimientos.filter(e => (e.asignacion_estado || "pendiente") === estado);
    }

    const worksheetData = dataToExport.map(emp => {
      const baseData = {
        "Emprendimiento": emp.nombre,
        "Beneficiario": `${emp.beneficiario_nombre} ${emp.beneficiario_apellido}`,
        "Puntaje Promedio": emp.puntaje_promedio,
        "Evaluaciones": emp.total_evaluaciones,
        "Mentores Asignados": emp.mentores_asignados,
        "Evaluaciones Completadas": emp.evaluaciones_completadas,
        "Recomiendan Sí": emp.recomendaciones.si,
        "Recomiendan No": emp.recomendaciones.no,
        "Estado": emp.asignacion_estado || "Pendiente"
      };
      if (tieneCohorts) {
        return { ...baseData, "Cohorte": emp.asignacion_cohorte || "-" };
      }
      return baseData;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    const sheetName = estado ? `${nivel} - ${estado.charAt(0).toUpperCase() + estado.slice(1)}` : `${nivel} - Todos`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const filename = estado ? `${nivel}_${estado}_${new Date().toISOString().split('T')[0]}.xlsx` : `${nivel}_todos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast({ title: "Exportado exitosamente", description: `Se han exportado ${dataToExport.length} registros a Excel` });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setEstadoFilter("todos");
    setCohorteFilter("todos");
    setRecomendacionFilter("todos");
    setEvalCountFilter("todos");
  };

  const hasActiveFilters = searchQuery || estadoFilter !== "todos" || cohorteFilter !== "todos" || recomendacionFilter !== "todos" || evalCountFilter !== "todos";

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
  const porcentajeUsado = Math.min((cuposUsados / maxCupos) * 100, 100);
  const otrosNiveles = ALL_NIVELES.filter(n => n !== nivel);

  return (
    <div className="space-y-4">
      {/* Stats cards */}
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
                className={`h-full transition-all ${cuposUsados > maxCupos ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${porcentajeUsado}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cupos Disponibles</CardDescription>
            <CardTitle className={`text-3xl ${cuposDisponibles <= 0 ? 'text-destructive' : 'text-green-600'}`}>
              {cuposDisponibles}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {tieneCohorts && maxPorCohorte && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cohorte 1</CardDescription>
              <CardTitle className={`text-2xl ${cuposPorCohorte[1] >= maxPorCohorte ? 'text-destructive' : ''}`}>
                {cuposPorCohorte[1]} / {maxPorCohorte}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cohorte 2</CardDescription>
              <CardTitle className={`text-2xl ${cuposPorCohorte[2] >= maxPorCohorte ? 'text-destructive' : ''}`}>
                {cuposPorCohorte[2]} / {maxPorCohorte}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filtros</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar emprendimiento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v as EstadoFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            {tieneCohorts && (
              <Select value={cohorteFilter} onValueChange={setCohorteFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Cohorte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las cohortes</SelectItem>
                  <SelectItem value="1">Cohorte 1</SelectItem>
                  <SelectItem value="2">Cohorte 2</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={recomendacionFilter} onValueChange={(v) => setRecomendacionFilter(v as RecomendacionFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Recomendación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las recomendaciones</SelectItem>
                <SelectItem value="recomendado">Recomendado</SelectItem>
                <SelectItem value="no_recomendado">No recomendado</SelectItem>
                <SelectItem value="sin_datos">Sin datos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={evalCountFilter} onValueChange={(v) => setEvalCountFilter(v as EvalCountFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="# Evaluaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las evaluaciones</SelectItem>
                <SelectItem value="1">1 evaluación</SelectItem>
                <SelectItem value="2">2 evaluaciones</SelectItem>
                <SelectItem value="3+">3+ evaluaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Emprendimientos Elegibles - Nivel {nivel}</CardTitle>
              <CardDescription>
                {filteredEmprendimientos.length} de {emprendimientos.length} emprendimiento(s)
                {hasActiveFilters && " (filtrado)"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportToExcel()} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Todos
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToExcel("aprobado")} className="gap-2">
                <Download className="h-4 w-4" />
                Aprobados
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToExcel("rechazado")} className="gap-2">
                <Download className="h-4 w-4" />
                Rechazados
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmprendimientos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {hasActiveFilters ? "No hay resultados con los filtros seleccionados" : "No hay emprendimientos elegibles para este nivel"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emprendimiento</TableHead>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" onClick={toggleSort} className="gap-1 hover:bg-muted">
                      Puntaje Promedio
                      {sortOrder === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Evaluaciones</TableHead>
                  <TableHead className="text-center">Mentores</TableHead>
                  <TableHead className="text-center">Completadas</TableHead>
                  <TableHead className="text-center">Recomendación</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  {tieneCohorts && <TableHead className="text-center">Cohorte</TableHead>}
                  <TableHead className="text-center">Mover Nivel</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmprendimientos.map((emp) => {
                  const isAprobado = emp.asignacion_estado === "aprobado";
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.nombre}</TableCell>
                      <TableCell>{emp.beneficiario_nombre} {emp.beneficiario_apellido}</TableCell>
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
                        <Badge variant={emp.mentores_asignados === emp.evaluaciones_completadas ? "default" : "destructive"}>
                          {emp.evaluaciones_completadas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.recomendaciones.total > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="flex items-center gap-1 text-green-600">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {emp.recomendaciones.si}
                            </span>
                            <span className="flex items-center gap-1 text-destructive">
                              <ThumbsDown className="h-3.5 w-3.5" />
                              {emp.recomendaciones.no}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin datos</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {emp.asignacion_estado === "aprobado" && <Badge className="bg-green-500">Aprobado</Badge>}
                        {emp.asignacion_estado === "rechazado" && <Badge variant="destructive">Rechazado</Badge>}
                        {!emp.asignacion_estado && <Badge variant="outline">Pendiente</Badge>}
                      </TableCell>
                      {tieneCohorts && (
                        <TableCell className="text-center">
                          {isAprobado ? (
                            <Badge>{emp.asignacion_cohorte}</Badge>
                          ) : (
                            <Select
                              value={selectedCohortes[emp.id]?.toString() || "1"}
                              onValueChange={(value) => setSelectedCohortes(prev => ({ ...prev, [emp.id]: parseInt(value) }))}
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
                        {!isAprobado ? (
                          <Select
                            value=""
                            onValueChange={(nuevoNivel) => {
                              setPendingLevelMove({ emp, nuevoNivel: nuevoNivel as NivelEmprendimiento });
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <div className="flex items-center gap-1 text-xs">
                                <ArrowRightLeft className="h-3 w-3" />
                                <span>Mover</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {otrosNiveles.map(n => (
                                <SelectItem key={n} value={n}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          {emp.asignacion_estado !== "aprobado" && (
                            <Button
                              size="sm"
                              onClick={() => handleAprobar(emp)}
                              className="gap-1"
                              disabled={emp.mentores_asignados > emp.evaluaciones_completadas}
                              title={emp.mentores_asignados > emp.evaluaciones_completadas ? "Faltan evaluaciones por completar" : "Aprobar cupo"}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Aprobar
                            </Button>
                          )}
                          {emp.asignacion_estado !== "rechazado" && emp.asignacion_estado !== "aprobado" && (
                            <Button size="sm" variant="destructive" onClick={() => handleRechazar(emp)} className="gap-1">
                              <XCircle className="h-4 w-4" />
                              Rechazar
                            </Button>
                          )}
                          {(emp.asignacion_estado === "aprobado" || emp.asignacion_estado === "rechazado") && (
                            <Button size="sm" variant="outline" onClick={() => handleRevertir(emp)} className="gap-1" title="Volver al estado pendiente">
                              <RotateCcw className="h-4 w-4" />
                              Revertir
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Over-quota confirmation dialog */}
      <AlertDialog open={!!pendingOverQuotaApproval} onOpenChange={(open) => { if (!open) setPendingOverQuotaApproval(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Cupos agotados</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Se han utilizado los <strong>{maxCupos} cupos disponibles</strong> para el nivel <strong>{nivel}</strong>.
                Actualmente hay <strong>{cuposUsados}</strong> cupos aprobados.
              </p>
              {tieneCohorts && maxPorCohorte && cuposPorCohorte[overQuotaCohorte as 1 | 2] >= maxPorCohorte && (
                <p>
                  Además, la <strong>Cohorte {overQuotaCohorte}</strong> ya tiene <strong>{cuposPorCohorte[overQuotaCohorte as 1 | 2]}</strong> de {maxPorCohorte} cupos asignados.
                </p>
              )}
              <p className="font-medium text-foreground">
                Estás aprobando solicitudes por encima del límite establecido. ¿Deseas continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOverQuotaApproval} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Aprobar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move level confirmation dialog */}
      <AlertDialog open={!!pendingLevelMove} onOpenChange={(open) => { if (!open) setPendingLevelMove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover de nivel</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Vas a mover <strong>{pendingLevelMove?.emp.nombre}</strong> del nivel <strong>{nivel}</strong> al nivel <strong>{pendingLevelMove?.nuevoNivel}</strong>.
              </p>
              <p>
                Este cambio es independiente del puntaje. Al aprobar el cupo en el nuevo nivel, todo funcionará como si el emprendimiento siempre hubiera pertenecido a ese nivel.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoverNivel}>
              Confirmar movimiento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
