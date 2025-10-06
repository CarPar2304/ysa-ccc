import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface PostCardProps {
  post: {
    id: string;
    contenido: string;
    created_at: string;
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
  };
  onReaction: (postId: string) => void;
  currentUserId?: string;
}

export const PostCard = ({ post, onReaction, currentUserId }: PostCardProps) => {
  const getInitials = (nombres: string | null, apellidos: string | null) => {
    const n = nombres?.charAt(0) || "";
    const a = apellidos?.charAt(0) || "";
    return (n + a).toUpperCase() || "??";
  };

  const hasLiked = currentUserId && post.reacciones.some(() => true);

  return (
    <Card className="shadow-md border-border hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            {post.usuarios?.avatar_url && (
              <AvatarImage src={post.usuarios.avatar_url} />
            )}
            <AvatarFallback className="bg-accent text-accent-foreground">
              {getInitials(post.usuarios?.nombres || null, post.usuarios?.apellidos || null)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
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
      
      <CardContent className="space-y-4 pt-0">
        {post.contenido && (
          <p className="text-foreground whitespace-pre-wrap leading-relaxed">
            {post.contenido}
          </p>
        )}

        {post.post_tags && post.post_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.post_tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                @{tag.usuarios?.nombres} {tag.usuarios?.apellidos}
              </span>
            ))}
          </div>
        )}

        {post.imagen_url && (
          <div className="rounded-lg overflow-hidden border border-border">
            <img
              src={post.imagen_url}
              alt="Post image"
              className="w-full h-auto object-cover max-h-[500px]"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${
                hasLiked 
                  ? "text-red-500 hover:text-red-600" 
                  : "text-muted-foreground hover:text-primary"
              }`}
              onClick={() => onReaction(post.id)}
            >
              <Heart className={`h-5 w-5 ${hasLiked ? "fill-current" : ""}`} />
              <span className="font-medium">{post.reacciones?.length || 0}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">{post.comentarios?.length || 0}</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-primary"
          >
            <Share2 className="h-5 w-5" />
            <span className="hidden sm:inline">Compartir</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
