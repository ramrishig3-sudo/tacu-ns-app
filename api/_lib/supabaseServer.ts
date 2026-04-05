/**
 * CyberShield Pro — Server-side Supabase Client
 * Used by Vercel functions and Express server for database operations.
 * Uses SERVICE_ROLE key (bypasses RLS) — NEVER use on frontend.
 */
import { createClient } from "@supabase/supabase-js";

let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseServer() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  return supabase;
}

// ── Cache Check (24-hour window) ─────────────────────────
export async function getCachedScan(ip: string) {
  const sb = getSupabaseServer();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await sb
    .from("ip_scans")
    .select("*")
    .eq("ip", ip)
    .gte("created_at", twentyFourHoursAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

// ── Insert Scan Result ───────────────────────────────────
export async function insertScanResult(result: {
  ip: string;
  vt_malicious: number;
  vt_suspicious: number;
  vt_reputation: number;
  otx_hits: number;
  risk_level: string;
  user_id?: string;
}) {
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("ip_scans").insert(result).select().single();

  if (error) {
    console.error("[Supabase] Insert error:", error.message);
    throw error;
  }
  return data;
}

// ── Insert Scan Log ──────────────────────────────────────
export async function insertScanLog(log: {
  ip: string;
  status: "success" | "error" | "cached";
  error_message?: string;
  response_time_ms?: number;
  user_id?: string;
}) {
  const sb = getSupabaseServer();
  await sb.from("scan_logs").insert(log).catch((err: any) => {
    console.error("[Supabase] Log insert error:", err.message);
  });
}

// ── Get Device Tokens ────────────────────────────────────
export async function getDeviceTokens(userId?: string) {
  const sb = getSupabaseServer();
  let query = sb.from("device_tokens").select("token");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[Supabase] Token fetch error:", error.message);
    return [];
  }
  return (data || []).map((d: any) => d.token);
}
