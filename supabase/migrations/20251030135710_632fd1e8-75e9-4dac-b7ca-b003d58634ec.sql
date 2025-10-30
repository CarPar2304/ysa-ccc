-- 1. Agregar campo nivel a modulos (ya existe pero aseguramos)
-- El campo nivel ya existe en modulos según el esquema

-- 2. Crear tabla de perfiles de asesoría
CREATE TABLE public.perfiles_asesoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tematica TEXT NOT NULL,
  foto_url TEXT,
  banner_url TEXT,
  perfil_mentor TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Crear tabla de disponibilidades recurrentes
CREATE TABLE public.disponibilidades_mentor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_asesoria_id UUID NOT NULL REFERENCES public.perfiles_asesoria(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0=Domingo, 1=Lunes, etc.
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(perfil_asesoria_id, dia_semana, hora_inicio)
);

-- 4. Crear tabla de reservas de asesoría
CREATE TABLE public.reservas_asesoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_asesoria_id UUID NOT NULL REFERENCES public.perfiles_asesoria(id) ON DELETE CASCADE,
  beneficiario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_reserva TIMESTAMP WITH TIME ZONE NOT NULL,
  url_asesoria TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Habilitar RLS en todas las tablas
ALTER TABLE public.perfiles_asesoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidades_mentor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas_asesoria ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para perfiles_asesoria
CREATE POLICY "Perfiles asesoría: ver todos autenticados"
  ON public.perfiles_asesoria
  FOR SELECT
  TO authenticated
  USING (activo = true OR is_mentor(auth.uid()));

CREATE POLICY "Perfiles asesoría: mentores crean propios"
  ON public.perfiles_asesoria
  FOR INSERT
  TO authenticated
  WITH CHECK (is_mentor(auth.uid()) AND mentor_id = auth.uid());

CREATE POLICY "Perfiles asesoría: mentores actualizan propios"
  ON public.perfiles_asesoria
  FOR UPDATE
  TO authenticated
  USING (is_mentor(auth.uid()) AND mentor_id = auth.uid())
  WITH CHECK (is_mentor(auth.uid()) AND mentor_id = auth.uid());

CREATE POLICY "Perfiles asesoría: mentores borran propios"
  ON public.perfiles_asesoria
  FOR DELETE
  TO authenticated
  USING (is_mentor(auth.uid()) AND mentor_id = auth.uid());

-- 7. Políticas RLS para disponibilidades_mentor
CREATE POLICY "Disponibilidades: ver todas autenticados"
  ON public.disponibilidades_mentor
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Disponibilidades: mentores gestionan propias"
  ON public.disponibilidades_mentor
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfiles_asesoria
    WHERE id = disponibilidades_mentor.perfil_asesoria_id
    AND mentor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.perfiles_asesoria
    WHERE id = disponibilidades_mentor.perfil_asesoria_id
    AND mentor_id = auth.uid()
  ));

-- 8. Políticas RLS para reservas_asesoria
CREATE POLICY "Reservas: beneficiarios ven propias"
  ON public.reservas_asesoria
  FOR SELECT
  TO authenticated
  USING (beneficiario_id = auth.uid() OR mentor_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Reservas: beneficiarios crean propias"
  ON public.reservas_asesoria
  FOR INSERT
  TO authenticated
  WITH CHECK (is_beneficiario(auth.uid()) AND beneficiario_id = auth.uid());

CREATE POLICY "Reservas: admins actualizan todas"
  ON public.reservas_asesoria
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 9. Triggers para updated_at
CREATE TRIGGER set_updated_at_perfiles_asesoria
  BEFORE UPDATE ON public.perfiles_asesoria
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_reservas_asesoria
  BEFORE UPDATE ON public.reservas_asesoria
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 10. Índices para mejorar performance
CREATE INDEX idx_perfiles_asesoria_mentor ON public.perfiles_asesoria(mentor_id);
CREATE INDEX idx_perfiles_asesoria_tematica ON public.perfiles_asesoria(tematica);
CREATE INDEX idx_disponibilidades_perfil ON public.disponibilidades_mentor(perfil_asesoria_id);
CREATE INDEX idx_reservas_beneficiario ON public.reservas_asesoria(beneficiario_id);
CREATE INDEX idx_reservas_mentor ON public.reservas_asesoria(mentor_id);
CREATE INDEX idx_reservas_fecha ON public.reservas_asesoria(fecha_reserva);