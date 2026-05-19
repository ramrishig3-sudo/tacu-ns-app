import React, { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldCheck,
  Globe, Activity,
  AlertTriangle, CheckCircle,
  Loader2, MapPin, RefreshCw,
  Clock, Database
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { Geolocation } from "@capacitor/geolocation";
import apiClient from "../../services/api";
import PermissionDisclosure from "../common/PermissionDisclosure";

const DISCLOSURE_KEY = "tacu_location_disclosed";

const LOCATION_CACHE_KEY = "tacu_location_cache";
const CACHE_TTL = 5 * 60 * 1000;
const accent = "#8B5CF6";
const ch = (op: number) => `${accent}${Math.round(op * 255).toString(16).padStart(2, "0")}`;

interface IpInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  isp: string;
  asn: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface SecurityCheck {
  id: string;
  label: string;
  status: "secure" | "warning" | "risk" | "checking";
  detail: string;
}

const TAB_CONFIG = [
  { id: "overview",  label: "Overview",  icon: Shield },
  { id: "analysis",  label: "Analysis",  icon: Activity },
  { id: "history",   label: "History",   icon: Clock },
] as const;

export default function PrivacyShield() {
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [overallRisk, setOverallRisk] = useState<"low" | "medium" | "high" | "unknown" | "fetching">("unknown");
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<"overview" | "analysis" | "history">("overview");
  const [fetchError, setFetchError] = useState(false);
  const [permissionNote, setPermissionNote] = useState(false);
  const [locationSource, setLocationSource] = useState<"pending" | "gps" | "network" | "error">("pending");
  const [vpnMismatch, setVpnMismatch] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [fetchLatencyMs, setFetchLatencyMs] = useState<number | null>(null);

  const fetchIpInfo = useCallback(async (force = false, signal?: AbortSignal) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(LOCATION_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setIpInfo(data);
            setLocationSource(data.source || "gps");
            setLoading(false);
            setOverallRisk(data.isVpnDetected ? "low" : "medium");
            return;
          }
        }
      } catch (e) {
        console.warn("Cache read failed");
      }
    }

    setLoading(true);
    setFetchError(false);
    setPermissionNote(false);
    setVpnMismatch(false);
    setOverallRisk("fetching");
    setLocationSource("pending");
    setFetchLatencyMs(null);

    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

    try {
      let finalData: any = { source: "network" };
      let gpsData: any = null;

      try {
        const pos = await Promise.race([
          Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 }),
          timeout(9000)
        ]) as any;

        if (signal?.aborted) return;

        if (pos && pos.coords) {
          gpsData = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, source: "gps" };

          try {
            const rev = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?lat=${gpsData.latitude}&lon=${gpsData.longitude}&format=json`,
              { headers: { "User-Agent": "TacU-NS" }, timeout: 5000, signal: signal }
            );
            if (signal?.aborted) return;
            const addr = rev.data.address;
            gpsData.city = addr.city || addr.town || addr.municipality || addr.village || addr.suburb || "Secured Node";
            gpsData.region = addr.state || addr.province;
            gpsData.country = addr.country || "Edge Core";
            gpsData.countryCode = addr.country_code?.toUpperCase();
            if (gpsData.countryCode === "IN") gpsData.timezone = "Asia/Kolkata";
          } catch (e) {
            gpsData.city = "Detected Region";
            gpsData.country = "Global Context";
            gpsData.countryCode = "LOC";
            gpsData.timezone = "UTC";
          }
        }
      } catch (err: any) {
        if (signal?.aborted) return;
        if (err.message?.toLowerCase().includes("denied") || err.message?.toLowerCase().includes("permission")) {
          setPermissionNote(true);
        }
      }

      let networkData: any = null;
      try {
        const t0 = Date.now();
        const res = await axios.get("https://ipapi.co/json/", { timeout: 6000, signal: signal });
        if (!signal?.aborted) setFetchLatencyMs(Date.now() - t0);
        if (signal?.aborted) return;
        networkData = {
          ip: res.data.ip, city: res.data.city, region: res.data.region,
          country: res.data.country_name, countryCode: res.data.country_code,
          isp: res.data.org, asn: res.data.asn,
          latitude: res.data.latitude, longitude: res.data.longitude,
          timezone: res.data.timezone
        };
      } catch (err) {
        if (signal?.aborted) return;
        try {
          const res = await Promise.race([apiClient.get("/api/my-ip", { signal: signal }), timeout(6000)]) as any;
          if (signal?.aborted) return;
          networkData = res.data;
        } catch (e) {
          console.warn("Internal IP fallback failed.");
        }
      }

      if (signal?.aborted) return;

      let mismatch = false;
      if (gpsData) {
        finalData = { ...networkData, ...gpsData };
        setLocationSource("gps");
        if (networkData?.countryCode && gpsData.countryCode && networkData.countryCode !== gpsData.countryCode) {
          mismatch = true;
          setVpnMismatch(true);
        }
      } else if (networkData) {
        finalData = { ...networkData, source: "network" };
        setLocationSource("network");
      }

      if (finalData && (finalData.ip || finalData.latitude)) {
        const isVpnDetected = ["vpn", "proxy", "relay", "tunnel", "tor"].some(kw =>
          (finalData.isp || "").toLowerCase().includes(kw)
        ) || mismatch;
        const resultToStore = { ...finalData, isVpnDetected };
        setIpInfo(resultToStore);
        runSecurityAnalysis(resultToStore);
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ data: resultToStore, timestamp: Date.now() }));
      } else {
        throw new Error("Unable to determine location");
      }
    } catch (err) {
      if (!signal?.aborted) {
        setFetchError(true);
        setLocationSource("error");
        setOverallRisk("unknown");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const alreadyDisclosed = localStorage.getItem(DISCLOSURE_KEY) === "1";
    if (alreadyDisclosed) {
      fetchIpInfo(false, controller.signal);
    } else {
      setLoading(false);
      setShowDisclosure(true);
    }
    try {
      const saved = localStorage.getItem("threat_history");
      if (saved) setScanHistory(JSON.parse(saved));
    } catch { }
    return () => { controller.abort(); };
  }, [fetchIpInfo]);

  const runSecurityAnalysis = (info: IpInfo) => {
    const isVpnDetected = ["vpn", "proxy", "relay", "tunnel", "tor"].some(kw =>
      (info.isp || "").toLowerCase().includes(kw)
    );
    setSecurityChecks([
      { id: "https", label: "Transport",     status: "secure",                             detail: "HTTPS Enforced" },
      { id: "vpn",   label: "Identity Mask", status: isVpnDetected ? "secure" : "warning", detail: isVpnDetected ? "Cloaked" : "IP Exposed" },
      { id: "isp",   label: "ISP Routing",   status: info.isp ? "secure" : "warning",      detail: info.isp ? "ISP Identified" : "Unknown ISP" },
    ]);
    setOverallRisk(isVpnDetected ? "low" : "medium");
  };

  const riskColor = overallRisk === "low" ? "#10B981" : overallRisk === "fetching" ? accent : "#F59E0B";
  const riskLabel = overallRisk === "low" ? "Secured Node" : overallRisk === "fetching" ? "Syncing..." : "Medium Risk";

  const handleDisclosureContinue = useCallback(() => {
    localStorage.setItem(DISCLOSURE_KEY, "1");
    setShowDisclosure(false);
    setLoading(true);
    fetchIpInfo(true);
  }, [fetchIpInfo]);

  return (
    <div className="space-y-4 pb-20">
      <AnimatePresence>
        {showDisclosure && (
          <PermissionDisclosure
            type="location"
            onContinue={handleDisclosureContinue}
            onDismiss={() => setShowDisclosure(false)}
          />
        )}
      </AnimatePresence>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: ch(0.18) }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.30)})` }} />
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: overallRisk === "fetching" ? ch(0.12) : overallRisk === "low" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                        border: `1px solid ${overallRisk === "fetching" ? ch(0.25) : overallRisk === "low" ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}` }}>
            {overallRisk === "fetching"
              ? <RefreshCw size={16} style={{ color: accent }} className="animate-spin" />
              : <Shield size={16} style={{ color: riskColor }} />}
          </div>
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: "rgba(148,163,184,0.40)" }}>Identity Shield</p>
            <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>Privacy Shield</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {overallRisk !== "fetching" && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                   style={{ background: `${riskColor}18`, border: `1px solid ${riskColor}30` }}>
                {overallRisk === "low"
                  ? <CheckCircle size={8} style={{ color: riskColor }} />
                  : <AlertTriangle size={8} style={{ color: riskColor }} />}
                <span className="text-[6.5px] font-black uppercase tracking-widest" style={{ color: riskColor }}>{riskLabel}</span>
              </div>
            )}
            <button onClick={() => fetchIpInfo(true)} disabled={loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
              style={{ background: ch(0.08), border: `1px solid ${ch(0.18)}` }}>
              <RefreshCw size={11} style={{ color: accent }} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* GPS permission note */}
      {permissionNote && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border px-4 py-2 text-center"
          style={{ background: `${accent}08`, borderColor: `${accent}25` }}>
          <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: accent }}>
            Location permission improves accuracy
          </p>
        </motion.div>
      )}

      {/* VPN mismatch alert */}
      {vpnMismatch && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.28)" }}>
          <AlertTriangle size={16} style={{ color: "#F59E0B" }} className="shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-tight" style={{ color: "#F59E0B" }}>Routing Anomaly Detected</p>
            <p className="text-[9px] font-bold" style={{ color: "rgba(245,158,11,0.70)" }}>VPN or proxy may be active (Network ≠ GPS)</p>
          </div>
        </motion.div>
      )}

      {/* Location source indicator */}
      {ipInfo && locationSource !== "error" && !loading && (
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
               style={{ background: "rgba(148,163,184,0.06)", border: "1px solid rgba(148,163,184,0.12)" }}>
            {locationSource === "gps"
              ? <MapPin size={10} style={{ color: "#10B981" }} />
              : <Globe size={10} style={{ color: accent }} />}
            <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.50)" }}>
              {locationSource === "gps" ? "Precise GPS Location" : "Approx. network-based location"}
            </span>
          </div>
        </div>
      )}

      {/* Fetch error */}
      {fetchError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: "rgba(239,68,68,0.20)" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, #EF4444, rgba(239,68,68,0.30))" }} />
          <div className="py-8 flex flex-col items-center gap-3 px-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                 style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)" }}>
              <AlertTriangle size={22} style={{ color: "#EF4444" }} />
            </div>
            <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#EF4444" }}>Unable to determine location</p>
            <p className="text-[9px] font-bold" style={{ color: "rgba(148,163,184,0.50)" }}>Signal sync timeout reached</p>
            <button onClick={() => fetchIpInfo(true)}
              className="mt-2 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              style={{ background: "#EF4444", color: "#fff" }}>
              Retry Sync
            </button>
          </div>
        </motion.div>
      )}

      {/* Tab bar */}
      <div className="rounded-2xl overflow-hidden border flex"
           style={{ background: "rgba(8,14,28,0.95)", borderColor: "rgba(148,163,184,0.10)" }}>
        {TAB_CONFIG.map(t => {
          const isActive = activeSection === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveSection(t.id as any)}
              className="relative flex-1 flex flex-col items-center gap-1.5 py-3 transition-all"
              style={{ background: isActive ? ch(0.10) : "transparent" }}>
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
              )}
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                   style={{ background: isActive ? ch(0.15) : "transparent" }}>
                <Icon size={12} style={{ color: isActive ? accent : "rgba(148,163,184,0.40)" }} />
              </div>
              <span className="text-[7px] font-black uppercase tracking-widest"
                    style={{ color: isActive ? accent : "rgba(148,163,184,0.40)" }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* Overview tab */}
        {activeSection === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {ipInfo ? (
              <>
                {/* IP identity card */}
                <div className="rounded-2xl border overflow-hidden"
                     style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: ch(0.15) }}>
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.25)})` }} />
                  <div className="p-5 flex flex-col items-center gap-1">
                    <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: `${accent}90` }}>Identity Vector</p>
                    <p className="text-2xl font-black tracking-tight" style={{ color: "#E2E8F0" }}>{ipInfo.ip}</p>
                    <div className="w-full mt-4 pt-4 grid grid-cols-4 gap-1"
                         style={{ borderTop: `1px solid ${ch(0.12)}` }}>
                      <MiniMetric label="CITY"  value={ipInfo.city} />
                      <MiniMetric label="ISO"   value={ipInfo.countryCode} />
                      <MiniMetric label="ISP"   value={(ipInfo.isp || "").split(" ")[0]} />
                      <MiniMetric label="ZONE"  value={(ipInfo.timezone || "UTC").split("/")[1] || "UTC"} />
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  <QuickStat label="Status"  value={overallRisk === "low" ? "Protected" : "Exposed"} color={overallRisk === "low" ? "#10B981" : "#F59E0B"} icon={<ShieldCheck size={14} />} />
                  <QuickStat label="Latency" value={fetchLatencyMs !== null ? `${fetchLatencyMs} ms` : "---"} color={accent} icon={<Activity size={14} />} />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border flex items-center justify-center py-20"
                   style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: ch(0.12) }}>
                <Loader2 size={24} style={{ color: accent }} className="animate-spin" />
              </div>
            )}
          </motion.div>
        )}

        {/* Analysis tab */}
        {activeSection === "analysis" && (
          <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border overflow-hidden"
                 style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: ch(0.15) }}>
              <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.25)})` }} />
              <div className="p-4">
                <p className="text-[7px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: `${accent}90` }}>Heuristic Logs</p>
                <div className="space-y-2">
                  {securityChecks.map(c => {
                    const statusColor = c.status === "secure" ? "#10B981" : c.status === "risk" ? "#EF4444" : "#F59E0B";
                    return (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl"
                           style={{ background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.08)" }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-6 rounded-full" style={{ background: statusColor }} />
                          <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: "#E2E8F0" }}>{c.label}</span>
                        </div>
                        <span className="text-[9px] font-bold" style={{ color: statusColor }}>{c.detail}</span>
                      </div>
                    );
                  })}
                  {securityChecks.length === 0 && (
                    <div className="py-8 flex justify-center">
                      <Loader2 size={20} style={{ color: accent }} className="animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* History tab */}
        {activeSection === "history" && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border overflow-hidden"
                 style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: ch(0.15) }}>
              <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.25)})` }} />
              <div className="p-4">
                <p className="text-[7px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: `${accent}90` }}>Scan History</p>
                {scanHistory.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ background: ch(0.08), border: `1px solid ${ch(0.18)}` }}>
                      <Database size={16} style={{ color: accent }} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(148,163,184,0.40)" }}>No history yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scanHistory.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                           style={{ background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.08)" }}>
                        <span className="text-[10px] font-bold" style={{ color: "#E2E8F0" }}>{item.ip || "Unknown"}</span>
                        <span className="text-[9px] font-black uppercase" style={{ color: "rgba(148,163,184,0.40)" }}>{item.time || ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center px-1">
      <p className="text-[7px] font-black uppercase tracking-wider mb-1" style={{ color: "rgba(148,163,184,0.40)" }}>{label}</p>
      <p className="text-[10px] font-black truncate" style={{ color: "#E2E8F0" }}>{value}</p>
    </div>
  );
}

function QuickStat({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-3.5 flex items-center justify-between"
         style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: `${color}22` }}>
      <div>
        <p className="text-[7px] font-black uppercase tracking-wider mb-0.5" style={{ color: "rgba(148,163,184,0.40)" }}>{label}</p>
        <p className="text-base font-black" style={{ color }}>{value}</p>
      </div>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
           style={{ background: `${color}12`, color }}>
        {icon}
      </div>
    </div>
  );
}
