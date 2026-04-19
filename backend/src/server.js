require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed"));
      }
    }
  })
);

const port = Number(process.env.PORT || 8080);
const mongoClient = new MongoClient(process.env.MONGO_URI || "");

let cacheCollection;
let policyCollection;
let swarmCollection;
let profileCollection;
const lookupLimiter = createRateLimiter({
  windowMs: Number(process.env.LOOKUP_RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.LOOKUP_RATE_LIMIT_MAX || 60)
});

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "");
    next();
  } catch (_error) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "tacuns-threat-service", now: new Date().toISOString() });
});

app.post("/api/v1/threat/lookup", async (req, res) => {
  const limited = lookupLimiter(req, res);
  if (limited) {
    return;
  }

  const domain = sanitizeDomain(req.body?.domain);
  if (!domain) {
    return res.status(400).json({ error: "Valid domain is required" });
  }

  const cached = await cacheCollection.findOne({ domain });
  if (cached && cached.expiresAt > new Date()) {
    return res.json({ verdict: cached.verdict, cached: true });
  }

  const [safeBrowsing, otx] = await Promise.all([
    lookupSafeBrowsing(domain),
    lookupOtx(domain)
  ]);

  const verdict = mergeVerdicts(domain, safeBrowsing, otx);

  await cacheCollection.updateOne(
    { domain },
    {
      $set: {
        domain,
        verdict,
        safeBrowsing,
        otx,
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
      }
    },
    { upsert: true }
  );

  res.json({ verdict, cached: false });
});

app.post("/api/v1/threat/explain", async (req, res) => {
  const verdict = req.body?.verdict;
  if (!verdict || typeof verdict !== "object") {
    return res.status(400).json({ error: "Verdict payload is required" });
  }

  const explanation = await summarizeVerdict(verdict);
  res.json({ explanation });
});

app.get("/api/v1/policies/default", async (_req, res) => {
  const policy = await policyCollection.findOne({ key: "default" });
  res.json(
    policy || {
      key: "default",
      blockedDomains: [],
      allowedDomains: [],
      message: "No remote default policy configured"
    }
  );
});

// --- Sentinel AI Cloud v2 Endpoints ---

/**
 * Anonymous Threat Reporting (Swarm Intelligence)
 * Apps report local blocks to build global immunity.
 */
app.post("/api/v2/swarm/report", async (req, res) => {
  const { domain, reason, context } = req.body;
  const sanitized = sanitizeDomain(domain);
  if (!sanitized) return res.status(400).json({ error: "Invalid domain" });

  await swarmCollection.updateOne(
    { domain: sanitized },
    {
      $inc: { reportCount: 1 },
      $set: { lastReported: new Date(), reason, context },
      $setOnInsert: { domain: sanitized, createdAt: new Date() }
    },
    { upsert: true }
  );

  res.json({ ok: true });
});

/**
 * Swarm Vaccine (AI Life Rules)
 * Fetch domains that have been flagged by the community.
 */
app.get("/api/v2/swarm/vaccine", async (_req, res) => {
  const hotThreats = await swarmCollection
    .find({ reportCount: { $gt: 5 } }) // Simple threshold for demo
    .sort({ reportCount: -1 })
    .limit(100)
    .toArray();
  
  res.json({
    version: Date.now(),
    rules: hotThreats.map(t => ({ domain: t.domain, reason: t.reason }))
  });
});

/**
 * Profile Sync
 * Backup and Restore user-defined rules.
 */
app.post("/api/v2/profile/sync", async (req, res) => {
  const { userId, rules, settings } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  await profileCollection.updateOne(
    { userId },
    { $set: { rules, settings, updatedAt: new Date() } },
    { upsert: true }
  );

  res.json({ ok: true });
});

app.get("/api/v2/profile/:userId", async (req, res) => {
  const profile = await profileCollection.findOne({ userId: req.params.userId });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

app.put("/api/v1/admin/policies/default", requireAdmin, async (req, res) => {
  const payload = {
    key: "default",
    blockedDomains: Array.isArray(req.body?.blockedDomains) ? req.body.blockedDomains : [],
    allowedDomains: Array.isArray(req.body?.allowedDomains) ? req.body.allowedDomains : [],
    message: typeof req.body?.message === "string" ? req.body.message : "Updated",
    updatedAt: new Date()
  };

  await policyCollection.updateOne({ key: "default" }, { $set: payload }, { upsert: true });
  res.json({ ok: true, policy: payload });
});

async function lookupSafeBrowsing(domain) {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    return { matched: false, source: "google_safe_browsing", reason: "API key not configured" };
  }

  const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client: {
        clientId: "tacuns-firewall",
        clientVersion: "1.0.0"
      },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url: `http://${domain}` }, { url: `https://${domain}` }]
      }
    })
  });

  if (!response.ok) {
    return { matched: false, source: "google_safe_browsing", reason: `Safe Browsing failed with ${response.status}` };
  }

  const data = await response.json();
  return {
    matched: Array.isArray(data.matches) && data.matches.length > 0,
    source: "google_safe_browsing",
    reason: Array.isArray(data.matches) && data.matches.length > 0 ? "Domain matched Google Safe Browsing" : "No Safe Browsing hit",
    raw: data
  };
}

async function lookupOtx(domain) {
  const apiKey = process.env.OTX_API_KEY;
  if (!apiKey) {
    return { matched: false, source: "alienvault_otx", reason: "API key not configured" };
  }

  const response = await fetch(`https://otx.alienvault.com/api/v1/indicators/domain/${domain}/general`, {
    headers: {
      "X-OTX-API-KEY": apiKey
    }
  });

  if (!response.ok) {
    return { matched: false, source: "alienvault_otx", reason: `OTX failed with ${response.status}` };
  }

  const data = await response.json();
  const pulseCount = Array.isArray(data.pulse_info?.pulses) ? data.pulse_info.pulses.length : 0;
  return {
    matched: pulseCount > 0,
    source: "alienvault_otx",
    reason: pulseCount > 0 ? `Found ${pulseCount} OTX pulse matches` : "No OTX pulse hits",
    pulseCount
  };
}

async function summarizeVerdict(verdict) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return `Threat source: ${verdict.source}. Reason: ${verdict.reason}. Confidence: ${verdict.confidence}.`;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You summarize security verdicts for a mobile firewall app. Keep responses under 60 words."
        },
        {
          role: "user",
          content: JSON.stringify(verdict)
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    return `Threat source: ${verdict.source}. Reason: ${verdict.reason}. Confidence: ${verdict.confidence}.`;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || `Threat source: ${verdict.source}. Reason: ${verdict.reason}.`;
}

function mergeVerdicts(domain, safeBrowsing, otx) {
  if (safeBrowsing.matched) {
    return {
      domain,
      action: "BLOCK",
      confidence: 95,
      source: "google_safe_browsing",
      reason: safeBrowsing.reason
    };
  }

  if (otx.matched) {
    return {
      domain,
      action: "BLOCK",
      confidence: 85,
      source: "alienvault_otx",
      reason: otx.reason
    };
  }

  return {
    domain,
    action: "ALLOW",
    confidence: 60,
    source: "reputation_engine",
    reason: "No threat intelligence hit found"
  };
}

function sanitizeDomain(input) {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!cleaned || cleaned.length > 253 || cleaned.includes(" ")) return null;
  return cleaned;
}

async function start() {
  try {
    // Mocking DB for demo
    // await mongoClient.connect();
    console.log("MOCK: Skipping MongoDB connection for local demo.");
    const db = { collection: () => ({ createIndex: async () => {}, findOne: async () => null, find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }), updateOne: async () => {} }) };
    cacheCollection = db.collection("threat_cache");
    policyCollection = db.collection("policies");
    swarmCollection = db.collection("swarm_intelligence");
    profileCollection = db.collection("user_profiles");
  } catch (err) {
    console.warn("DB Connection failed, continuing in mock mode for health check.");
  }
  
  app.listen(port, () => {
    console.log(`TacU NS threat service listening on ${port}`);
  });
}

function createRateLimiter({ windowMs, max }) {
  const hits = new Map();
  return (req, res) => {
    const now = Date.now();
    const forwarded = req.headers["x-forwarded-for"];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : req.socket.remoteAddress || "unknown";

    const current = hits.get(ip);
    if (!current || current.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }

    if (current.count >= max) {
      res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000)
      });
      return true;
    }

    current.count += 1;
    hits.set(ip, current);
    return false;
  };
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
