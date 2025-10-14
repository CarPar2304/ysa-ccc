-- Crear enum para niveles
CREATE TYPE public.nivel_emprendimiento AS ENUM ('Starter', 'Growth', 'Scale');

-- Agregar campo referido a la tabla usuarios
ALTER TABLE public.usuarios 
ADD COLUMN referido TEXT;

-- Agregar campo nivel a la tabla evaluaciones
ALTER TABLE public.evaluaciones 
ADD COLUMN nivel nivel_emprendimiento;

-- Agregar campo nivel a la tabla modulos
ALTER TABLE public.modulos 
ADD COLUMN nivel nivel_emprendimiento;