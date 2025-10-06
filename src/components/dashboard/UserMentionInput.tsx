import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";

interface User {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  avatar_url: string | null;
}

interface UserMentionInputProps {
  onSelectUser: (userId: string) => void;
}

export const UserMentionInput = ({ onSelectUser }: UserMentionInputProps) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (search.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nombres, apellidos, avatar_url")
          .or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%`)
          .limit(5);

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const getInitials = (nombres: string | null, apellidos: string | null) => {
    const n = nombres?.charAt(0) || "";
    const a = apellidos?.charAt(0) || "";
    return (n + a).toUpperCase() || "??";
  };

  return (
    <Card className="p-4 space-y-3 bg-muted/50">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar personas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {loading && (
        <p className="text-sm text-muted-foreground text-center">Buscando...</p>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.id)}
              className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-8 w-8">
                {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(user.nombres, user.apellidos)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {user.nombres} {user.apellidos}
              </span>
            </button>
          ))}
        </div>
      )}

      {!loading && search.length >= 2 && users.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          No se encontraron usuarios
        </p>
      )}
    </Card>
  );
};
