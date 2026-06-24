# PGCopilot Hostinger Deployment

PGCopilot is an Expo React app. For Hostinger, deploy the web version generated into the `dist` folder.

## Recommended: Hostinger Node.js Web App

Use this when your Hostinger plan supports Node.js Web Apps.

1. Open Hostinger hPanel.
2. Go to Websites, then choose Add Website.
3. Choose Node.js Apps.
4. Choose Import Git Repository.
5. Authorize GitHub and select `anilbonala-github/PGCopilot`.
6. Select branch `main`.
7. Use these build settings:

```text
Install command: npm install
Build command: npm run build:web
Output directory: dist
Node.js version: 20.x or 22.x
Framework/type: Other or React, depending on what Hostinger detects
```

8. Add environment variables before deploying:

```text
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

Do not add the Supabase `service_role` secret to Hostinger for this frontend app.

## Domain Setup

For the main app, either connect:

```text
pgcopilot.com
```

or create a subdomain:

```text
app.pgcopilot.com
```

Hostinger will guide the DNS setup inside hPanel. If the domain was purchased in Hostinger, DNS is usually already managed there.

## Local Web Build Check

From this folder:

```powershell
npm install
npm run build:web
```

The generated website will be in:

```text
dist
```

The build also copies the privacy policy to:

```text
https://pgcopilot.com/privacy-policy.html
https://pgcopilot.com/pgcopilot-privacy-policy.html
```

Use `https://pgcopilot.com/privacy-policy.html` for Apple App Store Connect, Google Play Console, and Expo/EAS metadata.

## If Hostinger Only Shows Basic Git Deployment

Basic Git deployment may only pull files from GitHub and may not run `npm install` or `npm run build:web`.

If that happens, use one of these options:

1. Deploy through Hostinger Node.js Web App instead.
2. Build locally with `npm run build:web`, then upload the contents of `dist` into `public_html`.
3. Use GitHub Actions later to build `dist` and deploy the built files automatically.
