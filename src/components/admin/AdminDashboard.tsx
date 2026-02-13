import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { UsuariosStats } from "./stats/UsuariosStats";
import { EmprendimientosStats } from "./stats/EmprendimientosStats";
import { EquiposStats } from "./stats/EquiposStats";
import { FinanciamientosStats } from "./stats/FinanciamientosStats";
import { ProyeccionesStats } from "./stats/ProyeccionesStats";
import { DashboardFilters, FilterType, NivelFilter } from "./DashboardFilters";
import { useDashboardExport } from "@/hooks/useDashboardExport";
import { toast } from "sonner";

interface AdminDashboardProps {
  operadorNiveles?: string[];
}

export const AdminDashboard = ({ operadorNiveles }: AdminDashboardProps) => {
  const isOperador = !!operadorNiveles;
  // For operators, force filter to beneficiarios and lock nivel to their assigned levels
  const [filterType, setFilterType] = useState<FilterType>(isOperador ? "beneficiarios" : "todos");
  const [nivelFilter, setNivelFilter] = useState<NivelFilter>(
    isOperador && operadorNiveles.length === 1 ? operadorNiveles[0] as NivelFilter : "todos"
  );
  const [exporting, setExporting] = useState(false);
  const { exportDashboard } = useDashboardExport();

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDashboard();
      toast.success("Dashboard exportado exitosamente");
    } catch (error) {
      console.error("Error exporting dashboard:", error);
      toast.error("Error al exportar el dashboard");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {isOperador ? (
          <DashboardFilters
            filterType={filterType}
            nivelFilter={nivelFilter}
            onFilterTypeChange={() => {}}
            onNivelFilterChange={(v) => {
              if (operadorNiveles.includes(v) || v === "todos") setNivelFilter(v);
            }}
            restrictNiveles={operadorNiveles}
            hideTypeFilter
          />
        ) : (
          <DashboardFilters
            filterType={filterType}
            nivelFilter={nivelFilter}
            onFilterTypeChange={setFilterType}
            onNivelFilterChange={setNivelFilter}
          />
        )}
        <Button 
          onClick={handleExport} 
          disabled={exporting}
          className="flex items-center gap-2"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exportar Dashboard
            </>
          )}
        </Button>
      </div>
      
      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="emprendimientos">Emprendimientos</TabsTrigger>
          <TabsTrigger value="equipos">Equipos</TabsTrigger>
          <TabsTrigger value="financiamiento">Financiamiento</TabsTrigger>
          <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <UsuariosStats filterType={filterType} nivelFilter={nivelFilter} />
        </TabsContent>
        
        <TabsContent value="emprendimientos">
          <EmprendimientosStats filterType={filterType} nivelFilter={nivelFilter} />
        </TabsContent>
        
        <TabsContent value="equipos">
          <EquiposStats filterType={filterType} nivelFilter={nivelFilter} />
        </TabsContent>
        
        <TabsContent value="financiamiento">
          <FinanciamientosStats filterType={filterType} nivelFilter={nivelFilter} />
        </TabsContent>
        
        <TabsContent value="proyecciones">
          <ProyeccionesStats filterType={filterType} nivelFilter={nivelFilter} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
