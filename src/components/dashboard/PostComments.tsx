import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Comment {
  id: string;
  contenido: string;
  created_at: string;
  user_id: string;
  usuarios: {
    nombres: string | null;
    apellidos: string | null;
    avatar_url: string | null;
  } | null;
}

interface PostCommentsProps {
  postId: string;
  commentsCount: number;
  currentUserId?: string;
}

export const PostComments = ({ postId, commentsCount, currentUserId }: PostCommentsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && comments.length === 0) {
      fetchComments();
    }
  }, [isOpen]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comentarios")
        .select(`
          *,
          usuarios!comentarios_user_id_fkey (nombres, apellidos, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los comentarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUserId) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from("comentarios")
        .insert({
          post_id: postId,
          user_id: currentUserId,
          contenido: newComment,
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      toast({
        title: "Comentario publicado",
        description: "Tu comentario se ha agregado correctamente",
      });
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({
        title: "Error",
        description: "No se pudo publicar el comentario",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const getInitials = (nombres: string | null, apellidos: string | null) => {
    const n = nombres?.charAt(0) || "";
    const a = apellidos?.charAt(0) || "";
    return (n + a).toUpperCase() || "??";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">{commentsCount}</span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-4 animate-in slide-in-from-top-2">
        <div className="pl-2 border-l-2 border-primary/20">
          {/* Lista de comentarios */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Cargando comentarios...
              </p>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <Card key={comment.id} className="p-3 bg-muted/30">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      {comment.usuarios?.avatar_url && (
                        <AvatarImage src={comment.usuarios.avatar_url} />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(comment.usuarios?.nombres || null, comment.usuarios?.apellidos || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {comment.usuarios?.nombres} {comment.usuarios?.apellidos}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.contenido}</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">👋</p>
                <p className="text-sm text-muted-foreground">
                  No hay comentarios aún. ¡Sé el primero en comentar!
                </p>
              </div>
            )}
          </div>

          {/* Input para nuevo comentario */}
          {currentUserId && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <Input
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
                disabled={posting}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handlePostComment}
                disabled={posting || !newComment.trim()}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
