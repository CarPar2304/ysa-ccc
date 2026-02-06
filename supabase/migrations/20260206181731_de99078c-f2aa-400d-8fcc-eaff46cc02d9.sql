-- Permitir que stakeholders vean todos los diagnósticos (solo lectura)
CREATE POLICY "Diagnosticos: stakeholders pueden ver"
ON public.diagnosticos
FOR SELECT
TO authenticated
USING (is_stakeholder(auth.uid()));