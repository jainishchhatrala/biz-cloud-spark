CREATE TABLE public.process_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  part_name text NOT NULL,
  raw_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  spare_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  total_nos numeric NOT NULL DEFAULT 0,
  drawing_data text,
  drawing_name text,
  notes text,
  status text NOT NULL DEFAULT 'Open',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.process_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.process_batches(id) ON DELETE CASCADE,
  parent_step_id uuid REFERENCES public.process_steps(id) ON DELETE SET NULL,
  step text NOT NULL,
  machine_type text,
  vendor text,
  qty_sent numeric NOT NULL DEFAULT 0,
  qty_ready numeric NOT NULL DEFAULT 0,
  qty_forwarded numeric NOT NULL DEFAULT 0,
  size_mm numeric,
  sheet_mm numeric,
  sheet_nos numeric,
  status text NOT NULL DEFAULT 'Open',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  notes text,
  by_user uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_batches TO authenticated;
GRANT ALL ON public.process_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_steps TO authenticated;
GRANT ALL ON public.process_steps TO service_role;
ALTER TABLE public.process_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pb read" ON public.process_batches FOR SELECT TO authenticated USING (public.has_perm('jobwork','view') OR public.has_perm('jobwork','edit') OR public.has_perm('inventory','view'));
CREATE POLICY "pb insert" ON public.process_batches FOR INSERT TO authenticated WITH CHECK (public.has_perm('jobwork','create'));
CREATE POLICY "pb update" ON public.process_batches FOR UPDATE TO authenticated USING (public.has_perm('jobwork','edit') OR public.has_perm('jobwork','create')) WITH CHECK (public.has_perm('jobwork','edit') OR public.has_perm('jobwork','create'));
CREATE POLICY "pb delete" ON public.process_batches FOR DELETE TO authenticated USING (public.has_perm('jobwork','delete'));
CREATE POLICY "ps read" ON public.process_steps FOR SELECT TO authenticated USING (public.has_perm('jobwork','view') OR public.has_perm('jobwork','edit') OR public.has_perm('inventory','view'));
CREATE POLICY "ps insert" ON public.process_steps FOR INSERT TO authenticated WITH CHECK (public.has_perm('jobwork','create') OR public.has_perm('jobwork','edit'));
CREATE POLICY "ps update" ON public.process_steps FOR UPDATE TO authenticated USING (public.has_perm('jobwork','edit') OR public.has_perm('jobwork','create')) WITH CHECK (public.has_perm('jobwork','edit') OR public.has_perm('jobwork','create'));
CREATE POLICY "ps delete" ON public.process_steps FOR DELETE TO authenticated USING (public.has_perm('jobwork','delete'));
CREATE TRIGGER trg_touch_process_batches BEFORE UPDATE ON public.process_batches FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_touch_process_steps BEFORE UPDATE ON public.process_steps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX process_steps_batch_idx ON public.process_steps(batch_id);