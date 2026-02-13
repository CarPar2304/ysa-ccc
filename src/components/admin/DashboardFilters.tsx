import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";

export type FilterType = "todos" | "beneficiarios" | "candidatos";
export type NivelFilter = "todos" | "Starter" | "Growth" | "Scale" | "candidatos";

interface DashboardFiltersProps {
  filterType: FilterType;
  nivelFilter: NivelFilter;
  onFilterTypeChange: (value: FilterType) => void;
  onNivelFilterChange: (value: NivelFilter) => void;
  restrictNiveles?: string[];
  hideTypeFilter?: boolean;
}

export const DashboardFilters = ({
  filterType,
  nivelFilter,
  onFilterTypeChange,
  onNivelFilterChange,
  restrictNiveles,
  hideTypeFilter,
}: DashboardFiltersProps) => {
  const allNiveles = ["Starter", "Growth", "Scale"];
  const availableNiveles = restrictNiveles || allNiveles;

  return (
    <Card className="border-dashed flex-1">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {!hideTypeFilter && (
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-type" className="text-sm whitespace-nowrap">
                  Tipo:
                </Label>
                <Select value={filterType} onValueChange={(v) => onFilterTypeChange(v as FilterType)}>
                  <SelectTrigger id="filter-type" className="w-[160px]">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="beneficiarios">Beneficiarios</SelectItem>
                    <SelectItem value="candidatos">Candidatos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Label htmlFor="nivel-filter" className="text-sm whitespace-nowrap">
                Nivel:
              </Label>
              <Select value={nivelFilter} onValueChange={(v) => onNivelFilterChange(v as NivelFilter)}>
                <SelectTrigger id="nivel-filter" className="w-[160px]">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {availableNiveles.map((nivel) => (
                    <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                  ))}
                  {!restrictNiveles && (
                    <SelectItem value="candidatos">Candidatos (por puntaje)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
