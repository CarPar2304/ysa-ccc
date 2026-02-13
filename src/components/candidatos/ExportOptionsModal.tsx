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
  candidato?: CandidatoData | null;
  candidatos?: (CandidatoData & { _progreso_promedio?: number })[];
  open: boolean;
  onClose: () => void;
  includeProgress?: boolean;
}

interface ExportSection {
  key: string;
  label: string;
  checked: boolean;
}

export const ExportOptionsModal = ({ candidato, candidatos, open, onClose, includeProgress }: ExportOptionsModalProps) => {
  const baseSections: ExportSection[] = [
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
  ];

  if (includeProgress) {
    baseSections.push({ key: "progreso", label: "Progreso Académico", checked: true });
  }

  const [sections, setSections] = useState<ExportSection[]>(baseSections);

  const isMassExport = !candidato && candidatos && candidatos.length > 0;
  const dataToExport = isMassExport ? candidatos : (candidato ? [candidato] : []);

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

  const buildCandidatoRow = (c: CandidatoData, selectedSections: string[]) => {
    const row: Record<string, any> = {};

    if (selectedSections.includes("personal")) {
      Object.assign(row, {
        "Nombres": c.nombres,
        "Apellidos": c.apellidos,
        "Tipo de Documento": c.tipo_documento || "N/A",
        "Número de Identificación": c.numero_identificacion || "N/A",
        "Género": c.genero || "N/A",
        "Año de Nacimiento": c.ano_nacimiento || "N/A",
        "Identificación Étnica": c.identificacion_etnica || "N/A",
        "Menor de Edad": c.menor_de_edad ? "Sí" : "No",
        "Nivel de Inglés": c.nivel_ingles || "N/A",
        "Biografía": c.biografia || "N/A",
      });
    }

    if (selectedSections.includes("contacto")) {
      Object.assign(row, {
        "Email": c.email || "N/A",
        "Celular": c.celular || "N/A",
        "Dirección": c.direccion || "N/A",
        "Departamento": c.departamento || "N/A",
        "Municipio": c.municipio || "N/A",
      });
    }

    if (selectedSections.includes("autorizaciones")) {
      Object.assign(row, {
        "Autoriza Tratamiento de Datos": c.autorizaciones?.tratamiento_datos ? "Sí" : "No",
        "Autoriza Datos Sensibles": c.autorizaciones?.datos_sensibles ? "Sí" : "No",
        "Autoriza Contacto por Correo": c.autorizaciones?.correo ? "Sí" : "No",
        "Autoriza Contacto por Celular": c.autorizaciones?.celular ? "Sí" : "No",
      });
    }

    if (selectedSections.includes("acudiente")) {
      Object.assign(row, {
        "Acudiente - Nombres": c.acudiente?.nombres || "N/A",
        "Acudiente - Apellidos": c.acudiente?.apellidos || "N/A",
        "Acudiente - Relación": c.acudiente?.relacion_con_menor || "N/A",
        "Acudiente - Email": c.acudiente?.email || "N/A",
        "Acudiente - Celular": c.acudiente?.celular || "N/A",
        "Acudiente - Tipo Doc": c.acudiente?.tipo_documento || "N/A",
        "Acudiente - Identificación": c.acudiente?.numero_identificacion || "N/A",
      });
    }

    if (selectedSections.includes("emprendimiento")) {
      Object.assign(row, {
        "Emprendimiento": c.emprendimiento?.nombre || "N/A",
        "Descripción Emprendimiento": c.emprendimiento?.descripcion || "N/A",
        "Categoría": c.emprendimiento?.categoria || "N/A",
        "Etapa": c.emprendimiento?.etapa || "N/A",
        "Nivel Definitivo": c.emprendimiento?.nivel_definitivo || "N/A",
        "Industria Vertical": c.emprendimiento?.industria_vertical || "N/A",
        "Año de Fundación": c.emprendimiento?.ano_fundacion || "N/A",
        "Estado Unidad Productiva": c.emprendimiento?.estado_unidad_productiva || "N/A",
        "Tipo de Cliente": c.emprendimiento?.tipo_cliente || "N/A",
        "Alcance de Mercado": c.emprendimiento?.alcance_mercado || "N/A",
        "Ventas Último Año": c.emprendimiento?.ventas_ultimo_ano || "N/A",
        "Página Web": c.emprendimiento?.pagina_web || "N/A",
        "Nivel de Innovación": c.emprendimiento?.nivel_innovacion || "N/A",
        "Integración Tecnológica": c.emprendimiento?.integracion_tecnologia || "N/A",
        "Plan de Negocios": c.emprendimiento?.plan_negocios || "N/A",
        "Formalización": c.emprendimiento?.formalizacion ? "Sí" : "No",
      });
    }

    if (selectedSections.includes("equipo")) {
      Object.assign(row, {
        "Equipo Total": c.equipo?.equipo_total || 0,
        "Fundadoras": c.equipo?.fundadoras || 0,
        "Colaboradoras": c.equipo?.colaboradoras || 0,
        "Colaboradores Jóvenes": c.equipo?.colaboradores_jovenes || 0,
        "Personas Full-time": c.equipo?.personas_full_time || 0,
        "Equipo Técnico": c.equipo?.equipo_tecnico ? "Sí" : "No",
        "Organigrama": c.equipo?.organigrama || "N/A",
        "Tipo de Decisiones": c.equipo?.tipo_decisiones || "N/A",
      });
    }

    if (selectedSections.includes("financiamiento")) {
      Object.assign(row, {
        "Busca Financiamiento": c.financiamiento?.busca_financiamiento || "N/A",
        "Monto Buscado": c.financiamiento?.monto_buscado || "N/A",
        "Financiamiento Previo": c.financiamiento?.financiamiento_previo ? "Sí" : "No",
        "Monto Recibido": c.financiamiento?.monto_recibido || "N/A",
        "Tipo de Actor": c.financiamiento?.tipo_actor || "N/A",
        "Tipo de Inversión": c.financiamiento?.tipo_inversion || "N/A",
        "Etapa Financiamiento": c.financiamiento?.etapa || "N/A",
      });
    }

    if (selectedSections.includes("proyecciones")) {
      Object.assign(row, {
        "Principales Objetivos": c.proyecciones?.principales_objetivos || "N/A",
        "Desafíos": c.proyecciones?.desafios || "N/A",
        "Acciones de Crecimiento": c.proyecciones?.acciones_crecimiento || "N/A",
        "Impacto Proyección": c.proyecciones?.impacto || "N/A",
        "Intención Internacionalización": c.proyecciones?.intencion_internacionalizacion ? "Sí" : "No",
        "Decisiones Acciones Crecimiento": c.proyecciones?.decisiones_acciones_crecimiento ? "Sí" : "No",
      });
    }

    if (selectedSections.includes("diagnostico")) {
      Object.assign(row, {
        "Diagnóstico": c.diagnostico?.contenido || "N/A",
        "Fecha Diagnóstico": c.diagnostico?.updated_at 
          ? new Date(c.diagnostico.updated_at).toLocaleDateString('es-CO')
          : "N/A",
      });
    }

    if (selectedSections.includes("cupo")) {
      Object.assign(row, {
        "Estado del Cupo": c.cupo?.estado || "N/A",
        "Nivel del Cupo": c.cupo?.nivel || "N/A",
        "Cohorte": c.cupo?.cohorte || "N/A",
        "Notas del Cupo": c.cupo?.notas || "N/A",
        "Fecha de Asignación": c.cupo?.fecha_asignacion 
          ? new Date(c.cupo.fecha_asignacion).toLocaleDateString('es-CO') 
          : "N/A",
      });
    }

    if (selectedSections.includes("evaluaciones")) {
      const evalCount = c.evaluaciones_detalle?.length || 0;
      Object.assign(row, {
        "Cantidad de Evaluaciones": evalCount,
        "Puntaje Última Evaluación": evalCount > 0 
          ? c.evaluaciones_detalle![evalCount - 1].puntaje || 0 
          : "N/A",
        "Nivel Última Evaluación": evalCount > 0 
          ? c.evaluaciones_detalle![evalCount - 1].nivel || "N/A" 
          : "N/A",
      });
    }

    if (selectedSections.includes("progreso")) {
      const withProgress = c as CandidatoData & { _progreso_promedio?: number };
      Object.assign(row, {
        "Progreso Promedio (%)": withProgress._progreso_promedio ?? "N/A",
      });
    }

    return row;
  };

  const exportToExcel = () => {
    if (dataToExport.length === 0) return;

    const workbook = XLSX.utils.book_new();
    const selectedSections = sections.filter(s => s.checked).map(s => s.key);

    if (isMassExport) {
      // Mass export: all candidatos in one sheet with all selected fields
      const allData = dataToExport.map(c => buildCandidatoRow(c, selectedSections));
      const mainSheet = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(workbook, mainSheet, "Candidatos");

      // Separate evaluations sheet if selected
      if (selectedSections.includes("evaluaciones")) {
        const evalData: any[] = [];
        dataToExport.forEach(c => {
          c.evaluaciones_detalle?.forEach((e, i) => {
            evalData.push({
              "Candidato": `${c.nombres} ${c.apellidos}`,
              "Email": c.email,
              "Emprendimiento": c.emprendimiento?.nombre || "N/A",
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
            });
          });
        });
        if (evalData.length > 0) {
          const evalSheet = XLSX.utils.json_to_sheet(evalData);
          XLSX.utils.book_append_sheet(workbook, evalSheet, "Evaluaciones Detalle");
        }
      }

      const fileName = `candidatos_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } else {
      // Individual export: multiple sheets per section
      const c = dataToExport[0];
      
      const generalData = buildCandidatoRow(c, selectedSections.filter(s => 
        ["personal", "contacto", "autorizaciones", "acudiente", "cupo"].includes(s)
      ));
      
      if (Object.keys(generalData).length > 0) {
        const generalSheet = XLSX.utils.json_to_sheet([generalData]);
        XLSX.utils.book_append_sheet(workbook, generalSheet, "Información General");
      }

      if (selectedSections.includes("emprendimiento") && c.emprendimiento) {
        const empData = {
          "Nombre": c.emprendimiento.nombre,
          "Descripción": c.emprendimiento.descripcion || "N/A",
          "Categoría": c.emprendimiento.categoria || "N/A",
          "Etapa": c.emprendimiento.etapa || "N/A",
          "Nivel Definitivo": c.emprendimiento.nivel_definitivo || "N/A",
          "Industria Vertical": c.emprendimiento.industria_vertical || "N/A",
          "Año de Fundación": c.emprendimiento.ano_fundacion || "N/A",
          "Estado Unidad Productiva": c.emprendimiento.estado_unidad_productiva || "N/A",
          "Tipo de Cliente": c.emprendimiento.tipo_cliente || "N/A",
          "Alcance de Mercado": c.emprendimiento.alcance_mercado || "N/A",
          "Ventas Último Año": c.emprendimiento.ventas_ultimo_ano || "N/A",
          "Página Web": c.emprendimiento.pagina_web || "N/A",
          "Nivel de Innovación": c.emprendimiento.nivel_innovacion || "N/A",
          "Integración Tecnológica": c.emprendimiento.integracion_tecnologia || "N/A",
          "Plan de Negocios": c.emprendimiento.plan_negocios || "N/A",
          "Formalización": c.emprendimiento.formalizacion ? "Sí" : "No",
        };
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([empData]), "Emprendimiento");
      }

      if (selectedSections.includes("equipo") && c.equipo) {
        const equipoData = {
          "Equipo Total": c.equipo.equipo_total || 0,
          "Fundadoras": c.equipo.fundadoras || 0,
          "Colaboradoras": c.equipo.colaboradoras || 0,
          "Colaboradores Jóvenes": c.equipo.colaboradores_jovenes || 0,
          "Personas Full-time": c.equipo.personas_full_time || 0,
          "Equipo Técnico": c.equipo.equipo_tecnico ? "Sí" : "No",
          "Organigrama": c.equipo.organigrama || "N/A",
          "Tipo de Decisiones": c.equipo.tipo_decisiones || "N/A",
        };
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([equipoData]), "Equipo");
      }

      if (selectedSections.includes("financiamiento") && c.financiamiento) {
        const finData = {
          "Busca Financiamiento": c.financiamiento.busca_financiamiento || "N/A",
          "Monto Buscado": c.financiamiento.monto_buscado || "N/A",
          "Financiamiento Previo": c.financiamiento.financiamiento_previo ? "Sí" : "No",
          "Monto Recibido": c.financiamiento.monto_recibido || "N/A",
          "Tipo de Actor": c.financiamiento.tipo_actor || "N/A",
          "Tipo de Inversión": c.financiamiento.tipo_inversion || "N/A",
          "Etapa": c.financiamiento.etapa || "N/A",
        };
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([finData]), "Financiamiento");
      }

      if (selectedSections.includes("proyecciones") && c.proyecciones) {
        const proyData = {
          "Principales Objetivos": c.proyecciones.principales_objetivos || "N/A",
          "Desafíos": c.proyecciones.desafios || "N/A",
          "Acciones de Crecimiento": c.proyecciones.acciones_crecimiento || "N/A",
          "Impacto": c.proyecciones.impacto || "N/A",
          "Intención Internacionalización": c.proyecciones.intencion_internacionalizacion ? "Sí" : "No",
          "Decisiones Acciones Crecimiento": c.proyecciones.decisiones_acciones_crecimiento ? "Sí" : "No",
        };
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([proyData]), "Proyecciones");
      }

      if (selectedSections.includes("diagnostico") && c.diagnostico?.contenido) {
        const diagData = {
          "Contenido": c.diagnostico.contenido,
          "Última Actualización": c.diagnostico.updated_at 
            ? new Date(c.diagnostico.updated_at).toLocaleDateString('es-CO')
            : "N/A",
        };
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([diagData]), "Diagnóstico");
      }

      if (selectedSections.includes("evaluaciones") && c.evaluaciones_detalle && c.evaluaciones_detalle.length > 0) {
        const evalData = c.evaluaciones_detalle.map((e, i) => ({
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
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(evalData), "Evaluaciones");
      }

      const fileName = `${c.nombres}_${c.apellidos}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    }

    onClose();
  };

  const selectedCount = sections.filter(s => s.checked).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isMassExport 
              ? `Exportar ${dataToExport.length} candidatos` 
              : "Opciones de Exportación"
            }
          </DialogTitle>
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

          {isMassExport && sections.some(s => s.checked && s.key === "evaluaciones") && (
            <p className="text-xs text-muted-foreground">
              * Las evaluaciones se exportarán en una hoja separada con el detalle completo.
            </p>
          )}
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
