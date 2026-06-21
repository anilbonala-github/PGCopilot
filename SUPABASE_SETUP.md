# PGCopilot Supabase Setup

PGCopilot now uses one shared Supabase PostgreSQL database for:

- Expo web app / admin portal
- Android app
- iOS app

## 1. Create Supabase Project

1. Open https://supabase.com
2. Create a new project
3. Choose a region close to your users
4. Save the project password somewhere safe

## 2. Create Database Tables

1. Open your Supabase project
2. Go to SQL Editor
3. Open `supabase/schema.sql` from this project
4. Paste the full SQL
5. Click Run

This creates and seeds:

- hostels
- rooms
- beds
- tenants
- expenses
- rent_payments

## 3. Add App Keys

1. In Supabase, go to Project Settings > API
2. Copy Project URL
3. Copy anon public key
4. Create a `.env` file in this project using `.env.example`

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Restart Expo after changing `.env`.

## 4. Run The Apps

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
npx eas-cli build --platform ios --profile production
```

## 5. Current Security Note

The SQL file includes open MVP policies so you can test quickly. Before public launch, replace them with owner/staff login policies using Supabase Auth and Row Level Security.

The app will show demo data if Supabase keys are missing or if Supabase returns an error.
