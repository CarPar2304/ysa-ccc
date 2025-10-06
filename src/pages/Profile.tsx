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
import { Lock, Upload, User as UserIcon, Briefcase, Award } from "lucide-react";
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
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </Layout>
    );
  }

  const nombreCompleto = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() || 'Usuario';

  // Vista básica para Admin y Mentor
  if (!isBeneficiario) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl p-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={usuario.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {nombreCompleto.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 cursor-pointer">
                  <div className="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Upload className="h-4 w-4" />
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
              <div>
                <h1 className="text-3xl font-bold text-foreground">{nombreCompleto}</h1>
                <p className="text-muted-foreground">{usuario.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
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
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={usuario.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {nombreCompleto.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 cursor-pointer">
                <div className="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Upload className="h-4 w-4" />
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
            <div>
              <h1 className="text-3xl font-bold text-foreground">{nombreCompleto}</h1>
              <p className="text-muted-foreground">{usuario.email}</p>
              <p className="text-sm text-muted-foreground mt-1">Beneficiario</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="usuario" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usuario" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Usuario
            </TabsTrigger>
            <TabsTrigger value="emprendimiento" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Emprendimiento
            </TabsTrigger>
            <TabsTrigger value="evaluacion" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Evaluación
              <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuario" className="space-y-6">
            <ProfileBasicInfo readOnly />
            <ProfileAuthorizations readOnly />
            <ProfileGuardian readOnly />
          </TabsContent>

          <TabsContent value="emprendimiento">
            <Tabs defaultValue="info" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="financiamiento">Financiamiento</TabsTrigger>
                <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-6">
                <ProfileEntrepreneurship readOnly />
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

          <TabsContent value="evaluacion">
            <ProfileEvaluation />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Profile;
