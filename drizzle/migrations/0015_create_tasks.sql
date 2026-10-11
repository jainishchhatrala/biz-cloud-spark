CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'Normal',
  assigned_to uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid,
  due_at text,
  status text NOT NULL DEFAULT 'Assigned',
  accepted_at timestamptz,
  finished_at timestamptz,
  updates jsonb NOT NULL DEFAULT '[]'::jsonb,
  rating integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks read" ON public.tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'Admin') OR assigned_to = auth.uid() OR assigned_by = auth.uid());
CREATE POLICY "tasks create" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid());
CREATE POLICY "tasks update" ON public.tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'Admin') OR assigned_to = auth.uid() OR assigned_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'Admin') OR assigned_to = auth.uid() OR assigned_by = auth.uid());
CREATE POLICY "tasks delete" ON public.tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'Admin') OR assigned_by = auth.uid());
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();