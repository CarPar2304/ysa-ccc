import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useQuotaStatus = (userId: string | null) => {
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quotaInfo, setQuotaInfo] = useState<{
    nivel: string | null;
    cohorte: number | null;
  } | null>(null);

  useEffect(() => {
    const checkQuotaStatus = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Check if user owns an emprendimiento
        const { data: emprendimiento } = await supabase
          .from("emprendimientos")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (emprendimiento) {
          // Check quota for own emprendimiento
          const { data: asignacion } = await supabase
            .from("asignacion_cupos")
            .select("estado, nivel, cohorte")
            .eq("emprendimiento_id", emprendimiento.id)
            .eq("estado", "aprobado")
            .maybeSingle();

          if (asignacion) {
            setIsApproved(true);
            setQuotaInfo({
              nivel: asignacion.nivel,
              cohorte: asignacion.cohorte,
            });
            setLoading(false);
            return;
          }
        }

        // 2. Check if user is a co-founder linked to an emprendimiento with approved quota
        const { data: memberships } = await supabase
          .from("emprendimiento_miembros")
          .select("emprendimiento_id")
          .eq("user_id", userId);

        if (memberships && memberships.length > 0) {
          const empIds = memberships.map(m => m.emprendimiento_id);
          const { data: asignacion } = await supabase
            .from("asignacion_cupos")
            .select("estado, nivel, cohorte")
            .in("emprendimiento_id", empIds)
            .eq("estado", "aprobado")
            .maybeSingle();

          if (asignacion) {
            setIsApproved(true);
            setQuotaInfo({
              nivel: asignacion.nivel,
              cohorte: asignacion.cohorte,
            });
            setLoading(false);
            return;
          }
        }

        setIsApproved(false);
        setQuotaInfo(null);
      } catch (error) {
        console.error("Error checking quota status:", error);
        setIsApproved(false);
      } finally {
        setLoading(false);
      }
    };

    checkQuotaStatus();
  }, [userId]);

  return { isApproved, loading, quotaInfo };
};