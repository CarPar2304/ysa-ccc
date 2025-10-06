import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Trash2, X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Post {
  id: string;
  contenido: string;
  created_at: string;
  imagen_url: string | null;
  reacciones: Array<{ id: string }>;
  comentarios: Array<{ id: string }>;
}

interface ProfilePostsProps {
  readOnly?: boolean;
}

export const ProfilePosts = ({ readOnly }: ProfilePostsProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserPosts();
    fetchUserAvatar();
  }, []);

  const fetchUserAvatar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("usuarios")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      
      setUserAvatar(data?.avatar_url || null);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          contenido,
          created_at,
          imagen_url,
          reacciones (id),
          comentarios (id)
        `)
        .eq("user_id", user.id)
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

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    setEditContent(post.contenido);
  };

  const handleSaveEdit = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("posts")
        .update({ contenido: editContent })
        .eq("id", postId);

      if (error) throw error;

      setPosts(posts.map(p => 
        p.id === postId ? { ...p, contenido: editContent } : p
      ));
      
      setEditingId(null);
      setEditContent("");
      
      toast({
        title: "Actualizado",
        description: "La publicación se actualizó correctamente",
      });
    } catch (error) {
      console.error("Error updating post:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la publicación",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== deleteId));
      setDeleteId(null);
      
      toast({
        title: "Eliminado",
        description: "La publicación se eliminó correctamente",
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la publicación",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Cargando publicaciones...</p>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-2">
          <p className="text-lg text-muted-foreground">
            No has hecho ninguna publicación aún
          </p>
          <p className="text-sm text-muted-foreground">
            Ve a YSA Conecta para compartir con la comunidad
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id} className="shadow-md border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  {userAvatar && <AvatarImage src={userAvatar} />}
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    TU
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              </div>

              {!readOnly && (
                <div className="flex gap-2">
                  {editingId === post.id ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSaveEdit(post.id)}
                        className="h-8 w-8"
                      >
                        <Save className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(post)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(post.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {editingId === post.id ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px]"
              />
            ) : (
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {post.contenido}
              </p>
            )}

            {post.imagen_url && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={post.imagen_url}
                  alt="Post"
                  className="w-full h-auto object-cover max-h-[400px]"
                />
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
              <span>{post.reacciones?.length || 0} reacciones</span>
              <span>{post.comentarios?.length || 0} comentarios</span>
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar publicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La publicación será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
