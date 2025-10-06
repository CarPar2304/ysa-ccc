import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface Reaction {
  id: string;
  tipo_reaccion: string;
  user_id: string;
}

interface EmojiReactionsProps {
  postId: string;
  reactions: Reaction[];
  currentUserId?: string;
  onReactionUpdate: () => void;
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export const EmojiReactions = ({ postId, reactions, currentUserId, onReactionUpdate }: EmojiReactionsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Agrupar reacciones por tipo
  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.tipo_reaccion] = (acc[reaction.tipo_reaccion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Encontrar la reacción del usuario actual
  const userReaction = reactions.find(r => r.user_id === currentUserId);

  const handleReaction = async (emoji: string) => {
    if (!currentUserId) return;

    try {
      // Si el usuario ya reaccionó con el mismo emoji, eliminarlo
      if (userReaction?.tipo_reaccion === emoji) {
        await supabase
          .from("reacciones")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
      } else {
        // Si el usuario ya reaccionó con otro emoji, actualizar
        if (userReaction) {
          await supabase
            .from("reacciones")
            .update({ tipo_reaccion: emoji })
            .eq("post_id", postId)
            .eq("user_id", currentUserId);
        } else {
          // Si no ha reaccionado, crear nueva reacción
          await supabase
            .from("reacciones")
            .insert({
              post_id: postId,
              user_id: currentUserId,
              tipo_reaccion: emoji,
            });
        }
      }

      setIsOpen(false);
      onReactionUpdate();
    } catch (error) {
      console.error("Error handling reaction:", error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${
              userReaction
                ? "text-primary hover:text-primary"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            <span className="text-lg">{userReaction?.tipo_reaccion || "👍"}</span>
            {reactions.length > 0 && (
              <span className="font-medium">{reactions.length}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="text-2xl hover:scale-110 transition-transform p-2 h-auto"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Mostrar resumen de reacciones */}
      {Object.keys(reactionCounts).length > 0 && (
        <div className="flex gap-1 text-xs">
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <span
              key={emoji}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted"
            >
              <span>{emoji}</span>
              <span className="text-muted-foreground">{count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
