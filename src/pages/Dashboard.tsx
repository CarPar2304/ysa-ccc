import { Layout } from "@/components/Layout";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreatePost } from "@/components/dashboard/CreatePost";
import { PostCard } from "@/components/dashboard/PostCard";
import { Card, CardContent } from "@/components/ui/card";

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
  } | null;
  reacciones: { id: string }[];
  comentarios: { id: string }[];
  post_tags?: Array<{
    usuarios: {
      nombres: string | null;
      apellidos: string | null;
    } | null;
  }>;
}

const Dashboard = () => {
  const { isBeneficiario, loading: roleLoading, userId } = useUserRole();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!roleLoading) {
      if (isBeneficiario) {
        fetchPosts();
        fetchUserAvatar();
      } else {
        setLoading(false);
      }
    }
  }, [roleLoading, isBeneficiario]);

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

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          usuarios!posts_user_id_fkey (nombres, apellidos, avatar_url),
          reacciones (id),
          comentarios (id)
        `)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Fetch tags and user info separately for each post
      const postsWithTags = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: tags } = await supabase
            .from("post_tags")
            .select("user_id")
            .eq("post_id", post.id);

          // Get user info for each tagged user
          const taggedUsersData = await Promise.all(
            (tags || []).map(async (tag) => {
              const { data: userData } = await supabase
                .from("usuarios")
                .select("nombres, apellidos")
                .eq("id", tag.user_id)
                .single();
              
              return { usuarios: userData };
            })
          );

          return {
            ...post,
            post_tags: taggedUsersData,
          };
        })
      );

      setPosts(postsWithTags);
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


  const handleReaction = async (postId: string) => {
    if (!userId) return;

    try {
      const existingReaction = posts
        .find((p) => p.id === postId)
        ?.reacciones.find(() => true);

      if (existingReaction) {
        await supabase.from("reacciones").delete().eq("post_id", postId).eq("user_id", userId);
      } else {
        await supabase.from("reacciones").insert({
          post_id: postId,
          user_id: userId,
          tipo_reaccion: "like",
        });
      }

      fetchPosts();
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };

  if (roleLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isBeneficiario) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg border border-border">
          <h1 className="text-3xl font-bold text-foreground mb-2">YSA Conecta</h1>
          <p className="text-muted-foreground">Comparte ideas, imágenes y conecta con tu comunidad</p>
        </div>

        {userId && (
          <CreatePost
            userId={userId}
            userAvatar={currentUserAvatar}
            onPostCreated={fetchPosts}
          />
        )}

        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onReaction={handleReaction}
              currentUserId={userId}
            />
          ))}

          {posts.length === 0 && (
            <Card className="shadow-soft border-border">
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
