import { Layout } from "@/components/Layout";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleRedirect } from "@/components/RoleRedirect";
import { AssignedEntrepreneurships } from "@/components/mentor/AssignedEntrepreneurships";
import { AsesoriasManager } from "@/components/mentor/AsesoriasManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MentorPanel = () => {
  const { isMentor, loading } = useUserRole();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </Layout>
    );
  }

  if (!isMentor) {
    return <RoleRedirect />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Panel de Mentor</h1>
          <p className="text-muted-foreground">Gestiona tus evaluaciones y mentorías</p>
        </div>

        <Tabs defaultValue="evaluaciones" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
            <TabsTrigger value="asesorias">Mis Asesorías</TabsTrigger>
          </TabsList>

          <TabsContent value="evaluaciones">
            <AssignedEntrepreneurships />
          </TabsContent>

          <TabsContent value="asesorias">
            <AsesoriasManager />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MentorPanel;
