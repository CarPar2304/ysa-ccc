import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { ProfileBasicInfo } from "@/components/profile/ProfileBasicInfo";
import { ProfileAuthorizations } from "@/components/profile/ProfileAuthorizations";
import { ProfileGuardian } from "@/components/profile/ProfileGuardian";
import { ProfileEntrepreneurship } from "@/components/profile/ProfileEntrepreneurship";
import { ProfileTeam } from "@/components/profile/ProfileTeam";
import { ProfileProjections } from "@/components/profile/ProfileProjections";
import { ProfileFinancing } from "@/components/profile/ProfileFinancing";
import { ProfileEvaluation } from "@/components/profile/ProfileEvaluation";
import { Lock } from "lucide-react";

const Profile = () => {
  const { role, loading, isBeneficiario } = useUserRole();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </Layout>
    );
  }

  // Vista básica para Admin y Mentor
  if (!isBeneficiario) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Mi Perfil</h1>
            <p className="text-muted-foreground">Información básica de usuario</p>
          </div>
          <ProfileBasicInfo />
        </div>
      </Layout>
    );
  }

  // Vista completa con pestañas para Beneficiarios
  return (
    <Layout>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información completa</p>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="basic">Información Básica</TabsTrigger>
            <TabsTrigger value="authorizations">Autorizaciones</TabsTrigger>
            <TabsTrigger value="guardian">Acudiente</TabsTrigger>
            <TabsTrigger value="entrepreneurship">Emprendimiento</TabsTrigger>
            <TabsTrigger value="team">Equipo</TabsTrigger>
            <TabsTrigger value="projections">Proyecciones</TabsTrigger>
            <TabsTrigger value="financing">Financiamiento</TabsTrigger>
            <TabsTrigger value="evaluation" className="relative">
              Evaluación
              <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <ProfileBasicInfo />
          </TabsContent>

          <TabsContent value="authorizations">
            <ProfileAuthorizations />
          </TabsContent>

          <TabsContent value="guardian">
            <ProfileGuardian />
          </TabsContent>

          <TabsContent value="entrepreneurship">
            <ProfileEntrepreneurship />
          </TabsContent>

          <TabsContent value="team">
            <ProfileTeam />
          </TabsContent>

          <TabsContent value="projections">
            <ProfileProjections />
          </TabsContent>

          <TabsContent value="financing">
            <ProfileFinancing />
          </TabsContent>

          <TabsContent value="evaluation">
            <ProfileEvaluation />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Profile;
