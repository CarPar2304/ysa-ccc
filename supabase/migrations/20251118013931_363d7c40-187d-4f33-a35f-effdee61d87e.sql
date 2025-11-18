-- Modificar recursos_url para almacenar objetos con título y URL
ALTER TABLE public.clases 
ALTER COLUMN recursos_url TYPE jsonb USING 
  CASE 
    WHEN recursos_url IS NULL THEN NULL
    ELSE to_jsonb(recursos_url)
  END;

COMMENT ON COLUMN public.clases.recursos_url IS 'Array de objetos JSON con formato: [{titulo: string, url: string}]';