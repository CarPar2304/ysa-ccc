import { supabase } from "@/integrations/supabase/client";
import { filterEmprendimientos, buildEvaluacionesMap, getNivelFromScore } from "./useDashboardFilter";
import * as XLSX from "xlsx";
import { NivelFilter } from "@/components/admin/DashboardFilters";

interface ExportRow {
  Seccion: string;
  Grafico: string;
  Categoria: string;
  Valor: string | number;
}

export const useDashboardExport = () => {
  const fetchDashboardData = async (nivelFilter: NivelFilter): Promise<ExportRow[]> => {
    const rows: ExportRow[] = [];
    
    try {
      // Fetch base data
      const { data: beneficiariosIds } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "beneficiario");

      const beneficiariosSet = new Set(beneficiariosIds?.map(b => b.user_id) || []);

      const { data: allEmprendimientos } = await supabase
        .from("emprendimientos")
        .select("*");

      const { data: asignaciones } = await supabase
        .from("asignacion_cupos")
        .select("emprendimiento_id, estado, nivel")
        .eq("estado", "aprobado");

      const aprobadosSet = new Set(asignaciones?.map(a => a.emprendimiento_id) || []);

      const { data: evaluaciones } = await supabase
        .from("evaluaciones")
        .select("emprendimiento_id, puntaje");

      const evaluacionesMap = buildEvaluacionesMap(evaluaciones || []);

      // Filter emprendimientos - for "todos" we use all, for specific levels we filter
      const emprendimientos = filterEmprendimientos(
        allEmprendimientos || [],
        beneficiariosSet,
        aprobadosSet,
        asignaciones || [],
        evaluacionesMap,
        "todos",
        nivelFilter
      );

      if (emprendimientos.length === 0) {
        rows.push({ Seccion: "General", Grafico: "Sin datos", Categoria: "-", Valor: 0 });
        return rows;
      }

      // ========== USUARIOS ==========
      const filteredUserIds = new Set(emprendimientos.map(e => e.user_id));
      rows.push({ Seccion: "Usuarios", Grafico: "Total Usuarios", Categoria: "-", Valor: filteredUserIds.size });

      // Distribución por nivel
      const nivelCounts: Record<string, number> = {};
      emprendimientos.forEach(e => {
        const asignacion = asignaciones?.find(a => a.emprendimiento_id === e.id);
        let nivel: string | null = asignacion?.nivel || null;
        if (!nivel) {
          const evaluacion = evaluacionesMap.get(e.id);
          if (evaluacion?.puntaje) {
            nivel = getNivelFromScore(evaluacion.puntaje);
          }
        }
        const nivelLabel = nivel || "Sin nivel";
        nivelCounts[nivelLabel] = (nivelCounts[nivelLabel] || 0) + 1;
      });
      Object.entries(nivelCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Usuarios", Grafico: "Distribución por Nivel", Categoria: name, Valor: value });
      });

      // Get user data
      const { data: usuariosBenef } = await supabase
        .from("usuarios")
        .select("genero, ano_nacimiento, departamento, municipio, identificacion_etnica, id")
        .in("id", Array.from(filteredUserIds));

      const usuarios = usuariosBenef || [];
      const totalUsuarios = usuarios.length || 1;

      // Edad promedio
      const currentYear = new Date().getFullYear();
      const edades = usuarios
        .filter(u => u.ano_nacimiento && !isNaN(parseInt(u.ano_nacimiento)))
        .map(u => currentYear - parseInt(u.ano_nacimiento || "0"));
      const edadPromedio = edades.length ? edades.reduce((sum, edad) => sum + edad, 0) / edades.length : 0;
      rows.push({ Seccion: "Usuarios", Grafico: "Edad Promedio", Categoria: "-", Valor: edadPromedio.toFixed(1) });

      // Género
      const generoCounts = usuarios.reduce((acc: any, user) => {
        const genero = user.genero || "No especificado";
        acc[genero] = (acc[genero] || 0) + 1;
        return acc;
      }, {});
      Object.entries(generoCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Usuarios", Grafico: "Distribución de Género", Categoria: name, Valor: value as number });
      });

      // Identificación étnica
      const etnicaCounts = usuarios.reduce((acc: any, user) => {
        const etnica = user.identificacion_etnica || "No especificado";
        acc[etnica] = (acc[etnica] || 0) + 1;
        return acc;
      }, {});
      Object.entries(etnicaCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Usuarios", Grafico: "Identificación Étnica", Categoria: name, Valor: value as number });
      });

      // Departamento
      const deptoCounts = usuarios.reduce((acc: any, user) => {
        const depto = user.departamento || "No especificado";
        acc[depto] = (acc[depto] || 0) + 1;
        return acc;
      }, {});
      Object.entries(deptoCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Usuarios", Grafico: "Distribución por Departamento", Categoria: name, Valor: value as number });
      });

      // Municipio
      const municCounts = usuarios.reduce((acc: any, user) => {
        const munic = user.municipio || "No especificado";
        acc[munic] = (acc[munic] || 0) + 1;
        return acc;
      }, {});
      Object.entries(municCounts)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .forEach(([name, value]) => {
          rows.push({ Seccion: "Usuarios", Grafico: "Top 10 Municipios", Categoria: name, Valor: value as number });
        });

      // ========== EMPRENDIMIENTOS ==========
      const totalEmp = emprendimientos.length;

      // Estado unidad productiva
      const estadoCounts = emprendimientos.reduce((acc: any, e) => {
        const estado = e.estado_unidad_productiva || "No especificado";
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
      }, {});
      Object.entries(estadoCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Estado Unidad Productiva", Categoria: name, Valor: value as number });
      });

      // Vertical / Industria
      const verticalCounts = emprendimientos.reduce((acc: any, e) => {
        const vertical = e.industria_vertical || "No especificado";
        acc[vertical] = (acc[vertical] || 0) + 1;
        return acc;
      }, {});
      Object.entries(verticalCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Vertical (Industria)", Categoria: name, Valor: value as number });
      });

      // Formalización
      const formalCounts = emprendimientos.reduce((acc: any, e) => {
        const formal = e.formalizacion ? "Formalizado" : "No formalizado";
        acc[formal] = (acc[formal] || 0) + 1;
        return acc;
      }, {});
      Object.entries(formalCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Formalización", Categoria: name, Valor: value as number });
      });

      // Registro
      const registroCounts = emprendimientos.reduce((acc: any, e) => {
        const registro = e.registro || "Sin registro";
        acc[registro] = (acc[registro] || 0) + 1;
        return acc;
      }, {});
      Object.entries(registroCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Tipo de Registro", Categoria: name, Valor: value as number });
      });

      // Categoría
      const catCounts = emprendimientos.reduce((acc: any, e) => {
        const cat = e.categoria || "No especificado";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});
      Object.entries(catCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Categoría", Categoria: name, Valor: value as number });
      });

      // Alcance mercado
      const alcanceCounts = emprendimientos.reduce((acc: any, e) => {
        const alcance = e.alcance_mercado || "No especificado";
        acc[alcance] = (acc[alcance] || 0) + 1;
        return acc;
      }, {});
      Object.entries(alcanceCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Alcance de Mercado", Categoria: name, Valor: value as number });
      });

      // Tipo cliente
      const clienteCounts = emprendimientos.reduce((acc: any, e) => {
        const cliente = e.tipo_cliente || "No especificado";
        acc[cliente] = (acc[cliente] || 0) + 1;
        return acc;
      }, {});
      Object.entries(clienteCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Tipo de Cliente", Categoria: name, Valor: value as number });
      });

      // Plan de negocios
      const planCounts = emprendimientos.reduce((acc: any, e) => {
        const plan = e.plan_negocios || "No especificado";
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {});
      Object.entries(planCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Plan de Negocios", Categoria: name, Valor: value as number });
      });

      // Etapa
      const etapaCounts = emprendimientos.reduce((acc: any, e) => {
        const etapa = e.etapa || "No especificado";
        acc[etapa] = (acc[etapa] || 0) + 1;
        return acc;
      }, {});
      Object.entries(etapaCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Etapa", Categoria: name, Valor: value as number });
      });

      // Nivel innovación
      const innovCounts = emprendimientos.reduce((acc: any, e) => {
        const innov = e.nivel_innovacion || "No especificado";
        acc[innov] = (acc[innov] || 0) + 1;
        return acc;
      }, {});
      Object.entries(innovCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Nivel de Innovación", Categoria: name, Valor: value as number });
      });

      // Prácticas ambientales generales
      const practicasCounts = emprendimientos.reduce((acc: any, e) => {
        const practica = e.practicas_ambientales_general || "No especificado";
        acc[practica] = (acc[practica] || 0) + 1;
        return acc;
      }, {});
      Object.entries(practicasCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Prácticas Ambientales Generales", Categoria: name, Valor: value as number });
      });

      // Prácticas por tipo
      const tipos = ["agua", "aire", "residuos", "energia", "suelo"];
      tipos.forEach(tipo => {
        const campo = `practicas_${tipo}` as keyof typeof emprendimientos[0];
        const counts = emprendimientos.reduce((acc: any, e) => {
          const val = String(e[campo] || "No especificado");
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {});
        Object.entries(counts).forEach(([name, value]) => {
          rows.push({ Seccion: "Emprendimientos", Grafico: `Prácticas Ambientales - ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`, Categoria: name, Valor: value as number });
        });
      });

      // Participaciones previas
      const previas = emprendimientos.filter(e => Boolean(e.participaciones_previas)).length;
      rows.push({ Seccion: "Emprendimientos", Grafico: "Participaciones Previas", Categoria: "Sí", Valor: previas });
      rows.push({ Seccion: "Emprendimientos", Grafico: "Participaciones Previas", Categoria: "No", Valor: totalEmp - previas });

      // Impacto oferta
      const impactoCounts = emprendimientos.reduce((acc: any, e) => {
        const impacto = e.impacto_oferta || "No especificado";
        acc[impacto] = (acc[impacto] || 0) + 1;
        return acc;
      }, {});
      Object.entries(impactoCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Impacto de la Oferta", Categoria: name, Valor: value as number });
      });

      // Integración tecnología
      const tecCounts = emprendimientos.reduce((acc: any, e) => {
        const tec = e.integracion_tecnologia || "No especificado";
        acc[tec] = (acc[tec] || 0) + 1;
        return acc;
      }, {});
      Object.entries(tecCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Integración de Tecnología", Categoria: name, Valor: value as number });
      });

      // Actividades I+D
      const actID = emprendimientos.filter(e => Boolean(e.actividades_id)).length;
      rows.push({ Seccion: "Emprendimientos", Grafico: "Actividades I+D", Categoria: "Sí", Valor: actID });
      rows.push({ Seccion: "Emprendimientos", Grafico: "Actividades I+D", Categoria: "No", Valor: totalEmp - actID });

      // Ubicación principal
      const ubicCounts = emprendimientos.reduce((acc: any, e) => {
        const ubic = e.ubicacion_principal || "No especificado";
        acc[ubic] = (acc[ubic] || 0) + 1;
        return acc;
      }, {});
      Object.entries(ubicCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Ubicación Principal", Categoria: name, Valor: value as number });
      });

      // Ventas último año
      const ventasCounts = emprendimientos.reduce((acc: any, e) => {
        const venta = e.ventas_ultimo_ano || "No especificado";
        acc[venta] = (acc[venta] || 0) + 1;
        return acc;
      }, {});
      Object.entries(ventasCounts).forEach(([name, value]) => {
        rows.push({ Seccion: "Emprendimientos", Grafico: "Ventas Último Año", Categoria: name, Valor: value as number });
      });

      // ========== EQUIPOS ==========
      const empIds = emprendimientos.map(e => e.id);
      const { data: allEquipos } = await supabase
        .from("equipos")
        .select("*")
        .in("emprendimiento_id", empIds.length > 0 ? empIds : ["none"]);

      const equipos = allEquipos || [];
      if (equipos.length > 0) {
        const totalEquipos = equipos.length;

        const sumTotal = equipos.reduce((sum, e) => sum + (e.equipo_total || 0), 0);
        rows.push({ Seccion: "Equipos", Grafico: "Promedio Equipo Total", Categoria: "-", Valor: (sumTotal / totalEquipos).toFixed(1) });

        const sumFullTime = equipos.reduce((sum, e) => sum + (e.personas_full_time || 0), 0);
        rows.push({ Seccion: "Equipos", Grafico: "Promedio Full Time", Categoria: "-", Valor: (sumFullTime / totalEquipos).toFixed(1) });

        const sumColaboradoras = equipos.reduce((sum, e) => sum + (e.colaboradoras || 0), 0);
        rows.push({ Seccion: "Equipos", Grafico: "Promedio Colaboradoras", Categoria: "-", Valor: (sumColaboradoras / totalEquipos).toFixed(1) });

        const sumFundadoras = equipos.reduce((sum, e) => sum + (e.fundadoras || 0), 0);
        rows.push({ Seccion: "Equipos", Grafico: "Promedio Fundadoras", Categoria: "-", Valor: (sumFundadoras / totalEquipos).toFixed(1) });

        const sumJovenes = equipos.reduce((sum, e) => sum + (e.colaboradores_jovenes || 0), 0);
        rows.push({ Seccion: "Equipos", Grafico: "Promedio Jóvenes", Categoria: "-", Valor: (sumJovenes / totalEquipos).toFixed(1) });

        // Equipo técnico
        const tecnicoCounts = equipos.reduce((acc: any, e) => {
          const tecnico = e.equipo_tecnico ? "Tiene equipo técnico" : "No tiene equipo técnico";
          acc[tecnico] = (acc[tecnico] || 0) + 1;
          return acc;
        }, {});
        Object.entries(tecnicoCounts).forEach(([name, value]) => {
          rows.push({ Seccion: "Equipos", Grafico: "Equipo Técnico", Categoria: name, Valor: value as number });
        });

        // Organigrama
        const orgCounts = equipos.reduce((acc: any, e) => {
          const org = e.organigrama || "No especificado";
          acc[org] = (acc[org] || 0) + 1;
          return acc;
        }, {});
        Object.entries(orgCounts).forEach(([name, value]) => {
          rows.push({ Seccion: "Equipos", Grafico: "Organigrama", Categoria: name, Valor: value as number });
        });

        // Tipo decisiones
        const decCounts = equipos.reduce((acc: any, e) => {
          const dec = e.tipo_decisiones || "No especificado";
          acc[dec] = (acc[dec] || 0) + 1;
          return acc;
        }, {});
        Object.entries(decCounts).forEach(([name, value]) => {
          rows.push({ Seccion: "Equipos", Grafico: "Tipo de Decisiones", Categoria: name, Valor: value as number });
        });
      }

      // ========== FINANCIAMIENTO ==========
      const { data: allFinanciamientos } = await supabase
        .from("financiamientos")
        .select("*")
        .in("emprendimiento_id", empIds.length > 0 ? empIds : ["none"]);

      const financiamientos = allFinanciamientos || [];
      if (financiamientos.length > 0) {
        const conPrevio = financiamientos.filter(f => f.financiamiento_previo === true);
        rows.push({ Seccion: "Financiamiento", Grafico: "Con Financiamiento Previo", Categoria: "-", Valor: conPrevio.length });

        // Tipo actor
        const actorCounts = conPrevio.reduce((acc: any, f) => {
          const actor = f.tipo_actor || "No especificado";
          acc[actor] = (acc[actor] || 0) + 1;
          return acc;
        }, {});
        Object.entries(actorCounts).forEach(([name, value]) => {
          rows.push({ Seccion: "Financiamiento", Grafico: "Tipo de Actor (Financiamiento Previo)", Categoria: name, Valor: value as number });
        });

        // Etapa financiamiento
        const etapaFinCounts = conPrevio.reduce((acc: any, f) => {
          const etapa = f.etapa || "No especificado";
          acc[etapa] = (acc[etapa] || 0) + 1;
          return acc;
        }, {});
        Object.entries(etapaFinCounts).forEach(([name, value]) => {
          rows.push({ Seccion: "Financiamiento", Grafico: "Etapa de Financiamiento", Categoria: name, Valor: value as number });
        });

        // Promedio recibido
        const montosRecibidos = conPrevio
          .filter(f => f.monto_recibido)
          .map(f => f.monto_recibido || 0);
        const promedioRec = montosRecibidos.length
          ? montosRecibidos.reduce((sum, m) => sum + m, 0) / montosRecibidos.length
          : 0;
        rows.push({ Seccion: "Financiamiento", Grafico: "Promedio Monto Recibido", Categoria: "-", Valor: promedioRec.toFixed(0) });

        // Buscan inversión
        const buscan = financiamientos.filter(f => f.busca_financiamiento && f.busca_financiamiento !== "No");
        rows.push({ Seccion: "Financiamiento", Grafico: "Buscan Inversión", Categoria: "-", Valor: buscan.length });

        // Tipo inversión buscada
        const invCounts = buscan.reduce((acc: any, f) => {
          const inv = f.tipo_inversion || "No especificado";
          acc[inv] = (acc[inv] || 0) + 1;
          return acc;
        }, {});
        Object.entries(invCounts).forEach(([name, value]) => {
          rows.push({ Seccion: "Financiamiento", Grafico: "Tipo de Inversión Buscada", Categoria: name, Valor: value as number });
        });
      }

      // ========== PROYECCIONES ==========
      const { data: allProyecciones } = await supabase
        .from("proyecciones")
        .select("*")
        .in("emprendimiento_id", empIds.length > 0 ? empIds : ["none"]);

      const proyecciones = allProyecciones || [];
      if (proyecciones.length > 0) {
        const totalProy = proyecciones.length;

        // Internacionalización
        const internCounts = proyecciones.reduce((acc: any, p) => {
          const intern = p.intencion_internacionalizacion ? "Sí" : "No";
          acc[intern] = (acc[intern] || 0) + 1;
          return acc;
        }, {});
        Object.entries(internCounts).forEach(([name, value]) => {
          rows.push({ Seccion: "Proyecciones", Grafico: "Intención de Internacionalización", Categoria: name, Valor: value as number });
        });

        // Impacto proyección
        const impactoPCounts = proyecciones.reduce((acc: any, p) => {
          const imp = p.impacto || "No especificado";
          acc[imp] = (acc[imp] || 0) + 1;
          return acc;
        }, {});
        Object.entries(impactoPCounts).forEach(([name, value]) => {
          rows.push({ Seccion: "Proyecciones", Grafico: "Impacto de Proyección", Categoria: name, Valor: value as number });
        });

        // Acciones crecimiento
        const accCounts = proyecciones.reduce((acc: any, p) => {
          const acc_crec = p.decisiones_acciones_crecimiento ? "Sí" : "No";
          acc[acc_crec] = (acc[acc_crec] || 0) + 1;
          return acc;
        }, {});
        Object.entries(accCounts).forEach(([name, value]) => {
          rows.push({ Seccion: "Proyecciones", Grafico: "Decisiones Acciones Crecimiento", Categoria: name, Valor: value as number });
        });
      }

    } catch (error) {
      console.error("Error fetching dashboard data for export:", error);
    }

    return rows;
  };

  const exportDashboard = async () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: General (todos)
    const generalData = await fetchDashboardData("todos");
    const wsGeneral = XLSX.utils.json_to_sheet(generalData);
    XLSX.utils.book_append_sheet(wb, wsGeneral, "General");

    // Sheet 2: Starter
    const starterData = await fetchDashboardData("Starter");
    const wsStarter = XLSX.utils.json_to_sheet(starterData);
    XLSX.utils.book_append_sheet(wb, wsStarter, "Starter");

    // Sheet 3: Growth
    const growthData = await fetchDashboardData("Growth");
    const wsGrowth = XLSX.utils.json_to_sheet(growthData);
    XLSX.utils.book_append_sheet(wb, wsGrowth, "Growth");

    // Sheet 4: Scale
    const scaleData = await fetchDashboardData("Scale");
    const wsScale = XLSX.utils.json_to_sheet(scaleData);
    XLSX.utils.book_append_sheet(wb, wsScale, "Scale");

    // Download
    const fecha = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Dashboard_YSA_${fecha}.xlsx`);
  };

  return { exportDashboard };
};
