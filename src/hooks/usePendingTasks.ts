import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PendingTasksResult {
  pendingTasks: Record<string, number>;
  loading: boolean;
}

export const usePendingTasks = (userId: string | null, moduleIds: string[]): PendingTasksResult => {
  const [pendingTasks, setPendingTasks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || moduleIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchPendingTasks = async () => {
      try {
        // Get all active tasks for these modules
        const { data: tareas, error: tareasError } = await supabase
          .from("tareas")
          .select("id, modulo_id")
          .in("modulo_id", moduleIds)
          .eq("activo", true)
          .gte("fecha_limite", new Date().toISOString());

        if (tareasError) throw tareasError;

        if (!tareas || tareas.length === 0) {
          setPendingTasks({});
          setLoading(false);
          return;
        }

        // Get user's submissions
        const tareaIds = tareas.map((t) => t.id);
        const { data: entregas, error: entregasError } = await supabase
          .from("entregas")
          .select("tarea_id")
          .eq("user_id", userId)
          .in("tarea_id", tareaIds);

        if (entregasError) throw entregasError;

        const entregaSet = new Set((entregas || []).map((e) => e.tarea_id));

        // Count pending tasks per module
        const pendingByModule: Record<string, number> = {};
        tareas.forEach((tarea) => {
          if (!entregaSet.has(tarea.id)) {
            pendingByModule[tarea.modulo_id] = (pendingByModule[tarea.modulo_id] || 0) + 1;
          }
        });

        setPendingTasks(pendingByModule);
      } catch (error) {
        console.error("Error fetching pending tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingTasks();
  }, [userId, moduleIds.join(",")]);

  return { pendingTasks, loading };
};
