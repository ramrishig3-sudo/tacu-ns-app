-- ============================================================
-- CyberShield Pro — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Table: ip_scans ─────────────────────────────────────────
-- Stores all IP scan results with caching support (24-hour dedup)
CREATE TABLE IF NOT EXISTS ip_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT NOT NULL,
  vt_malicious INT DEFAULT 0,
  vt_suspicious INT DEFAULT 0,
  vt_reputation INT DEFAULT 0,
  otx_hits INT DEFAULT 0,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_ip_scans_ip ON ip_scans(ip);
CREATE INDEX IF NOT EXISTS idx_ip_scans_created ON ip_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_scans_risk ON ip_scans(risk_level);
CREATE INDEX IF NOT EXISTS idx_ip_scans_ip_created ON ip_scans(ip, created_at DESC);

-- ── Table: scan_logs ────────────────────────────────────────
-- Audit log of all scan requests
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT NOT NULL,
  source TEXT DEFAULT 'app',
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'cached')),
  error_message TEXT,
  response_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_created ON scan_logs(created_at DESC);

-- ── Table: device_tokens ────────────────────────────────────
-- FCM push notification device tokens
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  platform TEXT DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE ip_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Public read access for ip_scans (using anon key)
CREATE POLICY "Public read ip_scans" ON ip_scans
  FOR SELECT USING (true);

-- Service role can insert/update ip_scans
CREATE POLICY "Service insert ip_scans" ON ip_scans
  FOR INSERT WITH CHECK (true);

-- Public read for scan_logs
CREATE POLICY "Public read scan_logs" ON scan_logs
  FOR SELECT USING (true);

-- Service role can insert scan_logs
CREATE POLICY "Service insert scan_logs" ON scan_logs
  FOR INSERT WITH CHECK (true);

-- Device tokens: users can manage their own
CREATE POLICY "Public manage device_tokens" ON device_tokens
  FOR ALL USING (true);

-- ── Helper: Cleanup old scan logs (optional cron) ───────────
-- Run periodically to keep scan_logs table manageable
-- DELETE FROM scan_logs WHERE created_at < NOW() - INTERVAL '30 days';
