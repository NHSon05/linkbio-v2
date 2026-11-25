import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/auth";

/**
 * Secret-key client for trusted server jobs only (AN-01 event ingestion). Never use it for user
 * requests that RLS should check. Returns null when the secret is not configured.
 */
export function createAdminClient() {
  const env = getSupabaseEnv();
  // NEXT_SUPABASE_SECRET_KEY: older local name; prefer SUPABASE_SECRET_KEY.
  const secret =
    process.env.SUPABASE_SECRET_KEY || process.env.NEXT_SUPABASE_SECRET_KEY;
  if (!env || !secret) return null;
  return createClient(env.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
