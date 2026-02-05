import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsuariosStats } from "./stats/UsuariosStats";
import { EmprendimientosStats } from "./stats/EmprendimientosStats";
import { EquiposStats } from "./stats/EquiposStats";
import { FinanciamientosStats } from "./stats/FinanciamientosStats";
import { ProyeccionesStats } from "./stats/ProyeccionesStats";
import { DashboardFilters, FilterType, NivelFilter } from "./DashboardFilters";

export const AdminDashboard = () => {
  const [filterType, setFilterType] = useState<FilterType>("todos");
  const [nivelFilter, setNivelFilter] = useState<NivelFilter>("todos");

  return (
    <div className="space-y-4">
      <DashboardFilters
        filterType={filterType}
        nivelFilter={nivelFilter}
        onFilterTypeChange={setFilterType}
        onNivelFilterChange={setNivelFilter}
      />
      
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
