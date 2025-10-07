import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const [selectedEmprendimiento, setSelectedEmprendimiento] = useState<string>("");
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
    if (!selectedMentor || !selectedEmprendimiento) {
      toast({
        title: "Error",
        description: "Selecciona un mentor y un emprendimiento",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("mentor_emprendimiento_assignments")
        .insert({
          mentor_id: selectedMentor,
          emprendimiento_id: selectedEmprendimiento,
          activo: true,
        });

      if (error) throw error;

      toast({
        title: "Asignación creada",
        description: "El mentor fue asignado correctamente",
      });

      setSelectedMentor("");
      setSelectedEmprendimiento("");
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

  const handleRemoveAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mentor_emprendimiento_assignments")
        .update({ activo: false })
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
          <CardTitle>Asignar Mentor a Emprendimiento</CardTitle>
          <CardDescription>Selecciona un mentor y un emprendimiento para crear la asignación</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Select value={selectedEmprendimiento} onValueChange={setSelectedEmprendimiento}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar emprendimiento" />
              </SelectTrigger>
              <SelectContent>
                {emprendimientos.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nombre} ({emp.usuarios.nombres} {emp.usuarios.apellidos})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleAssign} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Asignar
            </Button>
          </div>
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
