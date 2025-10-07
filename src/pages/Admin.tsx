import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleRedirect } from "@/components/RoleRedirect";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminEvaluations } from "@/components/admin/AdminEvaluations";
import { MentorAssignments } from "@/components/admin/MentorAssignments";
import { Top100Rankings } from "@/components/admin/Top100Rankings";
import { EvaluationProgress } from "@/components/admin/EvaluationProgress";

const Admin = () => {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <RoleRedirect />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestiona contenido, usuarios y evaluaciones</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
            <TabsTrigger value="mentors">Gestión de Mentores</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="evaluations" className="space-y-4">
            <Tabs defaultValue="gestion" className="space-y-4">
              <TabsList>
                <TabsTrigger value="gestion">Gestión</TabsTrigger>
                <TabsTrigger value="progreso">Progreso</TabsTrigger>
                <TabsTrigger value="rankings">Top 100</TabsTrigger>
              </TabsList>

              <TabsContent value="gestion">
                <AdminEvaluations />
              </TabsContent>

              <TabsContent value="progreso">
                <EvaluationProgress />
              </TabsContent>

              <TabsContent value="rankings">
                <Top100Rankings />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="mentors" className="space-y-4">
            <MentorAssignments />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
