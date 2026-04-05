/// <reference types="vite/client" />

/**
 * CyberShield Pro — Client-side Supabase
 * Uses ANON key (safe for frontend, RLS enforced).
 * Used for reading scan history on the client.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ── Read Scan History ────────────────────────────────────
export async function getScanHistory(limit = 20) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("threat_scans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Supabase Client] History fetch error:", error.message);
    return [];
  }
  return data || [];
}

// ── Register Device Token ────────────────────────────────
export async function registerDeviceToken(token: string, userId?: string) {
  if (!supabase) return;

  const { error } = await supabase.from("device_tokens").upsert(
    {
      token,
      platform: "android",
      user_id: userId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) {
    console.error("[Supabase Client] Token registration error:", error.message);
  }
}
