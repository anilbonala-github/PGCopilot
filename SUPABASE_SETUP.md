# PGCopilot Supabase Setup

PGCopilot uses one shared Supabase project for:

- Web app / Hostinger deployment
- Expo Android app
- Expo iOS app

## 1. Enable Phone OTP

1. Open your Supabase project.
2. Go to Authentication > Providers.
3. Enable Phone.
4. Configure an SMS provider in Supabase before real users test OTP.

Without an SMS provider, Supabase phone OTP may not deliver codes in production.

## 2. Run Sprint 1 + Module 2 Database Schema

1. Open Supabase > SQL Editor.
2. Open `supabase/schema.sql` from this repo.
3. Paste the full SQL.
4. Click Run.

This creates the production-pilot foundation:

- `profiles`
- `hostels`
- `hostel_members`
- `staff_invites`
- `rooms`
- `beds`
- `tenants`
- `expenses`
- `rent_payments`

It also enables RLS so users can only access hostels where they are Owner or Staff.

Module 2 multi-hostel support is included:

- Owner -> Hostel -> Rooms -> Beds -> Tenants hierarchy
- Child records include `owner_id`, `hostel_id`, and `created_by`
- Hostel records include their own `id`, plus `owner_id` and `created_by`
- Database triggers fill missing ownership/audit fields on new records
- Existing rows are backfilled where possible from the parent hostel
- Owner and Staff users only see assigned hostel data through RLS

Module 3 RLS is included:

- Users can read only their assigned hostels
- Users can read/write only tenants, payments, expenses, rooms, and beds for assigned hostels
- Reports are protected because they are calculated from RLS-protected tenants, payments, rooms, beds, and expenses
- Only Owners can delete hostel-scoped records
- Tenant document metadata is protected by RLS
- Supabase Storage bucket `tenant-documents` is private and protected by hostel membership policies

Tenant document files must use this storage path format:

```text
<hostel_id>/<tenant_id>/<file-name>
```

Example:

```text
5a0c...hostel-uuid/88cb...tenant-uuid/aadhaar-front.jpg
```

Module 4 tenant admission is included:

- Full name
- Mobile number
- Emergency contact
- Aadhaar number
- Company / college
- Joining date
- Room / bed assignment
- Monthly rent
- Deposit amount
- Food included
- Rent due day
- Status: Active or Vacated
- Document uploads for tenant photo, Aadhaar front/back, employee ID, student ID, and agreement document

Tenant document files are uploaded to the private `tenant-documents` Supabase Storage bucket, and metadata is stored in `tenant_documents`.

## 3. Add App Keys

Use only the anon public key in the app.

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Never put the Supabase `service_role` secret in Hostinger, Expo, Android, iOS, or GitHub frontend code.

## 4. Hostinger Environment Variables

In Hostinger, add:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Then redeploy. Expo web bakes these values during `npm run build:web`.

## 5. First Owner Setup

1. Open the app.
2. Login with mobile OTP.
3. If no hostel exists for the logged-in owner, the app shows Create Hostel.
4. Create the hostel.
5. The SQL trigger automatically creates the Owner membership.

After the first hostel is created, owners can use the hostel name dropdown on the dashboard to create another hostel or switch between hostels. Rooms, beds, tenants, expenses, rent reports, and staff invites are scoped to the selected hostel.

## 6. Staff Invite Flow

1. Owner opens More > Invite staff.
2. Owner enters staff mobile number.
3. Staff logs in with OTP using that number.
4. The app accepts matching pending invites and assigns Staff role.

Staff can add/update hostel data, but delete policies are owner-only.

## 7. Optional Demo Admin Data

Use this only when you want a fixed demo login with sample hostel data.

1. In Supabase Authentication > Providers > Phone, add this test OTP pair:

```text
919123456789=123456
```

Supabase test phone numbers must be international format without spaces, dashes, or the `+` prefix.

2. Login once in the app with mobile `9123456789` and OTP `123456`.
3. Open Supabase > SQL Editor.
4. Run `supabase/demo_seed.sql` from this repo.
5. Logout and login again with `9123456789`.

That test user will be mapped as `Owner` for the seeded `Greenview Men's PG` hostel, including rooms, beds, tenants, and expenses.

## 8. Local Commands

Web:

```powershell
npm run web
```

Android:

```powershell
npx expo run:android
```

iOS / EAS:

```powershell
npx eas-cli build --platform ios --profile ios-device
```
