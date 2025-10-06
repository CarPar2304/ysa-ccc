import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

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
}

const Dashboard = () => {
  const { isBeneficiario, loading: roleLoading, userId } = useUserRole();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!roleLoading && isBeneficiario) {
      fetchPosts();
    }
  }, [roleLoading, isBeneficiario]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          usuarios!posts_user_id_fkey (nombres, apellidos, avatar_url),
          reacciones (id),
          comentarios (id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
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

  const handlePost = async () => {
    if (!newPost.trim() || !userId) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from("posts")
        .insert({
          contenido: newPost,
          user_id: userId,
        });

      if (error) throw error;

      setNewPost("");
      fetchPosts();
      toast({
        title: "Éxito",
        description: "Publicación creada correctamente",
      });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la publicación",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
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

  const getInitials = (nombres: string | null, apellidos: string | null) => {
    const n = nombres?.charAt(0) || "";
    const a = apellidos?.charAt(0) || "";
    return (n + a).toUpperCase() || "??";
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">YSA Conecta</h1>
          <p className="text-muted-foreground">Comparte ideas y conecta con tu comunidad</p>
        </div>

        <Card className="shadow-medium border-border">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">TU</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="¿Qué estás pensando?"
                  className="min-h-[100px] resize-none bg-background"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                    onClick={handlePost}
                    disabled={posting || !newPost.trim()}
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="shadow-soft border-border hover:shadow-medium transition-all">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar>
                    {post.usuarios?.avatar_url && (
                      <AvatarImage src={post.usuarios.avatar_url} />
                    )}
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {getInitials(post.usuarios?.nombres || null, post.usuarios?.apellidos || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {post.usuarios?.nombres} {post.usuarios?.apellidos}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground whitespace-pre-wrap">{post.contenido}</p>
                <div className="flex items-center gap-6 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-primary"
                    onClick={() => handleReaction(post.id)}
                  >
                    <Heart className="h-4 w-4" />
                    {post.reacciones?.length || 0}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                    <MessageCircle className="h-4 w-4" />
                    {post.comentarios?.length || 0}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {posts.length === 0 && (
            <Card className="shadow-soft border-border">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  No hay publicaciones aún. ¡Sé el primero en compartir algo!
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
