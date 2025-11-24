import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Eye, RefreshCw } from "lucide-react";
import { CandidatoData } from "@/pages/Candidatos";
import { CandidatoDetailModal } from "./CandidatoDetailModal";
import * as XLSX from "xlsx";

interface CandidatosListProps {
  candidatos: CandidatoData[];
  loading: boolean;
  onRefresh: () => void;
}

export const CandidatosList = ({ candidatos, loading, onRefresh }: CandidatosListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");
  const [selectedCandidato, setSelectedCandidato] = useState<CandidatoData | null>(null);

  const filteredCandidatos = candidatos.filter((candidato) => {
    const matchesSearch = 
      candidato.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidato.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidato.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidato.emprendimiento?.nombre.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === "todos" ||
      (statusFilter === "candidato" && (!candidato.cupo || candidato.cupo.estado !== "aprobado")) ||
      (statusFilter === "beneficiario" && candidato.cupo?.estado === "aprobado");

    const matchesNivel = 
      nivelFilter === "todos" ||
      candidato.cupo?.nivel === nivelFilter;

    return matchesSearch && matchesStatus && matchesNivel;
  });

  const exportToExcel = () => {
    const exportData = filteredCandidatos.map((c) => ({
      Nombres: c.nombres,
      Apellidos: c.apellidos,
      Email: c.email,
      Celular: c.celular,
      Identificación: c.numero_identificacion,
      Departamento: c.departamento,
      Municipio: c.municipio,
      Emprendimiento: c.emprendimiento?.nombre || "N/A",
      Categoría: c.emprendimiento?.categoria || "N/A",
      Etapa: c.emprendimiento?.etapa || "N/A",
      "Nivel Definitivo": c.emprendimiento?.nivel_definitivo || "N/A",
      "Estado Cupo": c.cupo?.estado || "Sin cupo",
      Nivel: c.cupo?.nivel || "N/A",
      Cohorte: c.cupo?.cohorte || "N/A",
      "Equipo Total": c.equipo?.equipo_total || 0,
      Fundadoras: c.equipo?.fundadoras || 0,
      "Equipo Técnico": c.equipo?.equipo_tecnico ? "Sí" : "No",
      "Busca Financiamiento": c.financiamiento?.busca_financiamiento || "N/A",
      "Monto Buscado": c.financiamiento?.monto_buscado || "N/A",
      Evaluaciones: c.evaluaciones || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidatos");
    XLSX.writeFile(wb, `candidatos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusBadge = (candidato: CandidatoData) => {
    if (candidato.cupo?.estado === "aprobado") {
      return <Badge variant="default" className="bg-green-500">Beneficiario</Badge>;
    }
    return <Badge variant="secondary">Candidato</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Lista de Candidatos</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={filteredCandidatos.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filtros */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o emprendimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="candidato">Candidatos</SelectItem>
                  <SelectItem value="beneficiario">Beneficiarios</SelectItem>
                </SelectContent>
              </Select>
              <Select value={nivelFilter} onValueChange={setNivelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los niveles</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Growth">Growth</SelectItem>
                  <SelectItem value="Scale">Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resultados */}
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredCandidatos.length} de {candidatos.length} resultados
            </p>

            {/* Tabla */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Emprendimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Cohorte</TableHead>
                      <TableHead>Evaluaciones</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Cargando datos...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredCandidatos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No se encontraron resultados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCandidatos.map((candidato) => (
                        <TableRow key={candidato.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {candidato.nombres} {candidato.apellidos}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {candidato.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {candidato.emprendimiento?.nombre || "N/A"}
                          </TableCell>
                          <TableCell>{getStatusBadge(candidato)}</TableCell>
                          <TableCell>
                            {candidato.cupo?.nivel || "N/A"}
                          </TableCell>
                          <TableCell>
                            {candidato.cupo?.cohorte || "N/A"}
                          </TableCell>
                          <TableCell>{candidato.evaluaciones || 0}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCandidato(candidato)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CandidatoDetailModal
        candidato={selectedCandidato}
        open={!!selectedCandidato}
        onClose={() => setSelectedCandidato(null)}
      />
    </>
  );
};
