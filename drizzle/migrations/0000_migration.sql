-- ============ Types ============
create type public.app_role as enum ('admin','accountant','sales_agent','supervisor');
create type public.customer_type as enum ('individual','company');
create type public.uae_emirate as enum ('dubai','abu_dhabi','sharjah','ajman','umm_al_quwain','ras_al_khaimah','fujairah');
create type public.vehicle_file_kind as enum ('photo','document');

-- ============ Generic helpers ============
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

create or replace function public.set_created_by()
returns trigger language plpgsql set search_path = public as $$
begin new.created_by := auth.uid(); return new; end $$;

-- UAE phone normalisation: 05XXXXXXXX / 9715XXXXXXXX / 00971... -> +9715XXXXXXXX
create or replace function public.normalize_phone(_p text)
returns text language plpgsql immutable set search_path = public as $$
declare d text;
begin
  if _p is null or btrim(_p) = '' then return null; end if;
  d := regexp_replace(_p, '[^0-9]', '', 'g');
  if d like '00%' then d := substr(d, 3); end if;
  if d ~ '^0[0-9]{8,9}$' then d := '971' || substr(d, 2); end if;
  if length(d) < 7 then raise exception 'Invalid phone number: %', _p; end if;
  return '+' || d;
end $$;

-- ============ Profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ============ Roles ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- ============ Branches ============
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{2,6}$'),
  name text not null check (length(btrim(name)) > 0),
  emirate public.uae_emirate,
  address text,
  phone text,
  email text,
  vat_trn text check (vat_trn is null or vat_trn ~ '^[0-9]{15}$'),
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.branches to authenticated;
grant all on public.branches to service_role;
alter table public.branches enable row level security;

-- ============ Branch assignments ============
create table public.user_branches (
  user_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);
grant select on public.user_branches to authenticated;
grant all on public.user_branches to service_role;
alter table public.user_branches enable row level security;

-- ============ Security helper functions ============
create or replace function public.is_active_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and is_active)
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = _user_id and ur.role = _role and p.is_active
  )
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = _user_id and ur.role = any(_roles) and p.is_active
  )
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
$$;

create or replace function public.has_branch_access(_user_id uuid, _branch_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin(_user_id) or exists (
    select 1 from public.user_branches ub
    join public.profiles p on p.id = ub.user_id
    where ub.user_id = _user_id and ub.branch_id = _branch_id and p.is_active
  )
$$;

create or replace function public.shares_branch(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_branches x
    join public.user_branches y on x.branch_id = y.branch_id
    where x.user_id = _a and y.user_id = _b
  )
$$;

create or replace function public.app_is_initialized()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;

revoke execute on function public.is_active_user(uuid) from public, anon;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.has_any_role(uuid, public.app_role[]) from public, anon;
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.has_branch_access(uuid, uuid) from public, anon;
revoke execute on function public.shares_branch(uuid, uuid) from public, anon;
grant execute on function public.is_active_user(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_any_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.has_branch_access(uuid, uuid) to authenticated;
grant execute on function public.shares_branch(uuid, uuid) to authenticated;
grant execute on function public.app_is_initialized() to anon, authenticated;

-- ============ Policies: profiles / roles / branches / assignments ============
create policy "Profiles: view own, admin, or same-branch colleagues"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin(auth.uid())
    or (public.is_active_user(auth.uid()) and public.shares_branch(auth.uid(), id))
  );
create policy "Profiles: update own contact details or admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));

create policy "Roles: view own or admin"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Assignments: view own or admin"
  on public.user_branches for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Branches: view assigned"
  on public.branches for select to authenticated
  using (public.has_branch_access(auth.uid(), id));
create policy "Branches: admin create"
  on public.branches for insert to authenticated
  with check (public.is_admin(auth.uid()));
create policy "Branches: admin update"
  on public.branches for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create trigger branches_updated_at before update on public.branches
  for each row execute function public.set_updated_at();
create trigger branches_created_by before insert on public.branches
  for each row execute function public.set_created_by();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============ New account handling ============
-- First account ever becomes the active Admin. After that, only accounts created
-- by an Admin (flagged in app metadata, which end users cannot set) may be created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  first_admin boolean;
  by_admin boolean := coalesce((new.raw_app_meta_data ->> 'created_by_admin')::boolean, false);
begin
  perform pg_advisory_xact_lock(hashtext('auto_phoenix_first_admin'));
  first_admin := not public.app_is_initialized();

  if not first_admin and not by_admin then
    raise exception 'AP_SIGNUP_CLOSED: Sign-up is closed. Ask your Auto Phoenix admin to create your account.';
  end if;

  insert into public.profiles (id, full_name, email, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    first_admin
  );

  if first_admin then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Admin: set a staff member's access atomically ============
create or replace function public.admin_set_user_access(
  _user_id uuid,
  _role public.app_role,
  _branch_ids uuid[],
  _is_active boolean,
  _full_name text default null,
  _phone text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only an admin can change staff access';
  end if;
  if not exists (select 1 from public.profiles where id = _user_id) then
    raise exception 'Staff member not found';
  end if;
  if _user_id = auth.uid() and (_role <> 'admin' or not _is_active) then
    raise exception 'You cannot remove your own admin access or deactivate yourself';
  end if;

  update public.profiles
     set is_active = _is_active,
         full_name = coalesce(nullif(btrim(_full_name), ''), full_name),
         phone = case when _phone is null then phone else nullif(btrim(_phone), '') end
   where id = _user_id;

  delete from public.user_roles where user_id = _user_id and role <> _role;
  insert into public.user_roles (user_id, role) values (_user_id, _role)
    on conflict (user_id, role) do nothing;

  delete from public.user_branches
   where user_id = _user_id and not (branch_id = any(coalesce(_branch_ids, '{}')));
  insert into public.user_branches (user_id, branch_id)
    select _user_id, b from unnest(coalesce(_branch_ids, '{}')) as b
    on conflict do nothing;
end $$;
revoke execute on function public.admin_set_user_access(uuid, public.app_role, uuid[], boolean, text, text) from public, anon;
grant execute on function public.admin_set_user_access(uuid, public.app_role, uuid[], boolean, text, text) to authenticated;

-- ============ Customers ============
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  customer_type public.customer_type not null default 'individual',
  name text not null check (length(btrim(name)) > 0),
  contact_person text,
  phone text not null,
  alt_phone text,
  email text,
  emirate public.uae_emirate,
  address text,
  trn text check (trn is null or trn ~ '^[0-9]{15}$'),
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_phone_unique on public.customers (phone);
create index customers_branch_idx on public.customers (branch_id);
create index customers_name_idx on public.customers (lower(name));
grant select, insert, update on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;

create or replace function public.customers_normalize()
returns trigger language plpgsql set search_path = public as $$
begin
  new.phone := public.normalize_phone(new.phone);
  new.alt_phone := public.normalize_phone(new.alt_phone);
  new.email := nullif(lower(btrim(new.email)), '');
  new.trn := nullif(regexp_replace(coalesce(new.trn, ''), '[^0-9]', '', 'g'), '');
  return new;
end $$;
create trigger customers_normalize before insert or update on public.customers
  for each row execute function public.customers_normalize();
create trigger customers_created_by before insert on public.customers
  for each row execute function public.set_created_by();
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create policy "Customers: branch staff view"
  on public.customers for select to authenticated
  using (public.has_branch_access(auth.uid(), branch_id));
create policy "Customers: admin and sales create"
  on public.customers for insert to authenticated
  with check (
    public.has_branch_access(auth.uid(), branch_id)
    and public.has_any_role(auth.uid(), array['admin','sales_agent']::public.app_role[])
  );
create policy "Customers: admin and sales update"
  on public.customers for update to authenticated
  using (
    public.has_branch_access(auth.uid(), branch_id)
    and public.has_any_role(auth.uid(), array['admin','sales_agent']::public.app_role[])
  )
  with check (
    public.has_branch_access(auth.uid(), branch_id)
    and public.has_any_role(auth.uid(), array['admin','sales_agent']::public.app_role[])
  );

-- ============ Vehicles ============
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  customer_id uuid not null references public.customers(id),
  make text not null check (length(btrim(make)) > 0),
  model text not null check (length(btrim(model)) > 0),
  year int check (year is null or year between 1950 and 2100),
  plate_emirate public.uae_emirate,
  plate_code text,
  plate_number text,
  vin text,
  color text,
  odometer_km int check (odometer_km is null or odometer_km >= 0),
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index vehicles_plate_unique on public.vehicles (plate_emirate, coalesce(plate_code, ''), plate_number)
  where plate_number is not null;
create unique index vehicles_vin_unique on public.vehicles (vin) where vin is not null;
create index vehicles_customer_idx on public.vehicles (customer_id);
create index vehicles_branch_idx on public.vehicles (branch_id);
grant select, insert, update on public.vehicles to authenticated;
grant all on public.vehicles to service_role;
alter table public.vehicles enable row level security;

-- Vehicle always lives in its owner's branch.
create or replace function public.vehicles_prepare()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select branch_id into new.branch_id from public.customers where id = new.customer_id;
  if new.branch_id is null then raise exception 'Customer not found'; end if;
  new.plate_code := nullif(upper(btrim(coalesce(new.plate_code, ''))), '');
  new.plate_number := nullif(upper(regexp_replace(coalesce(new.plate_number, ''), '\s', '', 'g')), '');
  new.vin := nullif(upper(regexp_replace(coalesce(new.vin, ''), '\s', '', 'g')), '');
  return new;
end $$;
create trigger vehicles_prepare before insert or update on public.vehicles
  for each row execute function public.vehicles_prepare();
create trigger vehicles_created_by before insert on public.vehicles
  for each row execute function public.set_created_by();
create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

-- When a customer moves branch, their vehicles move with them.
create or replace function public.customers_cascade_branch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.branch_id is distinct from old.branch_id then
    update public.vehicles set branch_id = new.branch_id where customer_id = new.id;
  end if;
  return new;
end $$;
create trigger customers_cascade_branch after update of branch_id on public.customers
  for each row execute function public.customers_cascade_branch();

create policy "Vehicles: branch staff view"
  on public.vehicles for select to authenticated
  using (public.has_branch_access(auth.uid(), branch_id));
create policy "Vehicles: admin and sales create"
  on public.vehicles for insert to authenticated
  with check (
    public.has_branch_access(auth.uid(), branch_id)
    and public.has_any_role(auth.uid(), array['admin','sales_agent']::public.app_role[])
  );
create policy "Vehicles: admin and sales update"
  on public.vehicles for update to authenticated
  using (
    public.has_branch_access(auth.uid(), branch_id)
    and public.has_any_role(auth.uid(), array['admin','sales_agent']::public.app_role[])
  )
  with check (
    public.has_branch_access(auth.uid(), branch_id)
    and public.has_any_role(auth.uid(), array['admin','sales_agent']::public.app_role[])
  );

-- ============ Vehicle files ============
create table public.vehicle_files (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  branch_id uuid not null references public.branches(id),
  kind public.vehicle_file_kind not null default 'photo',
  storage_path text not null unique,
  file_name text,
  mime_type text,
  size_bytes bigint,
  caption text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index vehicle_files_vehicle_idx on public.vehicle_files (vehicle_id);
grant select, insert on public.vehicle_files to authenticated;
grant all on public.vehicle_files to service_role;
alter table public.vehicle_files enable row level security;

create or replace function public.vehicle_files_prepare()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select branch_id into new.branch_id from public.vehicles where id = new.vehicle_id;
  if new.branch_id is null then raise exception 'Vehicle not found'; end if;
  if split_part(new.storage_path, '/', 1) <> new.branch_id::text then
    raise exception 'File path does not match the vehicle branch';
  end if;
  return new;
end $$;
create trigger vehicle_files_prepare before insert on public.vehicle_files
  for each row execute function public.vehicle_files_prepare();
create trigger vehicle_files_created_by before insert on public.vehicle_files
  for each row execute function public.set_created_by();

create policy "Vehicle files: branch staff view"
  on public.vehicle_files for select to authenticated
  using (public.has_branch_access(auth.uid(), branch_id));
create policy "Vehicle files: workshop and sales upload"
  on public.vehicle_files for insert to authenticated
  with check (
    public.has_branch_access(auth.uid(), branch_id)
    and public.has_any_role(auth.uid(), array['admin','sales_agent','supervisor']::public.app_role[])
  );

-- Storage: private bucket "vehicle-files", path = <branch_id>/<vehicle_id>/<file>
create policy "Vehicle storage: branch staff read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vehicle-files'
    and public.has_branch_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
create policy "Vehicle storage: workshop and sales upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vehicle-files'
    and public.has_branch_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
    and public.has_any_role(auth.uid(), array['admin','sales_agent','supervisor']::public.app_role[])
  );

-- ============ Audit log ============
create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  table_name text not null,
  record_id text,
  action text not null,
  branch_id uuid,
  old_data jsonb,
  new_data jsonb
);
create index audit_logs_occurred_idx on public.audit_logs (occurred_at desc);
create index audit_logs_table_idx on public.audit_logs (table_name, record_id);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "Audit: admin read"
  on public.audit_logs for select to authenticated
  using (public.is_admin(auth.uid()));

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  o jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  r jsonb := coalesce(n, o);
  b uuid;
begin
  b := case when tg_table_name = 'branches' then (r ->> 'id')::uuid
            else nullif(r ->> 'branch_id', '')::uuid end;
  insert into public.audit_logs (actor_id, table_name, record_id, action, branch_id, old_data, new_data)
  values (auth.uid(), tg_table_name, coalesce(r ->> 'id', r ->> 'user_id'), tg_op, b, o, n);
  return coalesce(new, old);
end $$;

create trigger audit_branches after insert or update or delete on public.branches
  for each row execute function public.audit_trigger();
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger();
create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function public.audit_trigger();
create trigger audit_user_branches after insert or update or delete on public.user_branches
  for each row execute function public.audit_trigger();
create trigger audit_customers after insert or update or delete on public.customers
  for each row execute function public.audit_trigger();
create trigger audit_vehicles after insert or update or delete on public.vehicles
  for each row execute function public.audit_trigger();
create trigger audit_vehicle_files after insert or update or delete on public.vehicle_files
  for each row execute function public.audit_trigger();

-- ============ Dashboard summary (runs with caller's permissions) ============
create or replace function public.branch_summary()
returns table (branch_id uuid, code text, name text, is_active boolean, customers bigint, vehicles bigint, staff bigint)
language sql stable security invoker set search_path = public as $$
  select b.id, b.code, b.name, b.is_active,
    (select count(*) from public.customers c where c.branch_id = b.id and c.is_active),
    (select count(*) from public.vehicles v where v.branch_id = b.id and v.is_active),
    (select count(*) from public.user_branches ub where ub.branch_id = b.id)
  from public.branches b
  order by b.name
$$;
revoke execute on function public.branch_summary() from public, anon;
grant execute on function public.branch_summary() to authenticated;