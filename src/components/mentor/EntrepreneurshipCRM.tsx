import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DiagnosticView } from "./DiagnosticView";

interface EntrepreneurshipData {
  emprendimiento: any;
  usuario: any;
  equipo: any;
  financiamiento: any;
  proyecciones: any;
}

interface EntrepreneurshipCRMProps {
  emprendimientoId: string;
  isJurado?: boolean;
}

export const EntrepreneurshipCRM = ({ emprendimientoId, isJurado = false }: EntrepreneurshipCRMProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EntrepreneurshipData | null>(null);

  useEffect(() => {
    fetchData();
  }, [emprendimientoId]);

  const fetchData = async () => {
    try {
      const { data: emprendimiento, error: empError } = await supabase
        .from("emprendimientos")
        .select(`
          *,
          usuarios:user_id (*)
        `)
        .eq("id", emprendimientoId)
        .single();

      if (empError) throw empError;

      const { data: equipo } = await supabase
        .from("equipos")
        .select("*")
        .eq("emprendimiento_id", emprendimientoId)
        .maybeSingle();

      const { data: financiamiento } = await supabase
        .from("financiamientos")
        .select("*")
        .eq("emprendimiento_id", emprendimientoId)
        .maybeSingle();

      const { data: proyecciones } = await supabase
        .from("proyecciones")
        .select("*")
        .eq("emprendimiento_id", emprendimientoId)
        .maybeSingle();

      setData({
        emprendimiento,
        usuario: emprendimiento.usuarios,
        equipo,
        financiamiento,
        proyecciones,
      });
    } catch (error) {
      console.error("Error fetching entrepreneurship data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return <div>No se encontró información del emprendimiento</div>;
  }

  const InfoItem = ({ label, value }: { label: string; value: any }) => (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "No especificado"}</p>
    </div>
  );

  return (
    <Tabs defaultValue={isJurado ? "diagnostico" : "general"} className="w-full">
      <TabsList className={`grid w-full ${isJurado ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {isJurado && <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>}
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="beneficiario">Beneficiario</TabsTrigger>
        <TabsTrigger value="equipo">Equipo</TabsTrigger>
        <TabsTrigger value="financiamiento">Financiamiento</TabsTrigger>
        <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
      </TabsList>

      {isJurado && (
        <TabsContent value="diagnostico" className="space-y-4 mt-4">
          <DiagnosticView emprendimientoId={emprendimientoId} />
        </TabsContent>
      )}

      <TabsContent value="general" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{data.emprendimiento.nombre}</CardTitle>
            <CardDescription>{data.emprendimiento.descripcion}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <InfoItem label="Categoría" value={data.emprendimiento.categoria} />
            <InfoItem label="Etapa" value={data.emprendimiento.etapa} />
            <InfoItem label="Industria/Vertical" value={data.emprendimiento.industria_vertical} />
            <InfoItem label="Alcance de Mercado" value={data.emprendimiento.alcance_mercado} />
            <InfoItem label="Tipo de Cliente" value={data.emprendimiento.tipo_cliente} />
            <InfoItem label="Estado Unidad Productiva" value={data.emprendimiento.estado_unidad_productiva} />
            <InfoItem label="Ventas Último Año" value={data.emprendimiento.ventas_ultimo_ano} />
            <InfoItem label="Ubicación Principal" value={data.emprendimiento.ubicacion_principal} />
            <InfoItem label="Nivel de Innovación" value={data.emprendimiento.nivel_innovacion} />
            <InfoItem label="Integración Tecnológica" value={data.emprendimiento.integracion_tecnologia} />
            <InfoItem label="Plan de Negocios" value={data.emprendimiento.plan_negocios} />
            <InfoItem label="Formalización" value={data.emprendimiento.formalizacion ? "Sí" : "No"} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="beneficiario" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Información del Beneficiario</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <InfoItem label="Nombre Completo" value={`${data.usuario?.nombres} ${data.usuario?.apellidos}`} />
            <InfoItem label="Email" value={data.usuario?.email} />
            <InfoItem label="Celular" value={data.usuario?.celular} />
            <InfoItem label="Tipo de Documento" value={data.usuario?.tipo_documento} />
            <InfoItem label="Número de Documento" value={data.usuario?.numero_identificacion} />
            <InfoItem label="Género" value={data.usuario?.genero} />
            <InfoItem label="Año de Nacimiento" value={data.usuario?.ano_nacimiento} />
            <InfoItem label="Identificación Étnica" value={data.usuario?.identificacion_etnica} />
            <InfoItem label="Departamento" value={data.usuario?.departamento} />
            <InfoItem label="Municipio" value={data.usuario?.municipio} />
            <InfoItem label="Dirección" value={data.usuario?.direccion} />
            <InfoItem label="Nivel de Conocimiento" value={data.usuario?.nivel_conocimiento} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="equipo" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Información del Equipo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {data.equipo ? (
              <>
                <InfoItem label="Equipo Total" value={data.equipo.equipo_total} />
                <InfoItem label="Fundadoras" value={data.equipo.fundadoras} />
                <InfoItem label="Colaboradoras" value={data.equipo.colaboradoras} />
                <InfoItem label="Colaboradores Jóvenes" value={data.equipo.colaboradores_jovenes} />
                <InfoItem label="Personas Full-Time" value={data.equipo.personas_full_time} />
                <InfoItem label="Equipo Técnico" value={data.equipo.equipo_tecnico ? "Sí" : "No"} />
                <InfoItem label="Organigrama" value={data.equipo.organigrama} />
                <InfoItem label="Tipo de Decisiones" value={data.equipo.tipo_decisiones} />
              </>
            ) : (
              <p className="text-muted-foreground col-span-2">No hay información de equipo registrada</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="financiamiento" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Información de Financiamiento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {data.financiamiento ? (
              <>
                <InfoItem label="Busca Financiamiento" value={data.financiamiento.busca_financiamiento} />
                <InfoItem label="Financiamiento Previo" value={data.financiamiento.financiamiento_previo ? "Sí" : "No"} />
                <InfoItem label="Monto Recibido" value={data.financiamiento.monto_recibido ? `$${data.financiamiento.monto_recibido}` : "N/A"} />
                <InfoItem label="Monto Buscado" value={data.financiamiento.monto_buscado} />
                <InfoItem label="Tipo de Actor" value={data.financiamiento.tipo_actor} />
                <InfoItem label="Tipo de Inversión" value={data.financiamiento.tipo_inversion} />
                <InfoItem label="Etapa" value={data.financiamiento.etapa} />
              </>
            ) : (
              <p className="text-muted-foreground col-span-2">No hay información de financiamiento registrada</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="proyecciones" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Proyecciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.proyecciones ? (
              <>
                <InfoItem label="Principales Objetivos" value={data.proyecciones.principales_objetivos} />
                <InfoItem label="Acciones de Crecimiento" value={data.proyecciones.acciones_crecimiento} />
                <InfoItem label="Desafíos" value={data.proyecciones.desafios} />
                <InfoItem label="Impacto" value={data.proyecciones.impacto} />
                <InfoItem label="Decisiones/Acciones de Crecimiento" value={data.proyecciones.decisiones_acciones_crecimiento ? "Sí" : "No"} />
                <InfoItem label="Intención de Internacionalización" value={data.proyecciones.intencion_internacionalizacion ? "Sí" : "No"} />
              </>
            ) : (
              <p className="text-muted-foreground">No hay información de proyecciones registrada</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
