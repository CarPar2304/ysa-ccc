import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Panel de Mentor</h1>
          <p className="text-muted-foreground">Gestiona tus módulos asignados</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mis Módulos Asignados</CardTitle>
                <CardDescription>Crea y edita clases en los módulos asignados</CardDescription>
              </div>
              <Button className="bg-primary hover:bg-primary-hover">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Clase
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              No tienes módulos asignados aún. Contacta al administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MentorPanel;
