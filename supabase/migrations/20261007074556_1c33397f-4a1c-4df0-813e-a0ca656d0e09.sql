create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  vendor_type text not null default 'Job Work',
  contact_person text, phone text, whatsapp text, email text, city text, address text,
  services text, notes text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vendors to authenticated;
grant all on public.vendors to service_role;
alter table public.vendors enable row level security;
create policy "vendors read" on public.vendors for select to authenticated using (public.my_role() is not null and not public.is_dealer());
create policy "vendors insert" on public.vendors for insert to authenticated with check (public.has_perm('jobwork','create'));
create policy "vendors update" on public.vendors for update to authenticated using (public.has_perm('jobwork','edit'));
create policy "vendors delete" on public.vendors for delete to authenticated using (public.has_perm('jobwork','delete'));
create trigger trg_touch_vendors before update on public.vendors for each row execute function public.touch_updated_at();

create table public.vendor_logs (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  job_work_id uuid references public.job_work(id) on delete set null,
  log_type text not null default 'Call',
  note text not null,
  delay_reason text,
  next_followup_at text,
  by_user uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vendor_logs to authenticated;
grant all on public.vendor_logs to service_role;
alter table public.vendor_logs enable row level security;
create policy "vlogs read" on public.vendor_logs for select to authenticated using (public.my_role() is not null and not public.is_dealer());
create policy "vlogs insert" on public.vendor_logs for insert to authenticated with check (public.has_perm('jobwork','create') or public.has_perm('jobwork','edit'));
create policy "vlogs delete" on public.vendor_logs for delete to authenticated using (public.has_perm('jobwork','delete'));
create trigger trg_touch_vendor_logs before update on public.vendor_logs for each row execute function public.touch_updated_at();
create index on public.vendor_logs(vendor_id);