import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Mentor {
  id: string;
  nombres: string;
  apellidos: string;
}

interface OperatorAssignment {
  id: string;
  mentor_id: string;
  nivel: string;
  activo: boolean;
  created_at: string;
  mentor: {
    nombres: string;
    apellidos: string;
  };
}

export const OperatorAssignment = () => {
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [assignments, setAssignments] = useState<OperatorAssignment[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<string>("");
  const [selectedNiveles, setSelectedNiveles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const niveles = ["Starter", "Growth", "Scale"];

  useEffect(() => {
    fetchMentores();
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

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("mentor_operadores")
      .select(`
        id,
        mentor_id,
        nivel,
        activo,
        created_at,
        mentor:usuarios!mentor_operadores_mentor_id_fkey(nombres, apellidos)
      `)
      .eq("activo", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching operator assignments:", error);
      return;
    }

    setAssignments(data as any);
  };

  const toggleNivel = (nivel: string) => {
    setSelectedNiveles((prev) =>
      prev.includes(nivel)
        ? prev.filter((n) => n !== nivel)
        : [...prev, nivel]
    );
  };

  const handleAssign = async () => {
    if (!selectedMentor || selectedNiveles.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona un mentor y al menos un nivel",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const records = selectedNiveles.map((nivel) => ({
        mentor_id: selectedMentor,
        nivel,
        activo: true,
      }));

      const { error } = await supabase
        .from("mentor_operadores")
        .upsert(records, {
          onConflict: "mentor_id,nivel",
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast({
        title: "Operador asignado",
        description: `El mentor fue asignado como operador de ${selectedNiveles.join(", ")}`,
      });

      setSelectedMentor("");
      setSelectedNiveles([]);
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

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mentor_operadores")
        .update({ activo: false })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Operador removido",
        description: "La asignación de operador fue desactivada",
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

  // Group assignments by mentor
  const groupedAssignments = assignments.reduce<Record<string, OperatorAssignment[]>>((acc, a) => {
    if (!acc[a.mentor_id]) acc[a.mentor_id] = [];
    acc[a.mentor_id].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Asignar Mentor Operador
          </CardTitle>
          <CardDescription>
            Los operadores tendrán acceso al panel de administración (Dashboard y Diagnósticos) y a la vista de estudiantes,
            filtrado exclusivamente por el nivel asignado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="space-y-2">
            <Label>Niveles de acceso ({selectedNiveles.length} seleccionados)</Label>
            <div className="border rounded-lg p-4 space-y-2">
              {niveles.map((nivel) => (
                <div key={nivel} className="flex items-center space-x-2">
                  <Checkbox
                    id={`nivel-${nivel}`}
                    checked={selectedNiveles.includes(nivel)}
                    onCheckedChange={() => toggleNivel(nivel)}
                  />
                  <Label htmlFor={`nivel-${nivel}`} className="cursor-pointer text-sm">
                    {nivel}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleAssign} disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Asignar como Operador
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operadores Activos</CardTitle>
          <CardDescription>
            Mentores con acceso de operador por nivel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedAssignments).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay operadores asignados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Niveles</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedAssignments).map(([mentorId, mentorAssignments]) => (
                  <TableRow key={mentorId}>
                    <TableCell>
                      {mentorAssignments[0].mentor.nombres} {mentorAssignments[0].mentor.apellidos}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {mentorAssignments.map((a) => (
                          <Badge key={a.id} variant="secondary">
                            {a.nivel}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {mentorAssignments.map((a) => (
                          <Button
                            key={a.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(a.id)}
                            title={`Remover ${a.nivel}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="ml-1 text-xs">{a.nivel}</span>
                          </Button>
                        ))}
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
