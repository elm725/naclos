import { createClient, SupabaseClient } from '@supabase/supabase-js';

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim().replace(/^['"]|['"]$/g, '');

  if (!value) {
    throw new Error(`Missing ${name} env var.`);
  }

  return value;
}

function readSupabaseUrl(): string {
  const value = readRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');

  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
      throw new Error('Supabase URL must be an https://<project-ref>.supabase.co URL.');
    }

    return url.origin;
  } catch (err) {
    throw new Error(
      'Invalid NEXT_PUBLIC_SUPABASE_URL env var. Use the exact Supabase Project URL, for example https://your-project-ref.supabase.co.'
    );
  }
}

export function getSupabaseProjectRef(): string {
  try {
    return new URL(readSupabaseUrl()).hostname.split('.')[0] || 'unknown';
  } catch {
    return 'invalid-url';
  }
}

/**
 * Browser-safe client — uses the anon key.
 */
export function getSupabaseClient(): SupabaseClient {
  return createClient(readSupabaseUrl(), readRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
}

export function getSupabaseBrowserClient(): SupabaseClient {
  return getSupabaseClient();
}

/**
 * Server-only admin client — uses service role key.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  return createClient(readSupabaseUrl(), readRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
