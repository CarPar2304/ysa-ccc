import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { EmojiReactions } from "./EmojiReactions";
import { PostComments } from "./PostComments";

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
  };
  onRefresh: () => void;
  currentUserId?: string;
}

export const PostCard = ({ post, onRefresh, currentUserId }: PostCardProps) => {
  const getInitials = (nombres: string | null, apellidos: string | null) => {
    const n = nombres?.charAt(0) || "";
    const a = apellidos?.charAt(0) || "";
    return (n + a).toUpperCase() || "??";
  };

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
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {post.usuarios?.nombres} {post.usuarios?.apellidos}
              </h3>
              {post.usuarios?.nivel_conocimiento && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
                  Nivel {post.usuarios.nivel_conocimiento}
                </span>
              )}
            </div>
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

        <div className="flex items-center gap-4 pt-3 border-t border-border">
          <EmojiReactions
            postId={post.id}
            reactions={post.reacciones}
            currentUserId={currentUserId}
            onReactionUpdate={onRefresh}
          />
          
          <PostComments
            postId={post.id}
            commentsCount={post.comentarios?.length || 0}
            currentUserId={currentUserId}
          />
        </div>
      </CardContent>
    </Card>
  );
};
