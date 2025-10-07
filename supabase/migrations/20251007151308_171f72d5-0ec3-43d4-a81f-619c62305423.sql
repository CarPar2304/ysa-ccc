-- Función para verificar si un mentor tiene asignado un emprendimiento
CREATE OR REPLACE FUNCTION public.mentor_has_emprendimiento(_user_id uuid, _emprendimiento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentor_emprendimiento_assignments mea
    WHERE mea.mentor_id = _user_id 
      AND mea.emprendimiento_id = _emprendimiento_id
      AND mea.activo = true
  );
$$;

-- Política para que mentores puedan ver emprendimientos asignados
CREATE POLICY "Emprendimientos: mentores pueden ver asignados"
ON public.emprendimientos
FOR SELECT
USING (
  public.mentor_has_emprendimiento(auth.uid(), id)
);