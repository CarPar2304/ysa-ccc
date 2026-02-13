import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useOperadorNiveles = () => {
  const [niveles, setNiveles] = useState<string[]>([]);
  const [isOperador, setIsOperador] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNiveles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("mentor_operadores")
          .select("nivel")
          .eq("mentor_id", user.id)
          .eq("activo", true);

        if (error) {
          console.error("Error fetching operador niveles:", error);
          setLoading(false);
          return;
        }

        const nivelesArr = data?.map(d => d.nivel) || [];
        setNiveles(nivelesArr);
        setIsOperador(nivelesArr.length > 0);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNiveles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchNiveles();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { niveles, isOperador, loading };
};
