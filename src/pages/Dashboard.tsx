import { Layout } from "@/components/Layout";
import { Loader2, Lock } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { RoleRedirect } from "@/components/RoleRedirect";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreatePost } from "@/components/dashboard/CreatePost";
import { PostCard } from "@/components/dashboard/PostCard";
import { Card, CardContent } from "@/components/ui/card";
import { useQuotaStatus } from "@/hooks/useQuotaStatus";

interface Post {
  id: string;
  contenido: string;
  created_at: string;
  user_id: string;
  imagen_url: string | null;
  usuarios: {
    nombres: string | null;
    apellidos: string | null;
    avatar_url: string | null;
    nivel_conocimiento: string | null;
  } | null;
  reacciones: Array<{
    id: string;
    tipo_reaccion: string;
    user_id: string;
  }>;
  comentarios: { id: string }[];
  post_tags?: Array<{
    usuarios: {
      nombres: string | null;
      apellidos: string | null;
    } | null;
  }>;
}

export interface UserQuotaMap {
  [userId: string]: {
    isApproved: boolean;
    nivel: string | null;
    cohorte: number | null;
  };
}

export interface UserRoleMap {
  [userId: string]: {
    role: string | null;
    isOperador: boolean;
  };
}

const Dashboard = () => {
  const { isBeneficiario, isAdmin, isStakeholder, isOperador, loading: roleLoading, userId } = useUserRole();
  const { isApproved, loading: quotaLoading } = useQuotaStatus(userId);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [userQuotaMap, setUserQuotaMap] = useState<UserQuotaMap>({});
  const [userRoleMap, setUserRoleMap] = useState<UserRoleMap>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!roleLoading) {
      if (isBeneficiario || isAdmin || isStakeholder || isOperador) {
        fetchPosts();
        fetchUserAvatar();
      } else {
        setLoading(false);
      }
    }
  }, [roleLoading, isBeneficiario, isAdmin, isStakeholder, isOperador]);

  const fetchUserAvatar = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from("usuarios")
        .select("avatar_url")
        .eq("id", userId)
        .single();
      setCurrentUserAvatar(data?.avatar_url || null);
    } catch (error) {
      console.error("Error fetching user avatar:", error);
    }
  };

  const fetchUserQuotas = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    try {
      // Get emprendimientos for all post authors
      const { data: emprendimientos } = await supabase
        .from("emprendimientos")
        .select("id, user_id")
        .in("user_id", userIds);

      if (!emprendimientos || emprendimientos.length === 0) return;

      const empIds = emprendimientos.map(e => e.id);
      const { data: cupos } = await supabase
        .from("asignacion_cupos")
        .select("emprendimiento_id, estado, nivel, cohorte")
        .in("emprendimiento_id", empIds)
        .eq("estado", "aprobado");

      const map: UserQuotaMap = {};
      for (const uid of userIds) {
        const emp = emprendimientos.find(e => e.user_id === uid);
        if (emp) {
          const cupo = cupos?.find(c => c.emprendimiento_id === emp.id);
          map[uid] = cupo
            ? { isApproved: true, nivel: cupo.nivel, cohorte: cupo.nivel === "Scale" ? 1 : cupo.cohorte }
            : { isApproved: false, nivel: null, cohorte: null };
        }
      }
      setUserQuotaMap(map);
    } catch (error) {
      console.error("Error fetching user quotas:", error);
    }
  };

  const fetchUserRoles = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const { data: operadores } = await supabase
        .from("mentor_operadores")
        .select("mentor_id")
        .in("mentor_id", userIds)
        .eq("activo", true);

      const operadorSet = new Set((operadores || []).map(o => o.mentor_id));
      const map: UserRoleMap = {};
      for (const r of (roles || [])) {
        map[r.user_id] = {
          role: r.role,
          isOperador: operadorSet.has(r.user_id),
        };
      }
      setUserRoleMap(map);
    } catch (error) {
      console.error("Error fetching user roles:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          usuarios!posts_user_id_fkey (nombres, apellidos, avatar_url, nivel_conocimiento),
          reacciones (id, tipo_reaccion, user_id),
          comentarios (id)
        `)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      const postsWithTags = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: tags } = await supabase
            .from("post_tags")
            .select("user_id")
            .eq("post_id", post.id);

          const taggedUserIds = (tags || []).map(tag => tag.user_id);
          const { data: taggedUsersData } = await supabase
            .rpc("get_public_user_profiles", { user_ids: taggedUserIds });

          const taggedUsersDataMapped = taggedUsersData?.map((userData: any) => ({
            usuarios: { nombres: userData.nombres, apellidos: userData.apellidos }
          })) || [];

          return { ...post, post_tags: taggedUsersDataMapped };
        })
      );

      setPosts(postsWithTags);

      // Fetch quota status for all unique post authors
      const uniqueUserIds = [...new Set(postsWithTags.map(p => p.user_id))];
      fetchUserQuotas(uniqueUserIds);
      fetchUserRoles(uniqueUserIds);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las publicaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading || loading || quotaLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isBeneficiario && !isAdmin && !isStakeholder && !isOperador) {
    return <RoleRedirect />;
  }

  if (isBeneficiario && !isApproved) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl p-4 md:p-6">
          <Card className="shadow-soft border-border">
            <CardContent className="p-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-muted rounded-full">
                  <Lock className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Acceso Restringido</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Tu cupo aún no ha sido aprobado. Una vez que el equipo administrativo apruebe tu solicitud,
                podrás acceder a YSA Conecta para compartir y conectar con la comunidad.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
        {/* Header mejorado */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 p-8 border border-primary/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full translate-y-6 -translate-x-6" />
          <div className="relative">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">YSA Conecta</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">Comparte ideas, imágenes y conecta con tu comunidad</p>
          </div>
        </div>

        {userId && (
          <CreatePost
            userId={userId}
            userAvatar={currentUserAvatar}
            onPostCreated={fetchPosts}
          />
        )}

        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onRefresh={fetchPosts}
              currentUserId={userId}
              userQuota={userQuotaMap[post.user_id]}
              userRole={userRoleMap[post.user_id]}
            />
          ))}

          {posts.length === 0 && (
            <Card className="border-border border-dashed">
              <CardContent className="p-12 text-center space-y-2">
                <p className="text-lg text-muted-foreground">
                  No hay publicaciones aún
                </p>
                <p className="text-sm text-muted-foreground">
                  ¡Sé el primero en compartir algo con la comunidad!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
