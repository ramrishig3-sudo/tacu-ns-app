import React, { useState } from "react";
import {
  Mail, Shield, AlertTriangle, CheckCircle, Info,
  Activity, Search, Zap, ChevronDown, HelpCircle,
  ShieldCheck, ShieldAlert, MapPin, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthStatus = "pass" | "fail" | "softfail" | "neutral" | "none";
type Severity   = "high" | "medium" | "low" | "info";

interface ReceivedHop {
  raw: string;
  from: string;
  by: string;
  ip: string | null;
  timestamp: string;
}

interface ThreatFlag {
  severity: Severity;
  title: string;
  description: string;
}

interface HeaderAnalysis {
  from: string;
  fromDisplay: string;
  fromDomain: string;
  to: string;
  subject: string;
  date: string;
  messageId: string;
  replyTo: string;
  returnPath: string;
  xMailer: string;
  originatingIp: string | null;
  spf: AuthStatus;
  dkim: AuthStatus;
  dmarc: AuthStatus;
  hops: ReceivedHop[];
  flags: ThreatFlag[];
  trustScore: number;
  risk: "safe" | "suspicious" | "high";
}

// ─── Parsing Helpers ──────────────────────────────────────────────────────────

function getHeader(raw: string, name: string): string {
  const re = new RegExp(`^${name}:\\s*([\\s\\S]*?)(?=\\n[^\\s]|$)`, "im");
  const m = raw.match(re);
  if (!m) return "";
  return m[1].replace(/\r?\n[\t ]+/g, " ").trim();
}

function extractDomain(emailStr: string): string {
  const m = emailStr.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return m ? m[1].toLowerCase() : "";
}

function extractDisplayName(emailStr: string): string {
  const m = emailStr.match(/^"?([^"<]+)"?\s*</);
  return m ? m[1].trim() : "";
}

function extractEmail(str: string): string {
  const m = str.match(/<([^>]+)>/);
  return m ? m[1].trim() : str.trim();
}

function extractIp(str: string): string | null {
  const m = str.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
  return m ? m[1] : null;
}

function parseAuthStatus(raw: string, field: string): AuthStatus {
  const re = new RegExp(`${field}\\s*=\\s*(pass|fail|softfail|neutral|temperror|permerror|none)`, "i");
  const m = raw.match(re);
  if (!m) return "none";
  const v = m[1].toLowerCase();
  if (v === "pass") return "pass";
  if (v === "softfail") return "softfail";
  if (v === "neutral") return "neutral";
  if (v === "none") return "none";
  return "fail";
}

const PHISHING_KEYWORDS = [
  "urgent", "immediately", "verify your account", "confirm your password",
  "wire transfer", "click here", "suspended", "unusual activity",
  "update your information", "security alert", "limited time", "act now",
];

const SUSPICIOUS_MAILERS = ["phpmailer", "sendblaster", "massmailer", "bulk", "smtp2go spam"];

// ─── Core Analysis Engine ─────────────────────────────────────────────────────

function analyzeHeader(raw: string): HeaderAnalysis {
  const flags: ThreatFlag[] = [];
  let trustScore = 100;

  const fromRaw    = getHeader(raw, "From");
  const fromEmail  = extractEmail(fromRaw);
  const fromDisplay = extractDisplayName(fromRaw);
  const fromDomain = extractDomain(fromEmail);
  const replyToRaw = getHeader(raw, "Reply-To");
  const replyEmail = replyToRaw ? extractEmail(replyToRaw) : "";
  const replyDomain = extractDomain(replyEmail);
  const returnPath = getHeader(raw, "Return-Path").replace(/[<>]/g, "").trim();
  const returnDomain = extractDomain(returnPath);
  const messageId  = getHeader(raw, "Message-ID");
  const xMailer    = getHeader(raw, "X-Mailer") || getHeader(raw, "X-Mailer-Info");
  const originIp   = getHeader(raw, "X-Originating-IP") ||
                     getHeader(raw, "X-Source-IP") ||
                     getHeader(raw, "X-Forwarded-To");

  const authResults = getHeader(raw, "Authentication-Results") + "\n" + raw;
  const spf  = parseAuthStatus(authResults, "spf");
  const dkim = parseAuthStatus(authResults, "dkim");
  const dmarc = parseAuthStatus(authResults, "dmarc");

  const hopRe = /^Received:\s*([\s\S]*?)(?=\nReceived:|\nFrom:|\n[A-Z][a-zA-Z-]+:|$)/gim;
  const hops: ReceivedHop[] = [];
  let hopMatch;
  while ((hopMatch = hopRe.exec(raw)) !== null) {
    const block = hopMatch[1].replace(/\r?\n[\t ]+/g, " ").trim();
    const fromM = block.match(/from\s+([^\s(]+)/i);
    const byM   = block.match(/by\s+([^\s(]+)/i);
    const timeM = block.match(/;\s*(.+)$/);
    hops.push({
      raw: block,
      from: fromM ? fromM[1] : "unknown",
      by:   byM   ? byM[1]   : "unknown",
      ip:   extractIp(block),
      timestamp: timeM ? timeM[1].trim() : "unknown",
    });
  }

  if (spf === "fail") {
    trustScore -= 30;
    flags.push({ severity: "high", title: "SPF Authentication Failed",
      description: `The sending server is NOT authorized to send email for domain "${fromDomain}". Classic spoofing indicator.` });
  } else if (spf === "softfail") {
    trustScore -= 15;
    flags.push({ severity: "medium", title: "SPF Soft Fail",
      description: `Sending server is weakly unauthorized for "${fromDomain}". Domain owner prefers rejection but hasn't enforced it.` });
  }

  if (dkim === "fail") {
    trustScore -= 25;
    flags.push({ severity: "high", title: "DKIM Signature Invalid",
      description: "Email content was modified after it was signed by the sender's server, or the signature is forged." });
  }

  if (dmarc === "fail") {
    trustScore -= 30;
    flags.push({ severity: "high", title: "DMARC Policy Violated",
      description: `Domain "${fromDomain}" has a DMARC policy that this email failed. The sending domain does not match the visible From address.` });
  }

  if (replyDomain && fromDomain && replyDomain !== fromDomain) {
    trustScore -= 40;
    flags.push({ severity: "high", title: "Reply-To Domain Mismatch",
      description: `From: "${fromDomain}" but replies go to "${replyDomain}". This is the #1 phishing technique — the email looks like it's from a trusted source but your reply goes to the attacker.` });
  }

  if (returnDomain && fromDomain && returnDomain !== fromDomain) {
    trustScore -= 20;
    flags.push({ severity: "medium", title: "Return-Path Domain Mismatch",
      description: `Bounce address domain "${returnDomain}" differs from sender domain "${fromDomain}". Could indicate envelope spoofing.` });
  }

  if (fromDisplay) {
    const displayHasDomain = fromDisplay.includes(".com") || fromDisplay.includes(".net") ||
                             fromDisplay.includes(".org") || fromDisplay.includes("bank") ||
                             fromDisplay.includes("paypal") || fromDisplay.includes("google") ||
                             fromDisplay.includes("amazon") || fromDisplay.includes("microsoft") ||
                             fromDisplay.includes("apple") || fromDisplay.includes("security");
    if (displayHasDomain) {
      const displayDomain = extractDomain(fromDisplay.replace(/\s/g, ""));
      if (!displayDomain || displayDomain !== fromDomain) {
        trustScore -= 20;
        flags.push({ severity: "medium", title: "Display Name Spoofing",
          description: `The visible name "${fromDisplay}" references a brand/domain that doesn't match the actual sender address "${fromEmail}". Attackers use this to appear legitimate.` });
      }
    }
  }

  if (!messageId) {
    trustScore -= 10;
    flags.push({ severity: "low", title: "Missing Message-ID",
      description: "Legitimate mail servers always add a Message-ID. Its absence suggests automated spam tools or a stripped/forged header." });
  }

  if (xMailer) {
    const mailerLower = xMailer.toLowerCase();
    if (SUSPICIOUS_MAILERS.some(s => mailerLower.includes(s))) {
      trustScore -= 20;
      flags.push({ severity: "medium", title: "Suspicious Mail Client",
        description: `X-Mailer "${xMailer}" is commonly associated with bulk email senders, spam tools, or phishing kits.` });
    }
  }

  const subject = getHeader(raw, "Subject").toLowerCase();
  const foundKeywords = PHISHING_KEYWORDS.filter(k => subject.includes(k));
  if (foundKeywords.length > 0) {
    const deduction = Math.min(35, foundKeywords.length * 12);
    trustScore -= deduction;
    flags.push({ severity: foundKeywords.length >= 2 ? "high" : "medium",
      title: "Phishing Keywords Detected",
      description: `Subject contains social engineering trigger words: "${foundKeywords.slice(0, 3).join('", "')}". These are used to create urgency and bypass rational thinking.` });
  }

  if (hops.length >= 2) {
    const times = hops.map(h => Date.parse(h.timestamp)).filter(t => !isNaN(t));
    let outOfOrder = 0;
    for (let i = 1; i < times.length; i++) {
      if (times[i] > times[i - 1]) outOfOrder++;
    }
    if (outOfOrder > 0) {
      trustScore -= 25;
      flags.push({ severity: "high", title: "Timestamp Order Anomaly",
        description: "The Received headers have timestamps out of sequence. Legitimate email chains always flow forward in time. This is a strong indicator of header forgery." });
    }
  }

  trustScore = Math.max(0, Math.min(100, trustScore));
  const risk: HeaderAnalysis["risk"] =
    trustScore >= 70 ? "safe" : trustScore >= 40 ? "suspicious" : "high";

  if (flags.length === 0) {
    flags.push({ severity: "info", title: "No Threats Detected",
      description: "All authentication checks passed and no phishing patterns were found. This email appears legitimate." });
  }

  return {
    from: fromEmail, fromDisplay, fromDomain,
    to: getHeader(raw, "To"),
    subject: getHeader(raw, "Subject"),
    date: getHeader(raw, "Date"),
    messageId, replyTo: replyEmail, returnPath, xMailer,
    originatingIp: originIp || (hops.length > 0 ? hops[hops.length - 1].ip : null),
    spf, dkim, dmarc, hops, flags, trustScore, risk,
  };
}

// ─── Demo Header ──────────────────────────────────────────────────────────────

const DEMO_HEADER = `Received: from mail.evil-domain.ru (mail.evil-domain.ru [185.220.101.42])
        by mx.gmail.com with ESMTPS id x12si123456.0 for <victim@gmail.com>;
        Mon, 06 May 2025 01:00:00 -0700
Received: from [192.168.1.1] (unknown [10.0.0.1])
        by mail.evil-domain.ru with SMTP id abc123;
        Mon, 06 May 2025 00:58:00 -0700
Authentication-Results: mx.gmail.com;
       spf=fail (google.com: domain of ceo@yourcompany.com does not designate 185.220.101.42 as permitted sender);
       dkim=fail header.i=@yourcompany.com;
       dmarc=fail (p=REJECT sp=REJECT dis=REJECT) header.from=yourcompany.com
From: "CEO John Smith" <ceo@yourcompany.com>
Reply-To: attacker@evil-domain.ru
To: employee@yourcompany.com
Subject: URGENT: Wire Transfer Required Immediately
Date: Mon, 06 May 2025 08:00:00 +0000
Message-ID: <20250506080000.12345@evil-domain.ru>
X-Mailer: PHPMailer 6.0
X-Originating-IP: 185.220.101.42`;

const CARD_BG   = "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))";
const CARD_BDR  = "rgba(148,163,184,0.1)";
const ACCENT    = "#38BDF8";
const ACCENT_BG = "rgba(56,189,248,0.06)";
const ACCENT_BDR = "rgba(56,189,248,0.18)";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmailAnalyzer() {
  const [rawHeader, setRawHeader]   = useState("");
  const [analysis, setAnalysis]     = useState<HeaderAnalysis | null>(null);
  const [infoOpen, setInfoOpen]     = useState(false);

  const run = () => {
    if (!rawHeader.trim()) return;
    setAnalysis(analyzeHeader(rawHeader));
  };

  const loadDemo = () => {
    setRawHeader(DEMO_HEADER);
    setAnalysis(null);
  };

  const riskColor = {
    safe:       { text: "#34D399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.22)",  stroke: "#34D399" },
    suspicious: { text: "#FCD34D", bg: "rgba(252,211,77,0.08)",  border: "rgba(252,211,77,0.22)",  stroke: "#FCD34D" },
    high:       { text: "#F87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.22)", stroke: "#F87171" },
  };

  const sevColor: Record<Severity, string> = {
    high:   "#F87171",
    medium: "#FCD34D",
    low:    "#94A3B8",
    info:   "#34D399",
  };

  return (
    <div className="space-y-4 pb-20">

      {/* Info card toggle */}
      <button
        onClick={() => setInfoOpen(v => !v)}
        className="w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.99]"
        style={{ background: ACCENT_BG, borderColor: ACCENT_BDR }}
      >
        <div className="flex items-center gap-2.5">
          <HelpCircle size={15} style={{ color: ACCENT }} className="shrink-0" />
          <span className="font-black text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
            What is Email Header Forensics? Tap to {infoOpen ? "hide" : "learn"}
          </span>
        </div>
        <ChevronDown size={14} style={{ color: ACCENT }}
          className={cn("transition-transform duration-200", infoOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {infoOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative rounded-2xl border p-4 space-y-2.5 overflow-hidden"
              style={{ background: CARD_BG, borderColor: ACCENT_BDR }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, transparent)` }} />
              <h3 className="font-black text-sm uppercase tracking-tight mt-1" style={{ color: "var(--text-primary)" }}>
                Email Header Forensics — Explained
              </h3>
              {[
                { emoji: "📧", title: "What is an email header?",
                  body: "Every email has a hidden 'header' — like a delivery receipt that shows every server the email passed through, who sent it, and security checks. The visible email only shows From/To/Subject. The header shows the full truth." },
                { emoji: "🎭", title: "What is email spoofing / phishing?",
                  body: "Attackers send emails that appear to be from your bank, CEO, or PayPal — but are actually from fake servers. They change the 'From' display name but the header reveals the real sender. This tool exposes those lies." },
                { emoji: "🔍", title: "What does this tool check?",
                  body: "SPF/DKIM/DMARC authentication, Reply-To vs From mismatch (the #1 phishing trick), display name spoofing, real origin IP, phishing keywords in subject, suspicious mail tools, and timestamp forgery." },
                { emoji: "📋", title: "How do I get my email header?",
                  body: "Gmail: Open email → 3-dot menu → 'Show original' → copy all text. Outlook: File → Properties → copy Internet headers. WhatsApp/SMS don't have headers — this is only for emails." },
              ].map(item => (
                <div key={item.title} className="flex gap-3 p-2.5 rounded-xl border"
                  style={{ background: "rgba(148,163,184,0.04)", borderColor: CARD_BDR }}>
                  <span className="text-base shrink-0 mt-0.5">{item.emoji}</span>
                  <div>
                    <p className="font-black text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </p>
                    <p className="text-[9px] font-bold leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input card */}
      <div className="relative rounded-2xl border p-4 overflow-hidden"
        style={{ background: CARD_BG, borderColor: ACCENT_BDR }}>
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${ACCENT}, transparent)` }} />
        <div className="flex items-center gap-3 mb-4 mt-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BDR}` }}>
            <Mail size={16} style={{ color: ACCENT }} />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-tight" style={{ color: "var(--text-primary)" }}>
              Header Intelligence
            </h3>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Paste raw email header below
            </p>
          </div>
        </div>

        <textarea
          value={rawHeader}
          onChange={e => { setRawHeader(e.target.value); setAnalysis(null); }}
          placeholder={"Paste full raw email header here...\n\nIn Gmail: open email → ⋮ menu → Show original → copy all text\nIn Outlook: File → Properties → Internet headers"}
          className="w-full h-40 p-3 rounded-xl border text-[9px] font-mono resize-none outline-none transition-colors"
          style={{ background: "rgba(148,163,184,0.04)", borderColor: CARD_BDR, color: "var(--text-primary)" }}
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={loadDemo}
            className="flex-1 py-2.5 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
            style={{ borderColor: CARD_BDR, color: "var(--text-secondary)", background: "rgba(148,163,184,0.04)" }}
          >
            Load Demo
          </button>
          <button
            onClick={run}
            className="flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 text-white flex items-center justify-center gap-1"
            style={{ background: ACCENT, boxShadow: "0 4px 14px rgba(56,189,248,0.22)" }}
          >
            <Zap size={10} className="inline" />
            Analyze
          </button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Trust score gauge + verdict */}
            <div className="relative rounded-2xl border p-4 overflow-hidden flex flex-col items-center py-6"
              style={{ background: CARD_BG, borderColor: riskColor[analysis.risk].border }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, ${riskColor[analysis.risk].stroke}, transparent)` }} />
              <div className="relative w-24 h-24 mb-4 mt-1">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" strokeWidth="9" style={{ stroke: "rgba(148,163,184,0.10)" }} />
                  <motion.circle
                    cx="50" cy="50" r="40" fill="none" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray="251"
                    initial={{ strokeDashoffset: 251 }}
                    animate={{ strokeDashoffset: 251 - (251 * analysis.trustScore / 100) }}
                    transition={{ duration: 1.0, ease: "easeOut" }}
                    style={{ stroke: riskColor[analysis.risk].stroke }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-metric font-black text-2xl leading-none" style={{ color: "var(--text-primary)" }}>
                    {analysis.trustScore}
                  </span>
                  <span className="text-[7px] font-black uppercase opacity-50 mt-0.5">Trust Score</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
                style={{ color: riskColor[analysis.risk].text, background: riskColor[analysis.risk].bg, borderColor: riskColor[analysis.risk].border }}>
                {analysis.risk === "safe" ? "LIKELY LEGITIMATE" : analysis.risk === "suspicious" ? "SUSPICIOUS EMAIL" : "HIGH RISK — POSSIBLE PHISHING"}
              </span>
            </div>

            {/* SPF / DKIM / DMARC row */}
            <div className="grid grid-cols-3 gap-2">
              {(["spf", "dkim", "dmarc"] as const).map(key => {
                const val = analysis[key];
                const color = val === "pass" ? "#34D399" : val === "none" ? "#94A3B8" : "#F87171";
                return (
                  <div key={key} className="p-2.5 rounded-xl border text-center"
                    style={{ background: "rgba(148,163,184,0.04)", borderColor: CARD_BDR }}>
                    <p className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-secondary)" }}>{key.toUpperCase()}</p>
                    <p className="font-black text-[10px] uppercase" style={{ color }}>{val}</p>
                  </div>
                );
              })}
            </div>

            {/* Threat flags */}
            <div className="relative rounded-2xl border p-4 overflow-hidden"
              style={{ background: CARD_BG, borderColor: CARD_BDR }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, transparent)` }} />
              <h3 className="text-[7px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 mt-1" style={{ color: ACCENT }}>
                <ShieldAlert size={11} />
                Forensic Findings ({analysis.flags.length})
              </h3>
              <div className="space-y-2">
                {analysis.flags.map((flag, i) => (
                  <div key={i} className="p-3 rounded-xl border"
                    style={{ background: `${sevColor[flag.severity]}10`, borderColor: `${sevColor[flag.severity]}28` }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-black text-[9px] uppercase tracking-wider" style={{ color: sevColor[flag.severity] }}>
                        {flag.title}
                      </p>
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase border"
                        style={{ color: sevColor[flag.severity], borderColor: `${sevColor[flag.severity]}30`, background: `${sevColor[flag.severity]}10` }}>
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-[9px] font-bold leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {flag.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata grid */}
            <div className="relative rounded-2xl border p-4 overflow-hidden"
              style={{ background: CARD_BG, borderColor: CARD_BDR }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, transparent)` }} />
              <h3 className="text-[7px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 mt-1" style={{ color: ACCENT }}>
                <Info size={11} />
                Message Metadata
              </h3>
              <div className="space-y-1.5">
                {[
                  { label: "From",         value: analysis.from },
                  { label: "Display Name", value: analysis.fromDisplay || "—" },
                  { label: "Reply-To",     value: analysis.replyTo || "Same as From" },
                  { label: "Return-Path",  value: analysis.returnPath || "—" },
                  { label: "To",           value: analysis.to },
                  { label: "Subject",      value: analysis.subject },
                  { label: "Date",         value: analysis.date },
                  { label: "Origin IP",    value: analysis.originatingIp || "Not disclosed" },
                  { label: "X-Mailer",     value: analysis.xMailer || "Not disclosed" },
                ].map(row => (
                  <div key={row.label} className="flex gap-2 py-1.5 border-b" style={{ borderColor: CARD_BDR }}>
                    <span className="text-[8px] font-black uppercase tracking-wider w-24 shrink-0 pt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {row.label}
                    </span>
                    <span className="text-[9px] font-bold font-mono break-all" style={{ color: "var(--text-primary)" }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Relay chain */}
            {analysis.hops.length > 0 && (
              <div className="relative rounded-2xl border p-4 overflow-hidden"
                style={{ background: CARD_BG, borderColor: CARD_BDR }}>
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${ACCENT}, transparent)` }} />
                <h3 className="text-[7px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 mt-1" style={{ color: ACCENT }}>
                  <Activity size={11} />
                  Relay Chain ({analysis.hops.length} hop{analysis.hops.length > 1 ? "s" : ""})
                </h3>
                <div className="space-y-2">
                  {analysis.hops.map((hop, i) => (
                    <div key={i} className="flex gap-3 p-2.5 rounded-xl border"
                      style={{ background: "rgba(148,163,184,0.04)", borderColor: CARD_BDR }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[7px] font-black"
                        style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BDR}` }}>
                        {analysis.hops.length - i}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black uppercase truncate" style={{ color: "var(--text-primary)" }}>
                          {hop.from}
                        </p>
                        <p className="text-[7px] font-bold mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                          via {hop.by}
                          {hop.ip && <span className="ml-2 font-metric" style={{ color: ACCENT }}>[{hop.ip}]</span>}
                        </p>
                        <p className="text-[7px] font-bold mt-0.5" style={{ color: "var(--text-muted)" }}>{hop.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
