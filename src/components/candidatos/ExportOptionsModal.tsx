import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CandidatoData } from "@/pages/Candidatos";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportOptionsModalProps {
  candidato: CandidatoData | null;
  open: boolean;
  onClose: () => void;
}

interface ExportSection {
  key: string;
  label: string;
  checked: boolean;
}

export const ExportOptionsModal = ({ candidato, open, onClose }: ExportOptionsModalProps) => {
  const [sections, setSections] = useState<ExportSection[]>([
    { key: "personal", label: "Información Personal", checked: true },
    { key: "contacto", label: "Contacto y Ubicación", checked: true },
    { key: "autorizaciones", label: "Autorizaciones", checked: true },
    { key: "acudiente", label: "Acudiente", checked: true },
    { key: "emprendimiento", label: "Emprendimiento", checked: true },
    { key: "equipo", label: "Equipo", checked: true },
    { key: "financiamiento", label: "Financiamiento", checked: true },
    { key: "proyecciones", label: "Proyecciones", checked: true },
    { key: "diagnostico", label: "Diagnóstico", checked: true },
    { key: "evaluaciones", label: "Evaluaciones", checked: true },
    { key: "cupo", label: "Estado del Cupo", checked: true },
  ]);

  const toggleSection = (key: string) => {
    setSections(prev => prev.map(s => 
      s.key === key ? { ...s, checked: !s.checked } : s
    ));
  };

  const selectAll = () => {
    setSections(prev => prev.map(s => ({ ...s, checked: true })));
  };

  const deselectAll = () => {
    setSections(prev => prev.map(s => ({ ...s, checked: false })));
  };

  const exportToExcel = () => {
    if (!candidato) return;

    const workbook = XLSX.utils.book_new();
    const selectedSections = sections.filter(s => s.checked).map(s => s.key);

    // Hoja de información general
    const generalData: Record<string, any> = {};

    if (selectedSections.includes("personal")) {
      Object.assign(generalData, {
        "Nombres": candidato.nombres,
        "Apellidos": candidato.apellidos,
        "Tipo de Documento": candidato.tipo_documento || "N/A",
        "Número de Identificación": candidato.numero_identificacion || "N/A",
        "Género": candidato.genero || "N/A",
        "Año de Nacimiento": candidato.ano_nacimiento || "N/A",
        "Identificación Étnica": candidato.identificacion_etnica || "N/A",
        "Menor de Edad": candidato.menor_de_edad ? "Sí" : "No",
        "Nivel de Inglés": candidato.nivel_ingles || "N/A",
        "Biografía": candidato.biografia || "N/A",
      });
    }

    if (selectedSections.includes("contacto")) {
      Object.assign(generalData, {
        "Email": candidato.email || "N/A",
        "Celular": candidato.celular || "N/A",
        "Dirección": candidato.direccion || "N/A",
        "Departamento": candidato.departamento || "N/A",
        "Municipio": candidato.municipio || "N/A",
      });
    }

    if (selectedSections.includes("autorizaciones") && candidato.autorizaciones) {
      Object.assign(generalData, {
        "Autoriza Tratamiento de Datos": candidato.autorizaciones.tratamiento_datos ? "Sí" : "No",
        "Autoriza Datos Sensibles": candidato.autorizaciones.datos_sensibles ? "Sí" : "No",
        "Autoriza Contacto por Correo": candidato.autorizaciones.correo ? "Sí" : "No",
        "Autoriza Contacto por Celular": candidato.autorizaciones.celular ? "Sí" : "No",
      });
    }

    if (selectedSections.includes("acudiente") && candidato.acudiente) {
      Object.assign(generalData, {
        "Acudiente - Nombres": candidato.acudiente.nombres,
        "Acudiente - Apellidos": candidato.acudiente.apellidos,
        "Acudiente - Relación": candidato.acudiente.relacion_con_menor,
        "Acudiente - Email": candidato.acudiente.email || "N/A",
        "Acudiente - Celular": candidato.acudiente.celular || "N/A",
        "Acudiente - Tipo Doc": candidato.acudiente.tipo_documento || "N/A",
        "Acudiente - Identificación": candidato.acudiente.numero_identificacion || "N/A",
      });
    }

    if (selectedSections.includes("cupo") && candidato.cupo) {
      Object.assign(generalData, {
        "Estado del Cupo": candidato.cupo.estado || "N/A",
        "Nivel del Cupo": candidato.cupo.nivel || "N/A",
        "Cohorte": candidato.cupo.cohorte || "N/A",
        "Notas del Cupo": candidato.cupo.notas || "N/A",
        "Fecha de Asignación": candidato.cupo.fecha_asignacion 
          ? new Date(candidato.cupo.fecha_asignacion).toLocaleDateString('es-CO') 
          : "N/A",
      });
    }

    // Agregar hoja de información general
    if (Object.keys(generalData).length > 0) {
      const generalSheet = XLSX.utils.json_to_sheet([generalData]);
      XLSX.utils.book_append_sheet(workbook, generalSheet, "Información General");
    }

    // Hoja de emprendimiento
    if (selectedSections.includes("emprendimiento") && candidato.emprendimiento) {
      const emprendimientoData = {
        "Nombre": candidato.emprendimiento.nombre,
        "Descripción": candidato.emprendimiento.descripcion || "N/A",
        "Categoría": candidato.emprendimiento.categoria || "N/A",
        "Etapa": candidato.emprendimiento.etapa || "N/A",
        "Nivel Definitivo": candidato.emprendimiento.nivel_definitivo || "N/A",
        "Industria Vertical": candidato.emprendimiento.industria_vertical || "N/A",
        "Año de Fundación": candidato.emprendimiento.ano_fundacion || "N/A",
        "Estado Unidad Productiva": candidato.emprendimiento.estado_unidad_productiva || "N/A",
        "Tipo de Cliente": candidato.emprendimiento.tipo_cliente || "N/A",
        "Alcance de Mercado": candidato.emprendimiento.alcance_mercado || "N/A",
        "Ventas Último Año": candidato.emprendimiento.ventas_ultimo_ano || "N/A",
        "Página Web": candidato.emprendimiento.pagina_web || "N/A",
        "Nivel de Innovación": candidato.emprendimiento.nivel_innovacion || "N/A",
        "Integración Tecnológica": candidato.emprendimiento.integracion_tecnologia || "N/A",
        "Plan de Negocios": candidato.emprendimiento.plan_negocios || "N/A",
        "Formalización": candidato.emprendimiento.formalizacion ? "Sí" : "No",
      };
      const empSheet = XLSX.utils.json_to_sheet([emprendimientoData]);
      XLSX.utils.book_append_sheet(workbook, empSheet, "Emprendimiento");
    }

    // Hoja de equipo
    if (selectedSections.includes("equipo") && candidato.equipo) {
      const equipoData = {
        "Equipo Total": candidato.equipo.equipo_total || 0,
        "Fundadoras": candidato.equipo.fundadoras || 0,
        "Colaboradoras": candidato.equipo.colaboradoras || 0,
        "Colaboradores Jóvenes": candidato.equipo.colaboradores_jovenes || 0,
        "Personas Full-time": candidato.equipo.personas_full_time || 0,
        "Equipo Técnico": candidato.equipo.equipo_tecnico ? "Sí" : "No",
        "Organigrama": candidato.equipo.organigrama || "N/A",
        "Tipo de Decisiones": candidato.equipo.tipo_decisiones || "N/A",
      };
      const equipoSheet = XLSX.utils.json_to_sheet([equipoData]);
      XLSX.utils.book_append_sheet(workbook, equipoSheet, "Equipo");
    }

    // Hoja de financiamiento
    if (selectedSections.includes("financiamiento") && candidato.financiamiento) {
      const financiamientoData = {
        "Busca Financiamiento": candidato.financiamiento.busca_financiamiento || "N/A",
        "Monto Buscado": candidato.financiamiento.monto_buscado || "N/A",
        "Financiamiento Previo": candidato.financiamiento.financiamiento_previo ? "Sí" : "No",
        "Monto Recibido": candidato.financiamiento.monto_recibido || "N/A",
        "Tipo de Actor": candidato.financiamiento.tipo_actor || "N/A",
        "Tipo de Inversión": candidato.financiamiento.tipo_inversion || "N/A",
        "Etapa": candidato.financiamiento.etapa || "N/A",
      };
      const finSheet = XLSX.utils.json_to_sheet([financiamientoData]);
      XLSX.utils.book_append_sheet(workbook, finSheet, "Financiamiento");
    }

    // Hoja de proyecciones
    if (selectedSections.includes("proyecciones") && candidato.proyecciones) {
      const proyeccionesData = {
        "Principales Objetivos": candidato.proyecciones.principales_objetivos || "N/A",
        "Desafíos": candidato.proyecciones.desafios || "N/A",
        "Acciones de Crecimiento": candidato.proyecciones.acciones_crecimiento || "N/A",
        "Impacto": candidato.proyecciones.impacto || "N/A",
        "Intención Internacionalización": candidato.proyecciones.intencion_internacionalizacion ? "Sí" : "No",
        "Decisiones Acciones Crecimiento": candidato.proyecciones.decisiones_acciones_crecimiento ? "Sí" : "No",
      };
      const proySheet = XLSX.utils.json_to_sheet([proyeccionesData]);
      XLSX.utils.book_append_sheet(workbook, proySheet, "Proyecciones");
    }

    // Hoja de diagnóstico
    if (selectedSections.includes("diagnostico") && candidato.diagnostico?.contenido) {
      const diagData = {
        "Contenido": candidato.diagnostico.contenido,
        "Última Actualización": candidato.diagnostico.updated_at 
          ? new Date(candidato.diagnostico.updated_at).toLocaleDateString('es-CO')
          : "N/A",
      };
      const diagSheet = XLSX.utils.json_to_sheet([diagData]);
      XLSX.utils.book_append_sheet(workbook, diagSheet, "Diagnóstico");
    }

    // Hoja de evaluaciones
    if (selectedSections.includes("evaluaciones") && candidato.evaluaciones_detalle && candidato.evaluaciones_detalle.length > 0) {
      const evalData = candidato.evaluaciones_detalle.map((e, i) => ({
        "Evaluación #": i + 1,
        "Tipo": e.tipo_evaluacion.toUpperCase(),
        "Nivel": e.nivel || "N/A",
        "Puntaje Total": e.puntaje || 0,
        "Puntaje Impacto": e.puntaje_impacto || 0,
        "Puntaje Equipo": e.puntaje_equipo || 0,
        "Puntaje Innovación/Tecnología": e.puntaje_innovacion_tecnologia || 0,
        "Puntaje Ventas": e.puntaje_ventas || 0,
        "Puntaje Proyección/Financiación": e.puntaje_proyeccion_financiacion || 0,
        "Puntaje Referido Regional": e.puntaje_referido_regional || 0,
        "Cumple Ubicación": e.cumple_ubicacion ? "Sí" : "No",
        "Cumple Equipo Mínimo": e.cumple_equipo_minimo ? "Sí" : "No",
        "Cumple Dedicación": e.cumple_dedicacion ? "Sí" : "No",
        "Cumple Interés": e.cumple_interes ? "Sí" : "No",
        "Retroalimentación Impacto": e.impacto_texto || "N/A",
        "Retroalimentación Equipo": e.equipo_texto || "N/A",
        "Retroalimentación Innovación": e.innovacion_tecnologia_texto || "N/A",
        "Retroalimentación Ventas": e.ventas_texto || "N/A",
        "Retroalimentación Proyección": e.proyeccion_financiacion_texto || "N/A",
        "Comentarios Adicionales": e.comentarios_adicionales || "N/A",
        "Fecha": new Date(e.created_at).toLocaleDateString('es-CO'),
      }));
      const evalSheet = XLSX.utils.json_to_sheet(evalData);
      XLSX.utils.book_append_sheet(workbook, evalSheet, "Evaluaciones");
    }

    // Generar y descargar archivo
    const fileName = `${candidato.nombres}_${candidato.apellidos}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    onClose();
  };

  const selectedCount = sections.filter(s => s.checked).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Opciones de Exportación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {selectedCount} de {sections.length} secciones seleccionadas
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Todas
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Ninguna
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {sections.map((section) => (
              <div key={section.key} className="flex items-center space-x-2">
                <Checkbox
                  id={section.key}
                  checked={section.checked}
                  onCheckedChange={() => toggleSection(section.key)}
                />
                <Label htmlFor={section.key} className="cursor-pointer">
                  {section.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={exportToExcel} disabled={selectedCount === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
