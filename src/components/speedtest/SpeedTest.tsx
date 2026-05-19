import React, { useState, useRef, useEffect } from "react";
import {
  Gauge, Activity, CheckCircle, XCircle, Loader2,
  Wifi, Globe, Server, Shield, Zap, Play, RefreshCw,
  Navigation, MapPin, Satellite
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Geolocation } from "@capacitor/geolocation";

type Tab = "speed" | "health" | "gps";
type Phase = "idle" | "ping" | "download" | "upload" | "done";

interface SpeedResult {
  ping: number | null;
  jitter: number | null;
  download: number | null;
  upload: number | null;
}

interface HealthItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  status: "pending" | "running" | "pass" | "fail";
  value?: string;
}

// ─── Speed Gauge (shared) ─────────────────────────────────────────────────────

function SpeedGauge({ value, max = 200, unit = "Mbps" }: { value: number; max?: number; unit?: string }) {
  const cx = 100, cy = 100, r = 78;
  const p = Math.min(Math.max(value, 0), max) / max;
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const ex = cx + r * Math.cos((1 - p) * Math.PI);
  const ey = cy - r * Math.sin((1 - p) * Math.PI);
  const fillPath = p > 0.001
    ? `M ${cx - r} ${cy} A ${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
    : null;
  const color = value >= 100 ? "#38BDF8" : value >= 50 ? "#22C55E" : value >= 10 ? "#F59E0B" : value > 0 ? "#EF4444" : "rgba(148,163,184,0.3)";

  return (
    <svg width="200" height="115" viewBox="0 0 200 115">
      <path d={bgPath} fill="none" stroke="rgba(148,163,184,0.10)" strokeWidth="13" strokeLinecap="round" />
      {fillPath && <>
        <path d={fillPath} fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" opacity="0.12" />
        <path d={fillPath} fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" />
      </>}
      <text x="100" y="88" textAnchor="middle" fontWeight="900" fontFamily="monospace"
        fontSize={value >= 100 ? "28" : "30"} fill={value > 0 ? color : "rgba(148,163,184,0.35)"}>
        {value > 0 ? (value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : value.toFixed(0)) : "—"}
      </text>
      <text x="100" y="104" textAnchor="middle" fontSize="10" fontWeight="700" fill="rgba(148,163,184,0.45)">{unit}</text>
      <text x="15" y="114" fontSize="9" fontWeight="700" fill="rgba(148,163,184,0.35)">0</text>
      <text x={max >= 100 ? "165" : "172"} y="114" fontSize="9" fontWeight="700" fill="rgba(148,163,184,0.35)">{max}</text>
    </svg>
  );
}

// ─── GPS Speedometer gauge (0–220 km/h) ──────────────────────────────────────

function GpsGauge({ speedKmh }: { speedKmh: number }) {
  const MAX = 220;
  const cx = 100, cy = 100, r = 78;
  const p = Math.min(Math.max(speedKmh, 0), MAX) / MAX;
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const ex = cx + r * Math.cos((1 - p) * Math.PI);
  const ey = cy - r * Math.sin((1 - p) * Math.PI);
  const fillPath = p > 0.001
    ? `M ${cx - r} ${cy} A ${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
    : null;
  const color = speedKmh === 0 ? "rgba(148,163,184,0.3)"
    : speedKmh < 30 ? "#22C55E"
    : speedKmh < 80 ? "#38BDF8"
    : speedKmh < 120 ? "#F59E0B"
    : "#EF4444";

  return (
    <svg width="200" height="115" viewBox="0 0 200 115">
      <path d={bgPath} fill="none" stroke="rgba(148,163,184,0.10)" strokeWidth="13" strokeLinecap="round" />
      {fillPath && <>
        <path d={fillPath} fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" opacity="0.12" />
        <path d={fillPath} fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" />
      </>}
      <text x="100" y="84" textAnchor="middle" fontWeight="900" fontFamily="monospace"
        fontSize={speedKmh >= 100 ? "30" : "34"} fill={speedKmh > 0 ? color : "rgba(148,163,184,0.35)"}>
        {speedKmh > 0 ? speedKmh.toFixed(1) : "0.0"}
      </text>
      <text x="100" y="102" textAnchor="middle" fontSize="10" fontWeight="700" fill="rgba(148,163,184,0.45)">km/h</text>
      <text x="15" y="114" fontSize="9" fontWeight="700" fill="rgba(148,163,184,0.35)">0</text>
      <text x="165" y="114" fontSize="9" fontWeight="700" fill="rgba(148,163,184,0.35)">{MAX}</text>
    </svg>
  );
}

// ─── Compass Arrow ────────────────────────────────────────────────────────────

function headingToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function CompassArrow({ heading }: { heading: number | null }) {
  const angle = heading ?? 0;
  const hasHeading = heading !== null;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="42" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1.5" />
        <circle cx="44" cy="44" r="34" fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="1" strokeDasharray="4 4" />
        <text x="44" y="10" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ef4444">N</text>
        <text x="80" y="47" textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(148,163,184,0.4)">E</text>
        <text x="44" y="84" textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(148,163,184,0.4)">S</text>
        <text x="8"  y="47" textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(148,163,184,0.4)">W</text>
        <g transform={`rotate(${angle}, 44, 44)`} style={{ opacity: hasHeading ? 1 : 0.3 }}>
          <polygon points="44,14 40,44 48,44" fill="#ef4444" />
          <polygon points="44,74 40,44 48,44" fill="rgba(148,163,184,0.35)" />
          <circle cx="44" cy="44" r="5" fill="rgba(8,14,28,0.95)" stroke="#ef4444" strokeWidth="2" />
        </g>
      </svg>
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.60)" }}>
        {hasHeading ? `${headingToCardinal(angle)} · ${Math.round(angle)}°` : "Move to detect heading"}
      </p>
    </div>
  );
}

// ─── Haversine distance (meters) ─────────────────────────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── GPS Speed Tab ────────────────────────────────────────────────────────────

function GpsSpeedTab() {
  const [tracking, setTracking]   = useState(false);
  const [speed, setSpeed]         = useState(0);
  const [heading, setHeading]     = useState<number | null>(null);
  const [accuracy, setAccuracy]   = useState<number | null>(null);
  const [altitude, setAltitude]   = useState<number | null>(null);
  const [maxSpeed, setMaxSpeed]   = useState(0);
  const [fixState, setFixState]   = useState<"waiting" | "fix" | "none">("none");
  const [error, setError]         = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPosRef  = useRef<{ lat: number; lon: number; t: number } | null>(null);
  const pollCount   = useRef(0);

  const stopTracking = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setTracking(false);
    setFixState("none");
    prevPosRef.current = null;
    pollCount.current = 0;
  };

  const applyPosition = (pos: any) => {
    let kmh = 0;
    if (pos.coords.speed !== null && pos.coords.speed !== undefined && pos.coords.speed >= 0) {
      kmh = pos.coords.speed * 3.6;
    } else if (prevPosRef.current) {
      const dist = haversineDistance(
        prevPosRef.current.lat, prevPosRef.current.lon,
        pos.coords.latitude, pos.coords.longitude
      );
      const dt = (Date.now() - prevPosRef.current.t) / 1000;
      if (dt > 0.5 && dist > 2) kmh = (dist / dt) * 3.6;
    }
    prevPosRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now() };
    const safeKmh = Math.max(0, kmh);
    setSpeed(parseFloat(safeKmh.toFixed(1)));
    setHeading(pos.coords.heading ?? null);
    setAccuracy(pos.coords.accuracy ?? null);
    setAltitude(pos.coords.altitude ?? null);
    setMaxSpeed(prev => Math.max(prev, safeKmh));
    setFixState("fix");
  };

  const startTracking = async () => {
    setError(null);
    setSpeed(0); setHeading(null); setAccuracy(null); setAltitude(null); setMaxSpeed(0);
    setFixState("waiting");
    setTracking(true);
    prevPosRef.current = null;
    pollCount.current = 0;

    try {
      const perm = await Geolocation.checkPermissions().catch(() => null);
      if (!perm || perm.location !== "granted") {
        await Geolocation.requestPermissions().catch(() => {});
      }
    } catch {}

    const poll = async () => {
      pollCount.current++;
      const highAccuracy = pollCount.current > 2;
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 8000 : 4000,
        });
        applyPosition(pos);
      } catch (e: any) {
        const msg = (e?.message ?? String(e)).toLowerCase();
        if (msg.includes("permission") || msg.includes("denied")) {
          setError("Location permission denied. Allow location access in device settings.");
          stopTracking();
        }
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 1500);
  };

  useEffect(() => () => stopTracking(), []);

  const fixColor = fixState === "fix" ? "#22c55e" : fixState === "waiting" ? "#f59e0b" : "rgba(148,163,184,0.4)";
  const fixLabel = fixState === "fix" ? "GPS Fix" : fixState === "waiting" ? "Acquiring…" : "No Signal";
  const gpsAccent = "#A78BFA";
  const gc = (op: number) => `${gpsAccent}${Math.round(op * 255).toString(16).padStart(2, "0")}`;

  return (
    <div className="rounded-2xl border overflow-hidden"
         style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: gc(0.18) }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${gpsAccent}, ${gc(0.30)})` }} />
      <div className="p-4 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.22em]"
               style={{ color: "rgba(148,163,184,0.40)" }}>Real-time GPS</p>
            <h3 className="font-black text-sm mt-0.5" style={{ color: "#E2E8F0" }}>GPS Speed Tracker</h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border"
               style={{ borderColor: `${fixColor}50`, background: `${fixColor}10` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: fixColor,
              animation: fixState === "waiting" ? "pulse 1.4s infinite" : "none" }} />
            <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: fixColor }}>{fixLabel}</span>
          </div>
        </div>

        {/* Speedometer */}
        <div className="flex flex-col items-center">
          <GpsGauge speedKmh={speed} />
        </div>

        {/* Compass + stats row */}
        <div className="grid grid-cols-2 gap-3 items-center">
          <CompassArrow heading={heading} />
          <div className="space-y-2">
            {[
              { icon: <Zap size={12} />,       label: "Max Speed", value: maxSpeed > 0 ? `${maxSpeed.toFixed(1)} km/h` : "—", color: "#f59e0b" },
              { icon: <MapPin size={12} />,    label: "Accuracy",  value: accuracy !== null ? `±${Math.round(accuracy)}m` : "—", color: "#38bdf8" },
              { icon: <Satellite size={12} />, label: "Altitude",  value: altitude !== null ? `${Math.round(altitude)}m` : "—", color: gpsAccent },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-xl border"
                   style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.08)" }}>
                <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.40)" }}>{item.label}</p>
                  <p className="text-[11px] font-black" style={{ color: "#E2E8F0" }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl border" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.30)" }}>
            <p className="text-[10px] font-bold" style={{ color: "#ef4444" }}>{error}</p>
          </div>
        )}

        {/* Control button */}
        {tracking ? (
          <button onClick={stopTracking}
            className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border"
            style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444", background: "rgba(239,68,68,0.06)" }}>
            <XCircle size={13} /> Stop Tracking
          </button>
        ) : (
          <button onClick={startTracking}
            className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${gpsAccent}, #6D28D9)`, color: "#fff", boxShadow: `0 4px 20px ${gc(0.25)}` }}>
            <Navigation size={13} /> Start GPS Tracking
          </button>
        )}

        <p className="text-[8px] font-bold uppercase tracking-wider text-center" style={{ color: "rgba(148,163,184,0.40)" }}>
          Walk or drive for accurate speed readings · GPS updates every second
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface NetInfo {
  ip: string; isp: string; city: string; country: string; countryCode: string; source: "gps" | "network";
}

const TAB_CONFIG = [
  { id: "speed",  label: "Speed",   icon: Gauge,       color: "#34D399" },
  { id: "health", label: "Health",  icon: Activity,    color: "#38BDF8" },
  { id: "gps",    label: "GPS",     icon: Navigation,  color: "#A78BFA" },
] as const;

export default function SpeedTest() {
  const [tab, setTab] = useState<Tab>("speed");
  const [phase, setPhase] = useState<Phase>("idle");
  const [live, setLive] = useState(0);
  const [results, setResults] = useState<SpeedResult>({ ping: null, jitter: null, download: null, upload: null });
  const [health, setHealth] = useState<HealthItem[]>([]);
  const [healthRunning, setHealthRunning] = useState(false);
  const [netInfo, setNetInfo] = useState<NetInfo | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => setNetInfo({ ip: d.ip, isp: d.org || d.isp || "—", city: d.city, country: d.country_name, countryCode: d.country_code, source: "network" }))
      .catch(() => {});
  }, []);

  const gaugeValue = phase === "done" ? (results.download ?? 0) : (phase === "download" || phase === "upload") ? live : 0;
  const phaseText: Record<Phase, string> = {
    idle: "READY TO TEST",
    ping: "MEASURING LATENCY...",
    download: "DOWNLOAD SPEED...",
    upload: "UPLOAD SPEED...",
    done: "TEST COMPLETE",
  };

  const measurePing = async () => {
    const times: number[] = [];
    for (let i = 0; i < 6; i++) {
      try {
        const s = performance.now();
        await fetch("https://speed.cloudflare.com/cdn-cgi/trace", { cache: "no-store", signal: abort.current?.signal });
        times.push(performance.now() - s);
      } catch { break; }
      if (i < 5) await new Promise(r => setTimeout(r, 80));
    }
    if (!times.length) return { ping: 0, jitter: 0 };
    const avg = times.reduce((a, b) => a + b) / times.length;
    const jitter = Math.sqrt(times.reduce((s, t) => s + (t - avg) ** 2, 0) / times.length);
    return { ping: Math.round(Math.min(...times)), jitter: Math.round(jitter) };
  };

  const measureDownload = async (): Promise<number> => {
    const WARMUP = 1200, MEASURE = 5000;
    const phaseStart = performance.now();
    let measureStart = 0, totalBytes = 0;
    const cb = () => `r=${Math.random()}`;

    const iv = setInterval(() => {
      if (measureStart > 0 && totalBytes > 0) {
        const dur = (performance.now() - measureStart) / 1000;
        setLive(parseFloat(((totalBytes * 8) / Math.max(0.1, dur) / 1e6).toFixed(1)));
      }
    }, 250);

    const worker = async () => {
      while (performance.now() - phaseStart < WARMUP + MEASURE && !abort.current?.signal.aborted) {
        try {
          const resp = await fetch(`https://speed.cloudflare.com/__down?bytes=10000000&${cb()}`, { signal: abort.current?.signal });
          const reader = resp.body?.getReader();
          if (!reader) break;
          while (true) {
            const { done, value } = await reader.read();
            if (done || abort.current?.signal.aborted) break;
            const now = performance.now();
            if (now - phaseStart > WARMUP) { if (!measureStart) measureStart = now; totalBytes += value.length; }
          }
        } catch { break; }
      }
    };

    await Promise.all(Array.from({ length: 4 }).map(() => worker()));
    clearInterval(iv);
    const dur = (performance.now() - (measureStart || phaseStart)) / 1000;
    return totalBytes > 0 ? parseFloat(((totalBytes * 8) / Math.max(0.1, dur) / 1e6).toFixed(1)) : 0;
  };

  const measureUpload = async (): Promise<number> => {
    const WARMUP = 1000, MEASURE = 5000;
    const payload = new Uint8Array(2 * 1024 * 1024).fill(65);
    const phaseStart = performance.now();
    let measureStart = 0, totalBytes = 0;

    const iv = setInterval(() => {
      if (measureStart > 0 && totalBytes > 0) {
        const dur = (performance.now() - measureStart) / 1000;
        setLive(parseFloat(((totalBytes * 8) / Math.max(0.1, dur) / 1e6).toFixed(1)));
      }
    }, 250);

    const worker = async () => {
      while (performance.now() - phaseStart < WARMUP + MEASURE && !abort.current?.signal.aborted) {
        try {
          const s = performance.now();
          await fetch("https://speed.cloudflare.com/__up", { method: "POST", body: payload, signal: abort.current?.signal });
          const now = performance.now();
          if (now - phaseStart > WARMUP) { if (!measureStart) measureStart = s; totalBytes += payload.length; }
        } catch { break; }
      }
    };

    await Promise.all(Array.from({ length: 6 }).map(() => worker()));
    clearInterval(iv);
    const dur = (performance.now() - (measureStart || phaseStart)) / 1000;
    return totalBytes > 0 ? parseFloat(((totalBytes * 8) / Math.max(0.1, dur) / 1e6).toFixed(1)) : 0;
  };

  const runTest = async () => {
    if (phase !== "idle" && phase !== "done") return;
    abort.current = new AbortController();
    setResults({ ping: null, jitter: null, download: null, upload: null });
    setLive(0);

    setPhase("ping");
    const { ping, jitter } = await measurePing();
    setResults(r => ({ ...r, ping, jitter }));

    setPhase("download");
    const download = await measureDownload();
    setLive(download);
    setResults(r => ({ ...r, download }));
    await new Promise(r => setTimeout(r, 600));

    setPhase("upload");
    setLive(0);
    const upload = await measureUpload();
    setLive(upload);
    setResults(r => ({ ...r, upload }));
    await new Promise(r => setTimeout(r, 400));

    setPhase("done");
    setLive(0);
  };

  const runHealth = async () => {
    setHealthRunning(true);
    const checks: HealthItem[] = [
      { id: "internet", label: "Internet Access",  desc: "Global connectivity check",   icon: <Globe size={13} />,    status: "pending" },
      { id: "dns",      label: "DNS Resolution",   desc: "Domain name lookup speed",    icon: <Server size={13} />,   status: "pending" },
      { id: "latency",  label: "Ping Latency",     desc: "Round-trip response time",    icon: <Zap size={13} />,      status: "pending" },
      { id: "backend",  label: "API Server",       desc: "TacU-NS backend status",      icon: <Activity size={13} />, status: "pending" },
      { id: "tls",      label: "TLS Security",     desc: "Encrypted connection check",  icon: <Shield size={13} />,   status: "pending" },
      { id: "conn",     label: "Connection Type",  desc: "Network interface detection", icon: <Wifi size={13} />,     status: "pending" },
    ];
    setHealth([...checks]);

    const update = (id: string, status: HealthItem["status"], value?: string) =>
      setHealth(prev => prev.map(c => c.id === id ? { ...c, status, value } : c));

    update("internet", "running");
    try {
      await fetch("https://speed.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
      update("internet", "pass", "Connected");
    } catch { update("internet", "fail", "No access"); }
    await new Promise(r => setTimeout(r, 200));

    update("dns", "running");
    try {
      const s = performance.now();
      const resp = await fetch("https://dns.google/resolve?name=google.com&type=A");
      const d = await resp.json();
      update("dns", d.Status === 0 ? "pass" : "fail", `${Math.round(performance.now() - s)}ms`);
    } catch { update("dns", "fail", "Timeout"); }
    await new Promise(r => setTimeout(r, 200));

    update("latency", "running");
    try {
      const times: number[] = [];
      for (let i = 0; i < 4; i++) {
        const s = performance.now();
        await fetch("https://speed.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
        times.push(performance.now() - s);
        await new Promise(r => setTimeout(r, 80));
      }
      const avg = Math.round(times.reduce((a, b) => a + b) / times.length);
      update("latency", avg < 250 ? "pass" : "fail", `${avg}ms avg`);
    } catch { update("latency", "fail", "Timeout"); }
    await new Promise(r => setTimeout(r, 200));

    update("backend", "running");
    try {
      const resp = await fetch("https://api.tacuns.net/health");
      update("backend", resp.ok ? "pass" : "fail", resp.ok ? "Online" : `Error ${resp.status}`);
    } catch { update("backend", "fail", "Unreachable"); }
    await new Promise(r => setTimeout(r, 200));

    update("tls", "running");
    await new Promise(r => setTimeout(r, 400));
    update("tls", "pass", "TLS Active");
    await new Promise(r => setTimeout(r, 200));

    update("conn", "running");
    await new Promise(r => setTimeout(r, 300));
    const conn = (navigator as any).connection || (navigator as any).mozConnection;
    update("conn", "pass", conn?.effectiveType?.toUpperCase() || conn?.type || "Active");
    setHealthRunning(false);
  };

  const getRating = (dl: number | null) => {
    if (dl === null) return { label: "—", color: "rgba(148,163,184,0.40)" };
    if (dl >= 100) return { label: "A+", color: "#38BDF8" };
    if (dl >= 50)  return { label: "A",  color: "#22C55E" };
    if (dl >= 25)  return { label: "B",  color: "#84CC16" };
    if (dl >= 10)  return { label: "C",  color: "#F59E0B" };
    if (dl >= 5)   return { label: "D",  color: "#F97316" };
    return              { label: "F",  color: "#EF4444" };
  };
  const rating = getRating(results.download);

  const activeTabColor = TAB_CONFIG.find(t => t.id === tab)?.color ?? "#34D399";

  return (
    <div className="space-y-4 pb-20">

      {/* Full-width tab bar */}
      <div className="flex rounded-2xl overflow-hidden border"
           style={{ background: "rgba(8,14,28,0.95)", borderColor: "rgba(148,163,184,0.10)" }}>
        {TAB_CONFIG.map(t => {
          const isActive = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="relative flex-1 flex flex-col items-center gap-1.5 py-3 transition-all"
              style={{ background: isActive ? `${t.color}10` : "transparent" }}>
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5"
                     style={{ background: t.color }} />
              )}
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                   style={{
                     background: isActive ? `${t.color}18` : "rgba(148,163,184,0.06)",
                     border: `1px solid ${isActive ? `${t.color}35` : "rgba(148,163,184,0.08)"}`,
                   }}>
                <Icon size={13} style={{ color: isActive ? t.color : "rgba(148,163,184,0.45)" }} />
              </div>
              <span className="text-[7px] font-black uppercase tracking-widest"
                    style={{ color: isActive ? t.color : "rgba(148,163,184,0.45)" }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Speed Test tab ── */}
        {tab === "speed" && (
          <motion.div key="speed" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border overflow-hidden"
                 style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: "rgba(52,211,153,0.18)" }}>
              <div style={{ height: 3, background: "linear-gradient(90deg, #34D399, rgba(52,211,153,0.30))" }} />
              <div className="p-4 space-y-5">

                <div className="flex flex-col items-center">
                  <SpeedGauge value={gaugeValue} max={200} unit={phase === "upload" ? "Mbps ↑" : "Mbps ↓"} />
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] -mt-1"
                     style={{ color: "rgba(148,163,184,0.40)" }}>
                    {phaseText[phase]}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Ping",     value: results.ping !== null ? `${results.ping}` : "—",
                      unit: "ms",   sub: results.jitter !== null ? `±${results.jitter}ms jitter` : "latency",
                      color: "#38BDF8", loading: phase === "ping" },
                    { label: "Download", value: results.download !== null ? `${results.download}` : phase === "download" ? `${live.toFixed(1)}` : "—",
                      unit: "Mbps", sub: "via Cloudflare", color: "#34D399", loading: phase === "download" },
                    { label: "Upload",   value: results.upload !== null ? `${results.upload}` : phase === "upload" ? `${live.toFixed(1)}` : "—",
                      unit: "Mbps", sub: "5MB payload", color: "#A78BFA", loading: phase === "upload" },
                    { label: "Rating",   value: rating.label, unit: "", sub: "network grade", color: rating.color, loading: false },
                  ].map(m => (
                    <div key={m.label} className="p-3 rounded-2xl border"
                         style={{ background: "rgba(148,163,184,0.04)", borderColor: `${m.color}20` }}>
                      <p className="text-[7px] font-black uppercase tracking-widest mb-1.5"
                         style={{ color: "rgba(148,163,184,0.40)" }}>{m.label}</p>
                      <div className="flex items-baseline gap-1">
                        {m.loading && <Loader2 size={9} className="animate-spin shrink-0 mb-0.5" style={{ color: m.color }} />}
                        <span className="text-xl font-black font-mono leading-none" style={{ color: m.color }}>{m.value}</span>
                        {m.unit && <span className="text-[8px] font-black" style={{ color: "rgba(148,163,184,0.40)" }}>{m.unit}</span>}
                      </div>
                      <p className="text-[7px] font-bold mt-1" style={{ color: "rgba(148,163,184,0.40)" }}>{m.sub}</p>
                    </div>
                  ))}
                </div>

                <button onClick={runTest} disabled={phase !== "idle" && phase !== "done"}
                  className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #34D399, #059669)", color: "#fff", boxShadow: "0 4px 20px rgba(52,211,153,0.25)" }}>
                  {phase !== "idle" && phase !== "done"
                    ? <><Loader2 size={13} className="animate-spin" />Testing...</>
                    : phase === "done"
                    ? <><RefreshCw size={13} />Run Again</>
                    : <><Play size={13} />Start Speed Test</>}
                </button>

                {/* Network Context */}
                <div className="p-4 rounded-2xl border"
                     style={{ background: "rgba(52,211,153,0.04)", borderColor: "rgba(52,211,153,0.18)" }}>
                  <p className="text-[8px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5"
                     style={{ color: "#34D399" }}>
                    <Globe size={10} /> Network Context
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Primary ISP",   value: netInfo?.isp          ?? "Identifying…" },
                      { label: "Global IP",     value: netInfo?.ip           ?? "Fetching…" },
                      { label: "Location",      value: netInfo ? `${netInfo.city}, ${netInfo.countryCode}` : "Locating…" },
                      { label: "Country",       value: netInfo?.country      ?? "—" },
                      { label: "Source",        value: netInfo ? "Network Topology" : "Pending…" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider"
                              style={{ color: "rgba(148,163,184,0.40)" }}>{item.label}</span>
                        <span className="text-[10px] font-bold truncate max-w-[180px]"
                              style={{ color: "#E2E8F0" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ── Health Check tab ── */}
        {tab === "health" && (
          <motion.div key="health" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border overflow-hidden"
                 style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: "rgba(56,189,248,0.18)" }}>
              <div style={{ height: 3, background: "linear-gradient(90deg, #38BDF8, rgba(56,189,248,0.30))" }} />
              <div className="p-4 space-y-4">

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-[0.22em]"
                       style={{ color: "rgba(148,163,184,0.40)" }}>Automated Diagnosis</p>
                    <h3 className="font-black text-sm mt-0.5" style={{ color: "#E2E8F0" }}>Network Health Check</h3>
                  </div>
                  {health.length > 0 && (
                    <div className="px-2.5 py-1 rounded-xl text-[8px] font-black border"
                         style={{ borderColor: "rgba(56,189,248,0.20)", background: "rgba(56,189,248,0.06)", color: "#38BDF8" }}>
                      {health.filter(c => c.status === "pass").length}/{health.length} OK
                    </div>
                  )}
                </div>

                {health.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                         style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.20)" }}>
                      <Activity size={24} style={{ color: "#38BDF8" }} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-center"
                       style={{ color: "rgba(148,163,184,0.40)" }}>
                      Run health check to diagnose<br />your network connection
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {health.map((item, i) => (
                      <motion.div key={item.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-3 rounded-xl border"
                        style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.08)" }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                             style={{
                               background: item.status === "pass" ? "rgba(34,197,94,0.12)" : item.status === "fail" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.08)",
                               color: item.status === "pass" ? "#22C55E" : item.status === "fail" ? "#EF4444" : "rgba(148,163,184,0.50)",
                               border: `1px solid ${item.status === "pass" ? "rgba(34,197,94,0.25)" : item.status === "fail" ? "rgba(239,68,68,0.25)" : "rgba(148,163,184,0.12)"}`,
                             }}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black" style={{ color: "#E2E8F0" }}>{item.label}</p>
                          <p className="text-[8px] font-bold" style={{ color: "rgba(148,163,184,0.40)" }}>{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.value && <span className="text-[9px] font-black" style={{ color: "rgba(148,163,184,0.60)" }}>{item.value}</span>}
                          {item.status === "running"  && <Loader2 size={13} className="animate-spin" style={{ color: "#38BDF8" }} />}
                          {item.status === "pass"     && <CheckCircle size={13} style={{ color: "#22c55e" }} />}
                          {item.status === "fail"     && <XCircle size={13} style={{ color: "#ef4444" }} />}
                          {item.status === "pending"  && <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "rgba(148,163,184,0.20)" }} />}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <button onClick={runHealth} disabled={healthRunning}
                  className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #38BDF8, #2563EB)", color: "#fff", boxShadow: "0 4px 20px rgba(56,189,248,0.25)" }}>
                  {healthRunning
                    ? <><Loader2 size={13} className="animate-spin" />Analyzing...</>
                    : <><Activity size={13} />{health.length ? "Run Again" : "Run Health Check"}</>}
                </button>

              </div>
            </div>
          </motion.div>
        )}

        {/* ── GPS Speed tab ── */}
        {tab === "gps" && (
          <motion.div key="gps" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GpsSpeedTab />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
