import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsuariosStats } from "./stats/UsuariosStats";
import { EmprendimientosStats } from "./stats/EmprendimientosStats";
import { EquiposStats } from "./stats/EquiposStats";
import { FinanciamientosStats } from "./stats/FinanciamientosStats";
import { ProyeccionesStats } from "./stats/ProyeccionesStats";

export const AdminDashboard = () => {
  return (
    <Tabs defaultValue="usuarios" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
        <TabsTrigger value="emprendimientos">Emprendimientos</TabsTrigger>
        <TabsTrigger value="equipos">Equipos</TabsTrigger>
        <TabsTrigger value="financiamiento">Financiamiento</TabsTrigger>
        <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
      </TabsList>

      <TabsContent value="usuarios">
        <UsuariosStats />
      </TabsContent>
      
      <TabsContent value="emprendimientos">
        <EmprendimientosStats />
      </TabsContent>
      
      <TabsContent value="equipos">
        <EquiposStats />
      </TabsContent>
      
      <TabsContent value="financiamiento">
        <FinanciamientosStats />
      </TabsContent>
      
      <TabsContent value="proyecciones">
        <ProyeccionesStats />
      </TabsContent>
    </Tabs>
  );
};
