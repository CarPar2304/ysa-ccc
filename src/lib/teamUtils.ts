import { supabase } from "@/integrations/supabase/client";

/**
 * Get all user IDs belonging to the same emprendimiento as the given user.
 * Returns at least the user's own ID.
 */
export const getTeamUserIds = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  try {
    // Find emprendimiento as owner
    let empId: string | null = null;

    const { data: owned } = await supabase
      .from("emprendimientos")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (owned) {
      empId = owned.id;
    } else {
      // Find as co-founder
      const { data: membership } = await supabase
        .from("emprendimiento_miembros")
        .select("emprendimiento_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (membership) {
        empId = membership.emprendimiento_id;
      }
    }

    if (!empId) return [userId];

    // Get owner
    const { data: emp } = await supabase
      .from("emprendimientos")
      .select("user_id")
      .eq("id", empId)
      .single();

    // Get all members
    const { data: members } = await supabase
      .from("emprendimiento_miembros")
      .select("user_id")
      .eq("emprendimiento_id", empId);

    const ids = new Set<string>([userId]);
    if (emp) ids.add(emp.user_id);
    if (members) members.forEach((m) => ids.add(m.user_id));

    return Array.from(ids);
  } catch (error) {
    console.error("Error getting team user IDs:", error);
    return userId ? [userId] : [];
  }
};
