
create type public.app_role as enum ('Admin','Sales','Production','QC','Accountant','Dealer');

create table public.profiles (
  id uuid primary key,
  name text not null,
  email text not null default '',
  login_id text not null unique,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null unique,
  modules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.role_permissions to authenticated;
grant all on public.role_permissions to service_role;
alter table public.role_permissions enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select r.role::text from public.user_roles r join public.profiles p on p.id = r.user_id
  where r.user_id = auth.uid() and p.active limit 1
$$;

create or replace function public.has_perm(_module text, _action text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.my_role() is null then false
    when public.my_role() = 'Admin' then true
    else coalesce((select (rp.modules -> _module ->> _action)::boolean from public.role_permissions rp where rp.role = public.my_role()), false)
  end
$$;

create or replace function public.is_dealer()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'Dealer', false)
$$;

create policy "profiles read" on public.profiles for select to authenticated using (public.my_role() is not null);
create policy "profiles update self or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'Admin'))
  with check (id = auth.uid() or public.has_role(auth.uid(),'Admin'));
create policy "roles read" on public.user_roles for select to authenticated using (public.my_role() is not null);
create policy "perm read" on public.role_permissions for select to authenticated using (true);
create policy "perm admin insert" on public.role_permissions for insert to authenticated with check (public.has_role(auth.uid(),'Admin'));
create policy "perm admin update" on public.role_permissions for update to authenticated using (public.has_role(auth.uid(),'Admin'));

-- numbering
create table public.doc_counters (prefix text not null, year int not null, n int not null default 0, primary key(prefix, year));
grant all on public.doc_counters to service_role;
alter table public.doc_counters enable row level security;

create or replace function public.next_doc_number(_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare y int := extract(year from now() at time zone 'utc'); v int;
begin
  if public.my_role() is null then raise exception 'Not authorized'; end if;
  insert into public.doc_counters(prefix, year, n) values (_prefix, y, 1)
  on conflict (prefix, year) do update set n = public.doc_counters.n + 1
  returning n into v;
  return _prefix || '-' || y || '-' || lpad(v::text, 3, '0');
end $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- company settings
create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'Aalidhra Cashew Export',
  tagline text default 'Premium cashew exports since 1998.',
  address text default 'Industrial Area, Veraval, Gujarat 362265',
  phone text default '+91 98250 11200',
  email text default 'sales@aalidhra.in',
  gstin text default '24ABCDE1234F1Z5',
  website text default 'www.aalidhra.in',
  logo_data text,
  terms_html text not null default '<p><strong>Terms &amp; Conditions</strong></p><p>1. <strong>Payment:</strong> 50% advance along with order, balance before dispatch.</p><p>2. <strong>Delivery:</strong> 6-8 weeks ex-works from the date of advance receipt.</p><p>3. <strong>Warranty:</strong> 12 months against manufacturing defects, excluding wear and tear.</p><p>4. <strong>Taxes:</strong> GST as applicable, extra at actuals.</p><p>5. <strong>Jurisdiction:</strong> All disputes subject to Rajkot (Gujarat) jurisdiction only.</p>',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.company_settings to authenticated;
grant all on public.company_settings to service_role;
alter table public.company_settings enable row level security;
create policy "company read" on public.company_settings for select to authenticated using (true);
create policy "company admin update" on public.company_settings for update to authenticated using (public.has_role(auth.uid(),'Admin'));

-- clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company text not null, person text not null, phone text not null,
  email text default '', city text default '', state text default '',
  source text not null default 'Website' check (source in ('IndiaMART','Alibaba','Google','Facebook','Website','Reference','Other')),
  status text not null default 'Warm' check (status in ('Hot','Warm','Cold','Order Won','Lost')),
  rating int not null default 3, color text not null default 'blue', notes text default '',
  owner_id uuid, dealer_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  at text not null default to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  discussion text default '', outcome text default '', next_step text default '',
  next_followup_at text, by_user uuid, accent text default 'orange',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null, model_code text default '', description text default '',
  unit text not null default 'Unit', default_price numeric not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  client_id uuid not null references public.clients(id) on delete cascade,
  client_name text default '', order_date text, valid_until text,
  status text not null default 'Draft' check (status in ('Draft','Sent','Awaiting response','Approved','Rejected','Converted')),
  items jsonb not null default '[]'::jsonb, notes text default '', dealer_id uuid, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  quotation_id uuid references public.quotations(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  client_name text default '', order_date text, expected_delivery text, dispatch_date text,
  items jsonb not null default '[]'::jsonb, status text not null default 'In Production',
  notes text default '', dealer_id uuid, created_by uuid, revised_at text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.production_updates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_index int not null default 0, stage text not null, progress int not null default 0,
  notes text default '', by_user uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.dispatches (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  item_index int not null default 0, dispatch_at text,
  vehicle_number text default '', transporter text default '', driver_name text default '',
  driver_phone text default '', bilty_number text default '', notes text default '', status text not null default 'Dispatched',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  client_id uuid, at text, amount numeric not null default 0,
  mode text not null default 'Bank Transfer' check (mode in ('Bank Transfer','Cheque','Cash','UPI')),
  reference text default '', notes text default '', receipt_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null, name text not null,
  category text not null default 'Raw Material' check (category in ('Raw Material','Spare Part','Finished Machine')),
  unit text not null default 'pcs', current_stock numeric not null default 0, min_level numeric not null default 0,
  supplier text default '', location text default '', purchase_reference text default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.job_work (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  vendor text default '', item text not null, work_type text default '',
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  initial_quantity numeric default 0, quantity_sent numeric default 0, quantity_received numeric default 0,
  stages jsonb not null default '[]'::jsonb, current_stage_index int not null default 0,
  send_date text, expected_return text, actual_return text,
  status text not null default 'Pending' check (status in ('Pending','Material Sent','In Process','Partially Received','Completed','Cancelled')),
  direction text not null default 'Out' check (direction in ('Out','In')),
  process_stage text default '', process_history jsonb not null default '[]'::jsonb, images jsonb not null default '[]'::jsonb,
  next_followup_at text, followup_notes text default '', notes text default '',
  auto_stock_in_done boolean not null default false, inventory_transaction_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  txn_type text not null check (txn_type in ('IN','OUT','ADJUSTMENT')),
  quantity numeric not null default 0, at text,
  reference_number text default '', party text default '', remarks text default '',
  by_user uuid, order_id uuid references public.orders(id) on delete set null,
  job_work_id uuid references public.job_work(id) on delete set null,
  allow_negative boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['profiles','role_permissions','company_settings','clients','interactions','products','quotations','orders','production_updates','dispatches','payments','inventory_items','job_work','inventory_transactions'] loop
    execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- stock movement trigger (mirrors create_inventory_txn)
create or replace function public.apply_inventory_txn() returns trigger language plpgsql security definer set search_path = public as $$
declare cur numeric;
begin
  select current_stock into cur from public.inventory_items where id = new.item_id for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if new.txn_type = 'OUT' and cur - new.quantity < 0 and not new.allow_negative then
    raise exception 'Insufficient stock. Current %, requested %.', cur, new.quantity;
  end if;
  update public.inventory_items set current_stock = case
    when new.txn_type = 'IN' then cur + new.quantity
    when new.txn_type = 'OUT' then cur - new.quantity
    else new.quantity end
  where id = new.item_id;
  return new;
end $$;
create trigger trg_apply_inventory_txn after insert on public.inventory_transactions for each row execute function public.apply_inventory_txn();

-- grants + RLS for business tables
do $$ declare t text; begin
  foreach t in array array['clients','interactions','products','quotations','orders','production_updates','dispatches','payments','inventory_items','job_work','inventory_transactions'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- clients (dealer scoped)
create policy "clients read" on public.clients for select to authenticated using (public.my_role() is not null and (not public.is_dealer() or dealer_id = auth.uid()));
create policy "clients insert" on public.clients for insert to authenticated with check (public.has_perm('clients','create') and (not public.is_dealer() or dealer_id = auth.uid()));
create policy "clients update" on public.clients for update to authenticated using (public.has_perm('clients','edit') and (not public.is_dealer() or dealer_id = auth.uid()));
create policy "clients delete" on public.clients for delete to authenticated using (public.has_perm('clients','delete') and not public.is_dealer());

create policy "interactions read" on public.interactions for select to authenticated using (public.my_role() is not null and exists (select 1 from public.clients c where c.id = client_id));
create policy "interactions insert" on public.interactions for insert to authenticated with check ((public.has_perm('clients','create') or public.has_perm('followups','create')) and exists (select 1 from public.clients c where c.id = client_id));

create policy "products read" on public.products for select to authenticated using (public.my_role() is not null);
create policy "products insert" on public.products for insert to authenticated with check (public.has_perm('products','create'));
create policy "products update" on public.products for update to authenticated using (public.has_perm('products','edit'));
create policy "products delete" on public.products for delete to authenticated using (public.has_perm('products','delete'));

create policy "quotations read" on public.quotations for select to authenticated using (public.my_role() is not null and (not public.is_dealer() or dealer_id = auth.uid()));
create policy "quotations insert" on public.quotations for insert to authenticated with check (public.has_perm('quotations','create') and (not public.is_dealer() or dealer_id = auth.uid()));
create policy "quotations update" on public.quotations for update to authenticated using (public.has_perm('quotations','edit') and (not public.is_dealer() or dealer_id = auth.uid()));
create policy "quotations delete" on public.quotations for delete to authenticated using (public.has_perm('quotations','delete'));

create policy "orders read" on public.orders for select to authenticated using (public.my_role() is not null and (not public.is_dealer() or dealer_id = auth.uid()));
create policy "orders insert" on public.orders for insert to authenticated with check ((public.has_perm('orders','create') or public.has_perm('quotations','edit')) and (not public.is_dealer() or dealer_id = auth.uid()));
create policy "orders update" on public.orders for update to authenticated using ((public.has_perm('orders','edit') or public.has_perm('production','edit') or public.has_perm('dispatch','create') or public.has_perm('quotations','edit')) and (not public.is_dealer() or dealer_id = auth.uid()));
create policy "orders delete" on public.orders for delete to authenticated using (public.has_perm('orders','delete'));

create policy "prod updates read" on public.production_updates for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id));
create policy "prod updates insert" on public.production_updates for insert to authenticated with check (public.has_perm('production','edit') or public.has_perm('orders','edit'));

create policy "dispatches read" on public.dispatches for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id));
create policy "dispatches insert" on public.dispatches for insert to authenticated with check (public.has_perm('dispatch','create'));

create policy "payments read" on public.payments for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id));
create policy "payments insert" on public.payments for insert to authenticated with check (public.has_perm('payments','create'));
create policy "payments delete" on public.payments for delete to authenticated using (public.has_perm('payments','delete'));

create policy "inv read" on public.inventory_items for select to authenticated using (public.my_role() is not null);
create policy "inv insert" on public.inventory_items for insert to authenticated with check (public.has_perm('inventory','create') or public.has_perm('jobwork','edit'));
create policy "inv update" on public.inventory_items for update to authenticated using (public.has_perm('inventory','edit'));
create policy "inv delete" on public.inventory_items for delete to authenticated using (public.has_perm('inventory','delete'));

create policy "txn read" on public.inventory_transactions for select to authenticated using (public.my_role() is not null);
create policy "txn insert" on public.inventory_transactions for insert to authenticated with check ((public.has_perm('inventory','create') or public.has_perm('jobwork','edit')) and by_user = auth.uid());

create policy "jw read" on public.job_work for select to authenticated using (public.my_role() is not null);
create policy "jw insert" on public.job_work for insert to authenticated with check (public.has_perm('jobwork','create'));
create policy "jw update" on public.job_work for update to authenticated using (public.has_perm('jobwork','edit'));
create policy "jw delete" on public.job_work for delete to authenticated using (public.has_perm('jobwork','delete'));

-- seed
insert into public.company_settings default values;

insert into public.role_permissions(role, modules)
select 'Admin', jsonb_object_agg(m, '{"view":true,"create":true,"edit":true,"delete":true}'::jsonb)
from unnest(array['dashboard','clients','followups','quotations','orders','production','dispatch','payments','inventory','jobwork','reports','team','products','settings']) m;
insert into public.role_permissions(role, modules)
select 'Sales', jsonb_object_agg(m, '{"view":true,"create":true,"edit":true,"delete":false}'::jsonb)
from unnest(array['dashboard','clients','followups','quotations','orders']) m;
insert into public.role_permissions(role, modules)
select 'Production', jsonb_object_agg(m, '{"view":true,"create":true,"edit":true,"delete":false}'::jsonb)
from unnest(array['dashboard','orders','production','dispatch','inventory','jobwork']) m;
insert into public.role_permissions(role, modules)
select 'QC', jsonb_object_agg(m, '{"view":true,"create":false,"edit":true,"delete":false}'::jsonb)
from unnest(array['dashboard','orders','production','dispatch']) m;
insert into public.role_permissions(role, modules)
select 'Accountant', jsonb_object_agg(m, '{"view":true,"create":true,"edit":true,"delete":false}'::jsonb)
from unnest(array['dashboard','clients','quotations','orders','payments','reports']) m;
insert into public.role_permissions(role, modules)
select 'Dealer', jsonb_object_agg(m, '{"view":true,"create":true,"edit":true,"delete":false}'::jsonb)
from unnest(array['dashboard','clients','quotations','orders','production','dispatch']) m;

insert into public.products(name, model_code, description, default_price) values
 ('HydraPress 120T','HP-120T','Hydraulic power press, 120 ton capacity',1340000),
 ('CNC Mill Pro 450','CNC-450','4-axis vertical machining center',1840000),
 ('LaserCut X2','LC-X2','Fiber laser cutting machine, 2000W',1420000),
 ('Pneumatic Press 60T','PP-60T','Pneumatic power press for sheet metal work',680000);

insert into public.clients(company, person, phone, email, city, state, source, status, rating, color) values
 ('Nova Engineering Works','Arjun Mehta','+91 98250 11842','arjun@novaeng.in','Ahmedabad','Gujarat','Reference','Hot',5,'orange'),
 ('Kinetic Auto Components','Priya Shah','+91 98791 44012','priya@kineticauto.com','Rajkot','Gujarat','IndiaMART','Warm',4,'blue'),
 ('Mechline Industries','Suresh Nair','+91 98470 22180','suresh@mechline.in','Pune','Maharashtra','Google','Order Won',5,'green'),
 ('Apex Fabricators','Neha Patel','+91 98980 33890','neha@apexfab.co','Surat','Gujarat','Website','Cold',3,'purple');

insert into public.inventory_items(sku, name, category, unit, current_stock, min_level, supplier, location) values
 ('RM-STL-001','MS Plate 10mm','Raw Material','kg',1200,500,'Shree Steel','Bay A1'),
 ('SP-HYD-014','Hydraulic Seal Kit','Spare Part','pcs',8,15,'SealTech','Store 2'),
 ('SP-MTR-007','3HP Induction Motor','Spare Part','pcs',4,3,'Crompton','Store 1');
