import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "mentor" | "beneficiario" | "stakeholder" | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOperador, setIsOperador] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setUserId(null);
          setIsOperador(false);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        setRole(roles?.role as UserRole || null);

        // Check if mentor is an operator
        if (roles?.role === "mentor") {
          const { data: opData } = await supabase
            .from("mentor_operadores")
            .select("id")
            .eq("mentor_id", user.id)
            .eq("activo", true)
            .limit(1);
          
          setIsOperador((opData?.length || 0) > 0);
        } else {
          setIsOperador(false);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { 
    role, 
    loading, 
    userId, 
    isAdmin: role === "admin", 
    isMentor: role === "mentor", 
    isBeneficiario: role === "beneficiario",
    isStakeholder: role === "stakeholder",
    isOperador
  };
};
