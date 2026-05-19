import React, { useRef, useState, useCallback, useEffect } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  QrCode, Camera, X, ShieldAlert, ShieldCheck, AlertTriangle,
  Loader2, Search, RefreshCw, Globe, FileText, Phone,
  Mail, User, IndianRupee, CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import apiClient from "../../services/api";

type ScanState = "idle" | "scanning" | "detected" | "analyzing" | "result";
type QRType = "url" | "upi" | "contact" | "email" | "phone" | "text";
type RiskLevel = "safe" | "suspicious" | "danger";

interface ParsedQR {
  type: QRType;
  raw: string;
  label: string;
  domain?: string;
  protocol?: string;
  upiId?: string;
  payeeName?: string;
  amount?: string;
  note?: string;
  ref?: string;
  contactName?: string;
  contactPhone?: string;
}

interface SecurityResult {
  risk: RiskLevel;
  warnings: string[];
  explanation: string;
  domainAgeDays: number | null;
  exposedPorts: number[];
  vulnIds: string[];
  threatIndicators: number;
}

// ── QR Parsing ────────────────────────────────────────────────────────
function parseQR(raw: string): ParsedQR {
  const text = raw.trim();

  if (/^upi:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const p = url.searchParams;
      return {
        type: "upi", raw: text, label: "UPI Payment",
        upiId:     p.get("pa") || "",
        payeeName: decodeURIComponent(p.get("pn") || ""),
        amount:    p.get("am") || "",
        note:      decodeURIComponent(p.get("tn") || ""),
        ref:       p.get("tr") || "",
      };
    } catch {}
    return { type: "upi", raw: text, label: "UPI Payment" };
  }

  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      return {
        type: "url", raw: text, label: "Web Link",
        domain: url.hostname,
        protocol: url.protocol.replace(":", ""),
      };
    } catch {}
    return { type: "url", raw: text, label: "Web Link" };
  }

  if (/^begin:vcard/i.test(text)) {
    return {
      type: "contact", raw: text, label: "Contact Card",
      contactName:  text.match(/^FN:(.*)/im)?.[1]?.trim() || "",
      contactPhone: text.match(/^TEL[^:]*:(.*)/im)?.[1]?.trim() || "",
    };
  }

  if (/^mailto:/i.test(text)) return { type: "email", raw: text, label: "Email Address" };
  if (/^tel:/i.test(text))    return { type: "phone", raw: text, label: "Phone Number" };
  return { type: "text", raw: text, label: "Plain Text" };
}

// ── Local UPI Analysis ────────────────────────────────────────────────
function analyzeUPI(p: ParsedQR): SecurityResult {
  const warnings: string[] = [];

  if (!p.upiId) {
    warnings.push("No UPI ID found in this QR code");
  } else if (!/^[\w.\-+]+@[\w]+$/.test(p.upiId)) {
    warnings.push("UPI ID format looks unusual");
  }

  const suspiciousWords = ["urgent", "emergency", "refund", "prize", "lottery", "win", "lucky", "reward", "immediate"];
  if (suspiciousWords.some(w => ((p.note || "") + " " + (p.payeeName || "")).toLowerCase().includes(w))) {
    warnings.push("Transaction description contains suspicious keywords");
  }

  const amt = parseFloat(p.amount || "0");
  if (amt > 0) warnings.push(`Amount pre-set to ₹${amt} — always verify before paying`);
  if (!p.payeeName) warnings.push("No merchant name in QR — cannot verify recipient");

  const risk: RiskLevel = warnings.length >= 2 ? "suspicious" : "safe";

  const merchant = p.payeeName || "an unidentified recipient";
  const explanation = warnings.length === 0
    ? `This QR initiates a UPI payment to ${merchant} (${p.upiId}). Verify the UPI ID and merchant name match the person or business you intend to pay before confirming.`
    : `This payment QR has characteristics that require your attention. Verify the merchant's identity through a trusted channel before making any payment. Do not pay if you received this QR unexpectedly.`;

  return { risk, warnings, explanation, domainAgeDays: null, exposedPorts: [], vulnIds: [], threatIndicators: 0 };
}

// ── Build Security Result from API response ───────────────────────────
function buildSecurity(data: any, parsed: ParsedQR): SecurityResult {
  const malicious = data.vt_malicious   || 0;
  const suspicious = data.vt_suspicious || 0;
  const intel      = data.otx_hits      || 0;
  const ports: number[] = data.shodan_ports || [];
  const vulns: string[] = data.shodan_vulns || [];
  const age: number | null = data.domain_age_days ?? null;

  const warnings: string[] = [];
  const DANGER_PORTS = [21, 22, 23, 135, 139, 445, 1433, 3306, 3389, 5900];

  if (malicious > 0)   warnings.push(`${malicious} independent security ${malicious === 1 ? "check" : "checks"} flagged this as malicious`);
  if (suspicious > 0)  warnings.push(`${suspicious} suspicious ${suspicious === 1 ? "indicator" : "indicators"} detected`);
  if (intel > 5)       warnings.push(`${intel} active threat intelligence records linked to this target`);
  if (age !== null && age < 7)  warnings.push("Domain registered in the last 7 days — extremely high phishing risk");
  else if (age !== null && age < 30) warnings.push(`Domain only ${age} days old — newly registered`);
  const dp = ports.filter(p => DANGER_PORTS.includes(p));
  if (dp.length > 0)   warnings.push(`High-risk services exposed on ports: ${dp.join(", ")}`);
  if (vulns.length > 0) warnings.push(`${vulns.length} known security ${vulns.length === 1 ? "vulnerability" : "vulnerabilities"} found on host`);

  const risk: RiskLevel =
    data.risk_level === "high"   ? "danger"    :
    data.risk_level === "medium" ? "suspicious" : "safe";

  const domain = parsed.domain || parsed.raw.substring(0, 40);
  let explanation = "";

  if (risk === "safe") {
    explanation = `This link points to ${domain}.${age !== null ? ` The domain has been active for ${age} days.` : ""} No active threats were detected. Proceed normally, but always confirm the URL matches your intended destination.`;
  } else if (risk === "suspicious") {
    explanation = `This link has warning signals. ${warnings[0] || "Unusual characteristics detected."}. Avoid opening it unless you can independently verify the source. Contact the sender to confirm before proceeding.`;
  } else {
    explanation = `This link is flagged as dangerous. ${malicious > 0 ? `${malicious} security ${malicious === 1 ? "system" : "systems"} confirmed this is a threat.` : "Multiple risk factors were detected."} Do NOT open this link. It is likely a phishing, malware, or scam page.`;
  }

  return { risk, warnings, explanation, domainAgeDays: age, exposedPorts: ports, vulnIds: vulns, threatIndicators: malicious };
}

// ── Demo entries ──────────────────────────────────────────────────────
const DEMOS = [
  { label: "Demo: Phishing URL",      value: "http://paypa1-secure-verify.net/login?token=abc123" },
  { label: "Demo: Suspicious UPI QR", value: "upi://pay?pa=prize_winner@upi&pn=Emergency%20Refund&am=9999&tn=Urgent%3A+Prize+Claim" },
];

const AMBER = "#FCD34D";
const AMBER_BG  = "rgba(252,211,77,0.08)";
const AMBER_BDR = "rgba(252,211,77,0.22)";

// ─────────────────────────────────────────────────────────────────────
export default function QRScanner() {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const controlsRef  = useRef<any>(null);
  const [scanState,    setScanState]    = useState<ScanState>("idle");
  const [detectedText, setDetectedText] = useState("");
  const [manualInput,  setManualInput]  = useState("");
  const [parsed,       setParsed]       = useState<ParsedQR | null>(null);
  const [security,     setSecurity]     = useState<SecurityResult | null>(null);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [demoOpen,     setDemoOpen]     = useState(false);

  const stopScan = useCallback(() => {
    try { controlsRef.current?.stop?.(); } catch {}
    controlsRef.current = null;
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  const startScan = useCallback(async () => {
    setErrorMsg(""); setDetectedText(""); setParsed(null); setSecurity(null);
    setScanState("scanning");
    try {
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (res: any, _err: any, ctrl: any) => {
          if (res) {
            ctrl.stop(); controlsRef.current = null;
            setDetectedText(res.getText());
            setScanState("detected");
          }
        }
      );
      controlsRef.current = controls;
    } catch {
      setErrorMsg("Camera permission denied. Use the paste field below instead.");
      setScanState("idle");
    }
  }, []);

  const cancelScan = useCallback(() => { stopScan(); setScanState("idle"); }, [stopScan]);

  const analyze = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text) return;

    const p = parseQR(text);
    setParsed(p);
    setScanState("analyzing");
    setErrorMsg("");

    if (p.type === "upi") {
      setSecurity(analyzeUPI(p));
      setScanState("result");
      return;
    }

    if (p.type === "text" || p.type === "contact" || p.type === "phone" || p.type === "email") {
      setSecurity({
        risk: "safe", warnings: [], explanation: "This QR contains local data only. No network connections or payments are triggered.",
        domainAgeDays: null, exposedPorts: [], vulnIds: [], threatIndicators: 0,
      });
      setScanState("result");
      return;
    }

    try {
      const res = await apiClient.post("/api/scan-threat", { target: text });
      if (res.data.success) {
        setSecurity(buildSecurity(res.data.data, p));
        setScanState("result");
      } else {
        setErrorMsg(res.data.error || "Could not analyze this target.");
        setScanState("detected");
      }
    } catch {
      setErrorMsg("Analysis server unreachable. Check your connection.");
      setScanState("detected");
    }
  }, []);

  const reset = useCallback(() => {
    stopScan(); setDetectedText(""); setManualInput(""); setParsed(null);
    setSecurity(null); setErrorMsg(""); setScanState("idle");
  }, [stopScan]);

  const activeRaw = detectedText || manualInput;

  return (
    <div className="space-y-4 pb-20">

      {/* ── Premium Header ── */}
      <div className="relative rounded-2xl overflow-hidden p-4"
        style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", border: `1px solid ${AMBER_BDR}` }}>
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${AMBER}, rgba(252,211,77,0.3))` }} />
        <div className="flex items-center gap-3 mt-1">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: AMBER_BG, border: `1px solid ${AMBER_BDR}`, boxShadow: "0 0 20px rgba(252,211,77,0.12)" }}>
            <QrCode size={18} style={{ color: AMBER }} />
          </div>
          <div>
            <p className="font-black text-[9px] uppercase tracking-[0.2em]" style={{ color: AMBER }}>QR Scanner</p>
            <p className="font-black text-[13px] tracking-tight" style={{ color: "var(--text-primary)" }}>Scan & Analyze</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: AMBER_BG, border: `1px solid ${AMBER_BDR}` }}>
            <ShieldAlert size={8} style={{ color: AMBER }} />
            <span className="text-[6.5px] font-black uppercase tracking-widest" style={{ color: AMBER }}>Security Analysis</span>
          </div>
        </div>
      </div>

      {/* ── Camera (always in DOM for stable ref) ── */}
      <div
        className="relative rounded-2xl overflow-hidden bg-black transition-all duration-300"
        style={{ height: scanState === "scanning" ? 230 : 0 }}
      >
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        {scanState === "scanning" && <>
          <motion.div
            className="absolute left-8 right-8 h-0.5 rounded-full"
            style={{ background: AMBER, boxShadow: `0 0 12px rgba(252,211,77,0.9)`, zIndex: 10 }}
            animate={{ top: ["16%", "80%", "16%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
          {(["tl","tr","bl","br"] as const).map(pos => (
            <div key={pos} className="absolute w-7 h-7" style={{
              top:    pos[0]==="t" ? 18 : undefined, bottom: pos[0]==="b" ? 18 : undefined,
              left:   pos[1]==="l" ? 18 : undefined, right:  pos[1]==="r" ? 18 : undefined,
              borderColor: AMBER,
              borderTopWidth:    pos[0]==="t" ? 2.5 : 0, borderBottomWidth: pos[0]==="b" ? 2.5 : 0,
              borderLeftWidth:   pos[1]==="l" ? 2.5 : 0, borderRightWidth:  pos[1]==="r" ? 2.5 : 0,
              borderRadius: pos==="tl"?"6px 0 0 0":pos==="tr"?"0 6px 0 0":pos==="bl"?"0 0 0 6px":"0 0 6px 0",
            }} />
          ))}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <button onClick={cancelScan} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-[8px] font-black uppercase tracking-wider"
              style={{ background:"rgba(0,0,0,0.65)", border:"1px solid rgba(255,255,255,0.15)" }}>
              <X size={10}/> Cancel
            </button>
          </div>
        </>}
      </div>

      {/* ── IDLE ── */}
      {scanState === "idle" && (
        <div className="space-y-3">
          <button
            onClick={startScan}
            className="w-full flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98]"
            style={{ borderColor: AMBER_BDR, background: AMBER_BG }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(252,211,77,0.12)", border: `1px solid ${AMBER_BDR}` }}>
              <Camera size={24} style={{ color: AMBER }} />
            </div>
            <div className="text-center">
              <p className="font-black text-[11px] uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>Tap to Scan QR Code</p>
              <p className="text-[8px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--text-muted)" }}>Supports URL · UPI · Contact · Text</p>
            </div>
          </button>

          {errorMsg && (
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/8 flex items-center gap-2">
              <AlertTriangle size={11} className="text-amber-400 shrink-0" />
              <p className="text-[8px] font-bold text-amber-400">{errorMsg}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
            <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>or paste manually</span>
            <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && manualInput.trim() && analyze(manualInput)}
              placeholder="Paste URL, UPI ID, or any QR content..."
              className="flex-1 px-3 py-2 rounded-xl outline-none text-[9px] font-mono dark:text-white"
              style={{ background: "rgba(148,163,184,0.08)", border: "1px solid var(--border-color)" }}
            />
            <button
              onClick={() => analyze(manualInput)}
              disabled={!manualInput.trim()}
              className="px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1 active:scale-95 disabled:opacity-40 transition-all"
              style={{ background: AMBER, color: "#0f172a" }}
            >
              <Search size={9}/> Go
            </button>
          </div>

          {/* Demo selector */}
          <button
            onClick={() => setDemoOpen(v => !v)}
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl border transition-all"
            style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          >
            <span className="text-[7px] font-black uppercase tracking-widest">Try a demo scan</span>
            {demoOpen ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
          </button>
          <AnimatePresence>
            {demoOpen && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} className="overflow-hidden">
                <div className="grid grid-cols-2 gap-2 pb-1">
                  {DEMOS.map(d => (
                    <button key={d.label} onClick={() => { setDetectedText(d.value); setManualInput(""); setDemoOpen(false); setScanState("detected"); }}
                      className="p-2.5 rounded-xl border text-left transition-all active:scale-95"
                      style={{ borderColor: AMBER_BDR, background: AMBER_BG }}
                    >
                      <p className="font-black text-[8px] uppercase tracking-wide" style={{ color: AMBER }}>{d.label}</p>
                      <p className="font-mono text-[7px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{d.value.substring(0,30)}…</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── DETECTED ── */}
      {scanState === "detected" && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl border" style={{ background: AMBER_BG, borderColor: AMBER_BDR }}>
            <p className="text-[7px] font-black uppercase tracking-widest mb-1.5" style={{ color: AMBER }}>Detected Content</p>
            <p className="font-mono text-[8px] break-all leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {activeRaw.length > 120 ? activeRaw.substring(0, 120) + "…" : activeRaw}
            </p>
          </div>
          {errorMsg && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/8 flex items-center gap-2">
              <AlertTriangle size={11} className="text-red-400 shrink-0"/>
              <p className="text-[8px] font-bold text-red-400">{errorMsg}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={reset}
              className="py-2.5 px-4 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all active:scale-95"
              style={{ borderColor:"var(--border-color)", color:"var(--text-secondary)" }}>
              Reset
            </button>
            <button onClick={() => analyze(activeRaw)}
              className="flex-1 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              style={{ background: AMBER, color: "#0f172a" }}>
              <ShieldAlert size={11}/> Analyze Now
            </button>
          </div>
        </div>
      )}

      {/* ── ANALYZING ── */}
      {scanState === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 size={30} className="animate-spin" style={{ color: AMBER }}/>
          <p className="font-black text-[9px] uppercase tracking-widest" style={{ color:"var(--text-secondary)" }}>Analyzing content...</p>
        </div>
      )}

      {/* ── RESULT ── */}
      {scanState === "result" && parsed && security && (
        <div className="space-y-3">
          <QRDetailsCard parsed={parsed}/>
          <SecurityCard security={security} parsed={parsed}/>
          <ExplanationCard explanation={security.explanation} risk={security.risk}/>
          <button onClick={reset}
            className="w-full py-2.5 rounded-xl border text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95"
            style={{ borderColor:"var(--border-color)", color:"var(--text-secondary)" }}>
            <RefreshCw size={9}/> Scan Another
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function QRDetailsCard({ parsed }: { parsed: ParsedQR }) {
  const typeConfig: Record<QRType, { color: string; bg: string; border: string; Icon: any }> = {
    url:     { color:"#38BDF8", bg:"rgba(56,189,248,0.08)",  border:"rgba(56,189,248,0.2)",  Icon: Globe },
    upi:     { color:"#34D399", bg:"rgba(52,211,153,0.08)",  border:"rgba(52,211,153,0.2)",  Icon: IndianRupee },
    contact: { color:"#A78BFA", bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.2)", Icon: User },
    email:   { color:"#FCD34D", bg:"rgba(252,211,77,0.08)",  border:"rgba(252,211,77,0.2)",  Icon: Mail },
    phone:   { color:"#34D399", bg:"rgba(52,211,153,0.08)",  border:"rgba(52,211,153,0.2)",  Icon: Phone },
    text:    { color:"#94A3B8", bg:"rgba(148,163,184,0.08)", border:"rgba(148,163,184,0.2)", Icon: FileText },
  };
  const cfg = typeConfig[parsed.type];

  return (
    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.2 }}
      className="relative p-4 rounded-2xl border space-y-3 overflow-hidden"
      style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: cfg.border }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />
      <div className="flex items-center gap-2.5 mt-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: cfg.bg, border:`1px solid ${cfg.border}` }}>
          <cfg.Icon size={15} style={{ color: cfg.color }}/>
        </div>
        <div>
          <span className="font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color, border:`1px solid ${cfg.border}` }}>
            {parsed.label}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {parsed.type === "url" && <>
          {parsed.domain && <DetailRow label="Domain" value={parsed.domain}/>}
          {parsed.protocol && <DetailRow label="Protocol" value={parsed.protocol.toUpperCase()} highlight={parsed.protocol === "http"} highlightMsg="Insecure (no encryption)"/>}
          <DetailRow label="Full URL" value={parsed.raw} mono truncate/>
        </>}

        {parsed.type === "upi" && <>
          {parsed.payeeName && <DetailRow label="Paying To"    value={parsed.payeeName} bold/>}
          {parsed.upiId     && <DetailRow label="UPI ID"       value={parsed.upiId} mono/>}
          {parsed.amount    ? <DetailRow label="Amount"        value={`₹${parsed.amount}`} bold highlight highlightMsg="Pre-filled amount"/>
                            : <DetailRow label="Amount"        value="Not specified"/>}
          {parsed.note      && <DetailRow label="Note"         value={parsed.note}/>}
          {parsed.ref       && <DetailRow label="Reference"    value={parsed.ref} mono/>}
        </>}

        {parsed.type === "contact" && <>
          {parsed.contactName  && <DetailRow label="Name"  value={parsed.contactName}/>}
          {parsed.contactPhone && <DetailRow label="Phone" value={parsed.contactPhone} mono/>}
        </>}

        {(parsed.type === "email" || parsed.type === "phone" || parsed.type === "text") && (
          <DetailRow label="Content" value={parsed.raw} mono truncate/>
        )}
      </div>
    </motion.div>
  );
}

function DetailRow({ label, value, mono, bold, truncate: trunc, highlight, highlightMsg }: {
  label: string; value: string; mono?: boolean; bold?: boolean;
  truncate?: boolean; highlight?: boolean; highlightMsg?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b last:border-0" style={{ borderColor: "rgba(148,163,184,0.1)" }}>
      <span className="text-[7px] font-black uppercase tracking-widest shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</span>
      <div className="text-right overflow-hidden">
        <p className={cn("text-[9px] leading-snug", mono && "font-mono", bold && "font-black", trunc && "truncate", highlight ? "text-amber-400" : "")}
          style={!highlight ? { color:"var(--text-primary)" } : {}}>
          {value}
        </p>
        {highlight && highlightMsg && (
          <p className="text-[7px] font-bold text-amber-400 mt-0.5">{highlightMsg}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function SecurityCard({ security, parsed }: { security: SecurityResult; parsed: ParsedQR }) {
  const riskCfg = {
    safe:       { Icon: ShieldCheck,   label:"Safe",         color:"#34D399", bg:"rgba(52,211,153,0.08)",  border:"rgba(52,211,153,0.25)" },
    suspicious: { Icon: AlertTriangle, label:"Verify First", color:"#FCD34D", bg:"rgba(252,211,77,0.08)",  border:"rgba(252,211,77,0.25)" },
    danger:     { Icon: ShieldAlert,   label:"Dangerous",    color:"#F87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.25)" },
  }[security.risk];

  return (
    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.2, delay:0.08 }}
      className="relative p-4 rounded-2xl border space-y-3 overflow-hidden"
      style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: riskCfg.border }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${riskCfg.color}, transparent)` }} />
      <div className="flex items-center gap-3 mt-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: riskCfg.bg, border:`1px solid ${riskCfg.border}` }}>
          <riskCfg.Icon size={20} style={{ color: riskCfg.color }}/>
        </div>
        <div>
          <p className="font-black text-[18px] tracking-tight leading-none font-metric" style={{ color: riskCfg.color }}>
            {riskCfg.label.toUpperCase()}
          </p>
          <p className="text-[7px] font-bold uppercase tracking-wider mt-0.5" style={{ color:"var(--text-muted)" }}>
            Security Status · {parsed.label}
          </p>
        </div>
      </div>

      {parsed.type === "url" && (
        <div className="grid grid-cols-3 gap-2">
          <MetricBox label="Threats Found"  value={`${security.threatIndicators}`}   color={security.threatIndicators > 0 ? "#F87171" : "#34D399"}/>
          <MetricBox label="Domain Age"     value={security.domainAgeDays !== null ? `${security.domainAgeDays}d` : "N/A"} color={security.domainAgeDays !== null && security.domainAgeDays < 30 ? "#FCD34D" : "#34D399"}/>
          <MetricBox label="Open Ports"     value={`${security.exposedPorts.length}`} color={security.exposedPorts.length > 0 ? "#FCD34D" : "#34D399"}/>
        </div>
      )}

      {parsed.type === "upi" && (
        <div className="grid grid-cols-2 gap-2">
          <MetricBox label="Warnings" value={`${security.warnings.length}`} color={security.warnings.length > 0 ? "#FCD34D" : "#34D399"}/>
          <MetricBox label="Status"   value={security.warnings.length === 0 ? "Valid" : "Check"} color={security.warnings.length === 0 ? "#34D399" : "#FCD34D"}/>
        </div>
      )}

      {security.warnings.length > 0 && (
        <div className="space-y-1.5">
          {security.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-xl" style={{ background:"rgba(0,0,0,0.25)" }}>
              <AlertTriangle size={9} className="text-amber-400 shrink-0 mt-0.5"/>
              <p className="text-[8px] font-bold leading-snug" style={{ color:"var(--text-secondary)" }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {security.warnings.length === 0 && (
        <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background:"rgba(0,0,0,0.25)" }}>
          <CheckCircle2 size={10} className="text-emerald-400 shrink-0"/>
          <p className="text-[8px] font-bold" style={{ color:"var(--text-secondary)" }}>
            {parsed.type === "upi" ? "UPI details look legitimate" : "No threats or risks detected"}
          </p>
        </div>
      )}

      {security.vulnIds.length > 0 && (
        <div className="space-y-1">
          <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: "#F87171" }}>Known Vulnerabilities on Host</p>
          <div className="flex flex-wrap gap-1">
            {security.vulnIds.slice(0, 6).map(v => (
              <span key={v} className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-red-500/20 text-red-400">{v}</span>
            ))}
            {security.vulnIds.length > 6 && (
              <span className="px-2 py-0.5 rounded-full text-[7px] font-black bg-red-500/10 text-red-300">+{security.vulnIds.length - 6} more</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2 rounded-xl text-center" style={{ background:"rgba(0,0,0,0.25)" }}>
      <p className="font-black text-[13px] leading-none font-metric" style={{ color }}>{value}</p>
      <p className="text-[6px] font-black uppercase tracking-widest mt-1" style={{ color:"var(--text-muted)" }}>{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function ExplanationCard({ explanation, risk }: { explanation: string; risk: RiskLevel }) {
  const borderColor = risk === "danger" ? "rgba(248,113,113,0.2)" : risk === "suspicious" ? "rgba(252,211,77,0.2)" : "rgba(52,211,153,0.2)";
  return (
    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.2, delay:0.16 }}
      className="p-4 rounded-2xl border"
      style={{ background:"linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor }}
    >
      <p className="text-[7px] font-black uppercase tracking-widest mb-2" style={{ color:"var(--text-muted)" }}>What This Means</p>
      <p className="text-[10px] font-bold leading-relaxed" style={{ color:"var(--text-secondary)" }}>{explanation}</p>
    </motion.div>
  );
}
