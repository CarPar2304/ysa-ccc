import { useState, useEffect } from "react";
import { getTeamUserIds } from "@/lib/teamUtils";
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
        const now = new Date().toISOString();
        // Get all active tasks for these modules
        const { data: tareas, error: tareasError } = await supabase
          .from("tareas")
          .select("id, modulo_id, fecha_inicio")
          .in("modulo_id", moduleIds)
          .eq("activo", true)
          .gte("fecha_limite", now);

        if (tareasError) throw tareasError;

        if (!tareas || tareas.length === 0) {
          setPendingTasks({});
          setLoading(false);
          return;
        }

        // Filter out tasks whose fecha_inicio hasn't started yet
        const activeTareas = tareas.filter((t) => {
          if (!t.fecha_inicio) return true;
          return t.fecha_inicio <= now;
        });

        if (activeTareas.length === 0) {
          setPendingTasks({});
          setLoading(false);
          return;
        }

        // Get all team member submissions (per emprendimiento)
        const tareaIds = activeTareas.map((t) => t.id);
        const teamUserIds = await getTeamUserIds(userId);
        const { data: entregas, error: entregasError } = await supabase
          .from("entregas")
          .select("tarea_id")
          .in("user_id", teamUserIds)
          .in("tarea_id", tareaIds);

        if (entregasError) throw entregasError;

        const entregaSet = new Set((entregas || []).map((e) => e.tarea_id));

        // Count pending tasks per module
        const pendingByModule: Record<string, number> = {};
        activeTareas.forEach((tarea) => {
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
