create extension if not exists pgcrypto;

create table if not exists public.hostels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  contact_number text,
  gst_number text,
  upi_id text,
  bank_details text,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  room_number text not null,
  floor text not null,
  room_type text not null check (room_type in ('Single', 'Double', 'Triple', 'Dormitory')),
  created_at timestamptz not null default now(),
  unique (hostel_id, room_number)
);

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  bed_number text not null,
  status text not null check (status in ('Occupied', 'Vacant', 'Reserved', 'Maintenance')),
  created_at timestamptz not null default now(),
  unique (hostel_id, bed_number)
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
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
  notice_period_days integer not null default 30,
  rent_status text not null default 'Pending' check (rent_status in ('Paid', 'Partial', 'Pending')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  label text not null,
  category text not null default 'Other',
  amount numeric not null default 0,
  expense_month date not null default date_trunc('month', current_date)::date,
  created_at timestamptz not null default now()
);

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rent_month date not null,
  amount numeric not null,
  paid_amount numeric not null default 0,
  due_date date not null,
  status text not null default 'Pending' check (status in ('Paid', 'Partial', 'Pending')),
  payment_mode text check (payment_mode in ('UPI', 'Cash', 'Bank Transfer')),
  created_at timestamptz not null default now()
);

alter table public.hostels enable row level security;
alter table public.rooms enable row level security;
alter table public.beds enable row level security;
alter table public.tenants enable row level security;
alter table public.expenses enable row level security;
alter table public.rent_payments enable row level security;

-- MVP policies: allow anon access for your first private test build.
-- Before public launch, replace these with owner/staff login based policies.
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

create policy "MVP read hostels" on public.hostels for select using (true);
create policy "MVP write hostels" on public.hostels for all using (true) with check (true);
create policy "MVP read rooms" on public.rooms for select using (true);
create policy "MVP write rooms" on public.rooms for all using (true) with check (true);
create policy "MVP read beds" on public.beds for select using (true);
create policy "MVP write beds" on public.beds for all using (true) with check (true);
create policy "MVP read tenants" on public.tenants for select using (true);
create policy "MVP write tenants" on public.tenants for all using (true) with check (true);
create policy "MVP read expenses" on public.expenses for select using (true);
create policy "MVP write expenses" on public.expenses for all using (true) with check (true);
create policy "MVP read rent payments" on public.rent_payments for select using (true);
create policy "MVP write rent payments" on public.rent_payments for all using (true) with check (true);

with hostel as (
  insert into public.hostels (name, address, contact_number, upi_id)
  values ('Greenview Men''s PG', 'HSR Layout, Bengaluru', '98450 00000', 'greenviewpg@upi')
  returning id
),
room_seed as (
  insert into public.rooms (hostel_id, room_number, floor, room_type)
  select id, room_number, floor, room_type
  from hostel
  cross join (values
    ('101', 'Ground', 'Triple'),
    ('102', 'Ground', 'Double'),
    ('201', '1st Floor', 'Triple'),
    ('202', '1st Floor', 'Double'),
    ('301', '2nd Floor', 'Triple')
  ) as r(room_number, floor, room_type)
  returning id, hostel_id, room_number
),
bed_seed as (
  insert into public.beds (hostel_id, room_id, bed_number, status)
  select hostel_id, id, bed_number, status
  from room_seed
  join (values
    ('101', '101-A', 'Occupied'), ('101', '101-B', 'Occupied'), ('101', '101-C', 'Vacant'),
    ('102', '102-A', 'Occupied'), ('102', '102-B', 'Vacant'),
    ('201', '201-A', 'Occupied'), ('201', '201-B', 'Occupied'), ('201', '201-C', 'Occupied'),
    ('202', '202-A', 'Reserved'), ('202', '202-B', 'Vacant'),
    ('301', '301-A', 'Occupied'), ('301', '301-B', 'Maintenance'), ('301', '301-C', 'Vacant')
  ) as b(room_number, bed_number, status) using (room_number)
  returning id, hostel_id, bed_number
),
tenant_seed as (
  insert into public.tenants (hostel_id, bed_id, full_name, mobile_number, monthly_rent, deposit_amount, rent_status)
  select hostel_id, id, full_name, mobile_number, monthly_rent, 15000, rent_status
  from bed_seed
  join (values
    ('101-A', 'Ramesh S', '98450 23891', 8500, 'Paid'),
    ('101-B', 'Arun Kumar', '99721 18452', 8500, 'Paid'),
    ('201-A', 'John N', '98863 53419', 8000, 'Pending'),
    ('201-B', 'Rahul V', '98455 90876', 8500, 'Partial'),
    ('301-A', 'Kiran P', '96631 72340', 9000, 'Pending'),
    ('201-C', 'Sanjay M', '99001 32118', 8500, 'Paid')
  ) as t(bed_number, full_name, mobile_number, monthly_rent, rent_status) using (bed_number)
)
insert into public.expenses (hostel_id, label, category, amount)
select id, label, category, amount
from hostel
cross join (values
  ('Food supplies', 'Food', 65000),
  ('Staff salaries', 'Salary', 72000),
  ('Electricity', 'Utilities', 28500),
  ('Internet & utilities', 'Utilities', 24500)
) as e(label, category, amount);
