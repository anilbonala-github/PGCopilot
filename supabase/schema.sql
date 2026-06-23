create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone_number text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hostels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  address text not null,
  contact_number text,
  gst_number text,
  upi_id text,
  bank_details text,
  created_at timestamptz not null default now()
);

alter table public.hostels add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.hostels add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.hostel_members (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('Owner', 'Staff')),
  status text not null default 'Active' check (status in ('Active', 'Disabled')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (hostel_id, user_id)
);

alter table public.hostel_members add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  phone_number text not null,
  role text not null default 'Staff' check (role in ('Staff')),
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.staff_invites add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  room_number text not null,
  floor text not null,
  room_type text not null check (room_type in ('Single', 'Double', 'Triple', 'Dormitory')),
  created_at timestamptz not null default now(),
  unique (hostel_id, room_number)
);

alter table public.rooms add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.rooms add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  bed_number text not null,
  status text not null check (status in ('Occupied', 'Vacant', 'Reserved', 'Maintenance')),
  created_at timestamptz not null default now(),
  unique (hostel_id, bed_number)
);

alter table public.beds add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.beds add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  bed_id uuid references public.beds(id) on delete set null,
  full_name text not null,
  mobile_number text,
  emergency_contact text,
  aadhaar_number text,
  company_college text,
  joining_date date not null default current_date,
  monthly_rent numeric not null default 0,
  deposit_amount numeric not null default 0,
  food_included boolean not null default true,
  rent_due_day integer not null default 5 check (rent_due_day between 1 and 31),
  status text not null default 'Active' check (status in ('Active', 'Vacated')),
  notice_period_days integer not null default 30,
  rent_status text not null default 'Pending' check (rent_status in ('Paid', 'Partial', 'Pending')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tenants add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.tenants add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.tenants add column if not exists emergency_contact text;
alter table public.tenants add column if not exists aadhaar_number text;
alter table public.tenants add column if not exists company_college text;
alter table public.tenants add column if not exists food_included boolean not null default true;
alter table public.tenants add column if not exists rent_due_day integer not null default 5;
alter table public.tenants add column if not exists status text not null default 'Active';

do $$
begin
  alter table public.tenants add constraint tenants_rent_due_day_check check (rent_due_day between 1 and 31);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.tenants add constraint tenants_status_check check (status in ('Active', 'Vacated'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  label text not null,
  category text not null default 'Other',
  amount numeric not null default 0,
  expense_month date not null default date_trunc('month', current_date)::date,
  created_at timestamptz not null default now()
);

alter table public.expenses add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.expenses add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rent_month date not null,
  amount numeric not null,
  paid_amount numeric not null default 0,
  due_date date not null,
  status text not null default 'Pending' check (status in ('Paid', 'Partial', 'Pending')),
  payment_mode text check (payment_mode in ('UPI', 'Cash', 'Bank Transfer')),
  created_at timestamptz not null default now()
);

alter table public.rent_payments add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.rent_payments add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.tenant_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  bucket_id text not null default 'tenant-documents',
  storage_path text not null,
  document_type text not null default 'Other' check (document_type in ('Aadhaar Front', 'Aadhaar Back', 'Photo', 'Employee ID', 'Student ID', 'Agreement', 'Other')),
  file_name text,
  mime_type text,
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

alter table public.tenant_documents add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.tenant_documents add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists hostels_owner_id_idx on public.hostels(owner_id);
create index if not exists hostel_members_user_id_idx on public.hostel_members(user_id);
create index if not exists hostel_members_hostel_id_idx on public.hostel_members(hostel_id);
create index if not exists staff_invites_phone_idx on public.staff_invites(phone_number);
create index if not exists rooms_hostel_id_idx on public.rooms(hostel_id);
create index if not exists beds_hostel_id_idx on public.beds(hostel_id);
create index if not exists tenants_hostel_id_idx on public.tenants(hostel_id);
create index if not exists expenses_hostel_id_idx on public.expenses(hostel_id);
create index if not exists rent_payments_hostel_id_idx on public.rent_payments(hostel_id);
create index if not exists tenant_documents_hostel_id_idx on public.tenant_documents(hostel_id);
create index if not exists tenant_documents_tenant_id_idx on public.tenant_documents(tenant_id);

create or replace function public.normalized_phone(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null then ''
    when length(regexp_replace(value, '\D', '', 'g')) = 10 then '91' || regexp_replace(value, '\D', '', 'g')
    when left(regexp_replace(value, '\D', '', 'g'), 1) = '0' and length(regexp_replace(value, '\D', '', 'g')) = 11 then '91' || right(regexp_replace(value, '\D', '', 'g'), 10)
    else regexp_replace(value, '\D', '', 'g')
  end;
$$;

create or replace function public.current_user_phone()
returns text
language sql
stable
as $$
  select public.normalized_phone(coalesce(auth.jwt() ->> 'phone', ''));
$$;

create or replace function public.is_hostel_member(target_hostel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hostel_members hm
    where hm.hostel_id = target_hostel_id
      and hm.user_id = auth.uid()
      and hm.status = 'Active'
  );
$$;

create or replace function public.is_hostel_owner(target_hostel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hostels h
    where h.id = target_hostel_id
      and h.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.hostel_members hm
    where hm.hostel_id = target_hostel_id
      and hm.user_id = auth.uid()
      and hm.role = 'Owner'
      and hm.status = 'Active'
  );
$$;

create or replace function public.can_write_hostel_data(target_hostel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hostel_members hm
    where hm.hostel_id = target_hostel_id
      and hm.user_id = auth.uid()
      and hm.role in ('Owner', 'Staff')
      and hm.status = 'Active'
  );
$$;

create or replace function public.storage_path_hostel_id(object_name text)
returns uuid
language plpgsql
stable
as $$
declare
  first_folder text;
begin
  first_folder := split_part(object_name, '/', 1);
  if first_folder = '' then
    return null;
  end if;
  return first_folder::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.storage_path_tenant_id(object_name text)
returns uuid
language plpgsql
stable
as $$
declare
  second_folder text;
begin
  second_folder := split_part(object_name, '/', 2);
  if second_folder = '' then
    return null;
  end if;
  return second_folder::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.apply_hostel_creator_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.owner_id := coalesce(new.owner_id, auth.uid());
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

drop trigger if exists before_hostel_insert_creator_fields on public.hostels;
create trigger before_hostel_insert_creator_fields
before insert on public.hostels
for each row execute function public.apply_hostel_creator_fields();

create or replace function public.apply_hostel_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hostel_owner uuid;
begin
  select owner_id into hostel_owner
  from public.hostels
  where id = new.hostel_id;

  if hostel_owner is null then
    raise exception 'Hostel owner could not be resolved for %', new.hostel_id;
  end if;

  new.owner_id := coalesce(new.owner_id, hostel_owner);
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

drop trigger if exists before_hostel_members_insert_audit_fields on public.hostel_members;
create trigger before_hostel_members_insert_audit_fields
before insert on public.hostel_members
for each row execute function public.apply_hostel_audit_fields();

drop trigger if exists before_staff_invites_insert_audit_fields on public.staff_invites;
create trigger before_staff_invites_insert_audit_fields
before insert on public.staff_invites
for each row execute function public.apply_hostel_audit_fields();

drop trigger if exists before_rooms_insert_audit_fields on public.rooms;
create trigger before_rooms_insert_audit_fields
before insert on public.rooms
for each row execute function public.apply_hostel_audit_fields();

drop trigger if exists before_beds_insert_audit_fields on public.beds;
create trigger before_beds_insert_audit_fields
before insert on public.beds
for each row execute function public.apply_hostel_audit_fields();

drop trigger if exists before_tenants_insert_audit_fields on public.tenants;
create trigger before_tenants_insert_audit_fields
before insert on public.tenants
for each row execute function public.apply_hostel_audit_fields();

drop trigger if exists before_expenses_insert_audit_fields on public.expenses;
create trigger before_expenses_insert_audit_fields
before insert on public.expenses
for each row execute function public.apply_hostel_audit_fields();

drop trigger if exists before_rent_payments_insert_audit_fields on public.rent_payments;
create trigger before_rent_payments_insert_audit_fields
before insert on public.rent_payments
for each row execute function public.apply_hostel_audit_fields();

drop trigger if exists before_tenant_documents_insert_audit_fields on public.tenant_documents;
create trigger before_tenant_documents_insert_audit_fields
before insert on public.tenant_documents
for each row execute function public.apply_hostel_audit_fields();

update public.hostels
set owner_id = coalesce(owner_id, created_by),
    created_by = coalesce(created_by, owner_id)
where owner_id is null or created_by is null;

update public.hostel_members hm
set owner_id = coalesce(hm.owner_id, h.owner_id),
    created_by = coalesce(hm.created_by, hm.invited_by, h.owner_id)
from public.hostels h
where hm.hostel_id = h.id
  and (hm.owner_id is null or hm.created_by is null);

update public.staff_invites si
set owner_id = coalesce(si.owner_id, h.owner_id),
    created_by = coalesce(si.created_by, si.invited_by, h.owner_id)
from public.hostels h
where si.hostel_id = h.id
  and (si.owner_id is null or si.created_by is null);

update public.rooms r
set owner_id = coalesce(r.owner_id, h.owner_id),
    created_by = coalesce(r.created_by, h.owner_id)
from public.hostels h
where r.hostel_id = h.id
  and (r.owner_id is null or r.created_by is null);

update public.beds b
set owner_id = coalesce(b.owner_id, h.owner_id),
    created_by = coalesce(b.created_by, h.owner_id)
from public.hostels h
where b.hostel_id = h.id
  and (b.owner_id is null or b.created_by is null);

update public.tenants t
set owner_id = coalesce(t.owner_id, h.owner_id),
    created_by = coalesce(t.created_by, h.owner_id)
from public.hostels h
where t.hostel_id = h.id
  and (t.owner_id is null or t.created_by is null);

update public.expenses e
set owner_id = coalesce(e.owner_id, h.owner_id),
    created_by = coalesce(e.created_by, h.owner_id)
from public.hostels h
where e.hostel_id = h.id
  and (e.owner_id is null or e.created_by is null);

update public.rent_payments rp
set owner_id = coalesce(rp.owner_id, h.owner_id),
    created_by = coalesce(rp.created_by, h.owner_id)
from public.hostels h
where rp.hostel_id = h.id
  and (rp.owner_id is null or rp.created_by is null);

update public.tenant_documents td
set owner_id = coalesce(td.owner_id, h.owner_id),
    created_by = coalesce(td.created_by, h.owner_id)
from public.hostels h
where td.hostel_id = h.id
  and (td.owner_id is null or td.created_by is null);

create or replace function public.sync_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone_number)
  values (new.id, public.normalized_phone(coalesce(new.phone, '')))
  on conflict (id) do update
    set phone_number = excluded.phone_number,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert or update of phone on auth.users
for each row execute function public.sync_new_auth_user();

create or replace function public.create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.hostel_members (hostel_id, owner_id, user_id, role, status, invited_by, created_by)
    values (new.id, new.owner_id, new.owner_id, 'Owner', 'Active', new.created_by, new.created_by)
    on conflict (hostel_id, user_id) do update
      set role = 'Owner',
          status = 'Active',
          owner_id = excluded.owner_id,
          created_by = coalesce(public.hostel_members.created_by, excluded.created_by);
  end if;
  return new;
end;
$$;

drop trigger if exists on_hostel_created_owner_membership on public.hostels;
create trigger on_hostel_created_owner_membership
after insert on public.hostels
for each row execute function public.create_owner_membership();

create or replace function public.accept_staff_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invite record;
  user_phone text := public.current_user_phone();
begin
  if auth.uid() is null or user_phone = '' then
    return;
  end if;

  insert into public.profiles (id, phone_number)
  values (auth.uid(), user_phone)
  on conflict (id) do update
    set phone_number = excluded.phone_number,
        updated_at = now();

  for invite in
    select *
    from public.staff_invites
    where status = 'Pending'
      and public.normalized_phone(phone_number) = user_phone
  loop
    if invite.owner_id = auth.uid() then
      update public.staff_invites
      set status = 'Revoked'
      where id = invite.id;
      continue;
    end if;

    insert into public.hostel_members (hostel_id, owner_id, user_id, role, status, invited_by, created_by)
    values (invite.hostel_id, invite.owner_id, auth.uid(), invite.role, 'Active', invite.invited_by, invite.invited_by)
    on conflict (hostel_id, user_id) do update
      set role = case
            when public.hostel_members.role = 'Owner' then 'Owner'
            else excluded.role
          end,
          status = 'Active',
          owner_id = excluded.owner_id,
          created_by = coalesce(public.hostel_members.created_by, excluded.created_by);

    update public.staff_invites
    set status = 'Accepted',
        accepted_by = auth.uid(),
        accepted_at = now()
    where id = invite.id;
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.hostels enable row level security;
alter table public.hostel_members enable row level security;
alter table public.staff_invites enable row level security;
alter table public.rooms enable row level security;
alter table public.beds enable row level security;
alter table public.tenants enable row level security;
alter table public.expenses enable row level security;
alter table public.rent_payments enable row level security;
alter table public.tenant_documents enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-documents',
  'tenant-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "MVP read hostels" on public.hostels;
drop policy if exists "MVP write hostels" on public.hostels;
drop policy if exists "MVP read rooms" on public.rooms;
drop policy if exists "MVP write rooms" on public.rooms;
drop policy if exists "MVP read beds" on public.beds;
drop policy if exists "MVP write beds" on public.beds;
drop policy if exists "MVP read tenants" on public.tenants;
drop policy if exists "MVP write tenants" on public.tenants;
drop policy if exists "MVP read expenses" on public.expenses;
drop policy if exists "MVP write expenses" on public.expenses;
drop policy if exists "MVP read rent payments" on public.rent_payments;
drop policy if exists "MVP write rent payments" on public.rent_payments;
drop policy if exists "MVP read tenant documents" on public.tenant_documents;
drop policy if exists "MVP write tenant documents" on public.tenant_documents;

drop policy if exists "Profiles are visible to owner" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
create policy "Profiles are visible to owner" on public.profiles
  for select using (id = auth.uid());
create policy "Users update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Members can read assigned hostels" on public.hostels;
drop policy if exists "Authenticated users can create own hostels" on public.hostels;
drop policy if exists "Owners can update hostels" on public.hostels;
drop policy if exists "Owners can delete hostels" on public.hostels;
create policy "Members can read assigned hostels" on public.hostels
  for select using (public.is_hostel_member(id) or owner_id = auth.uid());
create policy "Authenticated users can create own hostels" on public.hostels
  for insert with check (auth.uid() is not null and owner_id = auth.uid() and created_by = auth.uid());
create policy "Owners can update hostels" on public.hostels
  for update using (public.is_hostel_owner(id)) with check (public.is_hostel_owner(id));
create policy "Owners can delete hostels" on public.hostels
  for delete using (public.is_hostel_owner(id));

drop policy if exists "Members can read memberships" on public.hostel_members;
drop policy if exists "Owners manage memberships" on public.hostel_members;
create policy "Members can read memberships" on public.hostel_members
  for select using (user_id = auth.uid() or public.is_hostel_owner(hostel_id));
create policy "Owners manage memberships" on public.hostel_members
  for all using (public.is_hostel_owner(hostel_id)) with check (public.is_hostel_owner(hostel_id));

drop policy if exists "Owners manage staff invites" on public.staff_invites;
drop policy if exists "Invited phone can read invite" on public.staff_invites;
create policy "Owners manage staff invites" on public.staff_invites
  for all using (public.is_hostel_owner(hostel_id)) with check (public.is_hostel_owner(hostel_id));
create policy "Invited phone can read invite" on public.staff_invites
  for select using (public.normalized_phone(phone_number) = public.current_user_phone());

drop policy if exists "Members read rooms" on public.rooms;
drop policy if exists "Owner staff write rooms" on public.rooms;
drop policy if exists "Owner staff update rooms" on public.rooms;
drop policy if exists "Owners delete rooms" on public.rooms;
create policy "Members read rooms" on public.rooms for select using (public.is_hostel_member(hostel_id));
create policy "Owner staff write rooms" on public.rooms for insert with check (public.can_write_hostel_data(hostel_id));
create policy "Owner staff update rooms" on public.rooms for update using (public.can_write_hostel_data(hostel_id)) with check (public.can_write_hostel_data(hostel_id));
create policy "Owners delete rooms" on public.rooms for delete using (public.is_hostel_owner(hostel_id));

drop policy if exists "Members read beds" on public.beds;
drop policy if exists "Owner staff write beds" on public.beds;
drop policy if exists "Owner staff update beds" on public.beds;
drop policy if exists "Owners delete beds" on public.beds;
create policy "Members read beds" on public.beds for select using (public.is_hostel_member(hostel_id));
create policy "Owner staff write beds" on public.beds for insert with check (public.can_write_hostel_data(hostel_id));
create policy "Owner staff update beds" on public.beds for update using (public.can_write_hostel_data(hostel_id)) with check (public.can_write_hostel_data(hostel_id));
create policy "Owners delete beds" on public.beds for delete using (public.is_hostel_owner(hostel_id));

drop policy if exists "Members read tenants" on public.tenants;
drop policy if exists "Owner staff write tenants" on public.tenants;
drop policy if exists "Owner staff update tenants" on public.tenants;
drop policy if exists "Owners delete tenants" on public.tenants;
create policy "Members read tenants" on public.tenants for select using (public.is_hostel_member(hostel_id));
create policy "Owner staff write tenants" on public.tenants for insert with check (public.can_write_hostel_data(hostel_id));
create policy "Owner staff update tenants" on public.tenants for update using (public.can_write_hostel_data(hostel_id)) with check (public.can_write_hostel_data(hostel_id));
create policy "Owners delete tenants" on public.tenants for delete using (public.is_hostel_owner(hostel_id));

drop policy if exists "Members read expenses" on public.expenses;
drop policy if exists "Owner staff write expenses" on public.expenses;
drop policy if exists "Owner staff update expenses" on public.expenses;
drop policy if exists "Owners delete expenses" on public.expenses;
create policy "Members read expenses" on public.expenses for select using (public.is_hostel_member(hostel_id));
create policy "Owner staff write expenses" on public.expenses for insert with check (public.can_write_hostel_data(hostel_id));
create policy "Owner staff update expenses" on public.expenses for update using (public.can_write_hostel_data(hostel_id)) with check (public.can_write_hostel_data(hostel_id));
create policy "Owners delete expenses" on public.expenses for delete using (public.is_hostel_owner(hostel_id));

drop policy if exists "Members read rent payments" on public.rent_payments;
drop policy if exists "Owner staff write rent payments" on public.rent_payments;
drop policy if exists "Owner staff update rent payments" on public.rent_payments;
drop policy if exists "Owners delete rent payments" on public.rent_payments;
create policy "Members read rent payments" on public.rent_payments for select using (public.is_hostel_member(hostel_id));
create policy "Owner staff write rent payments" on public.rent_payments for insert with check (public.can_write_hostel_data(hostel_id));
create policy "Owner staff update rent payments" on public.rent_payments for update using (public.can_write_hostel_data(hostel_id)) with check (public.can_write_hostel_data(hostel_id));
create policy "Owners delete rent payments" on public.rent_payments for delete using (public.is_hostel_owner(hostel_id));

drop policy if exists "Members read tenant documents" on public.tenant_documents;
drop policy if exists "Owner staff write tenant documents" on public.tenant_documents;
drop policy if exists "Owner staff update tenant documents" on public.tenant_documents;
drop policy if exists "Owners delete tenant documents" on public.tenant_documents;
create policy "Members read tenant documents" on public.tenant_documents
  for select using (public.is_hostel_member(hostel_id));
create policy "Owner staff write tenant documents" on public.tenant_documents
  for insert with check (
    public.can_write_hostel_data(hostel_id)
    and bucket_id = 'tenant-documents'
    and public.storage_path_hostel_id(storage_path) = hostel_id
    and public.storage_path_tenant_id(storage_path) = tenant_id
    and exists (
      select 1
      from public.tenants t
      where t.id = tenant_id
        and t.hostel_id = tenant_documents.hostel_id
    )
  );
create policy "Owner staff update tenant documents" on public.tenant_documents
  for update using (public.can_write_hostel_data(hostel_id))
  with check (
    public.can_write_hostel_data(hostel_id)
    and bucket_id = 'tenant-documents'
    and public.storage_path_hostel_id(storage_path) = hostel_id
    and public.storage_path_tenant_id(storage_path) = tenant_id
    and exists (
      select 1
      from public.tenants t
      where t.id = tenant_id
        and t.hostel_id = tenant_documents.hostel_id
    )
  );
create policy "Owners delete tenant documents" on public.tenant_documents
  for delete using (public.is_hostel_owner(hostel_id));

drop policy if exists "Members read tenant document files" on storage.objects;
drop policy if exists "Owner staff upload tenant document files" on storage.objects;
drop policy if exists "Owner staff update tenant document files" on storage.objects;
drop policy if exists "Owners delete tenant document files" on storage.objects;
create policy "Members read tenant document files" on storage.objects
  for select using (
    bucket_id = 'tenant-documents'
    and public.is_hostel_member(public.storage_path_hostel_id(name))
  );
create policy "Owner staff upload tenant document files" on storage.objects
  for insert with check (
    bucket_id = 'tenant-documents'
    and public.can_write_hostel_data(public.storage_path_hostel_id(name))
    and exists (
      select 1
      from public.tenants t
      where t.hostel_id = public.storage_path_hostel_id(name)
        and t.id = public.storage_path_tenant_id(name)
        and public.can_write_hostel_data(t.hostel_id)
    )
  );
create policy "Owner staff update tenant document files" on storage.objects
  for update using (
    bucket_id = 'tenant-documents'
    and public.can_write_hostel_data(public.storage_path_hostel_id(name))
  )
  with check (
    bucket_id = 'tenant-documents'
    and public.can_write_hostel_data(public.storage_path_hostel_id(name))
    and exists (
      select 1
      from public.tenants t
      where t.hostel_id = public.storage_path_hostel_id(name)
        and t.id = public.storage_path_tenant_id(name)
        and public.can_write_hostel_data(t.hostel_id)
    )
  );
create policy "Owners delete tenant document files" on storage.objects
  for delete using (
    bucket_id = 'tenant-documents'
    and public.is_hostel_owner(public.storage_path_hostel_id(name))
  );

-- Demo data is intentionally no longer inserted by this production schema.
-- Create a hostel from the app after logging in with mobile OTP.
