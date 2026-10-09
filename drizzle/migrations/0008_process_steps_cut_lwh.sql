ALTER TABLE public.process_steps
  ADD COLUMN IF NOT EXISTS cut_l_mm numeric,
  ADD COLUMN IF NOT EXISTS cut_w_mm numeric,
  ADD COLUMN IF NOT EXISTS cut_h_mm numeric;

COMMENT ON COLUMN public.process_steps.cut_l_mm IS 'Cutting: piece length in MM (drives stock-out)';
COMMENT ON COLUMN public.process_steps.cut_w_mm IS 'Cutting: piece width in MM';
COMMENT ON COLUMN public.process_steps.cut_h_mm IS 'Cutting: piece height in MM';