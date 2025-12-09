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
  // Campos adicionales de usuario
  tipo_documento?: string;
  genero?: string;
  direccion?: string;
  ano_nacimiento?: string;
  identificacion_etnica?: string;
  biografia?: string;
  nivel_ingles?: string;
  menor_de_edad?: boolean;
  // Autorizaciones
  autorizaciones?: {
    tratamiento_datos: boolean;
    datos_sensibles: boolean;
    correo: boolean;
    celular: boolean;
  };
  // Acudiente
  acudiente?: {
    nombres: string;
    apellidos: string;
    email: string;
    celular: string;
    relacion_con_menor: string;
    tipo_documento?: string;
    numero_identificacion?: string;
  };
  // Emprendimiento expandido
  emprendimiento?: {
    id: string;
    nombre: string;
    descripcion: string;
    categoria: string;
    etapa: string;
    nivel_definitivo: string;
    industria_vertical?: string;
    alcance_mercado?: string;
    tipo_cliente?: string;
    pagina_web?: string;
    ano_fundacion?: number;
    ventas_ultimo_ano?: string;
    nivel_innovacion?: string;
    integracion_tecnologia?: string;
    plan_negocios?: string;
    formalizacion?: boolean;
    estado_unidad_productiva?: string;
  };
  // Cupo expandido
  cupo?: {
    id: string;
    nivel: string;
    cohorte: number;
    estado: string;
    fecha_asignacion: string;
    notas?: string;
  };
  // Equipo expandido
  equipo?: {
    equipo_total: number;
    fundadoras: number;
    colaboradoras: number;
    equipo_tecnico: boolean;
    personas_full_time?: number;
    colaboradores_jovenes?: number;
    tipo_decisiones?: string;
    organigrama?: string;
  };
  // Proyecciones expandidas
  proyecciones?: {
    principales_objetivos: string;
    desafios: string;
    impacto: string;
    acciones_crecimiento?: string;
    decisiones_acciones_crecimiento?: boolean;
    intencion_internacionalizacion?: boolean;
  };
  // Financiamiento expandido
  financiamiento?: {
    busca_financiamiento: string;
    monto_buscado: string;
    financiamiento_previo: boolean;
    monto_recibido?: number;
    tipo_actor?: string;
    tipo_inversion?: string;
    etapa?: string;
  };
  // Diagnóstico
  diagnostico?: {
    contenido: string;
    updated_at: string;
  };
  // Evaluaciones detalladas
  evaluaciones?: number;
  evaluaciones_detalle?: Array<{
    id: string;
    tipo_evaluacion: string;
    puntaje: number;
    puntaje_impacto: number;
    puntaje_equipo: number;
    puntaje_innovacion_tecnologia: number;
    puntaje_ventas: number;
    puntaje_referido_regional: number;
    puntaje_proyeccion_financiacion: number;
    impacto_texto: string;
    equipo_texto: string;
    innovacion_tecnologia_texto: string;
    ventas_texto: string;
    proyeccion_financiacion_texto: string;
    comentarios_adicionales: string;
    nivel: string;
    cumple_ubicacion: boolean;
    cumple_equipo_minimo: boolean;
    cumple_dedicacion: boolean;
    cumple_interes: boolean;
    created_at: string;
  }>;
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

      // Obtener información completa de usuarios
      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("*")
        .in("id", userIds);

      if (!usuarios) return;

      // Obtener emprendimientos con todos los campos
      const { data: emprendimientos } = await supabase
        .from("emprendimientos")
        .select("*")
        .in("user_id", userIds);

      const emprendimientoIds = emprendimientos?.map(e => e.id) || [];

      // Obtener todos los datos relacionados en paralelo
      const [
        { data: cupos },
        { data: equipos },
        { data: proyecciones },
        { data: financiamientos },
        { data: evaluaciones },
        { data: diagnosticos },
        { data: autorizaciones },
        { data: acudientes }
      ] = await Promise.all([
        supabase.from("asignacion_cupos").select("*").in("emprendimiento_id", emprendimientoIds),
        supabase.from("equipos").select("*").in("emprendimiento_id", emprendimientoIds),
        supabase.from("proyecciones").select("*").in("emprendimiento_id", emprendimientoIds),
        supabase.from("financiamientos").select("*").in("emprendimiento_id", emprendimientoIds),
        supabase.from("evaluaciones").select("*").in("emprendimiento_id", emprendimientoIds),
        supabase.from("diagnosticos").select("*").in("emprendimiento_id", emprendimientoIds),
        supabase.from("autorizaciones").select("*").in("user_id", userIds),
        supabase.from("acudientes").select("*").in("menor_id", userIds)
      ]);

      // Combinar datos
      const candidatosData: CandidatoData[] = usuarios.map(usuario => {
        const emprendimiento = emprendimientos?.find(e => e.user_id === usuario.id);
        const cupo = cupos?.find(c => c.emprendimiento_id === emprendimiento?.id);
        const equipo = equipos?.find(e => e.emprendimiento_id === emprendimiento?.id);
        const proyeccion = proyecciones?.find(p => p.emprendimiento_id === emprendimiento?.id);
        const financiamiento = financiamientos?.find(f => f.emprendimiento_id === emprendimiento?.id);
        const diagnostico = diagnosticos?.find(d => d.emprendimiento_id === emprendimiento?.id);
        const autorizacion = autorizaciones?.find(a => a.user_id === usuario.id);
        const acudiente = acudientes?.find(a => a.menor_id === usuario.id);
        const userEvaluaciones = evaluaciones?.filter(ev => ev.emprendimiento_id === emprendimiento?.id) || [];

        return {
          id: usuario.id,
          nombres: usuario.nombres || "",
          apellidos: usuario.apellidos || "",
          email: usuario.email || "",
          celular: usuario.celular || "",
          numero_identificacion: usuario.numero_identificacion || "",
          departamento: usuario.departamento || "",
          municipio: usuario.municipio || "",
          tipo_documento: usuario.tipo_documento || undefined,
          genero: usuario.genero || undefined,
          direccion: usuario.direccion || undefined,
          ano_nacimiento: usuario.ano_nacimiento || undefined,
          identificacion_etnica: usuario.identificacion_etnica || undefined,
          biografia: usuario.biografia || undefined,
          nivel_ingles: usuario.nivel_ingles || undefined,
          menor_de_edad: usuario.menor_de_edad,
          autorizaciones: autorizacion ? {
            tratamiento_datos: autorizacion.tratamiento_datos,
            datos_sensibles: autorizacion.datos_sensibles,
            correo: autorizacion.correo,
            celular: autorizacion.celular,
          } : undefined,
          acudiente: acudiente ? {
            nombres: acudiente.nombres,
            apellidos: acudiente.apellidos,
            email: acudiente.email || "",
            celular: acudiente.celular || "",
            relacion_con_menor: acudiente.relacion_con_menor,
            tipo_documento: acudiente.tipo_documento || undefined,
            numero_identificacion: acudiente.numero_identificacion || undefined,
          } : undefined,
          emprendimiento: emprendimiento ? {
            id: emprendimiento.id,
            nombre: emprendimiento.nombre,
            descripcion: emprendimiento.descripcion || "",
            categoria: emprendimiento.categoria || "",
            etapa: emprendimiento.etapa || "",
            nivel_definitivo: emprendimiento.nivel_definitivo || "",
            industria_vertical: emprendimiento.industria_vertical || undefined,
            alcance_mercado: emprendimiento.alcance_mercado || undefined,
            tipo_cliente: emprendimiento.tipo_cliente || undefined,
            pagina_web: emprendimiento.pagina_web || undefined,
            ano_fundacion: emprendimiento.ano_fundacion || undefined,
            ventas_ultimo_ano: emprendimiento.ventas_ultimo_ano || undefined,
            nivel_innovacion: emprendimiento.nivel_innovacion || undefined,
            integracion_tecnologia: emprendimiento.integracion_tecnologia || undefined,
            plan_negocios: emprendimiento.plan_negocios || undefined,
            formalizacion: emprendimiento.formalizacion ?? undefined,
            estado_unidad_productiva: emprendimiento.estado_unidad_productiva || undefined,
          } : undefined,
          cupo: cupo ? {
            id: cupo.id,
            nivel: cupo.nivel,
            cohorte: cupo.cohorte,
            estado: cupo.estado || "pendiente",
            fecha_asignacion: cupo.fecha_asignacion || "",
            notas: cupo.notas || undefined,
          } : undefined,
          equipo: equipo ? {
            equipo_total: equipo.equipo_total || 0,
            fundadoras: equipo.fundadoras || 0,
            colaboradoras: equipo.colaboradoras || 0,
            equipo_tecnico: equipo.equipo_tecnico || false,
            personas_full_time: equipo.personas_full_time || undefined,
            colaboradores_jovenes: equipo.colaboradores_jovenes || undefined,
            tipo_decisiones: equipo.tipo_decisiones || undefined,
            organigrama: equipo.organigrama || undefined,
          } : undefined,
          proyecciones: proyeccion ? {
            principales_objetivos: proyeccion.principales_objetivos || "",
            desafios: proyeccion.desafios || "",
            impacto: proyeccion.impacto || "",
            acciones_crecimiento: proyeccion.acciones_crecimiento || undefined,
            decisiones_acciones_crecimiento: proyeccion.decisiones_acciones_crecimiento ?? undefined,
            intencion_internacionalizacion: proyeccion.intencion_internacionalizacion ?? undefined,
          } : undefined,
          financiamiento: financiamiento ? {
            busca_financiamiento: financiamiento.busca_financiamiento || "",
            monto_buscado: financiamiento.monto_buscado || "",
            financiamiento_previo: financiamiento.financiamiento_previo,
            monto_recibido: financiamiento.monto_recibido || undefined,
            tipo_actor: financiamiento.tipo_actor || undefined,
            tipo_inversion: financiamiento.tipo_inversion || undefined,
            etapa: financiamiento.etapa || undefined,
          } : undefined,
          diagnostico: diagnostico ? {
            contenido: diagnostico.contenido || "",
            updated_at: diagnostico.updated_at,
          } : undefined,
          evaluaciones: userEvaluaciones.length,
          evaluaciones_detalle: userEvaluaciones.map(ev => ({
            id: ev.id,
            tipo_evaluacion: ev.tipo_evaluacion,
            puntaje: Number(ev.puntaje) || 0,
            puntaje_impacto: Number(ev.puntaje_impacto) || 0,
            puntaje_equipo: Number(ev.puntaje_equipo) || 0,
            puntaje_innovacion_tecnologia: Number(ev.puntaje_innovacion_tecnologia) || 0,
            puntaje_ventas: Number(ev.puntaje_ventas) || 0,
            puntaje_referido_regional: Number(ev.puntaje_referido_regional) || 0,
            puntaje_proyeccion_financiacion: Number(ev.puntaje_proyeccion_financiacion) || 0,
            impacto_texto: ev.impacto_texto || "",
            equipo_texto: ev.equipo_texto || "",
            innovacion_tecnologia_texto: ev.innovacion_tecnologia_texto || "",
            ventas_texto: ev.ventas_texto || "",
            proyeccion_financiacion_texto: ev.proyeccion_financiacion_texto || "",
            comentarios_adicionales: ev.comentarios_adicionales || "",
            nivel: ev.nivel || "",
            cumple_ubicacion: ev.cumple_ubicacion ?? true,
            cumple_equipo_minimo: ev.cumple_equipo_minimo ?? false,
            cumple_dedicacion: ev.cumple_dedicacion ?? false,
            cumple_interes: ev.cumple_interes ?? false,
            created_at: ev.created_at,
          })),
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
