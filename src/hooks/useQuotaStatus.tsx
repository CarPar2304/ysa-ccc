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
        // Obtener el emprendimiento del usuario
        const { data: emprendimiento } = await supabase
          .from("emprendimientos")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!emprendimiento) {
          setIsApproved(false);
          setLoading(false);
          return;
        }

        // Verificar si tiene un cupo aprobado
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
        } else {
          setIsApproved(false);
          setQuotaInfo(null);
        }
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
