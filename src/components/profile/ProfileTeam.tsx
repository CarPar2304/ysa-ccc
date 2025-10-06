import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, UserCheck, Star, Code } from "lucide-react";

interface ProfileTeamProps {
  readOnly?: boolean;
}

export const ProfileTeam = ({ readOnly = false }: ProfileTeamProps) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    equipo_total: 0,
    personas_full_time: 0,
    fundadoras: 0,
    colaboradoras: 0,
    colaboradores_jovenes: 0,
    equipo_tecnico: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: emprendimiento } = await supabase
        .from("emprendimientos")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!emprendimiento) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("equipos")
        .select("*")
        .eq("emprendimiento_id", emprendimiento.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          equipo_total: data.equipo_total || 0,
          personas_full_time: data.personas_full_time || 0,
          fundadoras: data.fundadoras || 0,
          colaboradoras: data.colaboradoras || 0,
          colaboradores_jovenes: data.colaboradores_jovenes || 0,
          equipo_tecnico: data.equipo_tecnico || false,
        });
      }
    } catch (error) {
      console.error("Error fetching team:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del equipo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const StatItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: number | string }) => (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/30 border border-border">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <Card className="shadow-medium border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Equipo de Trabajo
        </CardTitle>
        <CardDescription>Composición de tu equipo emprendedor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatItem icon={Users} label="Equipo Total" value={formData.equipo_total} />
          <StatItem icon={UserCheck} label="Full Time" value={formData.personas_full_time} />
          <StatItem icon={Star} label="Fundadoras" value={formData.fundadoras} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatItem icon={Users} label="Colaboradoras" value={formData.colaboradoras} />
          <StatItem icon={Users} label="Colaboradores Jóvenes" value={formData.colaboradores_jovenes} />
          <StatItem 
            icon={Code} 
            label="Equipo Técnico" 
            value={formData.equipo_tecnico ? "Sí" : "No"} 
          />
        </div>
      </CardContent>
    </Card>
  );
};