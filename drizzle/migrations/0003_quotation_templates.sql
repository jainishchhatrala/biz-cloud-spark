CREATE TABLE public.quotation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  discount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_templates TO authenticated;
GRANT ALL ON public.quotation_templates TO service_role;
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qtpl read" ON public.quotation_templates FOR SELECT TO authenticated USING (public.my_role() IS NOT NULL);
CREATE POLICY "qtpl insert" ON public.quotation_templates FOR INSERT TO authenticated WITH CHECK (public.my_role() IN ('Admin','Sales'));
CREATE POLICY "qtpl update" ON public.quotation_templates FOR UPDATE TO authenticated USING (public.my_role() IN ('Admin','Sales')) WITH CHECK (public.my_role() IN ('Admin','Sales'));
CREATE POLICY "qtpl delete" ON public.quotation_templates FOR DELETE TO authenticated USING (public.my_role() IN ('Admin','Sales'));
CREATE TRIGGER trg_touch_quotation_templates BEFORE UPDATE ON public.quotation_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.quotations ADD COLUMN template_id uuid REFERENCES public.quotation_templates(id) ON DELETE SET NULL;
ALTER TABLE public.quotations ADD COLUMN template_name text;
ALTER TABLE public.quotations ADD COLUMN discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN change_notes text;
ALTER TABLE public.quotations ADD COLUMN shared_at text;

INSERT INTO public.quotation_templates (name, description, discount, notes, items) VALUES
('Full Plant Project (Maruti Agro format)', 'RCN storage, elevators, conveyor, cooling bin, tray loading', 250000,
 'Prices Ex-Works. GST @ 18% extra. 50% advance with PO, balance against Proforma/Trials. Delivery 8-10 weeks.',
 '[
 {"name":"RCN Storage Bin (A/B/C Grade) 4.5 MT","description":"2mm perforated sheet · Capacity 4.5 MT approx · 3.1 x 12.0 x 13.3 ft","quantity":3,"unit_price":125000,"gst_percent":18},
 {"name":"RCN Storage Bin (A/B/C Grade) 2.3 MT","description":"2mm perforated sheet · Capacity 2.3 MT approx · 3.1 x 6.0 x 13.3 ft","quantity":3,"unit_price":80000,"gst_percent":18},
 {"name":"Double Bucket Elevator for Destoner 1st","description":"Plastic bucket, MS structure · 1.5 HP · 21.0 x 2.0 x 4 ft","quantity":1,"unit_price":160000,"gst_percent":18},
 {"name":"1 Ton Load Cell Hopper","description":"","quantity":1,"unit_price":55000,"gst_percent":18},
 {"name":"Z Bucket Elevator for Destoner","description":"Plastic bucket, MS structure · 1.0 HP","quantity":1,"unit_price":115000,"gst_percent":18},
 {"name":"Modular Conveyor Belt and Platform","description":"Boiled RCN from bucket elevator to cooling bin · 1.5 HP · 51.0 x 2.0 x 2.5 ft","quantity":1,"unit_price":420000,"gst_percent":18},
 {"name":"Cooling Bin 2 Partition","description":"2mm perforated sheet · 4 MT per partition · 7.5 x 7.5 x 15.0 ft","quantity":3,"unit_price":200000,"gst_percent":18},
 {"name":"Modular Belt for Shell Inspection","description":"13 ft · with VFD control panel","quantity":1,"unit_price":115000,"gst_percent":18},
 {"name":"Tray Loading System","description":"Bucket conveyor, SS hopper, vibratory outlet, PVC green conveyor belt","quantity":1,"unit_price":260000,"gst_percent":18},
 {"name":"Bucket Elevator for Shell Sorter","description":"","quantity":1,"unit_price":110000,"gst_percent":18}
 ]'::jsonb);