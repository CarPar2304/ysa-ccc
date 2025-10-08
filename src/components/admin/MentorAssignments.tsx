import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Mentor {
  id: string;
  nombres: string;
  apellidos: string;
}

interface Emprendimiento {
  id: string;
  nombre: string;
  user_id: string;
  usuarios: {
    nombres: string;
    apellidos: string;
  };
}

interface Assignment {
  id: string;
  mentor_id: string;
  emprendimiento_id: string;
  fecha_asignacion: string;
  activo: boolean;
  es_jurado: boolean;
  mentor: {
    nombres: string;
    apellidos: string;
  };
  emprendimiento: {
    nombre: string;
  };
}

export const MentorAssignments = () => {
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [emprendimientos, setEmprendimientos] = useState<Emprendimiento[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<string>("");
  const [selectedEmprendimientos, setSelectedEmprendimientos] = useState<string[]>([]);
  const [esJurado, setEsJurado] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

    if (error) {
      console.error("Error fetching mentores:", error);
      return;
    }

    const mentoresData = data
      .filter((item) => item.usuarios)
      .map((item: any) => ({
        id: item.usuarios.id,
        nombres: item.usuarios.nombres || "",
        apellidos: item.usuarios.apellidos || "",
      }));

    setMentores(mentoresData);
  };

  const fetchEmprendimientos = async () => {
    const { data, error } = await supabase
      .from("emprendimientos")
      .select("id, nombre, user_id, usuarios(nombres, apellidos)");

    if (error) {
      console.error("Error fetching emprendimientos:", error);
      return;
    }

    setEmprendimientos(data as any);
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("mentor_emprendimiento_assignments")
      .select(`
        id,
        mentor_id,
        emprendimiento_id,
        fecha_asignacion,
        activo,
        es_jurado,
        mentor:usuarios!mentor_emprendimiento_assignments_mentor_id_fkey(nombres, apellidos),
        emprendimiento:emprendimientos(nombre)
      `)
      .eq("activo", true);

    if (error) {
      console.error("Error fetching assignments:", error);
      return;
    }

    setAssignments(data as any);
  };

  const handleAssign = async () => {
    if (!selectedMentor || selectedEmprendimientos.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona un mentor y al menos un emprendimiento",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const assignments = selectedEmprendimientos.map((empId) => ({
        mentor_id: selectedMentor,
        emprendimiento_id: empId,
        activo: true,
        es_jurado: esJurado,
      }));

      const { error } = await supabase
        .from("mentor_emprendimiento_assignments")
        .upsert(assignments, {
          onConflict: "mentor_id,emprendimiento_id",
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast({
        title: "Asignaciones creadas",
        description: `El mentor fue asignado a ${selectedEmprendimientos.length} emprendimiento(s) como ${esJurado ? 'jurado' : 'mentor'}`,
      });

      setSelectedMentor("");
      setSelectedEmprendimientos([]);
      setEsJurado(false);
      fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEmprendimiento = (empId: string) => {
    setSelectedEmprendimientos((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId]
    );
  };

  const handleRemoveAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mentor_emprendimiento_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Asignación eliminada",
        description: "La asignación fue removida correctamente",
      });

      fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Asignar Mentor a Emprendimientos</CardTitle>
          <CardDescription>Selecciona un mentor y uno o varios emprendimientos para crear las asignaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="space-y-2">
            <Label>Emprendimientos ({selectedEmprendimientos.length} seleccionados)</Label>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
              {emprendimientos.map((emp) => (
                <div key={emp.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={emp.id}
                    checked={selectedEmprendimientos.includes(emp.id)}
                    onCheckedChange={() => toggleEmprendimiento(emp.id)}
                  />
                  <Label htmlFor={emp.id} className="cursor-pointer flex-1 text-sm">
                    {emp.nombre} ({emp.usuarios.nombres} {emp.usuarios.apellidos})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleAssign} disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Asignar Mentor a {selectedEmprendimientos.length || 0} Emprendimiento(s)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Asignaciones Activas</CardTitle>
              <CardDescription>Mentores asignados a emprendimientos</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate("/register-mentor")}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Registrar Nuevo Mentor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay asignaciones activas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Emprendimiento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha de Asignación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {assignment.mentor.nombres} {assignment.mentor.apellidos}
                    </TableCell>
                    <TableCell>{assignment.emprendimiento.nombre}</TableCell>
                    <TableCell>
                      <span className={assignment.es_jurado ? "text-primary font-medium" : "text-muted-foreground"}>
                        {assignment.es_jurado ? "Jurado" : "Mentor"}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(assignment.fecha_asignacion).toLocaleDateString()}</TableCell>
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
    </div>
  );
};
