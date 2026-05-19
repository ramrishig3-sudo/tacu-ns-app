import express from "express";
import cors from "cors";
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

  // ── CORS (required for Capacitor/Android WebView) ────────
  // Capacitor apps may send 'null', 'capacitor://localhost', or no origin at all.
  // Using a function-based origin handler to always allow access from the app.
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      // or any localhost/capacitor origin
      const allowed = !origin ||
        origin === "null" ||
        origin.startsWith("capacitor://") ||
        origin.startsWith("ionic://") ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("https://localhost") ||
        origin.includes("tacuns.net");
      callback(null, allowed ? true : false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: false, // must be false when origin is dynamic/wildcard
  }));

  // Handle preflight requests for all routes
  app.options("*", cors());

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

      // ── Shodan InternetDB (free, no auth) ───────────────
      let shodanPorts: number[] = [];
      let shodanVulns: string[] = [];
      let shodanHostnames: string[] = [];
      let shodanTags: string[] = [];

      if (targetType === "ip" && isValidIPv4(target)) {
        const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.)/.test(target);
        if (!isPrivate) {
          try {
            const shodanRes = await axios.get(`https://internetdb.shodan.io/${target}`, { timeout: 8000 });
            shodanPorts     = shodanRes.data.ports     || [];
            shodanVulns     = shodanRes.data.vulns     || [];
            shodanHostnames = (shodanRes.data.hostnames || []).slice(0, 5);
            shodanTags      = shodanRes.data.tags      || [];
          } catch (err: any) {
            console.warn("[Shodan] InternetDB failed:", err.message);
          }
        }
      }

      // ── Domain Age via RDAP (free, no auth) ─────────────
      let domainAgeDays: number | null = null;
      let domainRegistrar = "";

      let domainToCheck = "";
      if (targetType === "domain") domainToCheck = target;
      else if (targetType === "url") {
        try { domainToCheck = new URL(target).hostname; } catch {}
      }

      if (domainToCheck) {
        try {
          const rdapRes = await axios.get(`https://rdap.org/domain/${domainToCheck}`, {
            timeout: 10000, maxRedirects: 5, headers: { Accept: "application/json" }
          });
          const events = rdapRes.data?.events || [];
          const regEvent = events.find((e: any) => e.eventAction === "registration");
          if (regEvent?.eventDate) {
            domainAgeDays = Math.floor((Date.now() - new Date(regEvent.eventDate).getTime()) / 86400000);
          }
          for (const entity of (rdapRes.data?.entities || [])) {
            if ((entity.roles || []).includes("registrar")) {
              const fn = (entity.vcardArray?.[1] || []).find((v: any) => Array.isArray(v) && v[0] === "fn");
              if (fn) { domainRegistrar = fn[3] || ""; break; }
            }
          }
        } catch (err: any) {
          console.warn("[RDAP] Domain age check failed:", err.message);
        }
      }

      // ── Compute Risk Level ──────────────────────────────
      let riskLevel = "low";
      if (vtMalicious > 0 || otxHits > 5 || shodanVulns.length > 0) riskLevel = "high";
      else if (vtSuspicious > 0 || otxHits > 0) riskLevel = "medium";
      if (domainAgeDays !== null && domainAgeDays < 30 && vtMalicious > 0) riskLevel = "high";
      else if (domainAgeDays !== null && domainAgeDays < 7 && riskLevel === "low") riskLevel = "medium";

      const result = {
        target,
        target_type: targetType,
        risk_level: riskLevel,
        vt_malicious: vtMalicious,
        vt_suspicious: vtSuspicious,
        vt_reputation: vtReputation,
        otx_hits: otxHits,
        shodan_ports: shodanPorts,
        shodan_vulns: shodanVulns,
        shodan_hostnames: shodanHostnames,
        shodan_tags: shodanTags,
        domain_age_days: domainAgeDays,
        domain_registrar: domainRegistrar,
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
    const { message, messages, mode, context } = req.body || {};

    if ((!message && (!messages || messages.length === 0)) || (message && typeof message !== "string")) {
      return res.status(400).json({ success: false, error: "Message is required" });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ success: false, error: "AI service not configured" });
    }

    // --- Strict Privacy & Sanitization ---
    // We sanitize only the content we send to the AI
    const systemInstruction = `You are TacU- NS AI, a world-class cybersecurity expert.
Your goal is to help users identify threats and provide actionable security recommendations.
- Provide root cause analysis for security issues.
- Suggest specific fix steps and CLI commands.
- Offer two modes: Beginner and Expert.
- Be concise and professional.
- PRIVACY: Do not mention user identities. Do not store these logs.`;

    const modeStr = mode === "expert" ? "EXPERT" : "BEGINNER";
    const contextStr = context ? `\n[CONTEXT_DATA: ${sanitize(context).substring(0, 2000)}]` : "";

    // Build the message list for Groq
    let apiMessages = [
      { role: "system", content: systemInstruction }
    ];

    if (messages && Array.isArray(messages)) {
      // Limit to last 8 messages for token hygiene & privacy
      const recentHistory = messages.slice(-8).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: sanitize(m.content).substring(0, 2000)
      }));
      apiMessages = [...apiMessages, ...recentHistory];
    } else if (message) {
      apiMessages.push({ 
        role: "user", 
        content: `[Mode: ${modeStr}]${contextStr}\n\n${sanitize(message).substring(0, 4000)}` 
      });
    }

    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: apiMessages,
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
      // USER REQUIREMENT: Show friendly message, no stack traces
      return res.json({
        success: true,
        message: "⚠️ AI service is temporarily unavailable. Please try again.",
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
      // 1. x-forwarded-for (first IP), 2. cf-connecting-ip, 3. x-real-ip, 4. socket addr
      let clientIp = (req.headers["x-forwarded-for"] as string || "").split(",")[0].trim() ||
                     (req.headers["cf-connecting-ip"] as string) ||
                     (req.headers["x-real-ip"] as string) ||
                     req.socket.remoteAddress || "127.0.0.1";

      if (clientIp.startsWith("::ffff:")) clientIp = clientIp.substring(7);
      if (clientIp === "::1") clientIp = "127.0.0.1";

      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}$/;
      const isValid = clientIp && clientIp !== "127.0.0.1" && ipRegex.test(clientIp);

      const lookupUrl = isValid 
        ? `https://ipinfo.io/${clientIp}/json` 
        : `https://ipinfo.io/json`; // Fallback to current request IP (last resort)

      if (!lookupUrl) {
        throw new Error("Client IP identification failed");
      }

      const response = await axios.get(lookupUrl, { timeout: 10000 });
      const [lat, lon] = (response.data.loc || "0,0").split(",");
      
      res.json({
        ip: response.data.ip || clientIp,
        city: response.data.city || "Secured Node",
        region: response.data.region || "Edge Context",
        country: response.data.country || "Secured Region",
        isp: response.data.org || "Global Mesh Node",
        asn: response.data.org ? response.data.org.split(" ")[0] : "AS0000",
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        timezone: response.data.timezone || "UTC",
        isVpn: false, 
        isProxy: false,
      });
    } catch (err: any) {
      console.warn("IP Lookup Failed:", err.message);
      res.json({
        ip: "127.0.0.1",
        city: "Unknown", region: "Unknown", country: "Unknown",
        isp: "Local Access", latitude: 0, longitude: 0,
        isVpn: false, isProxy: false
      });
    }
  });

  // =================================================================
  // NEW: Speed Test (measures download/upload throughput)
  // =================================================================
  app.get("/api/speed-test", (req, res) => {
    // anti-caching
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    // Support larger chunks for high-speed WiFi (up to 4MB per request)
    const sizeMB = Math.min(Number(req.query.size) || 1, 4);
    const payload = Buffer.alloc(Math.floor(sizeMB * 1024 * 1024), "X");
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", payload.length);
    res.send(payload);
  });

  app.post("/api/speed-test/upload", (req, res) => {
    // throughput handshake
    res.setHeader("Cache-Control", "no-cache, no-store");
    res.json({ success: true, received: req.headers["content-length"] });
  });

  // =================================================================
  // IP Deep Intelligence
  // Sources per multi-vector analysis methodology:
  //   ipinfo.io     — Geolocation, ASN, ISP (free, no auth)
  //   Shodan InternetDB — Open ports, CVEs, hostnames (free, no auth)
  //   GreyNoise Community v3 — Behavioral classification (free, unauthenticated)
  //   AbuseIPDB v2  — Abuse confidence score (requires ABUSEIPDB_API_KEY)
  // Ref: https://docs.greynoise.io/reference/get_v3-community-ip
  // Ref: https://docs.abuseipdb.com/#check-endpoint
  // =================================================================
  app.get("/api/ip-intel/:ip", async (req, res) => {
    const ip = sanitize(req.params.ip);

    if (!isValidIPv4(ip)) {
      return res.status(400).json({ success: false, error: "Valid public IPv4 address required" });
    }

    const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|0\.)/.test(ip);
    if (isPrivate) {
      return res.status(400).json({ success: false, error: "Private or reserved IP — not externally routable" });
    }

    const cacheKey = `ip_intel_${ip}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: { ...cached, cached: true } });

    try {
      // ── 1. ipinfo.io — Geolocation + ASN/ISP (free, no auth) ──────────────
      let geo: Record<string, string> = {};
      try {
        const token = process.env.IPINFO_TOKEN;
        const url = token
          ? `https://ipinfo.io/${ip}/json?token=${token}`
          : `https://ipinfo.io/${ip}/json`;
        const r = await axios.get(url, { timeout: 8000 });
        geo = r.data || {};
      } catch (e: any) { console.warn("[ipinfo] failed:", e.message); }

      // ── 2. Shodan InternetDB — Attack surface (free, no auth) ─────────────
      let shodanPorts: number[] = [];
      let shodanCves: string[] = [];
      let shodanHostnames: string[] = [];
      let shodanTags: string[] = [];
      try {
        const r = await axios.get(`https://internetdb.shodan.io/${ip}`, { timeout: 8000 });
        shodanPorts     = r.data.ports     || [];
        shodanCves      = r.data.vulns     || [];
        shodanHostnames = (r.data.hostnames || []).slice(0, 5);
        shodanTags      = r.data.tags      || [];
      } catch (e: any) { console.warn("[Shodan InternetDB] failed:", e.message); }

      // ── 3. GreyNoise Community v3 — Behavioral classification ──────────────
      // Endpoint: GET https://api.greynoise.io/v3/community/{ip}
      // Fields: noise (internet scanner), riot (known benign), classification
      let gnNoise = false, gnRiot = false;
      let gnClassification = "unknown", gnName = "", gnLastSeen = "";
      try {
        const r = await axios.get(`https://api.greynoise.io/v3/community/${ip}`, { timeout: 8000 });
        gnNoise          = r.data.noise === true;
        gnRiot           = r.data.riot  === true;
        gnClassification = r.data.classification || "unknown";
        gnName           = r.data.name     || "";
        gnLastSeen       = r.data.last_seen || "";
      } catch (e: any) {
        if ((e as any).response?.status !== 404) console.warn("[GreyNoise] failed:", e.message);
      }

      // ── 4. AbuseIPDB v2 — Abuse history (requires ABUSEIPDB_API_KEY) ───────
      // Endpoint: GET https://api.abuseipdb.com/api/v2/check
      // Headers: Key: <apiKey>, Accept: application/json
      let abuseScore = 0, abuseReports = 0, abuseLastReported = "", abuseIsp = "";
      const abuseHasKey = !!process.env.ABUSEIPDB_API_KEY;
      if (abuseHasKey) {
        try {
          const r = await axios.get("https://api.abuseipdb.com/api/v2/check", {
            params: { ipAddress: ip, maxAgeInDays: 90 },
            headers: { Key: process.env.ABUSEIPDB_API_KEY!, Accept: "application/json" },
            timeout: 10000,
          });
          const d = r.data?.data || {};
          abuseScore        = d.abuseConfidenceScore || 0;
          abuseReports      = d.totalReports         || 0;
          abuseLastReported = d.lastReportedAt        || "";
          abuseIsp          = d.isp                   || "";
        } catch (e: any) { console.warn("[AbuseIPDB] failed:", e.message); }
      }

      // ── Risk level (multi-source correlation) ─────────────────────────────
      let riskLevel: "critical" | "high" | "medium" | "low" = "low";
      if (abuseScore > 75 || gnClassification === "malicious" || shodanCves.length > 3) {
        riskLevel = "critical";
      } else if (abuseScore > 25 || shodanCves.length > 0) {
        riskLevel = "high";
      } else if (abuseScore > 0 || abuseReports > 0 || gnNoise) {
        riskLevel = "medium";
      }

      const result = {
        ip,
        hostname:     geo.hostname  || shodanHostnames[0] || "",
        city:         geo.city      || "",
        region:       geo.region    || "",
        country:      geo.country   || "",
        org:          geo.org       || abuseIsp || "",
        timezone:     geo.timezone  || "",
        open_ports:   shodanPorts,
        cves:         shodanCves,
        hostnames:    shodanHostnames,
        tags:         shodanTags,
        gn_noise:           gnNoise,
        gn_riot:            gnRiot,
        gn_classification:  gnClassification,
        gn_name:            gnName,
        gn_last_seen:       gnLastSeen,
        abuse_score:        abuseScore,
        abuse_reports:      abuseReports,
        abuse_last_reported: abuseLastReported,
        abuse_has_key:      abuseHasKey,
        risk_level:   riskLevel,
        cached:       false,
        analyzed_at:  new Date().toISOString(),
      };

      setCache(cacheKey, result, 1800000); // 30-min cache
      return res.json({ success: true, data: result });

    } catch (e: any) {
      console.error("[ip-intel] error:", e.message);
      return res.status(500).json({ success: false, error: "Analysis failed" });
    }
  });

  // =================================================================
  // File Hash Lookup — Step 7
  // Sources:
  //   CIRCL HASHLOOKUP — crowd-sourced malware hash database (free, no auth)
  //   VirusTotal v3    — multi-engine file reputation (VIRUSTOTAL_API_KEY)
  // Accepts: MD5 (32 hex), SHA1 (40 hex), SHA256 (64 hex)
  // Ref: https://hashlookup.circl.lu  | https://docs.virustotal.com/reference/files
  // =================================================================
  app.get("/api/hash-lookup/:hash", async (req, res) => {
    const raw = sanitize(req.params.hash).toLowerCase();

    const hashType =
      /^[0-9a-f]{32}$/.test(raw) ? "md5"
      : /^[0-9a-f]{40}$/.test(raw) ? "sha1"
      : /^[0-9a-f]{64}$/.test(raw) ? "sha256"
      : null;

    if (!hashType) {
      return res.status(400).json({
        success: false,
        error: "Invalid hash. Paste an MD5 (32 chars), SHA1 (40 chars) or SHA256 (64 chars) hex hash.",
      });
    }

    const cacheKey = `hash_${raw}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: { ...cached, cached: true } });

    const result: Record<string, any> = {
      hash: raw,
      hash_type: hashType.toUpperCase(),
      verdict: "unknown",          // "known_malware" | "clean" | "unknown"
      malware_name: null as string | null,
      malware_family: null as string | null,
      detection_count: 0,
      total_engines: 0,
      circl_found: false,
      vt_found: false,
      vt_has_key: !!process.env.VIRUSTOTAL_API_KEY,
      cached: false,
      analyzed_at: new Date().toISOString(),
    };

    // ── 1. CIRCL HASHLOOKUP — free, no auth needed ──────────────────────────
    // CIRCL stores hashes of ALL known files (NSRL + malware DBs).
    // "Found" only means the file is known — NOT necessarily malicious.
    // Only treat as malware if the ClamAV antivirus field has a signature.
    try {
      const r = await axios.get(
        `https://hashlookup.circl.lu/lookup/${hashType}/${raw}`,
        { timeout: 8000 }
      );
      if (r.data && !r.data.message) {
        result.circl_found = true;
        const clamSig = r.data["ClamAV"] || null;
        if (clamSig) {
          // Confirmed malware signature in CIRCL
          result.verdict        = "known_malware";
          result.malware_name   = r.data["FileName"] || r.data["FileName-from-DB"] || null;
          result.malware_family = clamSig;
        }
        // No ClamAV sig → file is known (safe) — verdict left for VT to decide
      }
    } catch (e: any) {
      if (e.response?.status !== 404) {
        console.warn("[CIRCL HASHLOOKUP] failed:", e.message);
      }
    }

    // ── 2. VirusTotal v3 — multi-engine reputation (authoritative verdict) ───
    const vtKey = process.env.VIRUSTOTAL_API_KEY;
    if (vtKey) {
      try {
        const r = await axios.get(
          `https://www.virustotal.com/api/v3/files/${raw}`,
          { headers: { "x-apikey": vtKey }, timeout: 12000 }
        );
        const attrs = r.data?.data?.attributes || {};
        const stats = attrs.last_analysis_stats || {};
        const malicious = (stats.malicious || 0) + (stats.suspicious || 0);
        const total     = Object.values(stats as Record<string, number>).reduce((a, b) => a + b, 0);

        result.vt_found        = true;
        result.detection_count = malicious;
        result.total_engines   = total;

        if (malicious > 0) {
          // VT confirms malicious — override any CIRCL result
          result.verdict = "known_malware";
          if (!result.malware_name) result.malware_name = attrs.meaningful_name || attrs.name || null;
          if (!result.malware_family) {
            const cls   = attrs.popular_threat_classification;
            const names = cls?.popular_threat_name as Array<{ value: string }> | undefined;
            result.malware_family = names?.[0]?.value ?? null;
          }
        } else {
          // VT scanned it and zero engines flagged it → clean regardless of CIRCL
          result.verdict = "clean";
        }
      } catch (e: any) {
        if (e.response?.status !== 404) {
          console.warn("[VirusTotal] hash lookup failed:", e.message);
        }
      }
    }

    setCache(cacheKey, result, 3600000); // 1-hour cache
    return res.json({ success: true, data: result });
  });

  // =================================================================
  // Dark Web Breach Check — Step 8
  // Sources:
  //   EmailRep.io  — email reputation + credential leak indicator (free, no auth)
  //   HIBP v3      — full breach list per email (requires HIBP_API_KEY, $3.50/mo)
  // Ref: https://emailrep.io  | https://haveibeenpwned.com/API/v3
  // POST so email never appears in server access logs or CDN cache keys
  // =================================================================
  app.post("/api/breach-check", async (req, res) => {
    const raw = (req.body?.email || "").toString().trim().toLowerCase();

    if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return res.status(400).json({ success: false, error: "Valid email address required" });
    }

    const cacheKey = `breach_${raw}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: { ...cached, cached: true } });

    const result: Record<string, any> = {
      email: raw,
      breached: false,
      breach_count: 0,
      breaches: [] as any[],
      rep_reputation: "",
      rep_credentials_leaked: false,
      rep_data_breach: false,
      rep_blacklisted: false,
      rep_malicious: false,
      hibp_has_key: !!process.env.HIBP_API_KEY,
      cached: false,
      checked_at: new Date().toISOString(),
    };

    // ── 1. EmailRep.io — email reputation (free, no auth required) ───────────
    // Returns: reputation score, credential_leaked flag, data_breach flag.
    // Free tier: 10 requests/day without key; raises to 1000/day with free key.
    try {
      const r = await axios.get(`https://emailrep.io/${encodeURIComponent(raw)}`, {
        headers: { "User-Agent": "TacU-NS-SecurityApp/1.0" },
        timeout: 8000,
      });
      const d = r.data || {};
      const details = d.details || {};
      result.rep_reputation        = d.reputation    || "unknown";
      result.rep_credentials_leaked = !!details.credentials_leaked;
      result.rep_data_breach        = !!details.data_breach;
      result.rep_blacklisted        = !!details.blacklisted;
      result.rep_malicious          = !!details.malicious_activity;
      if (details.credentials_leaked || details.data_breach) {
        result.breached = true;
      }
    } catch (e: any) {
      console.warn("[EmailRep] failed:", e.message);
    }

    // ── 2. HIBP v3 — if key is ever added, upgrades to named breach list ────────
    const hibpKey = process.env.HIBP_API_KEY;
    if (hibpKey) {
      try {
        const r = await axios.get(
          `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(raw)}`,
          { headers: { "hibp-api-key": hibpKey, "User-Agent": "TacU-NS-SecurityApp/1.0" }, timeout: 12000 }
        );
        if (Array.isArray(r.data) && r.data.length > 0) {
          result.breached     = true;
          result.breach_count = r.data.length;
          result.breaches     = r.data
            .map((b: any) => ({
              name: b.Name, domain: b.Domain, breach_date: b.BreachDate,
              pwn_count: b.PwnCount, data_classes: b.DataClasses || [], is_verified: b.IsVerified,
            }))
            .sort((a: any, b: any) => new Date(b.breach_date).getTime() - new Date(a.breach_date).getTime());
        }
      } catch (e: any) {
        if ((e as any).response?.status !== 404) console.warn("[HIBP] failed:", e.message);
      }
    }

    setCache(cacheKey, result, 300000);
    return res.json({ success: true, data: result });
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
    app.get(/^\/(?!api).*$/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] TacU- NS is active on port ${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
