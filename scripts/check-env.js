const required = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch {
  // Hostinger and EAS should pass env vars directly; local .env loading is best effort.
}

const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error('\nMissing required environment variables for production web build:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error('\nAdd these in Hostinger Environment variables, then redeploy.');
  process.exit(1);
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

try {
  const parsedUrl = new URL(supabaseUrl);
  const invalidPath = parsedUrl.pathname && parsedUrl.pathname !== '/';
  if (invalidPath || !parsedUrl.hostname.endsWith('.supabase.co')) {
    console.error('\nEXPO_PUBLIC_SUPABASE_URL must be the base Supabase project URL.');
    console.error('Use this format:');
    console.error('https://your-project-ref.supabase.co');
    console.error('\nDo not include /rest/v1/ or any API path.');
    process.exit(1);
  }
} catch {
  console.error('\nEXPO_PUBLIC_SUPABASE_URL is not a valid URL.');
  console.error('Use this format: https://your-project-ref.supabase.co');
  process.exit(1);
}
