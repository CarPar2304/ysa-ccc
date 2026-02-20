import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Filter, Search, CheckSquare, Square, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OperatorAssignment } from "./OperatorAssignment";
import { Separator } from "@/components/ui/separator";

interface Mentor {
  id: string;
  nombres: string;
  apellidos: string;
}

interface Emprendimiento {
  id: string;
  nombre: string;
  user_id: string;
  nivel_definitivo: string | null;
  usuarios: {
    nombres: string;
    apellidos: string;
  };
  tieneAprobacion?: boolean;
  nivelCupo?: string | null;
  puntajeMax?: number | null;
}

interface Assignment {
  id: string;
  mentor_id: string;
  emprendimiento_id: string;
  fecha_asignacion: string;
  activo: boolean;
  es_jurado: boolean;
  mentor: { nombres: string; apellidos: string };
  emprendimiento: { nombre: string };
}

const NIVELES = ["Starter", "Growth", "Scale"];

// Nivel teórico para candidatos sin cupo basado en puntaje
function nivelTeoricoPorPuntaje(puntaje: number | null): string {
  if (puntaje === null) return "Sin evaluar";
  if (puntaje > 80) return "Scale";
  if (puntaje > 50) return "Growth";
  return "Starter";
}

export const MentorAssignments = () => {
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [emprendimientos, setEmprendimientos] = useState<Emprendimiento[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<string>("");
  const [selectedEmprendimientos, setSelectedEmprendimientos] = useState<string[]>([]);
  const [esJurado, setEsJurado] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");
  const [tipoFilter, setTipoFilter] = useState<string>("todos"); // todos | beneficiario | candidato
  const [assignmentSearch, setAssignmentSearch] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetchMentores();
    fetchEmprendimientos();
    fetchAssignments();
  }, []);

  const fetchMentores = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, usuarios(id, nombres, apellidos)")
      .eq("role", "mentor");

    if (error) { console.error("Error fetching mentores:", error); return; }

    setMentores(
      data.filter((item) => item.usuarios).map((item: any) => ({
        id: item.usuarios.id,
        nombres: item.usuarios.nombres || "",
        apellidos: item.usuarios.apellidos || "",
      }))
    );
  };

  const fetchEmprendimientos = async () => {
    const { data: empData, error } = await supabase
      .from("emprendimientos")
      .select("id, nombre, user_id, nivel_definitivo, usuarios(nombres, apellidos)");

    if (error) { console.error("Error fetching emprendimientos:", error); return; }

    // Cupos aprobados con nivel
    const { data: cuposData } = await supabase
      .from("asignacion_cupos")
      .select("emprendimiento_id, nivel")
      .eq("estado", "aprobado");

    const cuposMap = new Map(cuposData?.map(c => [c.emprendimiento_id, c.nivel]) || []);

    // Evaluaciones para calcular nivel teórico de candidatos
    const { data: evalData } = await supabase
      .from("evaluaciones")
      .select("emprendimiento_id, puntaje");

    const maxPuntajeMap = new Map<string, number>();
    evalData?.forEach(ev => {
      if (ev.puntaje !== null) {
        const prev = maxPuntajeMap.get(ev.emprendimiento_id) ?? -Infinity;
        if (ev.puntaje > prev) maxPuntajeMap.set(ev.emprendimiento_id, ev.puntaje);
      }
    });

    const result: Emprendimiento[] = empData?.map((emp: any) => ({
      ...emp,
      tieneAprobacion: cuposMap.has(emp.id),
      nivelCupo: cuposMap.get(emp.id) ?? null,
      puntajeMax: maxPuntajeMap.get(emp.id) ?? null,
    })) || [];

    setEmprendimientos(result);
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("mentor_emprendimiento_assignments")
      .select(`
        id, mentor_id, emprendimiento_id, fecha_asignacion, activo, es_jurado,
        mentor:usuarios!mentor_emprendimiento_assignments_mentor_id_fkey(nombres, apellidos),
        emprendimiento:emprendimientos(nombre)
      `)
      .eq("activo", true);

    if (error) { console.error("Error fetching assignments:", error); return; }
    setAssignments(data as any);
  };

  // ---- Lógica de filtrado de emprendimientos ----
  const filteredEmprendimientos = useMemo(() => {
    return emprendimientos.filter((emp) => {
      const esBeneficiario = emp.tieneAprobacion;
      const esCandidato = !emp.tieneAprobacion;

      // Filtro tipo
      if (tipoFilter === "beneficiario" && !esBeneficiario) return false;
      if (tipoFilter === "candidato" && !esCandidato) return false;

      // Filtro nivel
      if (nivelFilter !== "todos") {
        const nivelEfectivo = esBeneficiario
          ? emp.nivelCupo
          : nivelTeoricoPorPuntaje(emp.puntajeMax ?? null);
        if (nivelEfectivo !== nivelFilter) return false;
      }

      // Búsqueda por nombre
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const nombreEmp = emp.nombre.toLowerCase();
        const nombreUser = `${emp.usuarios?.nombres ?? ""} ${emp.usuarios?.apellidos ?? ""}`.toLowerCase();
        if (!nombreEmp.includes(q) && !nombreUser.includes(q)) return false;
      }

      return true;
    });
  }, [emprendimientos, tipoFilter, nivelFilter, searchTerm]);

  // Todos seleccionados en la vista filtrada
  const allFilteredSelected =
    filteredEmprendimientos.length > 0 &&
    filteredEmprendimientos.every((e) => selectedEmprendimientos.includes(e.id));

  const someFilteredSelected = filteredEmprendimientos.some((e) =>
    selectedEmprendimientos.includes(e.id)
  );

  const handleToggleAll = () => {
    if (allFilteredSelected) {
      // Deseleccionar solo los de la vista filtrada
      const filteredIds = new Set(filteredEmprendimientos.map(e => e.id));
      setSelectedEmprendimientos(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      // Agregar todos los filtrados que no estén ya seleccionados
      const newIds = filteredEmprendimientos.map(e => e.id);
      setSelectedEmprendimientos(prev => [...new Set([...prev, ...newIds])]);
    }
  };

  const toggleEmprendimiento = (empId: string) => {
    setSelectedEmprendimientos((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleAssign = async () => {
    if (!selectedMentor || selectedEmprendimientos.length === 0) {
      toast({ title: "Error", description: "Selecciona un mentor y al menos un emprendimiento", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const rows = selectedEmprendimientos.map((empId) => ({
        mentor_id: selectedMentor,
        emprendimiento_id: empId,
        activo: true,
        es_jurado: esJurado,
      }));

      const { error } = await supabase
        .from("mentor_emprendimiento_assignments")
        .upsert(rows, { onConflict: "mentor_id,emprendimiento_id", ignoreDuplicates: false });

      if (error) throw error;

      toast({
        title: "Asignaciones creadas",
        description: `El mentor fue asignado a ${selectedEmprendimientos.length} emprendimiento(s) como ${esJurado ? "jurado" : "mentor"}`,
      });

      setSelectedMentor("");
      setSelectedEmprendimientos([]);
      setEsJurado(false);
      fetchAssignments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mentor_emprendimiento_assignments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Asignación eliminada", description: "La asignación fue removida correctamente" });
      fetchAssignments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Filtro de tabla de asignaciones activas
  const filteredAssignments = useMemo(() => {
    if (!assignmentSearch) return assignments;
    const q = assignmentSearch.toLowerCase();
    return assignments.filter(a =>
      `${a.mentor.nombres} ${a.mentor.apellidos}`.toLowerCase().includes(q) ||
      a.emprendimiento.nombre.toLowerCase().includes(q)
    );
  }, [assignments, assignmentSearch]);

  const getNivelBadge = (emp: Emprendimiento) => {
    if (emp.tieneAprobacion) {
      return (
        <Badge variant="secondary" className="text-xs shrink-0">
          {emp.nivelCupo ?? "Aprobado"}
        </Badge>
      );
    }
    const nivel = nivelTeoricoPorPuntaje(emp.puntajeMax ?? null);
    if (nivel === "Sin evaluar") return null;
    return (
      <Badge variant="outline" className="text-xs shrink-0 border-dashed">
        {nivel} (candidato)
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* ---- PANEL DE ASIGNACIÓN ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Asignar Mentor a Emprendimientos</CardTitle>
          <CardDescription>
            Filtra por tipo y nivel para hacer asignaciones masivas o individuales de forma eficiente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Fila 1: Mentor + Jurado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mentor</Label>
              <Select value={selectedMentor} onValueChange={setSelectedMentor}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mentor" />
                </SelectTrigger>
                <SelectContent>
                  {mentores.map((mentor) => (
                    <SelectItem key={mentor.id} value={mentor.id}>
                      {mentor.nombres} {mentor.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 self-end pb-2">
              <Checkbox
                id="es-jurado"
                checked={esJurado}
                onCheckedChange={(checked) => setEsJurado(checked as boolean)}
              />
              <Label htmlFor="es-jurado" className="cursor-pointer">
                Es Jurado (puede evaluar)
              </Label>
            </div>
          </div>

          <Separator />

          {/* Fila 2: Filtros */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filtros de emprendimientos
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tipo */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setSelectedEmprendimientos([]); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="beneficiario">Beneficiarios (cupo aprobado)</SelectItem>
                    <SelectItem value="candidato">Candidatos (sin cupo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nivel */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nivel</Label>
                <Select value={nivelFilter} onValueChange={(v) => { setNivelFilter(v); setSelectedEmprendimientos([]); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los niveles</SelectItem>
                    {NIVELES.map(n => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Búsqueda */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Emprendimiento o persona..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lista de emprendimientos */}
          <div className="space-y-2">
            {/* Header de lista con seleccionar todo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : someFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-primary/50" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {allFilteredSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
                <span className="text-xs text-muted-foreground">
                  ({filteredEmprendimientos.length} en vista)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {selectedEmprendimientos.length} seleccionado{selectedEmprendimientos.length !== 1 ? "s" : ""}
                </span>
                {selectedEmprendimientos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedEmprendimientos([])}
                    className="text-xs text-destructive hover:underline"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="border rounded-lg max-h-72 overflow-y-auto">
              {filteredEmprendimientos.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No hay emprendimientos que coincidan con los filtros
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEmprendimientos.map((emp) => {
                    const isSelected = selectedEmprendimientos.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        htmlFor={`emp-${emp.id}`}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          id={`emp-${emp.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleEmprendimiento(emp.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.nombre}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {emp.usuarios?.nombres} {emp.usuarios?.apellidos}
                          </p>
                        </div>
                        {getNivelBadge(emp)}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleAssign}
            disabled={loading || !selectedMentor || selectedEmprendimientos.length === 0}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Asignar como {esJurado ? "Jurado" : "Mentor"} a {selectedEmprendimientos.length || 0} Emprendimiento(s)
          </Button>
        </CardContent>
      </Card>

      {/* ---- ASIGNACIONES ACTIVAS ---- */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Asignaciones Activas</CardTitle>
              <CardDescription className="mt-1">
                Mentores asignados a emprendimientos. Para registrar un nuevo mentor, accede a /register-mentor con el código de acceso.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar asignación..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {assignmentSearch ? "No hay asignaciones que coincidan con la búsqueda" : "No hay asignaciones activas"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Emprendimiento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.mentor.nombres} {assignment.mentor.apellidos}
                    </TableCell>
                    <TableCell>{assignment.emprendimiento.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={assignment.es_jurado ? "default" : "secondary"} className="text-xs">
                        {assignment.es_jurado ? "Jurado" : "Mentor"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(assignment.fecha_asignacion).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OperatorAssignment />
    </div>
  );
};
