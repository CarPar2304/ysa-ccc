-- Add nota column to entregas table (0-5 scale)
ALTER TABLE public.entregas 
ADD COLUMN IF NOT EXISTS nota numeric CHECK (nota >= 0 AND nota <= 5);
