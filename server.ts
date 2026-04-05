import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Input Validation (shared) ────────────────────────────
function isValidIPv4(ip: string): boolean {
  return /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(ip);
}
function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip);
}
function sanitize(input: string): string {
  return input.trim().replace(/[<>"'&;(){}]/g, "").substring(0, 500);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "1mb" }));

  // ── Security Headers ─────────────────────────────────────
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  app.get("/health", (req, res) => {
    res.send("TacU- NS Server is Running");
  });

  // =================================================================
  // EXPERIMENTAL TTL CACHE
  // =================================================================
  const threatCache = new Map<string, { data: any, expiry: number }>();
  function getCached(key: string) {
    const cached = threatCache.get(key);
    if (cached && Date.now() < cached.expiry) return cached.data;
    if (cached) threatCache.delete(key);
    return null;
  }
  function setCache(key: string, data: any, ttlMs = 3600000) {
    threatCache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  // =================================================================
  // NEW: Unified Multi-Vector Threat Scan Endpoint
  // =================================================================
  app.post("/api/scan-threat", async (req, res) => {
    const { target: rawTarget, userId } = req.body || {};

    if (!rawTarget || typeof rawTarget !== "string") {
      return res.status(400).json({ success: false, error: "Invalid target" });
    }

    const target = sanitize(rawTarget);
    
    // Auto-detect type
    let targetType: "ip" | "domain" | "url" | "hash" = "domain";
    if (isValidIP(target)) targetType = "ip";
    else if (/^[a-fA-F0-9]{32,64}$/.test(target)) targetType = "hash";
    else if (/^https?:\/\//i.test(target)) targetType = "url";
    else if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(target)) targetType = "domain";
    else return res.status(400).json({ success: false, error: "Unknown target format. Enter a valid IP, Domain, URL, or Hash." });

    const cacheKey = `scan_${targetType}_${target}`;
    const cachedResult = getCached(cacheKey);
    if (cachedResult) return res.json({ success: true, data: { ...cachedResult, cached: true } });

    try {
      // ── Call VirusTotal ──────────────────────────────────
      let vtMalicious = 0, vtSuspicious = 0, vtReputation = 0;
      const vtApiKey = process.env.VIRUSTOTAL_API_KEY;

      if (vtApiKey) {
        try {
          let vtUrl = "";
          if (targetType === "ip") vtUrl = `https://www.virustotal.com/api/v3/ip_addresses/${target}`;
          else if (targetType === "domain") vtUrl = `https://www.virustotal.com/api/v3/domains/${target}`;
          else if (targetType === "hash") vtUrl = `https://www.virustotal.com/api/v3/files/${target}`;
          else if (targetType === "url") {
            const encodedUrl = Buffer.from(target).toString("base64").replace(/=/g, "");
            vtUrl = `https://www.virustotal.com/api/v3/urls/${encodedUrl}`;
          }

          const vtRes = await axios.get(vtUrl, { headers: { "x-apikey": vtApiKey }, timeout: 15000 });
          const stats = vtRes.data?.data?.attributes?.last_analysis_stats;
          if (stats) {
            vtMalicious = stats.malicious || 0;
            vtSuspicious = stats.suspicious || 0;
          }
          vtReputation = vtRes.data?.data?.attributes?.reputation || 0;
        } catch (err: any) {
          console.warn(`[VirusTotal] API call failed for ${targetType}:`, err.message);
        }
      }

      // ── Call OTX AlienVault ──────────────────────────────
      let otxHits = 0;
      const otxApiKey = process.env.OTX_API_KEY;

      if (otxApiKey && (targetType === "ip" || targetType === "domain" || targetType === "hash")) {
        try {
          let otxIndicator = "IPv4";
          if (targetType === "domain") otxIndicator = "domain";
          if (targetType === "hash") otxIndicator = "file";
          
          const otxRes = await axios.get(
            `https://otx.alienvault.com/api/v1/indicators/${otxIndicator}/${target}/general`,
            { headers: { "X-OTX-API-KEY": otxApiKey }, timeout: 15000 }
          );
          otxHits = otxRes.data?.pulse_info?.count || 0;
        } catch (err: any) {
          console.warn(`[OTX] API call failed for ${targetType}:`, err.message);
        }
      }

      // ── Compute Risk Level ──────────────────────────────
      let riskLevel = "low";
      if (vtMalicious > 0 || otxHits > 5) riskLevel = "high";
      else if (vtSuspicious > 0 || otxHits > 0) riskLevel = "medium";

      const result = {
        target,
        target_type: targetType,
        risk_level: riskLevel,
        vt_malicious: vtMalicious,
        vt_suspicious: vtSuspicious,
        vt_reputation: vtReputation,
        otx_hits: otxHits,
        cached: false,
        created_at: new Date().toISOString(),
      };

      setCache(cacheKey, result);

      // Store in Supabase if configured
      try {
        const sbUrl = process.env.SUPABASE_URL;
        const sbKey = process.env.SUPABASE_SERVICE_KEY;
        if (sbUrl && sbKey) {
          await axios.post(`${sbUrl}/rest/v1/threat_scans`, {
            target, target_type: targetType, vt_malicious: vtMalicious, vt_suspicious: vtSuspicious,
            vt_reputation: vtReputation, otx_hits: otxHits,
            risk_level: riskLevel, user_id: userId || null,
          }, {
            headers: {
              apikey: sbKey,
              Authorization: `Bearer ${sbKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
          });
        }
      } catch (err: any) {
        console.warn("[Supabase] Insert failed:", err.message);
      }

      return res.json({ success: true, data: result });

    } catch (err: any) {
      console.error("[scan-threat] Error:", err.message);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // =================================================================
  // NEW: Live Threat Feed Endpoint (OTX)
  // =================================================================
  app.get("/api/threat/feed", async (req, res) => {
    const cacheKey = "otx_live_feed";
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const otxApiKey = process.env.OTX_API_KEY;
    if (!otxApiKey) {
        return res.json({ success: true, data: [] });
    }

    try {
      // Try subscribed pulses first, fallback to public activity
      let data: any[] = [];
      try {
        const subRes = await axios.get("https://otx.alienvault.com/api/v1/pulses/subscribed?limit=20", {
          headers: { "X-OTX-API-KEY": otxApiKey }, timeout: 10000
        });
        if (subRes.data && subRes.data.results && subRes.data.results.length > 0) {
            data = subRes.data.results;
        }
      } catch (e: any) {
          console.warn("Error fetching subscribed OTX:", e.message);
      }
      
      if (data.length === 0) {
          const pubRes = await axios.get("https://otx.alienvault.com/api/v1/pulses/activity?limit=20", {
            headers: { "X-OTX-API-KEY": otxApiKey }, timeout: 10000
          });
          if (pubRes.data && pubRes.data.results) data = pubRes.data.results;
      }

      const formatted = data.slice(0, 20).map((p: any) => {
          let riskColor = "gray";
          const dLower = (p.description || "").toLowerCase();
          const pLower = (p.name || "").toLowerCase();
          const tLower = (p.tags || []).join(" ").toLowerCase();
          if (dLower.includes("ransomware") || pLower.includes("ransomware") || tLower.includes("ransomware")) riskColor = "red";
          else if (dLower.includes("phishing") || pLower.includes("phishing")) riskColor = "amber";
          else if (p.indicator_count > 50) riskColor = "orange";
          
          return {
              id: p.id,
              name: p.name,
              description: p.description,
              author: p.author_name,
              indicator_count: p.indicator_count,
              tags: p.tags.slice(0, 4),
              created: p.created,
              risk_color: riskColor
          };
      });

      setCache(cacheKey, formatted, 1800000); // 30 mins cache
      return res.json({ success: true, data: formatted });
    } catch (err: any) {
        console.error("Feed error:", err.message);
        return res.status(500).json({ success: false, error: "Failed to fetch threat feed" });
    }
  });

  // =================================================================
  // NEW: AI Analyze Threat Endpoint
  // =================================================================
  app.post("/api/ai-analyze-threat", async (req, res) => {
    const { target, target_type, vt_malicious, vt_suspicious, otx_hits } = req.body || {};
    if (!target) return res.status(400).json({ success: false, error: "Missing target" });

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) return res.status(500).json({ success: false, error: "AI service offline" });

    try {
        const prompt = `You are a strict Cyber Security AI arraying a threat context for a ${target_type} target: ${target}.
Threat signals: VirusTotal returned ${vt_malicious} malicious flags, ${vt_suspicious} suspicious flags. AlienVault OTX reported ${otx_hits} indicator pulses.
Provide a hyper-concise assessment formatted STRICTLY as a JSON object with these exact keys:
"summary": A 2-sentence explanation of what this threat likely is based on the signals.
"risk_level": One word ("High", "Medium", "Low").
"recommended_actions": An array of 3 actionable short steps (e.g. ["Block at firewall", "Isolate endpoints"]). Do NOT wrap in markdown \`\`\`json. Output naked JSON only.`;

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.1,
              max_tokens: 500,
            },
            {
              headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
              timeout: 15000,
            }
          );
    
          let aiText = response.data?.choices?.[0]?.message?.content || "{}";
          // clean any markdown wrappers
          aiText = aiText.replace(/```json/gi, "").replace(/```/gi, "").trim();
          const parsed = JSON.parse(aiText);

          return res.json({ success: true, data: parsed });
    } catch (err: any) {
        console.error("AI Analysis error:", err.message);
        return res.status(500).json({ success: false, error: "AI logic failed. Please try again." });
    }
  });

  // =================================================================
  // NEW: AI Chat Endpoint (Groq proxy — NO API key on frontend)
  // =================================================================
  app.post("/api/ai-chat", async (req, res) => {
    const { message, mode, context } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, error: "Message is required" });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ success: false, error: "AI service not configured" });
    }

    const systemInstruction = `You are TacU- NS AI, a world-class cybersecurity expert and network troubleshooter. 
Your goal is to help users identify threats, analyze network data, and provide actionable security recommendations.
- Provide root cause analysis for security issues.
- Suggest specific fix steps and CLI commands (e.g., nmap, iptables, openssl).
- Offer two modes of explanation: Beginner (simple terms) and Expert (technical details).
- Be concise, professional, and security-focused.
- Format responses with clear headers and bullet points.`;

    const modeStr = mode === "expert" ? "EXPERT" : "BEGINNER";
    const contextStr = context ? `\n[CONTEXT_DATA: ${sanitize(context).substring(0, 2000)}]` : "";

    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `[Mode: ${modeStr}]${contextStr}\n\n${sanitize(message).substring(0, 4000)}` },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        },
        {
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const aiMessage = response.data?.choices?.[0]?.message?.content || "I couldn't process that request.";
      return res.json({ success: true, message: aiMessage });
    } catch (err: any) {
      console.error("[ai-chat] Groq error:", err.response?.data || err.message);
      return res.json({
        success: true,
        message: "⚠️ AI service temporarily unavailable. Please try again in a moment.",
      });
    }
  });

  // =================================================================
  // EXISTING: Threat Intelligence APIs (kept for backward compat)
  // =================================================================
  app.get("/api/threat/abuseipdb/:ip", async (req, res) => {
    const { ip } = req.params;
    if (!isValidIP(ip)) return res.status(400).json({ error: "Invalid IP format" });
    const apiKey = process.env.ABUSEIPDB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "AbuseIPDB API key missing" });

    try {
      const response = await axios.get("https://api.abuseipdb.com/api/v2/check", {
        params: { ipAddress: ip, maxAgeInDays: 90 },
        headers: { Key: apiKey, Accept: "application/json" },
        timeout: 15000,
      });
      res.json(response.data.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  app.get("/api/threat/virustotal/:type/:target", async (req, res) => {
    const { type, target } = req.params;
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "VirusTotal API key missing" });

    try {
      let url = "";
      if (type === "ip") url = `https://www.virustotal.com/api/v3/ip_addresses/${target}`;
      else if (type === "domain") url = `https://www.virustotal.com/api/v3/domains/${target}`;
      else if (type === "url") {
        const encodedUrl = Buffer.from(target).toString("base64").replace(/=/g, "");
        url = `https://www.virustotal.com/api/v3/urls/${encodedUrl}`;
      }

      const response = await axios.get(url, {
        headers: { "x-apikey": apiKey },
        timeout: 15000,
      });
      res.json(response.data.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  app.get("/api/threat/ipinfo/:ip", async (req, res) => {
    const { ip } = req.params;
    if (!isValidIP(ip)) return res.status(400).json({ error: "Invalid IP format" });
    const token = process.env.IPINFO_TOKEN;
    try {
      const url = token ? `https://ipinfo.io/${ip}?token=${token}` : `https://ipinfo.io/${ip}/json`;
      const response = await axios.get(url, { timeout: 10000 });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  app.post("/api/network/scan-ports", async (req, res) => {
    const { host, ports } = req.body;
    if (!host || !ports) return res.status(400).json({ error: "Host and ports required" });
    if (!isValidIP(host) && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(host)) {
      return res.status(400).json({ error: "Invalid host format" });
    }

    const results = [];
    for (const port of ports) {
      const result: any = { port, status: "closed", banner: null, vulnerabilities: [] };
      
      const status: any = await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1500);
        socket.on("connect", () => {
          socket.write("\r\n"); 
          socket.on("data", (data) => {
            result.banner = data.toString().trim().substring(0, 100);
            socket.destroy();
          });
          resolve("open");
        });
        socket.on("timeout", () => { socket.destroy(); resolve("closed"); });
        socket.on("error", () => { socket.destroy(); resolve("closed"); });
        socket.connect(port, host);
      });

      result.status = status;

      if (status === "open") {
        if (port === 22) {
          result.service = "SSH";
          if (result.banner?.includes("OpenSSH_7.2")) {
            result.vulnerabilities.push({ id: "CVE-2016-6210", severity: "medium", description: "User enumeration vulnerability" });
          }
        } else if (port === 80 || port === 443) result.service = "HTTP/HTTPS";
        else if (port === 445) {
          result.service = "SMB";
          result.vulnerabilities.push({ id: "MS17-010", severity: "critical", description: "EternalBlue vulnerability risk" });
        } else if (port === 3389) {
          result.service = "RDP";
          result.vulnerabilities.push({ id: "CVE-2019-0708", severity: "critical", description: "BlueKeep vulnerability risk" });
        }
      }
      results.push(result);
    }
    res.json({ host, results });
  });

  app.post("/api/threat/correlate", async (req, res) => {
    const { externalThreats, localScan, ipInfo } = req.body;
    
    let score = 0;
    const findings = [];

    if (externalThreats?.abuse?.abuseConfidenceScore > 50) {
      score += 40;
      findings.push(`Malicious external IP (${externalThreats.ipAddress}) identified with high confidence.`);
    }

    const criticalVulns = localScan?.filter((p: any) => p.vulnerabilities?.some((v: any) => v.severity === "critical"));
    if (criticalVulns?.length > 0) {
      score += 50;
      findings.push(`Critical vulnerabilities (${criticalVulns.length}) detected on local host ${req.body.host}.`);
    }

    if (ipInfo?.proxy || ipInfo?.vpn) {
      score += 20;
      findings.push("Connection is routed through a proxy or VPN, which may mask malicious origin.");
    }

    const finalScore = Math.min(100, score);
    res.json({
      score: finalScore,
      riskLevel: finalScore > 70 ? "Critical" : finalScore > 40 ? "High" : "Low",
      findings,
      timestamp: new Date().toISOString()
    });
  });

  // =================================================================
  // NEW: Real TCP Ping Endpoint
  // =================================================================
  app.get("/api/network/ping/:host", async (req, res) => {
    const { host } = req.params;
    const count = Math.min(Number(req.query.count) || 4, 10);

    // Validate host
    if (!isValidIP(host) && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(host)) {
      return res.status(400).json({ error: "Invalid host format" });
    }

    const results: { seq: number; time: number; status: string }[] = [];

    for (let i = 0; i < count; i++) {
      const startTime = process.hrtime.bigint();
      const result = await new Promise<{ time: number; status: string }>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);

        socket.on("connect", () => {
          const elapsed = Number(process.hrtime.bigint() - startTime) / 1_000_000; // ms
          socket.destroy();
          resolve({ time: Math.round(elapsed * 100) / 100, status: "Reply" });
        });

        socket.on("timeout", () => {
          socket.destroy();
          resolve({ time: -1, status: "Timeout" });
        });

        socket.on("error", (err: any) => {
          socket.destroy();
          resolve({ time: -1, status: err.code === "ECONNREFUSED" ? "Refused" : "Error" });
        });

        socket.connect(80, host);
      });

      results.push({ seq: i + 1, ...result });
    }

    const successful = results.filter((r) => r.time >= 0);
    const avgTime = successful.length > 0
      ? Math.round((successful.reduce((sum, r) => sum + r.time, 0) / successful.length) * 100) / 100
      : -1;

    res.json({
      host,
      results,
      stats: {
        sent: count,
        received: successful.length,
        lost: count - successful.length,
        lossPercent: Math.round(((count - successful.length) / count) * 100),
        avgTime,
        minTime: successful.length > 0 ? Math.min(...successful.map((r) => r.time)) : -1,
        maxTime: successful.length > 0 ? Math.max(...successful.map((r) => r.time)) : -1,
      },
    });
  });

  // =================================================================
  // NEW: My IP Info (Privacy Shield uses this)
  // =================================================================
  app.get("/api/my-ip", async (req, res) => {
    try {
      const response = await axios.get("https://ipinfo.io/json", { timeout: 10000 });
      const [lat, lon] = (response.data.loc || "0,0").split(",");
      res.json({
        ip: response.data.ip,
        city: response.data.city,
        region: response.data.region,
        country: response.data.country,
        isp: response.data.org,
        asn: response.data.org ? response.data.org.split(" ")[0] : "",
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        timezone: response.data.timezone,
        isVpn: false, 
        isProxy: false,
      });
    } catch (err: any) {
      console.warn("IP Lookup Failed:", err.message);
      // Return a safe fallback rather than failing the whole UI
      res.json({
        ip: "127.0.0.1",
        city: "Unknown", region: "Unknown", country: "Unknown",
        isp: "Local Network", latitude: 0, longitude: 0,
        isVpn: false, isProxy: false
      });
    }
  });

  // =================================================================
  // NEW: Speed Test (measures download of a small payload)
  // =================================================================
  app.get("/api/speed-test", (req, res) => {
    const sizeKB = Math.min(Number(req.query.size) || 256, 1024);
    const payload = Buffer.alloc(sizeKB * 1024, "A");
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", payload.length);
    res.setHeader("Cache-Control", "no-cache, no-store");
    res.send(payload);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] TacU- NS is active on port ${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
