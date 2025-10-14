import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuotaLevelTab } from "./QuotaLevelTab";

export const QuotaAssignment = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Asignación de Cupos</h2>
        <p className="text-muted-foreground">
          Gestiona la asignación de cupos por nivel y cohorte
        </p>
      </div>

      <Tabs defaultValue="starter" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="starter">Starter</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="scale">Scale</TabsTrigger>
        </TabsList>

        <TabsContent value="starter">
          <QuotaLevelTab 
            nivel="Starter" 
            maxCupos={100}
            tieneCohorts={true}
            maxPorCohorte={50}
          />
        </TabsContent>

        <TabsContent value="growth">
          <QuotaLevelTab 
            nivel="Growth" 
            maxCupos={80}
            tieneCohorts={true}
            maxPorCohorte={40}
          />
        </TabsContent>

        <TabsContent value="scale">
          <QuotaLevelTab 
            nivel="Scale" 
            maxCupos={45}
            tieneCohorts={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
