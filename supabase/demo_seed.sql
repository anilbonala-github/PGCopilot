-- Optional demo seed for a Supabase test phone number.
--
-- Use this only for demo/testing:
-- 1. In Supabase Auth > Phone, add test OTP: 919123456789=123456
-- 2. Login once in the app with mobile 9123456789 and OTP 123456.
-- 3. Run this full SQL in Supabase SQL Editor.
--
-- The test user will become Owner for the seeded hostel data.

do $$
declare
  demo_phone text := '919123456789';
  demo_owner_id uuid;
  demo_hostel_id uuid;
  room_101_id uuid;
  room_102_id uuid;
  room_201_id uuid;
  room_202_id uuid;
  room_301_id uuid;
  bed_101_a_id uuid;
  bed_101_b_id uuid;
  bed_201_a_id uuid;
  bed_201_b_id uuid;
  bed_301_a_id uuid;
begin
  select id
  into demo_owner_id
  from auth.users
  where public.normalized_phone(phone) = public.normalized_phone(demo_phone)
  order by created_at desc
  limit 1;

  if demo_owner_id is null then
    raise exception 'Demo auth user not found. Login once with phone % before running this seed.', demo_phone;
  end if;

  insert into public.profiles (id, phone_number, full_name)
  values (demo_owner_id, public.normalized_phone(demo_phone), 'Demo Admin')
  on conflict (id) do update
    set phone_number = excluded.phone_number,
        full_name = excluded.full_name,
        updated_at = now();

  select id
  into demo_hostel_id
  from public.hostels
  where owner_id = demo_owner_id
    and name = 'Greenview Men''s PG'
  limit 1;

  if demo_hostel_id is null then
    insert into public.hostels (owner_id, created_by, name, address, contact_number, upi_id)
    values (demo_owner_id, demo_owner_id, 'Greenview Men''s PG', 'HSR Layout, Bengaluru', '9123456789', 'greenviewpg@upi')
    returning id into demo_hostel_id;
  else
    update public.hostels
    set created_by = coalesce(created_by, demo_owner_id),
        address = 'HSR Layout, Bengaluru',
        contact_number = '9123456789',
        upi_id = 'greenviewpg@upi'
    where id = demo_hostel_id;
  end if;

  insert into public.hostel_members (hostel_id, owner_id, user_id, role, status, invited_by, created_by)
  values (demo_hostel_id, demo_owner_id, demo_owner_id, 'Owner', 'Active', demo_owner_id, demo_owner_id)
  on conflict (hostel_id, user_id) do update
    set role = 'Owner',
        status = 'Active',
        owner_id = excluded.owner_id,
        created_by = coalesce(public.hostel_members.created_by, excluded.created_by);

  insert into public.rooms (owner_id, hostel_id, created_by, room_number, floor, room_type)
  values
    (demo_owner_id, demo_hostel_id, demo_owner_id, '101', 'Ground', 'Triple'),
    (demo_owner_id, demo_hostel_id, demo_owner_id, '102', 'Ground', 'Double'),
    (demo_owner_id, demo_hostel_id, demo_owner_id, '201', '1st Floor', 'Triple'),
    (demo_owner_id, demo_hostel_id, demo_owner_id, '202', '1st Floor', 'Double'),
    (demo_owner_id, demo_hostel_id, demo_owner_id, '301', '2nd Floor', 'Triple')
  on conflict (hostel_id, room_number) do update
    set floor = excluded.floor,
        room_type = excluded.room_type,
        owner_id = excluded.owner_id,
        created_by = coalesce(public.rooms.created_by, excluded.created_by);

  select id into room_101_id from public.rooms where hostel_id = demo_hostel_id and room_number = '101';
  select id into room_102_id from public.rooms where hostel_id = demo_hostel_id and room_number = '102';
  select id into room_201_id from public.rooms where hostel_id = demo_hostel_id and room_number = '201';
  select id into room_202_id from public.rooms where hostel_id = demo_hostel_id and room_number = '202';
  select id into room_301_id from public.rooms where hostel_id = demo_hostel_id and room_number = '301';

  insert into public.beds (owner_id, hostel_id, room_id, created_by, bed_number, status)
  values
    (demo_owner_id, demo_hostel_id, room_101_id, demo_owner_id, '101-A', 'Occupied'),
    (demo_owner_id, demo_hostel_id, room_101_id, demo_owner_id, '101-B', 'Occupied'),
    (demo_owner_id, demo_hostel_id, room_101_id, demo_owner_id, '101-C', 'Vacant'),
    (demo_owner_id, demo_hostel_id, room_102_id, demo_owner_id, '102-A', 'Occupied'),
    (demo_owner_id, demo_hostel_id, room_102_id, demo_owner_id, '102-B', 'Vacant'),
    (demo_owner_id, demo_hostel_id, room_201_id, demo_owner_id, '201-A', 'Occupied'),
    (demo_owner_id, demo_hostel_id, room_201_id, demo_owner_id, '201-B', 'Occupied'),
    (demo_owner_id, demo_hostel_id, room_201_id, demo_owner_id, '201-C', 'Occupied'),
    (demo_owner_id, demo_hostel_id, room_202_id, demo_owner_id, '202-A', 'Reserved'),
    (demo_owner_id, demo_hostel_id, room_202_id, demo_owner_id, '202-B', 'Vacant'),
    (demo_owner_id, demo_hostel_id, room_301_id, demo_owner_id, '301-A', 'Occupied'),
    (demo_owner_id, demo_hostel_id, room_301_id, demo_owner_id, '301-B', 'Maintenance'),
    (demo_owner_id, demo_hostel_id, room_301_id, demo_owner_id, '301-C', 'Vacant')
  on conflict (hostel_id, bed_number) do update
    set room_id = excluded.room_id,
        status = excluded.status,
        owner_id = excluded.owner_id,
        created_by = coalesce(public.beds.created_by, excluded.created_by);

  select id into bed_101_a_id from public.beds where hostel_id = demo_hostel_id and bed_number = '101-A';
  select id into bed_101_b_id from public.beds where hostel_id = demo_hostel_id and bed_number = '101-B';
  select id into bed_201_a_id from public.beds where hostel_id = demo_hostel_id and bed_number = '201-A';
  select id into bed_201_b_id from public.beds where hostel_id = demo_hostel_id and bed_number = '201-B';
  select id into bed_301_a_id from public.beds where hostel_id = demo_hostel_id and bed_number = '301-A';

  insert into public.tenants (owner_id, hostel_id, created_by, bed_id, full_name, mobile_number, monthly_rent, deposit_amount, rent_status, joining_date, is_active)
  select demo_owner_id, demo_hostel_id, demo_owner_id, bed_101_a_id, 'Ramesh S', '9845023891', 8500, 15000, 'Paid', current_date - 60, true
  where not exists (select 1 from public.tenants where hostel_id = demo_hostel_id and full_name = 'Ramesh S');

  insert into public.tenants (owner_id, hostel_id, created_by, bed_id, full_name, mobile_number, monthly_rent, deposit_amount, rent_status, joining_date, is_active)
  select demo_owner_id, demo_hostel_id, demo_owner_id, bed_101_b_id, 'Arun Kumar', '9972118452', 8500, 15000, 'Paid', current_date - 45, true
  where not exists (select 1 from public.tenants where hostel_id = demo_hostel_id and full_name = 'Arun Kumar');

  insert into public.tenants (owner_id, hostel_id, created_by, bed_id, full_name, mobile_number, monthly_rent, deposit_amount, rent_status, joining_date, is_active)
  select demo_owner_id, demo_hostel_id, demo_owner_id, bed_201_a_id, 'John N', '9886353419', 8000, 12000, 'Pending', current_date - 40, true
  where not exists (select 1 from public.tenants where hostel_id = demo_hostel_id and full_name = 'John N');

  insert into public.tenants (owner_id, hostel_id, created_by, bed_id, full_name, mobile_number, monthly_rent, deposit_amount, rent_status, joining_date, is_active)
  select demo_owner_id, demo_hostel_id, demo_owner_id, bed_201_b_id, 'Rahul V', '9845590876', 8500, 15000, 'Partial', current_date - 25, true
  where not exists (select 1 from public.tenants where hostel_id = demo_hostel_id and full_name = 'Rahul V');

  insert into public.tenants (owner_id, hostel_id, created_by, bed_id, full_name, mobile_number, monthly_rent, deposit_amount, rent_status, joining_date, is_active)
  select demo_owner_id, demo_hostel_id, demo_owner_id, bed_301_a_id, 'Kiran P', '9663172340', 9000, 18000, 'Pending', current_date - 15, true
  where not exists (select 1 from public.tenants where hostel_id = demo_hostel_id and full_name = 'Kiran P');

  insert into public.expenses (owner_id, hostel_id, created_by, label, category, amount)
  select demo_owner_id, demo_hostel_id, demo_owner_id, 'Food supplies', 'Food', 65000
  where not exists (select 1 from public.expenses where hostel_id = demo_hostel_id and label = 'Food supplies');

  insert into public.expenses (owner_id, hostel_id, created_by, label, category, amount)
  select demo_owner_id, demo_hostel_id, demo_owner_id, 'Staff salaries', 'Salary', 72000
  where not exists (select 1 from public.expenses where hostel_id = demo_hostel_id and label = 'Staff salaries');

  insert into public.expenses (owner_id, hostel_id, created_by, label, category, amount)
  select demo_owner_id, demo_hostel_id, demo_owner_id, 'Electricity', 'Utilities', 28500
  where not exists (select 1 from public.expenses where hostel_id = demo_hostel_id and label = 'Electricity');

  insert into public.expenses (owner_id, hostel_id, created_by, label, category, amount)
  select demo_owner_id, demo_hostel_id, demo_owner_id, 'Internet & utilities', 'Utilities', 24500
  where not exists (select 1 from public.expenses where hostel_id = demo_hostel_id and label = 'Internet & utilities');

  raise notice 'Seeded demo hostel % for owner phone %', demo_hostel_id, demo_phone;
end $$;
