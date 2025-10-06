-- Extensions
create extension if not exists pgcrypto with schema public;

-- =========================
-- ENUM TYPES
-- =========================
-- Roles
create type public.app_role as enum ('admin','mentor','beneficiario');

-- Documento
create type public.tipo_documento as enum (
  'Cédula de ciudadanía',
  'Tarjeta de identidad',
  'Cédula de extranjería',
  'Pasaporte',
  'Permiso de Protección Temporal (PPT)'
);

-- Emprendimiento related ENUMs
create type public.estado_unidad_productiva as enum ('Idea de negocio','Idea en validación','Negocio en incubación');
create type public.categoria_emprendimiento as enum ('Base científica','Base tecnológica','Bioeconomía');
create type public.alcance_mercado as enum ('Local','Regional','Nacional','Internacional');
create type public.tipo_cliente as enum ('B2B','B2C','B2G','Mixto');
create type public.plan_negocios as enum ('No','En proceso','Básico','Completo');
create type public.etapa_emprendimiento as enum ('Idea','MVP','Primeras Ventas','Clientes frecuentes');
create type public.nivel_innovacion as enum ('Tradicional','Mejoras incrementales','Disruptiva','Innovadora');
create type public.practicas_ambientales as enum ('Sí','No','En proceso de incorporarlas');
create type public.nivel_practica_ambiental as enum ('No está en planes','En planes','Ya lo implementa');
create type public.impacto_oferta as enum ('Poblaciones afro','Mujeres','Colectivos LGTBI','Sostenibilidad','Población victima del conflicto armado','Ninguno');
create type public.integracion_tecnologia as enum ('Hace uso en su oferta','Solución tecnológica','Tecnología 4ta Generación');
create type public.ventas_ultimo_ano as enum ('Sin ventas','Menores a $50 Millones','Entre $50M a $80M','Mayores a $80 Millones');
create type public.ubicacion_principal as enum ('Zona urbana','Zona rural','Zona rural dispersa');
create type public.tipo_decision as enum ('De manera individual por el fundador principal','En consenso entre socios o cofundadores','A través de un comité o equipo directivo','Según orientación de asesores o mentores externos');
create type public.busca_financiamiento as enum ('Sí','No','Aún no lo sé');
create type public.estado_evaluacion as enum ('Cumple','No Cumple');
create type public.impacto_proyeccion as enum ('Local','Regional','Nacional','Internacional','Ninguna');
create type public.estado_simple as enum ('Sí','No','En proceso');

-- =========================
-- CORE TABLES
-- =========================
-- Perfiles de usuario (usuarios)
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nombres text,
  apellidos text,
  genero text,
  identificacion_etnica text,
  ano_nacimiento text,
  email text unique,
  celular text,
  tipo_documento public.tipo_documento,
  numero_identificacion text,
  departamento text,
  municipio text,
  direccion text,
  menor_de_edad boolean not null default false,
  nivel_conocimiento text,
  avatar_url text,
  biografia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla de roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

-- Autorizaciones (1:1 con usuario)
create table public.autorizaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.usuarios(id) on delete cascade,
  tratamiento_datos boolean not null default false,
  datos_sensibles boolean not null default false,
  correo boolean not null default false,
  genero text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Acudientes (para menores)
create table public.acudientes (
  id uuid primary key default gen_random_uuid(),
  menor_id uuid not null references public.usuarios(id) on delete cascade,
  nombres text not null,
  apellidos text not null,
  genero text,
  identificacion_etnica text,
  ano_nacimiento text,
  email text,
  celular text,
  tipo_documento public.tipo_documento,
  numero_identificacion text,
  direccion text,
  relacion_con_menor text not null,
  created_at timestamptz not null default now()
);

-- =========================
-- EMPRENDIMIENTO
-- =========================
create table public.emprendimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  estado_unidad_productiva public.estado_unidad_productiva,
  nombre text not null,
  descripcion text,
  industria_vertical text,
  formalizacion boolean,
  registro text,
  pais_registro text,
  categoria public.categoria_emprendimiento,
  alcance_mercado public.alcance_mercado,
  tipo_cliente public.tipo_cliente,
  plan_negocios public.plan_negocios,
  etapa public.etapa_emprendimiento,
  nivel_innovacion public.nivel_innovacion,
  practicas_ambientales_general public.practicas_ambientales,
  practicas_agua public.nivel_practica_ambiental,
  practicas_aire public.nivel_practica_ambiental,
  practicas_residuos public.nivel_practica_ambiental,
  practicas_suelo public.nivel_practica_ambiental,
  practicas_energia public.nivel_practica_ambiental,
  participaciones_previas boolean,
  detalle_participaciones text,
  cultura_dialogo text,
  cultura_estrategia text,
  cultura_valor_diferencial text,
  cultura_conocimiento_ancestral text,
  impacto_oferta public.impacto_oferta,
  integracion_tecnologia public.integracion_tecnologia,
  actividades_id boolean,
  ventas_ultimo_ano public.ventas_ultimo_ano,
  ubicacion_principal public.ubicacion_principal,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  emprendimiento_id uuid not null unique references public.emprendimientos(id) on delete cascade,
  equipo_total integer,
  personas_full_time integer,
  colaboradoras integer,
  fundadoras integer,
  colaboradores_jovenes integer,
  equipo_tecnico boolean,
  organigrama public.estado_simple,
  tipo_decisiones public.tipo_decision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.proyecciones (
  id uuid primary key default gen_random_uuid(),
  emprendimiento_id uuid not null unique references public.emprendimientos(id) on delete cascade,
  intencion_internacionalizacion boolean,
  impacto public.impacto_proyeccion,
  principales_objetivos text,
  decisiones_acciones_crecimiento boolean,
  acciones_crecimiento text,
  desafios text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financiamientos (
  id uuid primary key default gen_random_uuid(),
  emprendimiento_id uuid not null references public.emprendimientos(id) on delete cascade,
  financiamiento_previo boolean not null default false,
  tipo_actor text,
  etapa text,
  monto_recibido text,
  busca_financiamiento public.busca_financiamiento,
  monto_buscado text,
  tipo_inversion text,
  created_at timestamptz not null default now()
);

create table public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  emprendimiento_id uuid not null unique references public.emprendimientos(id) on delete cascade,
  puntaje numeric,
  ubicacion public.estado_evaluacion,
  equipo public.estado_evaluacion,
  dedicacion public.estado_evaluacion,
  interes public.estado_evaluacion,
  impacto_texto text,
  equipo_texto text,
  innovacion_tecnologia_texto text,
  ventas_texto text,
  referido_regional text,
  diagnostico_completo text,
  visible_para_usuario boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- SOCIAL (Conecta)
-- =========================
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  contenido text not null,
  imagen_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  contenido text not null,
  created_at timestamptz not null default now()
);

create table public.reacciones (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  tipo_reaccion text not null default 'like',
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table public.mensajes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.usuarios(id) on delete cascade,
  receiver_id uuid not null references public.usuarios(id) on delete cascade,
  contenido text not null,
  leido boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================
-- EDUCATIVO (Lab)
-- =========================
create table public.modulos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  duracion text,
  orden integer,
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clases (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  titulo text not null,
  descripcion text,
  contenido text,
  video_url text,
  recursos_url text[],
  orden integer,
  duracion_minutos integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asignaciones_mentor (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.usuarios(id) on delete cascade,
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  puede_editar boolean not null default true,
  created_at timestamptz not null default now(),
  unique (mentor_id, modulo_id)
);

create table public.progreso_usuario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  clase_id uuid not null references public.clases(id) on delete cascade,
  completado boolean not null default false,
  progreso_porcentaje integer not null default 0,
  ultima_actualizacion timestamptz not null default now(),
  unique (user_id, clase_id)
);

-- =========================
-- NOTICIAS (Now)
-- =========================
create table public.noticias (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.usuarios(id) on delete cascade,
  titulo text not null,
  descripcion text,
  contenido text,
  categoria text,
  imagen_url text,
  publicado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- FUNCTIONS (SECURITY / UTIL)
-- =========================
-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle new auth user -> usuarios
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nombres, apellidos)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombres', NULL), coalesce(new.raw_user_meta_data->>'apellidos', NULL));
  return new;
end;
$$;

-- role helpers
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = _user_id and ur.role = _role
  );
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.has_role(_user_id, 'admin'); $$;

create or replace function public.is_mentor(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.has_role(_user_id, 'mentor'); $$;

create or replace function public.is_beneficiario(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.has_role(_user_id, 'beneficiario'); $$;

create or replace function public.can_edit_modulo(_user_id uuid, _modulo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin(_user_id)
     or exists (
       select 1 from public.asignaciones_mentor am
       where am.mentor_id = _user_id and am.modulo_id = _modulo_id and am.puede_editar = true
     );
$$;

-- =========================
-- TRIGGERS
-- =========================
-- updated_at triggers
create trigger set_usuarios_updated_at before update on public.usuarios for each row execute function public.set_updated_at();
create trigger set_autorizaciones_updated_at before update on public.autorizaciones for each row execute function public.set_updated_at();
create trigger set_emprendimientos_updated_at before update on public.emprendimientos for each row execute function public.set_updated_at();
create trigger set_equipos_updated_at before update on public.equipos for each row execute function public.set_updated_at();
create trigger set_proyecciones_updated_at before update on public.proyecciones for each row execute function public.set_updated_at();
create trigger set_evaluaciones_updated_at before update on public.evaluaciones for each row execute function public.set_updated_at();
create trigger set_modulos_updated_at before update on public.modulos for each row execute function public.set_updated_at();
create trigger set_clases_updated_at before update on public.clases for each row execute function public.set_updated_at();
create trigger set_noticias_updated_at before update on public.noticias for each row execute function public.set_updated_at();
create trigger set_posts_updated_at before update on public.posts for each row execute function public.set_updated_at();

-- insert usuarios on auth.users creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================
-- RLS ENABLE + POLICIES
-- =========================
-- Enable RLS on all tables
alter table public.usuarios enable row level security;
alter table public.user_roles enable row level security;
alter table public.autorizaciones enable row level security;
alter table public.acudientes enable row level security;
alter table public.emprendimientos enable row level security;
alter table public.equipos enable row level security;
alter table public.proyecciones enable row level security;
alter table public.financiamientos enable row level security;
alter table public.evaluaciones enable row level security;
alter table public.posts enable row level security;
alter table public.comentarios enable row level security;
alter table public.reacciones enable row level security;
alter table public.mensajes enable row level security;
alter table public.modulos enable row level security;
alter table public.clases enable row level security;
alter table public.asignaciones_mentor enable row level security;
alter table public.progreso_usuario enable row level security;
alter table public.noticias enable row level security;

-- usuarios policies
create policy "Usuarios visibles para autenticados" on public.usuarios
for select to authenticated using (true);
create policy "Usuario puede actualizar su perfil" on public.usuarios
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Usuario puede crear su perfil" on public.usuarios
for insert to authenticated with check (auth.uid() = id);

-- user_roles policies
create policy "Leer roles (todos autenticados)" on public.user_roles
for select to authenticated using (true);
create policy "Solo admins pueden insertar roles" on public.user_roles
for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "Solo admins pueden actualizar roles" on public.user_roles
for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Solo admins pueden borrar roles" on public.user_roles
for delete to authenticated using (public.is_admin(auth.uid()));

-- autorizaciones
create policy "Autorizaciones: ver propias o admin" on public.autorizaciones
for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Autorizaciones: insertar propias o admin" on public.autorizaciones
for insert to authenticated with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Autorizaciones: actualizar propias o admin" on public.autorizaciones
for update to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid())) with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Autorizaciones: borrar propias o admin" on public.autorizaciones
for delete to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- acudientes
create policy "Acudientes: ver propias (menor) o admin" on public.acudientes
for select to authenticated using (menor_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Acudientes: insertar propias (menor) o admin" on public.acudientes
for insert to authenticated with check (menor_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Acudientes: actualizar propias (menor) o admin" on public.acudientes
for update to authenticated using (menor_id = auth.uid() or public.is_admin(auth.uid())) with check (menor_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Acudientes: borrar" on public.acudientes
for delete to authenticated using (menor_id = auth.uid() or public.is_admin(auth.uid()));

-- emprendimientos
create policy "Emprendimientos: ver propios o admin" on public.emprendimientos
for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Emprendimientos: insertar propios o admin" on public.emprendimientos
for insert to authenticated with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Emprendimientos: actualizar propios o admin" on public.emprendimientos
for update to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid())) with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Emprendimientos: borrar propios o admin" on public.emprendimientos
for delete to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- equipos
create policy "Equipos: ver si dueño o admin" on public.equipos
for select to authenticated using (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "Equipos: upsert si dueño o admin" on public.equipos
for insert to authenticated with check (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "Equipos: update si dueño o admin" on public.equipos
for update to authenticated using (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
) with check (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "Equipos: delete si dueño o admin" on public.equipos
for delete to authenticated using (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);

-- proyecciones
create policy "Proyecciones: ver si dueño o admin" on public.proyecciones
for select to authenticated using (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "Proyecciones: insert si dueño o admin" on public.proyecciones
for insert to authenticated with check (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "Proyecciones: update si dueño o admin" on public.proyecciones
for update to authenticated using (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
) with check (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "Proyecciones: delete si dueño o admin" on public.proyecciones
for delete to authenticated using (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);

-- financiamientos
create policy "Financiamientos: ver si dueño o admin" on public.financiamientos
for select to authenticated using (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "Financiamientos: insert si dueño o admin" on public.financiamientos
for insert to authenticated with check (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "Financiamientos: update si dueño o admin" on public.financiamientos
for update to authenticated using (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
) with check (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "Financiamientos: delete si dueño o admin" on public.financiamientos
for delete to authenticated using (
  exists (select 1 from public.emprendimientos e where e.id = emprendimiento_id and (e.user_id = auth.uid() or public.is_admin(auth.uid())))
);

-- evaluaciones
create policy "Evaluaciones: ver si visible para usuario dueño o admin" on public.evaluaciones
for select to authenticated using (
  public.is_admin(auth.uid()) OR (
    visible_para_usuario = true AND exists (
      select 1 from public.emprendimientos e
      where e.id = emprendimiento_id and e.user_id = auth.uid()
    )
  )
);
create policy "Evaluaciones: insertar solo admin" on public.evaluaciones
for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "Evaluaciones: update solo admin" on public.evaluaciones
for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Evaluaciones: delete solo admin" on public.evaluaciones
for delete to authenticated using (public.is_admin(auth.uid()));

-- posts
create policy "Posts: ver todos autenticados" on public.posts
for select to authenticated using (true);
create policy "Posts: crear solo beneficiario" on public.posts
for insert to authenticated with check (public.is_beneficiario(auth.uid()) and user_id = auth.uid());
create policy "Posts: actualizar autor o admin" on public.posts
for update to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid())) with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Posts: borrar autor o admin" on public.posts
for delete to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- comentarios
create policy "Comentarios: ver todos autenticados" on public.comentarios
for select to authenticated using (true);
create policy "Comentarios: crear solo beneficiario" on public.comentarios
for insert to authenticated with check (public.is_beneficiario(auth.uid()) and user_id = auth.uid());
create policy "Comentarios: borrar autor o admin" on public.comentarios
for delete to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- reacciones
create policy "Reacciones: ver todos autenticados" on public.reacciones
for select to authenticated using (true);
create policy "Reacciones: crear solo beneficiario" on public.reacciones
for insert to authenticated with check (public.is_beneficiario(auth.uid()) and user_id = auth.uid());
create policy "Reacciones: borrar autor o admin" on public.reacciones
for delete to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- mensajes
create policy "Mensajes: ver solo participantes" on public.mensajes
for select to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "Mensajes: crear solo beneficiario" on public.mensajes
for insert to authenticated with check (public.is_beneficiario(auth.uid()) and sender_id = auth.uid());
create policy "Mensajes: actualizar solo receptor (marcar leído)" on public.mensajes
for update to authenticated using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());
create policy "Mensajes: borrar solo participantes" on public.mensajes
for delete to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());

-- modulos
create policy "Módulos: ver todos autenticados" on public.modulos
for select to authenticated using (true);
create policy "Módulos: CRUD solo admin" on public.modulos
for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- clases
create policy "Clases: ver todos autenticados" on public.clases
for select to authenticated using (true);
create policy "Clases: insertar admin o mentor asignado" on public.clases
for insert to authenticated with check (public.can_edit_modulo(auth.uid(), modulo_id));
create policy "Clases: actualizar admin o mentor asignado" on public.clases
for update to authenticated using (public.can_edit_modulo(auth.uid(), modulo_id)) with check (public.can_edit_modulo(auth.uid(), modulo_id));
create policy "Clases: borrar admin o mentor asignado" on public.clases
for delete to authenticated using (public.can_edit_modulo(auth.uid(), modulo_id));

-- asignaciones_mentor
create policy "Asignaciones mentor: ver autenticados" on public.asignaciones_mentor
for select to authenticated using (true);
create policy "Asignaciones mentor: CRUD solo admin" on public.asignaciones_mentor
for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- progreso_usuario
create policy "Progreso: ver propio o admin" on public.progreso_usuario
for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Progreso: upsert propio o admin" on public.progreso_usuario
for insert to authenticated with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Progreso: update propio o admin" on public.progreso_usuario
for update to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid())) with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "Progreso: delete propio o admin" on public.progreso_usuario
for delete to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- noticias
create policy "Noticias: ver publicado o admin" on public.noticias
for select to authenticated using (public.is_admin(auth.uid()) or publicado = true);
create policy "Noticias: CRUD solo admin" on public.noticias
for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_autorizaciones_user on public.autorizaciones(user_id);
create index if not exists idx_acudientes_menor on public.acudientes(menor_id);
create index if not exists idx_emprendimientos_user on public.emprendimientos(user_id);
create index if not exists idx_equipos_emprendimiento on public.equipos(emprendimiento_id);
create index if not exists idx_proyecciones_emprendimiento on public.proyecciones(emprendimiento_id);
create index if not exists idx_financiamientos_emprendimiento on public.financiamientos(emprendimiento_id);
create index if not exists idx_evaluaciones_emprendimiento on public.evaluaciones(emprendimiento_id);
create index if not exists idx_posts_user on public.posts(user_id);
create index if not exists idx_comentarios_post on public.comentarios(post_id);
create index if not exists idx_comentarios_user on public.comentarios(user_id);
create index if not exists idx_reacciones_post on public.reacciones(post_id);
create index if not exists idx_reacciones_user on public.reacciones(user_id);
create index if not exists idx_mensajes_sender on public.mensajes(sender_id);
create index if not exists idx_mensajes_receiver on public.mensajes(receiver_id);
create index if not exists idx_clases_modulo on public.clases(modulo_id);
create index if not exists idx_asignaciones_mentor_mentor on public.asignaciones_mentor(mentor_id);
create index if not exists idx_asignaciones_mentor_modulo on public.asignaciones_mentor(modulo_id);
create index if not exists idx_progreso_usuario_user on public.progreso_usuario(user_id);
create index if not exists idx_progreso_usuario_clase on public.progreso_usuario(clase_id);
create index if not exists idx_noticias_autor on public.noticias(autor_id);
