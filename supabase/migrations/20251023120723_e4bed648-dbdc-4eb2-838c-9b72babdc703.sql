-- Policy: Mentores pueden ver evaluaciones CCC de emprendimientos asignados
CREATE POLICY "Mentores: ver CCC de asignados" 
ON public.evaluaciones
FOR SELECT 
USING (
  is_mentor(auth.uid())
  AND tipo_evaluacion = 'ccc'
  AND EXISTS (
    SELECT 1 
    FROM public.mentor_emprendimiento_assignments mea
    WHERE mea.mentor_id = auth.uid()
      AND mea.emprendimiento_id = evaluaciones.emprendimiento_id
      AND mea.activo = true
  )
);

-- Función para reforzar reglas de negocio en evaluaciones de jurado
CREATE OR REPLACE FUNCTION public.enforce_jurado_evaluation_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ccc_evaluation RECORD;
  v_total_puntaje NUMERIC;
BEGIN
  -- Solo aplicar para evaluaciones de tipo 'jurado'
  IF NEW.tipo_evaluacion = 'jurado' THEN
    -- Buscar la evaluación CCC base
    SELECT * INTO v_ccc_evaluation
    FROM public.evaluaciones
    WHERE emprendimiento_id = NEW.emprendimiento_id
      AND tipo_evaluacion = 'ccc'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Si no existe CCC, no permitir crear evaluación de jurado
    IF v_ccc_evaluation IS NULL THEN
      RAISE EXCEPTION 'No existe evaluación CCC para este emprendimiento';
    END IF;

    -- Copiar campos de la CCC (no editables por el jurado)
    NEW.cumple_ubicacion := v_ccc_evaluation.cumple_ubicacion;
    NEW.cumple_equipo_minimo := v_ccc_evaluation.cumple_equipo_minimo;
    NEW.cumple_dedicacion := v_ccc_evaluation.cumple_dedicacion;
    NEW.cumple_interes := v_ccc_evaluation.cumple_interes;
    NEW.referido_regional := v_ccc_evaluation.referido_regional;
    NEW.puntaje_referido_regional := v_ccc_evaluation.puntaje_referido_regional;

    -- Setear evaluacion_base_id si es null
    IF NEW.evaluacion_base_id IS NULL THEN
      NEW.evaluacion_base_id := v_ccc_evaluation.id;
    END IF;

    -- Recalcular puntaje total (suma de puntajes calificables + referido regional)
    v_total_puntaje := COALESCE(NEW.puntaje_impacto, 0) 
                     + COALESCE(NEW.puntaje_equipo, 0)
                     + COALESCE(NEW.puntaje_innovacion_tecnologia, 0)
                     + COALESCE(NEW.puntaje_ventas, 0)
                     + COALESCE(NEW.puntaje_proyeccion_financiacion, 0)
                     + COALESCE(NEW.puntaje_referido_regional, 0);
    
    NEW.puntaje := v_total_puntaje;

    -- Mapear nivel según puntaje total a valores del enum
    IF v_total_puntaje >= 0 AND v_total_puntaje <= 50 THEN
      NEW.nivel := 'Starter';
    ELSIF v_total_puntaje > 50 AND v_total_puntaje <= 80 THEN
      NEW.nivel := 'Growth';
    ELSIF v_total_puntaje > 80 AND v_total_puntaje <= 100 THEN
      NEW.nivel := 'Scale';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para aplicar las reglas antes de INSERT o UPDATE
CREATE TRIGGER trigger_enforce_jurado_evaluation_rules
BEFORE INSERT OR UPDATE ON public.evaluaciones
FOR EACH ROW
EXECUTE FUNCTION public.enforce_jurado_evaluation_rules();