import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { EmojiReactions } from "./EmojiReactions";
import { PostComments } from "./PostComments";
import { GraduationCap, Award, Shield, Users } from "lucide-react";

interface PostCardProps {
  post: {
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
  };
  onRefresh: () => void;
  currentUserId?: string;
  userQuota?: {
    isApproved: boolean;
    nivel: string | null;
    cohorte: number | null;
  };
  userRole?: {
    role: string | null;
    isOperador: boolean;
  };
}

export const PostCard = ({ post, onRefresh, currentUserId, userQuota, userRole }: PostCardProps) => {
  const getInitials = (nombres: string | null, apellidos: string | null) => {
    const n = nombres?.charAt(0) || "";
    const a = apellidos?.charAt(0) || "";
    return (n + a).toUpperCase() || "??";
  };

  const getNivelColor = (nivel: string | null) => {
    switch (nivel) {
      case "Scale": return "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400";
      case "Growth": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400";
      case "Starter": return "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-400";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Card className="shadow-sm border-border hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 ring-2 ring-primary/10">
            {post.usuarios?.avatar_url && (
              <AvatarImage src={post.usuarios.avatar_url} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {getInitials(post.usuarios?.nombres || null, post.usuarios?.apellidos || null)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm leading-tight">
                {post.usuarios?.nombres} {post.usuarios?.apellidos}
              </h3>
              {/* Student status badge */}
              {userQuota && (
                userQuota.isApproved ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getNivelColor(userQuota.nivel)}`}>
                    <Award className="h-3 w-3" />
                    {userQuota.nivel} · C{userQuota.cohorte}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-muted text-muted-foreground border-border">
                    <GraduationCap className="h-3 w-3" />
                    Candidato
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {post.contenido && (
          <p className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">
            {post.contenido}
          </p>
        )}

        {post.post_tags && post.post_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.post_tags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs font-medium"
              >
                @{tag.usuarios?.nombres} {tag.usuarios?.apellidos}
              </Badge>
            ))}
          </div>
        )}

        {post.imagen_url && (
          <div className="rounded-xl overflow-hidden border border-border">
            <img
              src={post.imagen_url}
              alt="Post image"
              className="w-full h-auto object-cover max-h-[500px]"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-border/60">
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
