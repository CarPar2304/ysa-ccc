import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CandidatosKPIs } from "@/components/candidatos/CandidatosKPIs";
import { CandidatosList } from "@/components/candidatos/CandidatosList";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export interface CandidatoData {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  celular: string;
  numero_identificacion: string;
  departamento: string;
  municipio: string;
  emprendimiento?: {
    id: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    etapa: string;
    nivel_definitivo: string;
  };
  cupo?: {
    id: string;
    nivel: string;
    cohorte: number;
    estado: string;
    fecha_asignacion: string;
  };
  equipo?: {
    equipo_total: number;
    fundadoras: number;
    colaboradoras: number;
    equipo_tecnico: boolean;
  };
  proyecciones?: {
    principales_objetivos: string;
    desafios: string;
    impacto: string;
  };
  financiamiento?: {
    busca_financiamiento: string;
    monto_buscado: string;
    financiamiento_previo: boolean;
  };
  evaluaciones?: number;
}

const Candidatos = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [candidatos, setCandidatos] = useState<CandidatoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCandidatos, setTotalCandidatos] = useState(0);
  const [totalBeneficiarios, setTotalBeneficiarios] = useState(0);
  const [totalEvaluaciones, setTotalEvaluaciones] = useState(0);

  useEffect(() => {
    fetchCandidatos();
  }, []);

  const fetchCandidatos = async () => {
    try {
      setLoading(true);

      // Obtener todos los usuarios beneficiarios
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "beneficiario");

      if (!userRoles) return;

      const userIds = userRoles.map(ur => ur.user_id);

      // Obtener información de usuarios
      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("*")
        .in("id", userIds);

      if (!usuarios) return;

      // Obtener emprendimientos
      const { data: emprendimientos } = await supabase
        .from("emprendimientos")
        .select("*")
        .in("user_id", userIds);

      // Obtener cupos
      const emprendimientoIds = emprendimientos?.map(e => e.id) || [];
      const { data: cupos } = await supabase
        .from("asignacion_cupos")
        .select("*")
        .in("emprendimiento_id", emprendimientoIds);

      // Obtener equipos
      const { data: equipos } = await supabase
        .from("equipos")
        .select("*")
        .in("emprendimiento_id", emprendimientoIds);

      // Obtener proyecciones
      const { data: proyecciones } = await supabase
        .from("proyecciones")
        .select("*")
        .in("emprendimiento_id", emprendimientoIds);

      // Obtener financiamientos
      const { data: financiamientos } = await supabase
        .from("financiamientos")
        .select("*")
        .in("emprendimiento_id", emprendimientoIds);

      // Obtener evaluaciones
      const { data: evaluaciones } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id")
        .in("emprendimiento_id", emprendimientoIds);

      // Combinar datos
      const candidatosData: CandidatoData[] = usuarios.map(usuario => {
        const emprendimiento = emprendimientos?.find(e => e.user_id === usuario.id);
        const cupo = cupos?.find(c => c.emprendimiento_id === emprendimiento?.id);
        const equipo = equipos?.find(e => e.emprendimiento_id === emprendimiento?.id);
        const proyeccion = proyecciones?.find(p => p.emprendimiento_id === emprendimiento?.id);
        const financiamiento = financiamientos?.find(f => f.emprendimiento_id === emprendimiento?.id);
        const evalCount = evaluaciones?.filter(ev => ev.emprendimiento_id === emprendimiento?.id).length || 0;

        return {
          id: usuario.id,
          nombres: usuario.nombres || "",
          apellidos: usuario.apellidos || "",
          email: usuario.email || "",
          celular: usuario.celular || "",
          numero_identificacion: usuario.numero_identificacion || "",
          departamento: usuario.departamento || "",
          municipio: usuario.municipio || "",
          emprendimiento: emprendimiento ? {
            id: emprendimiento.id,
            nombre: emprendimiento.nombre,
            descripcion: emprendimiento.descripcion || "",
            categoria: emprendimiento.categoria || "",
            etapa: emprendimiento.etapa || "",
            nivel_definitivo: emprendimiento.nivel_definitivo || "",
          } : undefined,
          cupo: cupo ? {
            id: cupo.id,
            nivel: cupo.nivel,
            cohorte: cupo.cohorte,
            estado: cupo.estado || "pendiente",
            fecha_asignacion: cupo.fecha_asignacion || "",
          } : undefined,
          equipo: equipo ? {
            equipo_total: equipo.equipo_total || 0,
            fundadoras: equipo.fundadoras || 0,
            colaboradoras: equipo.colaboradoras || 0,
            equipo_tecnico: equipo.equipo_tecnico || false,
          } : undefined,
          proyecciones: proyeccion ? {
            principales_objetivos: proyeccion.principales_objetivos || "",
            desafios: proyeccion.desafios || "",
            impacto: proyeccion.impacto || "",
          } : undefined,
          financiamiento: financiamiento ? {
            busca_financiamiento: financiamiento.busca_financiamiento || "",
            monto_buscado: financiamiento.monto_buscado || "",
            financiamiento_previo: financiamiento.financiamiento_previo,
          } : undefined,
          evaluaciones: evalCount,
        };
      });

      setCandidatos(candidatosData);

      // Calcular KPIs
      const candidatosCount = candidatosData.filter(c => !c.cupo || c.cupo.estado !== "aprobado").length;
      const beneficiariosCount = candidatosData.filter(c => c.cupo?.estado === "aprobado").length;
      const totalEval = evaluaciones?.length || 0;

      setTotalCandidatos(candidatosCount);
      setTotalBeneficiarios(beneficiariosCount);
      setTotalEvaluaciones(totalEval);

    } catch (error) {
      console.error("Error fetching candidatos:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de candidatos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Candidatos</h1>
          <p className="text-muted-foreground">
            Gestión y seguimiento de candidatos y beneficiarios
          </p>
        </div>

        <CandidatosKPIs
          totalCandidatos={totalCandidatos}
          totalBeneficiarios={totalBeneficiarios}
          totalEvaluaciones={totalEvaluaciones}
          loading={loading}
        />

        <CandidatosList
          candidatos={candidatos}
          loading={loading}
          onRefresh={fetchCandidatos}
        />
      </div>
    </Layout>
  );
};

export default Candidatos;
