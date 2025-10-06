import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { AdminNewsManager } from "@/components/admin/AdminNewsManager";
import { AdminModulesManager } from "@/components/admin/AdminModulesManager";
import { AdminMentorAssignments } from "@/components/admin/AdminMentorAssignments";
import { AdminEvaluations } from "@/components/admin/AdminEvaluations";

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
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestiona contenido, usuarios y evaluaciones</p>
        </div>

        <Tabs defaultValue="news" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="news">Noticias</TabsTrigger>
            <TabsTrigger value="modules">Módulos y Clases</TabsTrigger>
            <TabsTrigger value="mentors">Asignaciones Mentor</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="news" className="space-y-4">
            <AdminNewsManager />
          </TabsContent>

          <TabsContent value="modules" className="space-y-4">
            <AdminModulesManager />
          </TabsContent>

          <TabsContent value="mentors" className="space-y-4">
            <AdminMentorAssignments />
          </TabsContent>

          <TabsContent value="evaluations" className="space-y-4">
            <AdminEvaluations />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
