import React, { useState, useRef, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import {
  Globe, Wifi, User, MessageCircle, Mail, Phone,
  MessageSquare, IndianRupee, FileText, Download, Share2,
  QrCode, CheckCircle2, Lock, Sparkles
} from "lucide-react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

type QRGenType = "url" | "wifi" | "vcard" | "whatsapp" | "email" | "phone" | "sms" | "upi" | "text";

// ── Unique color per type ─────────────────────────────────────────────
const TYPE_CFG: Record<QRGenType, { color: string; bg: string; border: string; shadow: string }> = {
  url:      { color: "#38BDF8", bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.30)",  shadow: "rgba(56,189,248,0.18)" },
  wifi:     { color: "#A78BFA", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.30)", shadow: "rgba(167,139,250,0.18)" },
  vcard:    { color: "#34D399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.30)",  shadow: "rgba(52,211,153,0.18)" },
  whatsapp: { color: "#4ADE80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.30)",  shadow: "rgba(74,222,128,0.18)" },
  email:    { color: "#FCD34D", bg: "rgba(252,211,77,0.10)",  border: "rgba(252,211,77,0.30)",  shadow: "rgba(252,211,77,0.18)" },
  phone:    { color: "#2DD4BF", bg: "rgba(45,212,191,0.10)",  border: "rgba(45,212,191,0.30)",  shadow: "rgba(45,212,191,0.18)" },
  sms:      { color: "#FB923C", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.30)",  shadow: "rgba(251,146,60,0.18)" },
  upi:      { color: "#818CF8", bg: "rgba(129,140,248,0.10)", border: "rgba(129,140,248,0.30)", shadow: "rgba(129,140,248,0.18)" },
  text:     { color: "#F472B6", bg: "rgba(244,114,182,0.10)", border: "rgba(244,114,182,0.30)", shadow: "rgba(244,114,182,0.18)" },
};

const TYPES: { id: QRGenType; label: string; Icon: any; desc: string }[] = [
  { id: "url",      label: "Website",  Icon: Globe,         desc: "Any URL" },
  { id: "wifi",     label: "WiFi",     Icon: Wifi,          desc: "Network" },
  { id: "vcard",    label: "Contact",  Icon: User,          desc: "Card" },
  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle, desc: "WA Chat" },
  { id: "email",    label: "Email",    Icon: Mail,          desc: "Mail" },
  { id: "phone",    label: "Phone",    Icon: Phone,         desc: "Dial" },
  { id: "sms",      label: "SMS",      Icon: MessageSquare, desc: "Message" },
  { id: "upi",      label: "UPI Pay",  Icon: IndianRupee,   desc: "Payment" },
  { id: "text",     label: "Text",     Icon: FileText,      desc: "Content" },
];

// ── QR Content Builder (logic unchanged) ─────────────────────────────
function buildQRContent(type: QRGenType, f: Record<string, string>): string {
  const esc = (s: string) => s.replace(/[\\;,"]/g, v => `\\${v}`);
  switch (type) {
    case "url": return f.url?.trim() || "";
    case "wifi":
      if (!f.ssid?.trim()) return "";
      return `WIFI:T:${f.security || "WPA"};S:${esc(f.ssid)};P:${esc(f.password || "")};;`;
    case "vcard": {
      if (!f.name?.trim() && !f.phone?.trim()) return "";
      let v = "BEGIN:VCARD\nVERSION:3.0\n";
      if (f.name)  v += `FN:${f.name}\n`;
      if (f.phone) v += `TEL:${f.phone}\n`;
      if (f.email) v += `EMAIL:${f.email}\n`;
      if (f.org)   v += `ORG:${f.org}\n`;
      if (f.url)   v += `URL:${f.url}\n`;
      return v + "END:VCARD";
    }
    case "whatsapp": {
      const n = (f.phone || "").replace(/\D/g, "");
      if (!n) return "";
      return `https://wa.me/${n}${f.message ? `?text=${encodeURIComponent(f.message)}` : ""}`;
    }
    case "email": {
      if (!f.email?.trim()) return "";
      const p: string[] = [];
      if (f.subject) p.push(`subject=${encodeURIComponent(f.subject)}`);
      if (f.body)    p.push(`body=${encodeURIComponent(f.body)}`);
      return `mailto:${f.email}${p.length ? "?" + p.join("&") : ""}`;
    }
    case "phone": return f.phone?.trim() ? `tel:${f.phone.trim()}` : "";
    case "sms":   return f.phone?.trim() ? `smsto:${f.phone.trim()}${f.message ? `:${f.message}` : ""}` : "";
    case "upi": {
      if (!f.upiId?.trim()) return "";
      let u = `upi://pay?pa=${encodeURIComponent(f.upiId)}`;
      if (f.name)   u += `&pn=${encodeURIComponent(f.name)}`;
      if (f.amount) u += `&am=${f.amount}`;
      if (f.note)   u += `&tn=${encodeURIComponent(f.note)}`;
      return u;
    }
    case "text": return f.text?.trim() || "";
    default: return "";
  }
}

// ── Premium Input Components ──────────────────────────────────────────
function PInput({ label, placeholder, value, onChange, type = "text", accent }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; accent: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[6.5px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl outline-none text-[10px] font-mono dark:text-white transition-all"
        style={{
          background: "rgba(15,23,42,0.6)",
          border: `1px solid rgba(148,163,184,0.12)`,
          caretColor: accent,
        }}
        onFocus={e => { e.currentTarget.style.border = `1px solid ${accent}50`; e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}12`; }}
        onBlur={e => { e.currentTarget.style.border = `1px solid rgba(148,163,184,0.12)`; e.currentTarget.style.boxShadow = "none"; }}
      />
    </div>
  );
}

function PSelect({ label, value, onChange, options, accent }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; accent: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[6.5px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl outline-none text-[10px] dark:text-white"
        style={{ background: "rgba(15,23,42,0.6)", border: `1px solid rgba(148,163,184,0.12)` }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function PTextarea({ label, placeholder, value, onChange, accent }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; accent: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[6.5px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={3}
        className="w-full px-3.5 py-2.5 rounded-xl outline-none text-[10px] font-mono dark:text-white resize-none transition-all"
        style={{ background: "rgba(15,23,42,0.6)", border: `1px solid rgba(148,163,184,0.12)`, caretColor: accent }}
        onFocus={e => { e.currentTarget.style.border = `1px solid ${accent}50`; e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}12`; }}
        onBlur={e => { e.currentTarget.style.border = `1px solid rgba(148,163,184,0.12)`; e.currentTarget.style.boxShadow = "none"; }}
      />
    </div>
  );
}

// ── Form Fields (logic unchanged) ─────────────────────────────────────
function FormFields({ type, fields, setField, accent }: {
  type: QRGenType; fields: Record<string, string>; setField: (k: string, v: string) => void; accent: string;
}) {
  const f = fields;
  const s = (k: string) => (v: string) => setField(k, v);
  switch (type) {
    case "url":
      return <PInput accent={accent} label="Website URL" placeholder="https://example.com" value={f.url || ""} onChange={s("url")} />;
    case "wifi":
      return <>
        <PInput accent={accent} label="Network Name (SSID)" placeholder="My WiFi Network" value={f.ssid || ""} onChange={s("ssid")} />
        <PInput accent={accent} label="Password" placeholder="WiFi password" value={f.password || ""} onChange={s("password")} type="password" />
        <PSelect accent={accent} label="Security Type" value={f.security || "WPA"} onChange={s("security")}
          options={[{ value: "WPA", label: "WPA / WPA2" }, { value: "WEP", label: "WEP" }, { value: "nopass", label: "No Password" }]} />
      </>;
    case "vcard":
      return <>
        <PInput accent={accent} label="Full Name" placeholder="John Doe" value={f.name || ""} onChange={s("name")} />
        <PInput accent={accent} label="Phone Number" placeholder="+91 9999999999" value={f.phone || ""} onChange={s("phone")} type="tel" />
        <PInput accent={accent} label="Email (optional)" placeholder="john@email.com" value={f.email || ""} onChange={s("email")} type="email" />
        <PInput accent={accent} label="Organization (optional)" placeholder="Company Name" value={f.org || ""} onChange={s("org")} />
        <PInput accent={accent} label="Website (optional)" placeholder="https://..." value={f.url || ""} onChange={s("url")} />
      </>;
    case "whatsapp":
      return <>
        <PInput accent={accent} label="Phone Number (with country code)" placeholder="+91 9999999999" value={f.phone || ""} onChange={s("phone")} type="tel" />
        <PTextarea accent={accent} label="Pre-filled Message (optional)" placeholder="Hello!" value={f.message || ""} onChange={s("message")} />
      </>;
    case "email":
      return <>
        <PInput accent={accent} label="Email Address" placeholder="user@email.com" value={f.email || ""} onChange={s("email")} type="email" />
        <PInput accent={accent} label="Subject (optional)" placeholder="Email subject" value={f.subject || ""} onChange={s("subject")} />
        <PTextarea accent={accent} label="Body (optional)" placeholder="Email body..." value={f.body || ""} onChange={s("body")} />
      </>;
    case "phone":
      return <PInput accent={accent} label="Phone Number" placeholder="+91 9999999999" value={f.phone || ""} onChange={s("phone")} type="tel" />;
    case "sms":
      return <>
        <PInput accent={accent} label="Phone Number" placeholder="+91 9999999999" value={f.phone || ""} onChange={s("phone")} type="tel" />
        <PTextarea accent={accent} label="Message (optional)" placeholder="Your message..." value={f.message || ""} onChange={s("message")} />
      </>;
    case "upi":
      return <>
        <PInput accent={accent} label="UPI ID" placeholder="yourname@upi" value={f.upiId || ""} onChange={s("upiId")} />
        <PInput accent={accent} label="Payee Name" placeholder="Your Name / Shop Name" value={f.name || ""} onChange={s("name")} />
        <PInput accent={accent} label="Amount (optional)" placeholder="0.00" value={f.amount || ""} onChange={s("amount")} type="number" />
        <PInput accent={accent} label="Note / Description (optional)" placeholder="Payment for..." value={f.note || ""} onChange={s("note")} />
      </>;
    case "text":
      return <PTextarea accent={accent} label="Text Content" placeholder="Enter any text..." value={f.text || ""} onChange={s("text")} />;
    default: return null;
  }
}

// ── Corner marker for QR frame ────────────────────────────────────────
function Corner({ pos, color }: { pos: "tl"|"tr"|"bl"|"br"; color: string }) {
  return (
    <div className="absolute w-5 h-5" style={{
      top:    pos[0]==="t" ? 10 : undefined, bottom: pos[0]==="b" ? 10 : undefined,
      left:   pos[1]==="l" ? 10 : undefined, right:  pos[1]==="r" ? 10 : undefined,
      borderTopWidth:    pos[0]==="t" ? 2.5 : 0,
      borderBottomWidth: pos[0]==="b" ? 2.5 : 0,
      borderLeftWidth:   pos[1]==="l" ? 2.5 : 0,
      borderRightWidth:  pos[1]==="r" ? 2.5 : 0,
      borderColor: color,
      borderRadius: pos==="tl"?"5px 0 0 0":pos==="tr"?"0 5px 0 0":pos==="bl"?"0 0 0 5px":"0 0 5px 0",
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────
export default function QRGenerator() {
  const [type,     setType]     = useState<QRGenType>("url");
  const [fields,   setFields]   = useState<Record<string, string>>({});
  const [ready,    setReady]    = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cfg = TYPE_CFG[type];
  const activeType = TYPES.find(t => t.id === type)!;

  const setField = useCallback((k: string, v: string) => {
    setFields(prev => ({ ...prev, [k]: v }));
  }, []);

  const changeType = (t: QRGenType) => {
    setType(t); setFields({}); setReady(false);
    const c = canvasRef.current;
    if (c) { c.getContext("2d")?.clearRect(0, 0, c.width, c.height); }
  };

  useEffect(() => {
    const content = buildQRContent(type, fields);
    if (!content) { setReady(false); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, content, { width: 240, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(() => setReady(true)).catch(() => setReady(false));
  }, [type, fields]);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2500); };

  const getBase64 = (): string => {
    const c = canvasRef.current;
    if (!c) throw new Error("no canvas");
    return c.toDataURL("image/png").split(",")[1];
  };

  const download = useCallback(async () => {
    if (!ready) return;
    const base64 = getBase64();
    const filename = `qrcode-${Date.now()}.png`;
    try {
      await Filesystem.writeFile({ path: `Download/${filename}`, data: base64, directory: Directory.ExternalStorage });
      showToast("Saved to Downloads folder");
    } catch {
      try {
        const result = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
        await Share.share({ title: "Save QR Code", files: [result.uri], dialogTitle: "Save QR Code to device" });
      } catch { showToast("Save failed — use Share instead"); }
    }
  }, [ready]);

  const share = useCallback(async () => {
    if (!ready) return;
    try {
      const base64 = getBase64();
      const filename = `qrcode-share-${Date.now()}.png`;
      const result = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
      await Share.share({ title: "QR Code", text: "Scan this QR Code", files: [result.uri], dialogTitle: "Share QR Code" });
    } catch { showToast("Share failed"); }
  }, [ready]);

  return (
    <div className="space-y-4 pb-20">

      {/* ── Premium Header ── */}
      <div className="relative rounded-2xl overflow-hidden p-4"
        style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", border: "1px solid rgba(6,182,212,0.18)" }}>
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{ background: "linear-gradient(90deg, #06B6D4, rgba(6,182,212,0.3))" }} />
        <div className="flex items-center gap-3 mt-1">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #06B6D4, #0284c7)", boxShadow: "0 4px 14px rgba(6,182,212,0.30)" }}>
            <QrCode size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.2em]" style={{ color: "#06B6D4" }}>QR Factory</p>
            <p className="text-[11px] font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Generate QR Code</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <Sparkles size={8} style={{ color: "#06B6D4" }} />
            <span className="text-[6.5px] font-black uppercase tracking-widest" style={{ color: "#06B6D4" }}>On-Device</span>
          </div>
        </div>
      </div>

      {/* ── Type Selector Grid ── */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border-color)", background: "rgba(15,23,42,0.4)" }}>
        <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: "var(--border-color)" }}>
          <p className="text-[7px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Select QR Type</p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/5">
          {TYPES.map(({ id, label, Icon, desc }) => {
            const c = TYPE_CFG[id];
            const isActive = type === id;
            return (
              <button
                key={id}
                onClick={() => changeType(id)}
                className="relative flex flex-col items-center gap-1.5 py-3.5 px-2 transition-all active:scale-95"
                style={{
                  background: isActive ? c.bg : "rgba(15,23,42,0.7)",
                  boxShadow: isActive ? `inset 0 0 0 1px ${c.border}` : undefined,
                }}
              >
                {/* Active top bar */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: c.color }} />
                )}
                {/* Icon circle */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: isActive ? c.bg : "rgba(148,163,184,0.06)",
                    border: `1px solid ${isActive ? c.border : "rgba(148,163,184,0.08)"}`,
                    boxShadow: isActive ? `0 0 14px ${c.shadow}` : undefined,
                  }}>
                  <Icon size={15} style={{ color: isActive ? c.color : "rgba(148,163,184,0.5)" }} />
                </div>
                <span className="text-[7.5px] font-black uppercase tracking-wide leading-none"
                  style={{ color: isActive ? c.color : "rgba(148,163,184,0.6)" }}>{label}</span>
                <span className="text-[6px] leading-none" style={{ color: "rgba(148,163,184,0.35)" }}>{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Form Card ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="rounded-2xl overflow-hidden border"
          style={{ borderColor: cfg.border, background: "rgba(15,23,42,0.5)" }}
        >
          {/* Form header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: cfg.border, background: cfg.bg }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, boxShadow: `0 0 10px ${cfg.shadow}` }}>
              <activeType.Icon size={13} style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-[7px] font-black uppercase tracking-[0.18em]" style={{ color: cfg.color }}>
                {activeType.label} QR Code
              </p>
              <p className="text-[6px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {activeType.desc}
              </p>
            </div>
            <div className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />
          </div>

          {/* Form fields */}
          <div className="p-4 space-y-3">
            <FormFields type={type} fields={fields} setField={setField} accent={cfg.color} />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Placeholder (when not ready) ── */}
      {!ready && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-2xl border border-dashed"
          style={{ borderColor: "rgba(6,182,212,0.12)", background: "rgba(15,23,42,0.3)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.12)" }}>
            <QrCode size={24} style={{ color: "rgba(6,182,212,0.3)" }} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>QR Preview</p>
            <p className="text-[7px] font-bold" style={{ color: "rgba(148,163,184,0.3)" }}>Fill the form above</p>
          </div>
        </div>
      )}

      {/*
        Canvas is ALWAYS in DOM — never conditionally rendered.
        display:none controls visibility. This keeps canvasRef stable.
      */}
      <div style={{
        display: ready ? "flex" : "none",
        flexDirection: "column",
        alignItems: "center",
        gap: "0px",
        borderRadius: "20px",
        overflow: "hidden",
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 30px ${cfg.shadow}, 0 0 0 1px ${cfg.border}`,
        background: "rgba(15,23,42,0.7)",
      }}>
        {/* Preview header */}
        <div className="w-full flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: cfg.border, background: cfg.bg }}>
          <div className="flex items-center gap-2">
            <activeType.Icon size={11} style={{ color: cfg.color }} />
            <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
              {activeType.label} QR
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)" }}>
            <Lock size={7} className="text-emerald-400" />
            <span className="text-[6px] font-black uppercase tracking-widest text-emerald-400">Private</span>
          </div>
        </div>

        {/* QR canvas with corner markers */}
        <div className="relative flex items-center justify-center py-6 px-6 w-full"
          style={{ background: "rgba(15,23,42,0.9)" }}>
          <div className="relative p-4 rounded-2xl" style={{ background: "white", boxShadow: `0 0 40px ${cfg.shadow}` }}>
            <canvas ref={canvasRef} style={{ display: "block", borderRadius: "4px" }} />
          </div>
          {/* Corner markers */}
          {(["tl","tr","bl","br"] as const).map(pos => (
            <Corner key={pos} pos={pos} color={cfg.color} />
          ))}
        </div>

        {/* Privacy badge */}
        <div className="w-full px-4 py-2 border-t border-b flex items-center justify-center gap-2"
          style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(52,211,153,0.04)" }}>
          <CheckCircle2 size={9} className="text-emerald-400" />
          <span className="text-[6.5px] font-black uppercase tracking-[0.18em] text-emerald-400">
            Generated on device · Never uploaded
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex w-full">
          <button
            onClick={download}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 transition-all active:opacity-75"
            style={{ background: "rgba(15,23,42,0.8)", borderRight: `1px solid ${cfg.border}` }}
          >
            <Download size={12} style={{ color: cfg.color }} />
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>Download</span>
          </button>
          <button
            onClick={share}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 transition-all active:opacity-75"
            style={{ background: cfg.bg }}
          >
            <Share2 size={12} style={{ color: cfg.color }} />
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>Share</span>
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl border"
            style={{ background: "rgba(10,16,28,0.96)", borderColor: "rgba(56,189,248,0.2)" }}
          >
            <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-200">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
