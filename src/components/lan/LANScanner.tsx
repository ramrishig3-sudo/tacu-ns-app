import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Router, Smartphone, Monitor, Printer, Tv2,
  Camera, Server, HelpCircle, Wifi,
  ChevronDown, ChevronUp, RefreshCw,
  Loader2, CheckCircle2, MapPin, Tag,
} from "lucide-react";
import LanScan from "../../plugins/lanScan";

type DeviceType = "router" | "phone" | "computer" | "printer" | "tv" | "camera" | "server" | "iot" | "unknown";
type ScanPhase  = "idle" | "scanning" | "enriching" | "done";

interface LANDevice {
  ip: string; mac: string; vendor: string; hostname: string;
  type: DeviceType; isGateway: boolean; isSelf: boolean;
}

const accent = "#34D399";
const ch = (op: number) => `${accent}${Math.round(op * 255).toString(16).padStart(2, "0")}`;
const CARD_BG = "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))";

const TYPE_META: Record<DeviceType, { label: string; Icon: React.ElementType; color: string }> = {
  router:   { label: "Router / Gateway",   Icon: Router,     color: "#38BDF8" },
  phone:    { label: "Mobile Device",      Icon: Smartphone, color: "#A78BFA" },
  computer: { label: "Computer",           Icon: Monitor,    color: "#22C55E" },
  printer:  { label: "Printer",            Icon: Printer,    color: "#F59E0B" },
  tv:       { label: "Smart TV / Stream",  Icon: Tv2,        color: "#EC4899" },
  camera:   { label: "IP Camera",          Icon: Camera,     color: "#EF4444" },
  server:   { label: "Server / NAS",       Icon: Server,     color: "#06B6D4" },
  iot:      { label: "IoT / Smart Device", Icon: Server,     color: "#F97316" },
  unknown:  { label: "Active Device",      Icon: HelpCircle, color: "#64748B" },
};

function getLocalIP(): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pc.createDataChannel("");
      pc.createOffer()
        .then(o => pc.setLocalDescription(o))
        .catch(() => { clearTimeout(timer); resolve(null); });
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const m = e.candidate.candidate.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3})/);
        if (m && !m[1].startsWith("127.") && !m[1].startsWith("169.254")) {
          clearTimeout(timer); pc.close(); resolve(m[1]);
        }
      };
    } catch { clearTimeout(timer); resolve(null); }
  });
}

async function getHostname(ip: string): Promise<string> {
  const ptr = ip.split(".").reverse().join(".") + ".in-addr.arpa";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(`https://dns.google/resolve?name=${ptr}&type=PTR`, { signal: ctrl.signal });
    clearTimeout(timer);
    const d = await r.json();
    const ans = d.Answer?.[0]?.data as string | undefined;
    return ans ? ans.replace(/\.$/, "") : "";
  } catch { clearTimeout(timer); return ""; }
}

async function getMacVendor(mac: string): Promise<string> {
  if (!mac || mac.length < 8) return "";
  const prefix = mac.replace(/:/g, "").substring(0, 6);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(`https://api.macvendors.com/${prefix}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) return await r.text();
    return "";
  } catch { clearTimeout(timer); return ""; }
}

function detectType(ip: string, hostname: string, vendor: string): DeviceType {
  const oct = parseInt(ip.split(".")[3]);
  if (oct === 1 || oct === 254) return "router";
  const combined = (hostname + " " + vendor).toLowerCase();
  if (/router|gateway|modem|openwrt|dd-wrt|fritz|tp-?link|asus|netgear|linksys|dlink|cisco|huawei|zte/.test(combined)) return "router";
  if (/apple|iphone|ipad/.test(vendor.toLowerCase()) && !/macbook|imac/.test(hostname.toLowerCase())) return "phone";
  if (/samsung|xiaomi|realme|oneplus|oppo|vivo|motorola/.test(vendor.toLowerCase()) && !/tv|smart/.test(hostname.toLowerCase())) return "phone";
  if (/iphone|android|phone|mobile|pixel/.test(hostname.toLowerCase())) return "phone";
  if (/chromecast|roku|firetv|appletv|bravia|webos|smarttv|lg electronics|vizio|hisense/.test(combined)) return "tv";
  if (/printer|hp inc|canon|epson|brother|kyocera|xerox|lexmark/.test(combined)) return "printer";
  if (/macbook|imac|thinkpad|dell|laptop|desktop|windows|ubuntu|intel corporate/.test(combined)) return "computer";
  if (/raspberry|esp|arduino|tasmota|tuya|shelly/.test(combined)) return "iot";
  if (/camera|cam|hikvision|dahua|reolink|axis/.test(combined)) return "camera";
  if (/synology|qnap|truenas|plex|server|nas/.test(combined)) return "server";
  return "unknown";
}

export default function LANScanner() {
  const [localIP,   setLocalIP]   = useState<string | null>(null);
  const [devices,   setDevices]   = useState<LANDevice[]>([]);
  const [phase,     setPhase]     = useState<ScanPhase>("idle");
  const [error,     setError]     = useState<string | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [enrichPct, setEnrichPct] = useState(0);

  useEffect(() => { getLocalIP().then(ip => { if (ip) setLocalIP(ip); }); }, []);

  const startScan = async () => {
    if (phase === "scanning" || phase === "enriching") return;
    setDevices([]); setError(null); setEnrichPct(0);

    let ip = localIP;
    if (!ip) ip = await getLocalIP();
    if (!ip) { setError("Could not detect local IP. Connect to WiFi and try again."); return; }
    setLocalIP(ip);

    const subnet = ip.split(".").slice(0, 3).join(".");
    setPhase("scanning");
    let rawDevices: { ip: string; mac: string }[] = [];
    try {
      const result = await LanScan.scan({ subnet, timeout: 400 });
      rawDevices = result.devices;
    } catch (e) {
      setError("Scan failed. Make sure you are connected to WiFi.");
      setPhase("idle"); return;
    }

    if (!rawDevices.find(d => d.ip === ip)) rawDevices.push({ ip: ip!, mac: "" });

    setPhase("enriching");
    const enriched: LANDevice[] = [];
    for (let i = 0; i < rawDevices.length; i++) {
      const d = rawDevices[i];
      const [hostname, vendor] = await Promise.all([getHostname(d.ip), getMacVendor(d.mac)]);
      const oct = parseInt(d.ip.split(".")[3]);
      const isGateway = oct === 1 || oct === 254;
      const isSelf    = d.ip === ip;
      const type      = isSelf ? "phone" : (isGateway ? "router" : detectType(d.ip, hostname, vendor));
      enriched.push({ ip: d.ip, mac: d.mac, vendor, hostname, type, isGateway, isSelf });
      setEnrichPct(Math.round(((i + 1) / rawDevices.length) * 100));
      setDevices([...enriched].sort(sortDevices));
    }
    setPhase("done");
  };

  const sortDevices = (a: LANDevice, b: LANDevice) => {
    if (a.isSelf && !b.isSelf) return -1; if (!a.isSelf && b.isSelf) return 1;
    if (a.isGateway && !b.isGateway) return -1; if (!a.isGateway && b.isGateway) return 1;
    return a.ip.localeCompare(b.ip, undefined, { numeric: true });
  };

  const busy = phase === "scanning" || phase === "enriching";

  const statusLine = {
    idle:     "", scanning: "Scanning network — this takes ~15 seconds…",
    enriching:`Identifying devices — ${enrichPct}%`,
    done:     `${devices.length} active device${devices.length !== 1 ? "s" : ""} found`,
  }[phase];

  return (
    <div className="space-y-4 pb-20">

      {/* Header card */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: ch(0.18) }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.30)})` }} />
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: ch(0.12), border: `1px solid ${ch(0.25)}` }}>
                <Wifi size={16} style={{ color: accent }} />
              </div>
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: "rgba(148,163,184,0.40)" }}>Network Intelligence</p>
                <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>LAN Device Scanner</p>
              </div>
            </div>
            <button onClick={startScan} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
              style={{ background: busy ? "rgba(148,163,184,0.08)" : ch(0.15),
                       color: busy ? "rgba(148,163,184,0.45)" : accent,
                       border: `1px solid ${busy ? "rgba(148,163,184,0.12)" : ch(0.30)}` }}>
              <RefreshCw size={11} className={busy ? "animate-spin" : ""} />
              {phase === "done" ? "Rescan" : phase === "idle" ? "Scan" : "Scanning…"}
            </button>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl"
               style={{ background: "rgba(148,163,184,0.05)", border: `1px solid ${ch(0.12)}` }}>
            <MapPin size={11} style={{ color: accent }} />
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>This Device</span>
            <span className="text-[10px] font-black ml-auto tabular-nums" style={{ color: "#E2E8F0" }}>
              {localIP ?? "Detecting…"}
            </span>
          </div>

          {phase !== "idle" && (
            <div className="mt-3 flex items-center gap-1.5">
              {phase === "done"
                ? <CheckCircle2 size={11} style={{ color: accent }} />
                : <Loader2 size={9} className="animate-spin" style={{ color: accent }} />}
              <span className="text-[8px] font-black uppercase tracking-widest"
                    style={{ color: phase === "done" ? accent : "rgba(148,163,184,0.55)" }}>
                {statusLine}
              </span>
            </div>
          )}

          {phase === "enriching" && (
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(148,163,184,0.12)" }}>
              <motion.div className="h-full rounded-full" style={{ background: accent }}
                animate={{ width: `${enrichPct}%` }} transition={{ duration: 0.3 }} />
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border p-3" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.30)" }}>
          <p className="text-[10px] font-bold" style={{ color: "#EF4444" }}>{error}</p>
        </div>
      )}

      {/* Type summary chips */}
      {devices.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(Object.keys(TYPE_META) as DeviceType[]).map(t => {
            const count = devices.filter(d => d.type === t).length;
            if (!count) return null;
            const { Icon, color, label } = TYPE_META[t];
            return (
              <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 border text-[8px] font-black uppercase tracking-widest"
                   style={{ borderColor: `${color}40`, background: `${color}12`, color }}>
                <Icon size={10} /> {count} {label.split(" ")[0]}
              </div>
            );
          })}
        </div>
      )}

      {/* Device cards */}
      <AnimatePresence>
        {devices.map((device, i) => {
          const meta = TYPE_META[device.type];
          return (
            <motion.div key={device.ip}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
              className="rounded-2xl border overflow-hidden"
              style={{ background: CARD_BG, borderColor: `${meta.color}22` }}>
              <div style={{ height: 2, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}30)` }} />
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}35` }}>
                  <meta.Icon size={18} style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black tabular-nums" style={{ color: "#E2E8F0" }}>{device.ip}</span>
                    {device.isSelf && (
                      <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest"
                            style={{ background: ch(0.15), color: accent, border: `1px solid ${ch(0.30)}` }}>
                        This Device
                      </span>
                    )}
                    {device.isGateway && !device.isSelf && (
                      <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest"
                            style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.30)" }}>
                        Gateway
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: meta.color }}>{meta.label}</p>
                  {device.vendor && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Tag size={8} style={{ color: "rgba(148,163,184,0.45)" }} />
                      <p className="text-[9px] font-bold truncate" style={{ color: "rgba(148,163,184,0.60)" }}>{device.vendor}</p>
                    </div>
                  )}
                  {device.hostname && device.hostname !== device.vendor && (
                    <p className="text-[8px] font-bold mt-0.5 truncate" style={{ color: "rgba(148,163,184,0.40)" }}>{device.hostname}</p>
                  )}
                  {device.mac && (
                    <p className="text-[8px] font-black uppercase tracking-widest mt-0.5 tabular-nums"
                       style={{ color: "rgba(148,163,184,0.30)" }}>{device.mac}</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Empty state */}
      {phase === "idle" && devices.length === 0 && (
        <div className="rounded-2xl border flex flex-col items-center text-center p-8"
             style={{ background: CARD_BG, borderColor: ch(0.12) }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
               style={{ background: ch(0.10), border: `1px solid ${ch(0.20)}` }}>
            <Wifi size={22} style={{ color: accent }} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#E2E8F0" }}>No Scan Yet</p>
          <p className="text-[9px] font-bold mt-1" style={{ color: "rgba(148,163,184,0.45)" }}>
            Connect to WiFi and tap Scan to discover all active devices on your network
          </p>
        </div>
      )}

      {/* Learning box */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: ch(0.20) }}>
        <button onClick={() => setLearnOpen(o => !o)} className="w-full p-4 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: accent }}>How does this work?</span>
          {learnOpen
            ? <ChevronUp size={13} style={{ color: accent }} />
            : <ChevronDown size={13} style={{ color: accent }} />}
        </button>
        {learnOpen && (
          <div className="px-4 pb-4 space-y-3 text-[10px] font-bold leading-relaxed border-t"
               style={{ borderColor: ch(0.15), color: "rgba(148,163,184,0.55)" }}>
            <p className="mt-3">
              <span style={{ color: accent }}>ARP + TCP Scan</span> — The scanner uses native Android ARP resolution to probe all 254 IPs on your subnet. Real devices respond to ARP; ghost IPs are filtered out automatically.
            </p>
            <p>
              <span style={{ color: "#22C55E" }}>MAC Vendor Lookup</span> — Each device's hardware (MAC) address identifies the manufacturer — Apple, Samsung, TP-Link, etc.
            </p>
            <p>
              <span style={{ color: "#F59E0B" }}>Security Use</span> — If you see a device you don't recognize, that is an unauthorized connection. Note the MAC address and block it in your router settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
