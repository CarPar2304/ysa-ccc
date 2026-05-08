import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CandidatoFullDetailModal } from "./CandidatoFullDetailModal";
import type { CandidatoData } from "@/pages/Candidatos";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface Props {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

export const CandidatoFullDetailById = ({ userId, open, onClose }: Props) => {
  const [loading, setLoading] = useState(false);
  const [candidato, setCandidato] = useState<CandidatoData | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    let cancel = false;

    (async () => {
      setLoading(true);
      try {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (!usuario) {
          if (!cancel) setCandidato(null);
          return;
        }

        // Find emprendimiento as owner first
        let { data: emprendimiento } = await supabase
          .from("emprendimientos")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        let esCofundador = false;
        if (!emprendimiento) {
          const { data: membership } = await supabase
            .from("emprendimiento_miembros")
            .select("emprendimiento_id")
            .eq("user_id", userId)
            .maybeSingle();
          if (membership) {
            const { data: emp } = await supabase
              .from("emprendimientos")
              .select("*")
              .eq("id", membership.emprendimiento_id)
              .maybeSingle();
            emprendimiento = emp || null;
            esCofundador = true;
          }
        }

        const empId = emprendimiento?.id;

        const [
          { data: cupo },
          { data: equipo },
          { data: proyeccion },
          { data: financiamiento },
          { data: diagnostico },
          { data: autorizacion },
          { data: acudiente },
          { data: userEvaluaciones },
          { data: miembros },
        ] = await Promise.all([
          empId ? supabase.from("asignacion_cupos").select("*").eq("emprendimiento_id", empId).maybeSingle() : Promise.resolve({ data: null } as any),
          empId ? supabase.from("equipos").select("*").eq("emprendimiento_id", empId).maybeSingle() : Promise.resolve({ data: null } as any),
          empId ? supabase.from("proyecciones").select("*").eq("emprendimiento_id", empId).maybeSingle() : Promise.resolve({ data: null } as any),
          empId ? supabase.from("financiamientos").select("*").eq("emprendimiento_id", empId).maybeSingle() : Promise.resolve({ data: null } as any),
          empId ? supabase.from("diagnosticos").select("*").eq("emprendimiento_id", empId).maybeSingle() : Promise.resolve({ data: null } as any),
          supabase.from("autorizaciones").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("acudientes").select("*").eq("menor_id", userId).maybeSingle(),
          empId ? supabase.from("evaluaciones").select("*").eq("emprendimiento_id", empId) : Promise.resolve({ data: [] } as any),
          empId ? supabase.from("emprendimiento_miembros").select("user_id").eq("emprendimiento_id", empId) : Promise.resolve({ data: [] } as any),
        ]);

        let cofundadoresList: CandidatoData["cofundadores"] = [];
        const cofIds = (miembros || []).map((m: any) => m.user_id).filter((id: string) => id !== userId);
        if (cofIds.length > 0) {
          const { data: cofUsers } = await supabase
            .from("usuarios")
            .select("nombres, apellidos, email, celular")
            .in("id", cofIds);
          cofundadoresList = (cofUsers || []).map((u: any) => ({
            nombres: u.nombres || "",
            apellidos: u.apellidos || "",
            email: u.email || "",
            celular: u.celular || "",
          }));
        }

        const evals = userEvaluaciones || [];

        const data: CandidatoData = {
          id: usuario.id,
          nombres: usuario.nombres || "",
          apellidos: usuario.apellidos || "",
          email: usuario.email || "",
          created_at: usuario.created_at,
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
            nit: emprendimiento.nit || undefined,
            ventas_ultimo_ano: emprendimiento.ventas_ultimo_ano || undefined,
            valor_ventas: (emprendimiento as any).valor_ventas ?? undefined,
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
          evaluaciones: evals.length,
          evaluaciones_detalle: evals.map((ev: any) => ({
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
          cofundadores: cofundadoresList && cofundadoresList.length > 0 ? cofundadoresList : undefined,
          es_cofundador: esCofundador,
        };

        if (!cancel) setCandidato(data);
      } catch (e) {
        console.error("Error loading candidato detail:", e);
        if (!cancel) setCandidato(null);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, [open, userId]);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <CandidatoFullDetailModal candidato={candidato} open={open} onClose={onClose} />;
};
