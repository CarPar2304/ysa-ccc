import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image, X, Loader2, AtSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserMentionInput } from "./UserMentionInput";

interface CreatePostProps {
  userId: string;
  userAvatar?: string | null;
  onPostCreated: () => void;
}

export const CreatePost = ({ userId, userAvatar, onPostCreated }: CreatePostProps) => {
  const [newPost, setNewPost] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen no debe superar 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePost = async () => {
    if ((!newPost.trim() && !selectedImage) || !userId) return;

    setPosting(true);
    try {
      let imageUrl = null;

      if (selectedImage) {
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, selectedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          contenido: newPost,
          user_id: userId,
          imagen_url: imageUrl,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Insertar las menciones
      if (mentionedUsers.length > 0 && postData) {
        const tagInserts = mentionedUsers.map(uid => ({
          post_id: postData.id,
          user_id: uid,
        }));

        await supabase.from("post_tags").insert(tagInserts);
      }

      setNewPost("");
      setSelectedImage(null);
      setImagePreview(null);
      setMentionedUsers([]);
      onPostCreated();
      
      toast({
        title: "¡Publicado!",
        description: "Tu publicación se ha compartido correctamente",
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

  const handleMentionSelect = (userId: string) => {
    if (!mentionedUsers.includes(userId)) {
      setMentionedUsers([...mentionedUsers, userId]);
    }
    setShowMentions(false);
  };

  return (
    <Card className="shadow-lg border-border">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <Avatar className="h-12 w-12">
            {userAvatar && <AvatarImage src={userAvatar} />}
            <AvatarFallback className="bg-primary text-primary-foreground">TU</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-4">
            <Textarea
              placeholder="¿Qué quieres compartir?"
              className="min-h-[100px] resize-none bg-background border-input text-base"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />

            {imagePreview && (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-64 rounded-lg border border-border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {showMentions && (
              <UserMentionInput onSelectUser={handleMentionSelect} />
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={posting}
                >
                  <Image className="h-5 w-5" />
                  <span className="hidden sm:inline">Imagen</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-primary"
                  onClick={() => setShowMentions(!showMentions)}
                  disabled={posting}
                >
                  <AtSign className="h-5 w-5" />
                  <span className="hidden sm:inline">Mencionar</span>
                </Button>
              </div>
              
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                onClick={handlePost}
                disabled={posting || (!newPost.trim() && !selectedImage)}
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Publicar"
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
