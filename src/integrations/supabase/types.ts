export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      acudientes: {
        Row: {
          ano_nacimiento: string | null
          apellidos: string
          celular: string | null
          created_at: string
          direccion: string | null
          email: string | null
          genero: string | null
          id: string
          identificacion_etnica: string | null
          menor_id: string
          nombres: string
          numero_identificacion: string | null
          relacion_con_menor: string
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
        }
        Insert: {
          ano_nacimiento?: string | null
          apellidos: string
          celular?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          identificacion_etnica?: string | null
          menor_id: string
          nombres: string
          numero_identificacion?: string | null
          relacion_con_menor: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
        }
        Update: {
          ano_nacimiento?: string | null
          apellidos?: string
          celular?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          identificacion_etnica?: string | null
          menor_id?: string
          nombres?: string
          numero_identificacion?: string | null
          relacion_con_menor?: string
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
        }
        Relationships: [
          {
            foreignKeyName: "acudientes_menor_id_fkey"
            columns: ["menor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones_mentor: {
        Row: {
          created_at: string
          id: string
          mentor_id: string
          modulo_id: string
          puede_editar: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_id: string
          modulo_id: string
          puede_editar?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          mentor_id?: string
          modulo_id?: string
          puede_editar?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_mentor_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_mentor_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizaciones: {
        Row: {
          celular: boolean
          correo: boolean
          created_at: string
          datos_sensibles: boolean
          id: string
          tratamiento_datos: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          celular?: boolean
          correo?: boolean
          created_at?: string
          datos_sensibles?: boolean
          id?: string
          tratamiento_datos?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          celular?: boolean
          correo?: boolean
          created_at?: string
          datos_sensibles?: boolean
          id?: string
          tratamiento_datos?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autorizaciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clases: {
        Row: {
          contenido: string | null
          created_at: string
          descripcion: string | null
          duracion_minutos: number | null
          id: string
          modulo_id: string
          orden: number | null
          recursos_url: string[] | null
          titulo: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          contenido?: string | null
          created_at?: string
          descripcion?: string | null
          duracion_minutos?: number | null
          id?: string
          modulo_id: string
          orden?: number | null
          recursos_url?: string[] | null
          titulo: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          contenido?: string | null
          created_at?: string
          descripcion?: string | null
          duracion_minutos?: number | null
          id?: string
          modulo_id?: string
          orden?: number | null
          recursos_url?: string[] | null
          titulo?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clases_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          contenido: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      emprendimientos: {
        Row: {
          actividades_id: boolean | null
          alcance_mercado: Database["public"]["Enums"]["alcance_mercado"] | null
          categoria:
            | Database["public"]["Enums"]["categoria_emprendimiento"]
            | null
          created_at: string
          cultura_conocimiento_ancestral: string | null
          cultura_dialogo: string | null
          cultura_estrategia: string | null
          cultura_valor_diferencial: string | null
          descripcion: string | null
          detalle_participaciones: string | null
          estado_unidad_productiva:
            | Database["public"]["Enums"]["estado_unidad_productiva"]
            | null
          etapa: Database["public"]["Enums"]["etapa_emprendimiento"] | null
          formalizacion: boolean | null
          id: string
          impacto_oferta: Database["public"]["Enums"]["impacto_oferta"] | null
          industria_vertical: string | null
          integracion_tecnologia:
            | Database["public"]["Enums"]["integracion_tecnologia"]
            | null
          nivel_innovacion:
            | Database["public"]["Enums"]["nivel_innovacion"]
            | null
          nombre: string
          pais_registro: string | null
          participaciones_previas: boolean | null
          plan_negocios: Database["public"]["Enums"]["plan_negocios"] | null
          practicas_agua:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_aire:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_ambientales_general:
            | Database["public"]["Enums"]["practicas_ambientales"]
            | null
          practicas_energia:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_residuos:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_suelo:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          registro: string | null
          tipo_cliente: Database["public"]["Enums"]["tipo_cliente"] | null
          ubicacion_principal:
            | Database["public"]["Enums"]["ubicacion_principal"]
            | null
          updated_at: string
          user_id: string
          ventas_ultimo_ano:
            | Database["public"]["Enums"]["ventas_ultimo_ano"]
            | null
        }
        Insert: {
          actividades_id?: boolean | null
          alcance_mercado?:
            | Database["public"]["Enums"]["alcance_mercado"]
            | null
          categoria?:
            | Database["public"]["Enums"]["categoria_emprendimiento"]
            | null
          created_at?: string
          cultura_conocimiento_ancestral?: string | null
          cultura_dialogo?: string | null
          cultura_estrategia?: string | null
          cultura_valor_diferencial?: string | null
          descripcion?: string | null
          detalle_participaciones?: string | null
          estado_unidad_productiva?:
            | Database["public"]["Enums"]["estado_unidad_productiva"]
            | null
          etapa?: Database["public"]["Enums"]["etapa_emprendimiento"] | null
          formalizacion?: boolean | null
          id?: string
          impacto_oferta?: Database["public"]["Enums"]["impacto_oferta"] | null
          industria_vertical?: string | null
          integracion_tecnologia?:
            | Database["public"]["Enums"]["integracion_tecnologia"]
            | null
          nivel_innovacion?:
            | Database["public"]["Enums"]["nivel_innovacion"]
            | null
          nombre: string
          pais_registro?: string | null
          participaciones_previas?: boolean | null
          plan_negocios?: Database["public"]["Enums"]["plan_negocios"] | null
          practicas_agua?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_aire?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_ambientales_general?:
            | Database["public"]["Enums"]["practicas_ambientales"]
            | null
          practicas_energia?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_residuos?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_suelo?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          registro?: string | null
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente"] | null
          ubicacion_principal?:
            | Database["public"]["Enums"]["ubicacion_principal"]
            | null
          updated_at?: string
          user_id: string
          ventas_ultimo_ano?:
            | Database["public"]["Enums"]["ventas_ultimo_ano"]
            | null
        }
        Update: {
          actividades_id?: boolean | null
          alcance_mercado?:
            | Database["public"]["Enums"]["alcance_mercado"]
            | null
          categoria?:
            | Database["public"]["Enums"]["categoria_emprendimiento"]
            | null
          created_at?: string
          cultura_conocimiento_ancestral?: string | null
          cultura_dialogo?: string | null
          cultura_estrategia?: string | null
          cultura_valor_diferencial?: string | null
          descripcion?: string | null
          detalle_participaciones?: string | null
          estado_unidad_productiva?:
            | Database["public"]["Enums"]["estado_unidad_productiva"]
            | null
          etapa?: Database["public"]["Enums"]["etapa_emprendimiento"] | null
          formalizacion?: boolean | null
          id?: string
          impacto_oferta?: Database["public"]["Enums"]["impacto_oferta"] | null
          industria_vertical?: string | null
          integracion_tecnologia?:
            | Database["public"]["Enums"]["integracion_tecnologia"]
            | null
          nivel_innovacion?:
            | Database["public"]["Enums"]["nivel_innovacion"]
            | null
          nombre?: string
          pais_registro?: string | null
          participaciones_previas?: boolean | null
          plan_negocios?: Database["public"]["Enums"]["plan_negocios"] | null
          practicas_agua?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_aire?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_ambientales_general?:
            | Database["public"]["Enums"]["practicas_ambientales"]
            | null
          practicas_energia?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_residuos?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          practicas_suelo?:
            | Database["public"]["Enums"]["nivel_practica_ambiental"]
            | null
          registro?: string | null
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente"] | null
          ubicacion_principal?:
            | Database["public"]["Enums"]["ubicacion_principal"]
            | null
          updated_at?: string
          user_id?: string
          ventas_ultimo_ano?:
            | Database["public"]["Enums"]["ventas_ultimo_ano"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "emprendimientos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      equipos: {
        Row: {
          colaboradoras: number | null
          colaboradores_jovenes: number | null
          created_at: string
          emprendimiento_id: string
          equipo_tecnico: boolean | null
          equipo_total: number | null
          fundadoras: number | null
          id: string
          organigrama: Database["public"]["Enums"]["estado_simple"] | null
          personas_full_time: number | null
          tipo_decisiones: Database["public"]["Enums"]["tipo_decision"] | null
          updated_at: string
        }
        Insert: {
          colaboradoras?: number | null
          colaboradores_jovenes?: number | null
          created_at?: string
          emprendimiento_id: string
          equipo_tecnico?: boolean | null
          equipo_total?: number | null
          fundadoras?: number | null
          id?: string
          organigrama?: Database["public"]["Enums"]["estado_simple"] | null
          personas_full_time?: number | null
          tipo_decisiones?: Database["public"]["Enums"]["tipo_decision"] | null
          updated_at?: string
        }
        Update: {
          colaboradoras?: number | null
          colaboradores_jovenes?: number | null
          created_at?: string
          emprendimiento_id?: string
          equipo_tecnico?: boolean | null
          equipo_total?: number | null
          fundadoras?: number | null
          id?: string
          organigrama?: Database["public"]["Enums"]["estado_simple"] | null
          personas_full_time?: number | null
          tipo_decisiones?: Database["public"]["Enums"]["tipo_decision"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipos_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: true
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones: {
        Row: {
          created_at: string
          dedicacion: Database["public"]["Enums"]["estado_evaluacion"] | null
          diagnostico_completo: string | null
          emprendimiento_id: string
          equipo: Database["public"]["Enums"]["estado_evaluacion"] | null
          equipo_texto: string | null
          id: string
          impacto_texto: string | null
          innovacion_tecnologia_texto: string | null
          interes: Database["public"]["Enums"]["estado_evaluacion"] | null
          puntaje: number | null
          referido_regional: string | null
          ubicacion: Database["public"]["Enums"]["estado_evaluacion"] | null
          updated_at: string
          ventas_texto: string | null
          visible_para_usuario: boolean
        }
        Insert: {
          created_at?: string
          dedicacion?: Database["public"]["Enums"]["estado_evaluacion"] | null
          diagnostico_completo?: string | null
          emprendimiento_id: string
          equipo?: Database["public"]["Enums"]["estado_evaluacion"] | null
          equipo_texto?: string | null
          id?: string
          impacto_texto?: string | null
          innovacion_tecnologia_texto?: string | null
          interes?: Database["public"]["Enums"]["estado_evaluacion"] | null
          puntaje?: number | null
          referido_regional?: string | null
          ubicacion?: Database["public"]["Enums"]["estado_evaluacion"] | null
          updated_at?: string
          ventas_texto?: string | null
          visible_para_usuario?: boolean
        }
        Update: {
          created_at?: string
          dedicacion?: Database["public"]["Enums"]["estado_evaluacion"] | null
          diagnostico_completo?: string | null
          emprendimiento_id?: string
          equipo?: Database["public"]["Enums"]["estado_evaluacion"] | null
          equipo_texto?: string | null
          id?: string
          impacto_texto?: string | null
          innovacion_tecnologia_texto?: string | null
          interes?: Database["public"]["Enums"]["estado_evaluacion"] | null
          puntaje?: number | null
          referido_regional?: string | null
          ubicacion?: Database["public"]["Enums"]["estado_evaluacion"] | null
          updated_at?: string
          ventas_texto?: string | null
          visible_para_usuario?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: true
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      financiamientos: {
        Row: {
          busca_financiamiento:
            | Database["public"]["Enums"]["busca_financiamiento"]
            | null
          created_at: string
          emprendimiento_id: string
          etapa: string | null
          financiamiento_previo: boolean
          id: string
          monto_buscado: string | null
          monto_recibido: number | null
          tipo_actor: string | null
          tipo_inversion: string | null
        }
        Insert: {
          busca_financiamiento?:
            | Database["public"]["Enums"]["busca_financiamiento"]
            | null
          created_at?: string
          emprendimiento_id: string
          etapa?: string | null
          financiamiento_previo?: boolean
          id?: string
          monto_buscado?: string | null
          monto_recibido?: number | null
          tipo_actor?: string | null
          tipo_inversion?: string | null
        }
        Update: {
          busca_financiamiento?:
            | Database["public"]["Enums"]["busca_financiamiento"]
            | null
          created_at?: string
          emprendimiento_id?: string
          etapa?: string | null
          financiamiento_previo?: boolean
          id?: string
          monto_buscado?: string | null
          monto_recibido?: number | null
          tipo_actor?: string | null
          tipo_inversion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financiamientos_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: false
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes: {
        Row: {
          contenido: string
          created_at: string
          id: string
          leido: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: string
          leido?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
          leido?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_emprendimiento_assignments: {
        Row: {
          activo: boolean
          created_at: string
          emprendimiento_id: string
          fecha_asignacion: string
          id: string
          mentor_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          emprendimiento_id: string
          fecha_asignacion?: string
          id?: string
          mentor_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          emprendimiento_id?: string
          fecha_asignacion?: string
          id?: string
          mentor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_emprendimiento_assignments_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: false
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_emprendimiento_assignments_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          duracion: string | null
          id: string
          imagen_url: string | null
          orden: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          duracion?: string | null
          id?: string
          imagen_url?: string | null
          orden?: number | null
          titulo: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          duracion?: string | null
          id?: string
          imagen_url?: string | null
          orden?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      noticias: {
        Row: {
          autor_id: string
          categoria: string | null
          contenido: string | null
          created_at: string
          descripcion: string | null
          id: string
          imagen_url: string | null
          publicado: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_id: string
          categoria?: string | null
          contenido?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          publicado?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_id?: string
          categoria?: string | null
          contenido?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          publicado?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "noticias_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          contenido: string
          created_at: string
          id: string
          imagen_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: string
          imagen_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
          imagen_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      progreso_usuario: {
        Row: {
          clase_id: string
          completado: boolean
          id: string
          progreso_porcentaje: number
          ultima_actualizacion: string
          user_id: string
        }
        Insert: {
          clase_id: string
          completado?: boolean
          id?: string
          progreso_porcentaje?: number
          ultima_actualizacion?: string
          user_id: string
        }
        Update: {
          clase_id?: string
          completado?: boolean
          id?: string
          progreso_porcentaje?: number
          ultima_actualizacion?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progreso_usuario_clase_id_fkey"
            columns: ["clase_id"]
            isOneToOne: false
            referencedRelation: "clases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progreso_usuario_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecciones: {
        Row: {
          acciones_crecimiento: string | null
          created_at: string
          decisiones_acciones_crecimiento: boolean | null
          desafios: string | null
          emprendimiento_id: string
          id: string
          impacto: Database["public"]["Enums"]["impacto_proyeccion"] | null
          intencion_internacionalizacion: boolean | null
          principales_objetivos: string | null
          updated_at: string
        }
        Insert: {
          acciones_crecimiento?: string | null
          created_at?: string
          decisiones_acciones_crecimiento?: boolean | null
          desafios?: string | null
          emprendimiento_id: string
          id?: string
          impacto?: Database["public"]["Enums"]["impacto_proyeccion"] | null
          intencion_internacionalizacion?: boolean | null
          principales_objetivos?: string | null
          updated_at?: string
        }
        Update: {
          acciones_crecimiento?: string | null
          created_at?: string
          decisiones_acciones_crecimiento?: boolean | null
          desafios?: string | null
          emprendimiento_id?: string
          id?: string
          impacto?: Database["public"]["Enums"]["impacto_proyeccion"] | null
          intencion_internacionalizacion?: boolean | null
          principales_objetivos?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyecciones_emprendimiento_id_fkey"
            columns: ["emprendimiento_id"]
            isOneToOne: true
            referencedRelation: "emprendimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      reacciones: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tipo_reaccion: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tipo_reaccion?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tipo_reaccion?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reacciones_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reacciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ano_nacimiento: string | null
          apellidos: string | null
          avatar_url: string | null
          biografia: string | null
          celular: string | null
          created_at: string
          departamento: string | null
          direccion: string | null
          email: string | null
          genero: string | null
          id: string
          identificacion_etnica: string | null
          menor_de_edad: boolean
          municipio: string | null
          nivel_conocimiento: string | null
          nombres: string | null
          numero_identificacion: string | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at: string
        }
        Insert: {
          ano_nacimiento?: string | null
          apellidos?: string | null
          avatar_url?: string | null
          biografia?: string | null
          celular?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          email?: string | null
          genero?: string | null
          id: string
          identificacion_etnica?: string | null
          menor_de_edad?: boolean
          municipio?: string | null
          nivel_conocimiento?: string | null
          nombres?: string | null
          numero_identificacion?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
        }
        Update: {
          ano_nacimiento?: string | null
          apellidos?: string | null
          avatar_url?: string | null
          biografia?: string | null
          celular?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          email?: string | null
          genero?: string | null
          id?: string
          identificacion_etnica?: string | null
          menor_de_edad?: boolean
          municipio?: string | null
          nivel_conocimiento?: string | null
          nombres?: string | null
          numero_identificacion?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_modulo: {
        Args: { _modulo_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_beneficiario: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_mentor: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      alcance_mercado: "Local" | "Regional" | "Nacional" | "Internacional"
      app_role: "admin" | "mentor" | "beneficiario"
      busca_financiamiento: "Sí" | "No" | "Aún no lo sé"
      categoria_emprendimiento:
        | "Base científica"
        | "Base tecnológica"
        | "Bioeconomía"
      estado_evaluacion: "Cumple" | "No Cumple"
      estado_simple: "Sí" | "No" | "En proceso"
      estado_unidad_productiva:
        | "Idea de negocio"
        | "Idea en validación"
        | "Negocio en incubación"
      etapa_emprendimiento:
        | "Idea"
        | "MVP"
        | "Primeras Ventas"
        | "Clientes frecuentes"
      impacto_oferta:
        | "Poblaciones afro"
        | "Mujeres"
        | "Colectivos LGTBI"
        | "Sostenibilidad"
        | "Población víctima del conflicto armado"
        | "Ninguno de los anteriores"
      impacto_proyeccion:
        | "Local"
        | "Regional"
        | "Nacional"
        | "Internacional"
        | "Ninguna"
      integracion_tecnologia:
        | "Hace uso en su oferta"
        | "Solución tecnológica"
        | "Tecnología 4ta Generación"
      nivel_innovacion:
        | "Tradicional"
        | "Mejoras incrementales"
        | "Disruptiva"
        | "Innovadora"
      nivel_practica_ambiental:
        | "No está en planes"
        | "En planes"
        | "Ya lo implementa"
      plan_negocios: "No" | "En proceso" | "Básico" | "Completo"
      practicas_ambientales: "Sí" | "No" | "En proceso de incorporarlas"
      tipo_cliente: "B2B" | "B2C" | "B2G" | "Mixto"
      tipo_decision:
        | "De manera individual por el fundador principal"
        | "En consenso entre socios o cofundadores"
        | "A través de un comité o equipo directivo"
        | "Según orientación de asesores o mentores externos"
      tipo_documento:
        | "Cédula de ciudadanía"
        | "Tarjeta de identidad"
        | "Cédula de extranjería"
        | "Pasaporte"
        | "Permiso de Protección Temporal (PPT)"
      ubicacion_principal: "Zona urbana" | "Zona rural" | "Zona rural dispersa"
      ventas_ultimo_ano:
        | "Sin ventas"
        | "Menores a $50 Millones"
        | "Entre $50M a $80M"
        | "Mayores a $80 Millones"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alcance_mercado: ["Local", "Regional", "Nacional", "Internacional"],
      app_role: ["admin", "mentor", "beneficiario"],
      busca_financiamiento: ["Sí", "No", "Aún no lo sé"],
      categoria_emprendimiento: [
        "Base científica",
        "Base tecnológica",
        "Bioeconomía",
      ],
      estado_evaluacion: ["Cumple", "No Cumple"],
      estado_simple: ["Sí", "No", "En proceso"],
      estado_unidad_productiva: [
        "Idea de negocio",
        "Idea en validación",
        "Negocio en incubación",
      ],
      etapa_emprendimiento: [
        "Idea",
        "MVP",
        "Primeras Ventas",
        "Clientes frecuentes",
      ],
      impacto_oferta: [
        "Poblaciones afro",
        "Mujeres",
        "Colectivos LGTBI",
        "Sostenibilidad",
        "Población víctima del conflicto armado",
        "Ninguno de los anteriores",
      ],
      impacto_proyeccion: [
        "Local",
        "Regional",
        "Nacional",
        "Internacional",
        "Ninguna",
      ],
      integracion_tecnologia: [
        "Hace uso en su oferta",
        "Solución tecnológica",
        "Tecnología 4ta Generación",
      ],
      nivel_innovacion: [
        "Tradicional",
        "Mejoras incrementales",
        "Disruptiva",
        "Innovadora",
      ],
      nivel_practica_ambiental: [
        "No está en planes",
        "En planes",
        "Ya lo implementa",
      ],
      plan_negocios: ["No", "En proceso", "Básico", "Completo"],
      practicas_ambientales: ["Sí", "No", "En proceso de incorporarlas"],
      tipo_cliente: ["B2B", "B2C", "B2G", "Mixto"],
      tipo_decision: [
        "De manera individual por el fundador principal",
        "En consenso entre socios o cofundadores",
        "A través de un comité o equipo directivo",
        "Según orientación de asesores o mentores externos",
      ],
      tipo_documento: [
        "Cédula de ciudadanía",
        "Tarjeta de identidad",
        "Cédula de extranjería",
        "Pasaporte",
        "Permiso de Protección Temporal (PPT)",
      ],
      ubicacion_principal: ["Zona urbana", "Zona rural", "Zona rural dispersa"],
      ventas_ultimo_ano: [
        "Sin ventas",
        "Menores a $50 Millones",
        "Entre $50M a $80M",
        "Mayores a $80 Millones",
      ],
    },
  },
} as const
