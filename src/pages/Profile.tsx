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
import { ProfilePosts } from "@/components/profile/ProfilePosts";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { Lock, Upload, User as UserIcon, Briefcase, Award, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

const Profile = () => {
  const { role, loading, isBeneficiario } = useUserRole();
  const [usuario, setUsuario] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [asignacion, setAsignacion] = useState<any>(null);

  useEffect(() => {
    const fetchUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .single();
        setUsuario(data);

        // Obtener asignación de cupo si es beneficiario
        const { data: empData } = await supabase
          .from('emprendimientos')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (empData) {
          const { data: asignacionData } = await supabase
            .from('asignacion_cupos')
            .select('*')
            .eq('emprendimiento_id', empData.id)
            .eq('estado', 'aprobado')
            .single();
          
          setAsignacion(asignacionData);
        }
      }
    };
    fetchUsuario();
  }, []);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Eliminar avatar anterior si existe
      if (usuario?.avatar_url) {
        const oldPath = usuario.avatar_url.split('/').pop();
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${oldPath}`]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUsuario({ ...usuario, avatar_url: publicUrl });
      
      toast({
        title: "Avatar actualizado",
        description: "Tu foto de perfil se ha actualizado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading || !usuario) {
    return (
      <Layout>
        <ProfileSkeleton />
      </Layout>
    );
  }

  const nombreCompleto = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() || 'Usuario';

  // Vista básica para Admin y Mentor
  if (!isBeneficiario) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">
          <Card className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6">
              <div className="relative flex-shrink-0">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24">
                  <AvatarImage src={usuario.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-xl lg:text-2xl">
                    {nombreCompleto.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 cursor-pointer">
                  <div className="rounded-full bg-primary p-1.5 sm:p-2 text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">{nombreCompleto}</h1>
                <p className="text-muted-foreground text-sm sm:text-base break-all">{usuario.email}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Rol: {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Sin rol asignado'}
                </p>
              </div>
            </div>
          </Card>
          <ProfileBasicInfo readOnly />
        </div>
      </Layout>
    );
  }

  // Vista completa con pestañas para Beneficiarios
  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        <Card className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6">
            <div className="relative flex-shrink-0">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24">
                <AvatarImage src={usuario.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-xl lg:text-2xl">
                  {nombreCompleto.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 cursor-pointer">
                <div className="rounded-full bg-primary p-1.5 sm:p-2 text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">{nombreCompleto}</h1>
              <p className="text-muted-foreground text-sm sm:text-base break-all">{usuario.email}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Beneficiario</p>
              {asignacion && (
                <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-md bg-primary/10 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-primary">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4" />
                    Nivel: {asignacion.nivel}
                  </div>
                  {asignacion.cohorte && (
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-md bg-secondary/50 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-secondary-foreground">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      Cohorte: {asignacion.cohorte}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Tabs defaultValue="usuario" className="space-y-4 sm:space-y-6">
          <TabsList className="sticky top-0 z-10 backdrop-blur-sm bg-background/95 shadow-sm lg:static lg:shadow-none grid w-full grid-cols-4 p-0.5 sm:p-1 gap-0.5 sm:gap-1">
            <TabsTrigger value="usuario" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
              <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Usuario</span>
            </TabsTrigger>
            <TabsTrigger value="emprendimiento" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
              <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate sm:hidden">Emprend.</span>
              <span className="hidden sm:inline">Emprendimiento</span>
            </TabsTrigger>
            <TabsTrigger value="publicaciones" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate sm:hidden">Public.</span>
              <span className="hidden sm:inline">Publicaciones</span>
            </TabsTrigger>
            <TabsTrigger value="evaluacion" className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
              <Award className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate sm:hidden">Eval.</span>
              <span className="hidden sm:inline">Evaluación</span>
              <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-0.5 sm:ml-1 text-muted-foreground" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuario" className="space-y-6">
            <ProfileBasicInfo readOnly />
            <ProfileAuthorizations readOnly />
            <ProfileGuardian readOnly />
          </TabsContent>

          <TabsContent value="emprendimiento">
            <Tabs defaultValue="info" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="equipo">Equipo</TabsTrigger>
                <TabsTrigger value="financiamiento">Financiamiento</TabsTrigger>
                <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <ProfileEntrepreneurship />
              </TabsContent>

              <TabsContent value="equipo">
                <ProfileTeam readOnly />
              </TabsContent>

              <TabsContent value="financiamiento">
                <ProfileFinancing readOnly />
              </TabsContent>

              <TabsContent value="proyecciones">
                <ProfileProjections readOnly />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="publicaciones">
            <ProfilePosts />
          </TabsContent>

          <TabsContent value="evaluacion">
            <ProfileEvaluation />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Profile;
