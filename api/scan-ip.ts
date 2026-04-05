/**
 * CyberShield Pro — IP Scan API (Vercel Serverless Function)
 *
 * POST /api/scan-ip
 * Body: { ip: string, userId?: string }
 *
 * Flow:
 * 1. Validate IP format
 * 2. Check Supabase 24-hour cache
 * 3. Call VirusTotal + OTX AlienVault
 * 4. Compute risk level
 * 5. Store in Supabase
 * 6. If HIGH risk → send Firebase push notification
 * 7. Return structured result
 */
import axios from "axios";
import { validateScanRequest, sanitizeInput } from "./_lib/validate.js";
import { getCachedScan, insertScanResult, insertScanLog, getDeviceTokens } from "./_lib/supabaseServer.js";
import { sendThreatNotification } from "./_lib/firebaseAdmin.js";

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const startTime = Date.now();
  const body = req.body;

  // ── 1. Validate Input ──────────────────────────────────
  const validation = validateScanRequest(body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const ip = sanitizeInput(body.ip);
  const userId = body.userId ? sanitizeInput(body.userId) : undefined;

  try {
    // ── 2. Check 24-hour Cache ─────────────────────────────
    let cached = null;
    try {
      cached = await getCachedScan(ip);
    } catch (err) {
      console.warn("[Cache] Supabase cache check failed, proceeding with fresh scan");
    }

    if (cached) {
      await insertScanLog({
        ip,
        status: "cached",
        response_time_ms: Date.now() - startTime,
        user_id: userId,
      });

      return res.status(200).json({
        success: true,
        data: {
          ip: cached.ip,
          risk_level: cached.risk_level,
          vt_malicious: cached.vt_malicious,
          vt_suspicious: cached.vt_suspicious,
          vt_reputation: cached.vt_reputation,
          otx_hits: cached.otx_hits,
          cached: true,
          created_at: cached.created_at,
        },
      });
    }

    // ── 3. Call VirusTotal ──────────────────────────────────
    let vtMalicious = 0;
    let vtSuspicious = 0;
    let vtReputation = 0;

    const vtApiKey = process.env.VIRUSTOTAL_API_KEY;
    if (vtApiKey) {
      try {
        const vtRes = await axios.get(
          `https://www.virustotal.com/api/v3/ip_addresses/${ip}`,
          {
            headers: { "x-apikey": vtApiKey },
            timeout: 15000,
          }
        );

        const stats = vtRes.data?.data?.attributes?.last_analysis_stats;
        if (stats) {
          vtMalicious = stats.malicious || 0;
          vtSuspicious = stats.suspicious || 0;
        }
        vtReputation = vtRes.data?.data?.attributes?.reputation || 0;
      } catch (err: any) {
        console.warn("[VirusTotal] API call failed:", err.message);
      }
    } else {
      console.warn("[VirusTotal] API key not configured");
    }

    // ── 4. Call OTX AlienVault ──────────────────────────────
    let otxHits = 0;

    const otxApiKey = process.env.OTX_API_KEY;
    if (otxApiKey) {
      try {
        const otxRes = await axios.get(
          `https://otx.alienvault.com/api/v1/indicators/IPv4/${ip}/general`,
          {
            headers: { "X-OTX-API-KEY": otxApiKey },
            timeout: 15000,
          }
        );

        otxHits = otxRes.data?.pulse_info?.count || 0;
      } catch (err: any) {
        console.warn("[OTX] API call failed:", err.message);
      }
    } else {
      console.warn("[OTX] API key not configured");
    }

    // ── 5. Compute Risk Level ──────────────────────────────
    let riskLevel: "low" | "medium" | "high" = "low";
    if (vtMalicious > 0 || otxHits > 5) {
      riskLevel = "high";
    } else if (vtSuspicious > 0 || otxHits > 0) {
      riskLevel = "medium";
    }

    // ── 6. Store in Supabase ───────────────────────────────
    let createdAt = new Date().toISOString();
    try {
      const inserted = await insertScanResult({
        ip,
        vt_malicious: vtMalicious,
        vt_suspicious: vtSuspicious,
        vt_reputation: vtReputation,
        otx_hits: otxHits,
        risk_level: riskLevel,
        user_id: userId,
      });
      if (inserted?.created_at) createdAt = inserted.created_at;
    } catch (err) {
      console.error("[Supabase] Failed to store scan result");
    }

    // ── 7. Firebase Notification (HIGH risk only) ──────────
    if (riskLevel === "high") {
      try {
        const tokens = await getDeviceTokens(userId);
        if (tokens.length > 0) {
          await sendThreatNotification(tokens, ip, riskLevel);
        }
      } catch (err) {
        console.error("[Firebase] Notification failed");
      }
    }

    // ── 8. Log & Return ────────────────────────────────────
    await insertScanLog({
      ip,
      status: "success",
      response_time_ms: Date.now() - startTime,
      user_id: userId,
    });

    return res.status(200).json({
      success: true,
      data: {
        ip,
        risk_level: riskLevel,
        vt_malicious: vtMalicious,
        vt_suspicious: vtSuspicious,
        vt_reputation: vtReputation,
        otx_hits: otxHits,
        cached: false,
        created_at: createdAt,
      },
    });

  } catch (err: any) {
    console.error("[scan-ip] Unexpected error:", err.message);

    await insertScanLog({
      ip,
      status: "error",
      error_message: err.message,
      response_time_ms: Date.now() - startTime,
      user_id: userId,
    }).catch(() => {});

    return res.status(500).json({
      success: false,
      error: "Internal server error. Please try again later.",
    });
  }
}
