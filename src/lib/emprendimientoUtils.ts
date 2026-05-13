import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the emprendimiento_id for the given user, whether they are the owner
 * or a co-founder member. Returns null when none is found.
 */
export const getCurrentEmprendimientoId = async (userId: string): Promise<string | null> => {
  if (!userId) return null;

  const { data: owned } = await supabase
    .from("emprendimientos")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (owned?.id) return owned.id;

  const { data: member } = await supabase
    .from("emprendimiento_miembros")
    .select("emprendimiento_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return member?.emprendimiento_id ?? null;
};
