import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Wifi as WifiIcon, ShieldCheck, ShieldAlert, Signal, RefreshCw, Loader2,
  AlertTriangle, BarChart3, Zap, Radio, Search, X, Info, ChevronRight,
  Settings, AlertOctagon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { Capacitor } from "@capacitor/core";
import { CapacitorWifi as WifiPlugin } from "@capgo/capacitor-wifi";
import { Geolocation } from "@capacitor/geolocation";
import { NativeSettings, AndroidSettings } from "capacitor-native-settings";
import PermissionDisclosure from "../common/PermissionDisclosure";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WifiNetwork {
  id: string; ssid: string; bssid: string; signalPercent: number;
  frequency: number; channel: number; security: string;
  band: "2.4 GHz" | "5 GHz"; isConnected: boolean; vendor: string;
  rssi: number; risk?: "safe" | "vulnerable" | "critical";
}

interface SecurityIssue {
  id: string; severity: "critical" | "warning" | "info";
  title: string; description: string; recommendation: string;
}

type RogueAlertType = "EVIL_TWIN" | "BSSID_CHANGED" | "NEW_BSSID" | "SECURITY_DOWNGRADE";

interface RogueAlert {
  type: RogueAlertType; ssid: string; severity: "high" | "medium";
  description: string; currentBssid: string; previousBssid?: string;
}

interface KnownAPRecord {
  bssids: string[]; risk: "safe" | "vulnerable" | "critical";
  firstSeen: number; lastSeen: number;
}

// ─── Accent ──────────────────────────────────────────────────────────────────

const accent = "#A78BFA";
const ch = (op: number) => `${accent}${Math.round(op * 255).toString(16).padStart(2, "0")}`;
const CARD_BG = "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))";

// ─── AP Detection helpers ─────────────────────────────────────────────────────

const KNOWN_APS_KEY = "tacu_known_aps_v1";

function loadKnownAPs(): Record<string, KnownAPRecord> {
  try { const raw = localStorage.getItem(KNOWN_APS_KEY); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

function saveKnownAPs(networks: WifiNetwork[], known: Record<string, KnownAPRecord>): void {
  const now = Date.now();
  networks.forEach(n => {
    if (!n.ssid || n.ssid === "(HIDDEN)") return;
    const existing = known[n.ssid];
    if (existing) {
      if (!existing.bssids.includes(n.bssid)) existing.bssids.push(n.bssid);
      existing.lastSeen = now;
      existing.risk = n.risk ?? "safe";
    } else {
      known[n.ssid] = { bssids: [n.bssid], risk: n.risk ?? "safe", firstSeen: now, lastSeen: now };
    }
  });
  try { localStorage.setItem(KNOWN_APS_KEY, JSON.stringify(known)); }
  catch { localStorage.removeItem(KNOWN_APS_KEY); }
}

function detectRogueAPs(networks: WifiNetwork[], known: Record<string, KnownAPRecord>, bssidAvailable: boolean): RogueAlert[] {
  const alerts: RogueAlert[] = [];
  const bySsid: Record<string, WifiNetwork[]> = {};
  networks.forEach(n => {
    if (!n.ssid || n.ssid === "(HIDDEN)") return;
    if (!bySsid[n.ssid]) bySsid[n.ssid] = [];
    bySsid[n.ssid].push(n);
  });

  Object.entries(bySsid).forEach(([ssid, nets]) => {
    const uniqueBssids = [...new Set(nets.map(n => n.bssid))];
    const hist = known[ssid];

    if (bssidAvailable) {
      if (uniqueBssids.length >= 2) {
        alerts.push({ type: "EVIL_TWIN", ssid, severity: "high",
          description: `${uniqueBssids.length} different devices are broadcasting "${ssid}" simultaneously. One may be an attacker mimicking the legitimate access point.`,
          currentBssid: uniqueBssids[0], previousBssid: uniqueBssids[1] });
      }
      if (hist) {
        nets.forEach(n => {
          if (hist.bssids.length === 1 && !hist.bssids.includes(n.bssid)) {
            alerts.push({ type: "BSSID_CHANGED", ssid, severity: "high",
              description: `The hardware address of "${ssid}" changed from a previously trusted device. This network may be impersonating the legitimate AP.`,
              currentBssid: n.bssid, previousBssid: hist.bssids[0] });
          } else if (hist.bssids.length > 1 && !hist.bssids.includes(n.bssid)) {
            alerts.push({ type: "NEW_BSSID", ssid, severity: "medium",
              description: `A new access point is broadcasting "${ssid}" that was not previously recorded. Verify this is an expected mesh node or new router.`,
              currentBssid: n.bssid });
          }
        });
      }
    }

    if (!hist) return;
    nets.forEach(n => {
      const wasSecure = hist.risk === "safe";
      const nowVulnerable = n.risk === "vulnerable" || n.risk === "critical";
      if (wasSecure && nowVulnerable) {
        alerts.push({ type: "SECURITY_DOWNGRADE", ssid, severity: "high",
          description: `"${ssid}" previously used encrypted security but now advertises as open or unencrypted. This is a classic rogue AP interception technique.`,
          currentBssid: n.bssid });
      }
    });
  });

  const seen = new Set<string>();
  return alerts.filter(a => {
    const key = `${a.type}:${a.ssid}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Band filter tabs ─────────────────────────────────────────────────────────

const BAND_TABS = [
  { id: "all",    label: "All" },
  { id: "2.4 GHz", label: "2.4 GHz" },
  { id: "5 GHz",  label: "5 GHz" },
] as const;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WifiAnalyzer() {
  const [networks, setNetworks]                 = useState<WifiNetwork[]>([]);
  const [scanning, setScanning]                 = useState(false);
  const [selectedNetwork, setSelectedNetwork]   = useState<WifiNetwork | null>(null);
  const [filterBand, setFilterBand]             = useState<"all" | "2.4 GHz" | "5 GHz">("all");
  const [error, setError]                       = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showDisclosure, setShowDisclosure]     = useState(false);
  const isMounted = useRef(true);
  const [hasConsented, setHasConsented] = useState(() =>
    localStorage.getItem("wifi_disclosure_accepted") === "true"
  );
  const [wifiEnabled, setWifiEnabled]                   = useState(true);
  const [androidScanLimit, setAndroidScanLimit]         = useState(false);
  const [rogueAlerts, setRogueAlerts]                   = useState<RogueAlert[]>([]);
  const [lastScanTime, setLastScanTime]                 = useState<Date | null>(null);
  const [bssidTrackingAvailable, setBssidTrackingAvailable] = useState(false);
  const [trustedApCount, setTrustedApCount]             = useState(0);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const openSettings = async () => {
    try { await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails }); }
    catch { setError("Please open Android Settings → Apps → TacU-NS → Permissions and enable Location."); }
  };

  const doScan = useCallback(async (signal?: AbortSignal) => {
    if (!isMounted.current || signal?.aborted) return;
    if (Capacitor.getPlatform() === "web") {
      setError("WiFi scanning requires a physical Android device. Not supported in browser.");
      return;
    }
    setScanning(true); setError(null); setPermissionDenied(false);
    setAndroidScanLimit(false); setRogueAlerts([]);

    try {
      const { enabled } = await WifiPlugin.isEnabled();
      if (signal?.aborted) return;
      setWifiEnabled(enabled);
      if (!enabled) { setError("WiFi is currently disabled. Please enable it to scan."); setScanning(false); return; }

      const perms = await Geolocation.checkPermissions();
      if (signal?.aborted) return;
      if (perms.location !== "granted") { setPermissionDenied(true); setScanning(false); return; }

      let currentSsid: string | null = null;
      try { const ssidRes = await WifiPlugin.getSsid(); currentSsid = ssidRes.ssid || null; }
      catch (e) { console.warn("Could not fetch current SSID"); }

      const result = await WifiPlugin.getAvailableNetworks();
      if (signal?.aborted) return;

      if (result && result.networks) {
        if (result.networks.length === 0) {
          setAndroidScanLimit(true);
          setError("Location services are required to scan nearby WiFi networks.");
        }
        const mappedNetworks: WifiNetwork[] = result.networks.map((n: any) => {
          const rssi = n.rssi || -99;
          const signalPercent = Math.max(0, Math.min(100, Math.floor(((rssi + 90) / 60) * 100)));
          return {
            id: n.bssid || n.ssid, ssid: n.ssid || "(HIDDEN)",
            bssid: n.bssid || "00:00:00:00:00:00", signalPercent, rssi,
            frequency: n.frequency || 2400,
            channel: Math.floor(((n.frequency || 2412) - 2407) / 5) || 1,
            security: n.securityTypes?.join("/") || "SECURE",
            band: (n.frequency || 2412) > 4000 ? "5 GHz" : "2.4 GHz",
            isConnected: currentSsid !== null && n.ssid === currentSsid,
            vendor: "Verified Node",
            risk: (n.securityTypes || []).includes(0) ? "vulnerable" : "safe",
          };
        });
        setNetworks(mappedNetworks);

        const realBssids = mappedNetworks.filter(n => n.bssid && n.bssid !== "00:00:00:00:00:00");
        const bssidAvail = realBssids.length > 0;
        setBssidTrackingAvailable(bssidAvail);
        const knownAPs = loadKnownAPs();
        const detected = detectRogueAPs(mappedNetworks, knownAPs, bssidAvail);
        setRogueAlerts(detected);
        saveKnownAPs(mappedNetworks, knownAPs);
        setTrustedApCount(Object.keys(loadKnownAPs()).length);
        setLastScanTime(new Date());
      }
    } catch (e: any) {
      if (signal?.aborted) return;
      if (e.message?.toLowerCase().includes("permission")) setPermissionDenied(true);
      else setError("Unable to scan WiFi networks. Please check permissions and GPS.");
    } finally {
      if (isMounted.current && !signal?.aborted) setScanning(false);
    }
  }, []);

  const handleScan = useCallback(async () => {
    if (!hasConsented) setShowDisclosure(true);
    else doScan();
  }, [hasConsented, doScan]);

  const handleDisclosureContinue = () => {
    localStorage.setItem("wifi_disclosure_accepted", "true");
    setHasConsented(true); setShowDisclosure(false); doScan();
  };

  useEffect(() => {
    const controller = new AbortController();
    if (hasConsented) doScan(controller.signal);
    return () => controller.abort();
  }, [hasConsented, doScan]);

  const connectedNetwork = networks.find(n => n.isConnected);
  const issues = useMemo(() => {
    const i: SecurityIssue[] = [];
    if (networks.some(n => n.security.toLowerCase().includes("open") || n.risk === "vulnerable"))
      i.push({ id: "1", severity: "critical", title: "Open Hotspots", description: "Vulnerable to packet injection.", recommendation: "Avoid open APs. Use VPN Shield." });
    if (networks.some(n => n.security.toLowerCase().includes("wep") || n.risk === "critical"))
      i.push({ id: "2", severity: "critical", title: "Legacy Security", description: "WEP/WPA1 detected. Easily compromised.", recommendation: "Upgrade router to WPA3-SAE." });
    return i;
  }, [networks]);

  const rogueAlertSsids = useMemo(() => new Set(rogueAlerts.map(a => a.ssid)), [rogueAlerts]);

  return (
    <div className="space-y-4 pb-20">

      {/* Permission Disclosure Modal */}
      <AnimatePresence>
        {showDisclosure && (
          <PermissionDisclosure type="wifi" onContinue={handleDisclosureContinue} onDismiss={() => setShowDisclosure(false)} />
        )}
      </AnimatePresence>

      {/* Header card */}
      <div className="rounded-2xl border overflow-hidden"
           style={{ background: CARD_BG, borderColor: ch(0.18) }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.30)})` }} />
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: ch(0.12), border: `1px solid ${ch(0.25)}` }}>
            <WifiIcon size={16} style={{ color: accent }} />
          </div>
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: "rgba(148,163,184,0.40)" }}>RF Environment</p>
            <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>WiFi Analyzer</p>
          </div>
          <button onClick={handleScan} disabled={scanning}
            className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
            style={{ background: ch(0.08), border: `1px solid ${ch(0.18)}` }}>
            <RefreshCw size={13} style={{ color: accent }} className={scanning ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Permission denied */}
      {permissionDenied && (
        <div className="rounded-2xl border overflow-hidden"
             style={{ background: CARD_BG, borderColor: "rgba(245,158,11,0.22)" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, #F59E0B, rgba(245,158,11,0.30))" }} />
          <div className="p-5 flex flex-col items-center gap-4 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Settings size={18} style={{ color: "#F59E0B" }} />
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>Permission Required</p>
              <p className="text-[11px] font-bold mt-1 leading-relaxed" style={{ color: "rgba(148,163,184,0.60)" }}>
                Location permission is required to scan WiFi networks.
              </p>
            </div>
            <button onClick={openSettings}
              className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              style={{ background: "#F59E0B", color: "#fff" }}>
              Open Settings
            </button>
          </div>
        </div>
      )}

      {/* Rogue AP Alert Banner */}
      <AnimatePresence>
        {rogueAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <RogueAlertsBanner alerts={rogueAlerts} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected network */}
      {connectedNetwork && (
        <div className="rounded-2xl border overflow-hidden"
             style={{ background: CARD_BG, borderColor: "rgba(16,185,129,0.25)" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, #10B981, rgba(16,185,129,0.30))" }} />
          <div className="p-5 flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                 style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <WifiIcon size={16} style={{ color: "#10B981" }} />
            </div>
            <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: "rgba(16,185,129,0.70)" }}>Connected SSID</p>
            <h2 className="font-black text-lg uppercase tracking-tight truncate max-w-[200px]" style={{ color: "#E2E8F0" }}>{connectedNetwork.ssid}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase" style={{ background: "#10B981", color: "#fff" }}>Active</span>
              <span className="px-1.5 py-0.5 rounded border text-[7px] font-black uppercase"
                    style={{ background: "rgba(148,163,184,0.08)", borderColor: "rgba(148,163,184,0.14)", color: "rgba(148,163,184,0.60)" }}>
                {connectedNetwork.bssid}
              </span>
            </div>
            <div className="w-full mt-4 pt-4 grid grid-cols-4 gap-1" style={{ borderTop: "1px solid rgba(16,185,129,0.12)" }}>
              <DataPoint label="SEC"  value={connectedNetwork.security.split("[")[0]} color="#10B981" />
              <DataPoint label="SIG"  value={`${connectedNetwork.signalPercent}%`}    color="#10B981" />
              <DataPoint label="BAND" value={connectedNetwork.band.split(" ")[0]}     color={accent} />
              <DataPoint label="CH"   value={connectedNetwork.channel}                color="#F59E0B" />
            </div>
          </div>
        </div>
      )}

      {/* Quick metric grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total SSIDs"  value={networks.length}                                                                    color="#A78BFA" icon={<Search size={12} />} />
        <MetricCard label="Secure"       value={networks.filter(n => n.risk === "safe").length}                                    color="#10B981" icon={<ShieldCheck size={12} />} />
        <MetricCard label="Vulnerable"   value={networks.filter(n => n.risk === "vulnerable" || n.risk === "critical").length}     color="#EF4444" icon={<ShieldAlert size={12} />} />
        <MetricCard label="5 GHz Nodes"  value={networks.filter(n => n.band === "5 GHz").length}                                   color="#F59E0B" icon={<Zap size={12} />} />
      </div>

      {/* AP Guard Panel */}
      {(lastScanTime || networks.length > 0) && (
        <APGuardPanel trustedCount={trustedApCount} lastScan={lastScanTime}
          rogueCount={rogueAlerts.length} bssidAvailable={bssidTrackingAvailable} />
      )}

      {/* Security exceptions */}
      {issues.length > 0 && (
        <div className="rounded-2xl border overflow-hidden"
             style={{ background: CARD_BG, borderColor: "rgba(239,68,68,0.18)" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, #EF4444, rgba(239,68,68,0.30))" }} />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={12} style={{ color: "#EF4444" }} />
              <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: "#EF4444" }}>Exceptions</p>
            </div>
            <div className="space-y-2">
              {issues.map(issue => (
                <div key={issue.id} className="p-3 rounded-xl flex items-center justify-between gap-3"
                     style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <AlertTriangle size={11} style={{ color: "#EF4444" }} className="shrink-0" />
                    <span className="font-black text-[9px] uppercase truncate tracking-tight" style={{ color: "#E2E8F0" }}>{issue.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase shrink-0"
                        style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.20)", color: "#10B981" }}>
                    Fix Needed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spectral Matrix card */}
      <div className="rounded-2xl border overflow-hidden"
           style={{ background: CARD_BG, borderColor: ch(0.15) }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.25)})` }} />
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>Spectral Matrix</p>
          </div>

          {/* Band filter — full-width tabs */}
          <div className="rounded-xl overflow-hidden border flex mb-4"
               style={{ background: "rgba(8,14,28,0.95)", borderColor: "rgba(148,163,184,0.10)" }}>
            {BAND_TABS.map(t => {
              const isActive = filterBand === t.id;
              return (
                <button key={t.id} onClick={() => setFilterBand(t.id as any)}
                  className="relative flex-1 py-2.5 text-[8px] font-black uppercase tracking-widest transition-all"
                  style={{ background: isActive ? ch(0.10) : "transparent", color: isActive ? accent : "rgba(148,163,184,0.40)" }}>
                  {isActive && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* States */}
          {error && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <AlertTriangle size={28} style={{ color: "#F59E0B" }} />
              <p className="text-[10px] font-bold uppercase tracking-wide max-w-[200px] leading-relaxed" style={{ color: "#F59E0B" }}>{error}</p>
              {(androidScanLimit || !wifiEnabled) && (
                <button onClick={openSettings}
                  className="px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all"
                  style={{ background: accent, color: "#fff" }}>
                  {androidScanLimit ? "Enable Location" : "Enable WiFi"}
                </button>
              )}
            </div>
          )}
          {networks.length === 0 && !scanning && !error && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <Radio size={28} style={{ color: "rgba(148,163,184,0.30)" }} />
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(148,163,184,0.40)" }}>No signals detected</p>
              <button onClick={handleScan}
                className="px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all border"
                style={{ borderColor: ch(0.22), color: accent }}>
                Retry Scan
              </button>
            </div>
          )}
          {scanning && (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 size={28} style={{ color: accent }} className="animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>Scanning networks...</p>
            </div>
          )}

          {/* Network rows */}
          <div className="space-y-2">
            {networks
              .filter(n => filterBand === "all" || n.band === filterBand)
              .map(network => {
                const hasRogue = rogueAlertSsids.has(network.ssid);
                const sigColor = network.signalPercent > 80 ? "#10B981" : network.signalPercent > 50 ? "#F59E0B" : "#EF4444";
                return (
                  <button key={network.id} onClick={() => setSelectedNetwork(network)}
                    className="w-full p-3 rounded-xl border flex items-center justify-between gap-2 text-left transition-all active:scale-[0.99] group"
                    style={{
                      background: network.isConnected ? "rgba(16,185,129,0.06)" : hasRogue ? "rgba(239,68,68,0.05)" : "rgba(148,163,184,0.04)",
                      borderColor: network.isConnected ? "rgba(16,185,129,0.28)" : hasRogue ? "rgba(239,68,68,0.22)" : "rgba(148,163,184,0.10)",
                    }}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                           style={{ background: `${sigColor}18`, border: `1px solid ${sigColor}30` }}>
                        <Signal size={13} style={{ color: sigColor }} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[10px] uppercase truncate" style={{ color: "#E2E8F0" }}>{network.ssid}</span>
                          {hasRogue && (
                            <span className="shrink-0 px-1 py-0.5 rounded text-[6px] font-black uppercase tracking-wide"
                                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.22)", color: "#EF4444" }}>
                              ALERT
                            </span>
                          )}
                        </div>
                        <p className="text-[8px] font-bold" style={{ color: "rgba(148,163,184,0.45)" }}>
                          CH {network.channel} · {network.band} · {network.rssi} dBm
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase border"
                            style={{
                              background: network.risk === "safe" ? "rgba(16,185,129,0.10)" : network.risk === "vulnerable" ? "rgba(245,158,11,0.10)" : "rgba(239,68,68,0.10)",
                              borderColor: network.risk === "safe" ? "rgba(16,185,129,0.22)" : network.risk === "vulnerable" ? "rgba(245,158,11,0.22)" : "rgba(239,68,68,0.22)",
                              color: network.risk === "safe" ? "#10B981" : network.risk === "vulnerable" ? "#F59E0B" : "#EF4444",
                            }}>
                        {network.risk === "safe" ? "SECURE" : network.risk === "vulnerable" ? "OPEN" : "WEP"}
                      </span>
                      <ChevronRight size={13} style={{ color: "rgba(148,163,184,0.30)" }} />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Spectral Congestion bar chart */}
      <div className="rounded-2xl border overflow-hidden"
           style={{ background: CARD_BG, borderColor: ch(0.12) }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.20)})` }} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={12} style={{ color: accent }} />
            <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: `${accent}90` }}>Spectral Congestion</p>
          </div>
          <div className="flex items-end gap-1 h-12 px-1">
            {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(ch2 => {
              const count = networks.filter(n => n.channel === ch2).length;
              const height = (count / 4) * 100;
              const barColor = count > 2 ? "#EF4444" : count > 0 ? accent : "rgba(148,163,184,0.12)";
              return (
                <div key={ch2} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(10, height)}%` }}
                    className="w-full rounded-t-sm" style={{ background: barColor }} />
                  <span className="text-[6px] font-bold" style={{ color: "rgba(148,163,184,0.30)" }}>{ch2}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Network detail modal */}
      <AnimatePresence>
        {selectedNetwork && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedNetwork(null)} className="absolute inset-0 bg-black/65 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-sm rounded-[28px] overflow-hidden border shadow-2xl"
              style={{ background: "rgba(8,14,28,0.98)", borderColor: ch(0.20), backdropFilter: "blur(24px)" }}>
              <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.25)})` }} />
              <div className="p-6">
                <header className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                       style={{ background: selectedNetwork.risk === "safe" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                                border: `1px solid ${selectedNetwork.risk === "safe" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                    <WifiIcon size={18} style={{ color: selectedNetwork.risk === "safe" ? "#10B981" : "#EF4444" }} />
                  </div>
                  <button onClick={() => setSelectedNetwork(null)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                    style={{ border: "1px solid rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.60)" }}>
                    <X size={14} />
                  </button>
                </header>

                <div className="space-y-5">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-wider mb-1" style={{ color: "rgba(148,163,184,0.40)" }}>Network Identity</p>
                    <h2 className="text-xl font-black uppercase tracking-tight truncate" style={{ color: "#E2E8F0" }}>{selectedNetwork.ssid}</h2>
                    <p className="text-[9px] font-bold mt-1" style={{ color: "rgba(148,163,184,0.45)" }}>{selectedNetwork.bssid}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Risk Level", value: selectedNetwork.risk?.toUpperCase() || "UNKNOWN", color: selectedNetwork.risk === "safe" ? "#10B981" : "#EF4444" },
                      { label: "Security",   value: selectedNetwork.security.split("[")[0] },
                      { label: "Channel",    value: selectedNetwork.channel.toString() },
                      { label: "Strength",   value: `${selectedNetwork.signalPercent}% (${selectedNetwork.rssi}dBm)` },
                    ].map(d => (
                      <div key={d.label} className="p-3 rounded-xl"
                           style={{ background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.08)" }}>
                        <p className="text-[7px] font-black uppercase tracking-wider mb-1" style={{ color: "rgba(148,163,184,0.40)" }}>{d.label}</p>
                        <p className="font-black text-[10px] uppercase truncate" style={{ color: d.color || "#E2E8F0" }}>{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {rogueAlertSsids.has(selectedNetwork.ssid) && (
                    <div className="p-3.5 rounded-2xl border"
                         style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.22)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertOctagon size={12} style={{ color: "#EF4444" }} />
                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#EF4444" }}>Rogue AP Alert</p>
                      </div>
                      {rogueAlerts.filter(a => a.ssid === selectedNetwork.ssid).map((a, i) => (
                        <p key={i} className="text-[10px] font-bold leading-relaxed mt-1" style={{ color: "rgba(148,163,184,0.65)" }}>{a.description}</p>
                      ))}
                    </div>
                  )}

                  <div className="p-4 rounded-2xl"
                       style={{ background: "rgba(148,163,184,0.04)", border: "1px solid rgba(148,163,184,0.08)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={11} style={{ color: accent }} />
                      <p className="text-[7px] font-black uppercase tracking-wider" style={{ color: `${accent}90` }}>Recommendations</p>
                    </div>
                    <p className="text-[10px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.60)" }}>
                      {selectedNetwork.risk === "safe"
                        ? "This network uses modern encryption protocols. Safe for tactical data transmission."
                        : "VULNERABILITY DETECTED. Avoid transmitting sensitive packets. Enable VPN Shield before proceeding."}
                    </p>
                  </div>

                  <button
                    className="w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    style={{ background: "rgba(148,163,184,0.10)", color: "rgba(148,163,184,0.45)", border: "1px solid rgba(148,163,184,0.15)", cursor: "default" }}
                    disabled
                  >
                    {selectedNetwork.risk === "safe" ? "Network Verified Secure" : "Avoid This Network"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AP Guard Panel ────────────────────────────────────────────────────────────

function APGuardPanel({ trustedCount, lastScan, rogueCount, bssidAvailable }: {
  trustedCount: number; lastScan: Date | null; rogueCount: number; bssidAvailable: boolean;
}) {
  const isClean = rogueCount === 0;
  const statusColor = isClean ? "#10B981" : "#EF4444";
  function formatTime(d: Date | null) {
    if (!d) return "---";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return (
    <div className="rounded-2xl border overflow-hidden"
         style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
                  borderColor: isClean ? "rgba(16,185,129,0.22)" : "rgba(239,68,68,0.25)" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${statusColor}, ${statusColor}40)` }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: `${statusColor}12`, border: `1px solid ${statusColor}25` }}>
              <ShieldCheck size={16} style={{ color: statusColor }} />
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>AP Guard</p>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.45)" }}>Rogue AP detection</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
               style={{ background: `${statusColor}12`, border: `1px solid ${statusColor}25` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor }} />
            <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: statusColor }}>
              {isClean ? "CLEAN" : `${rogueCount} ALERT${rogueCount > 1 ? "S" : ""}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Trusted APs", value: trustedCount.toString() },
            { label: "Threats",     value: rogueCount.toString() },
            { label: "Last Scan",   value: formatTime(lastScan) },
          ].map(d => (
            <div key={d.label} className="p-2.5 rounded-xl text-center"
                 style={{ background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.08)" }}>
              <p className="font-black text-base leading-none" style={{ color: "#E2E8F0" }}>{d.value}</p>
              <p className="text-[7px] font-bold uppercase tracking-widest mt-1" style={{ color: "rgba(148,163,184,0.40)" }}>{d.label}</p>
            </div>
          ))}
        </div>

        {!bssidAvailable && (
          <div className="p-2.5 rounded-xl flex items-start gap-2"
               style={{ background: "rgba(252,211,77,0.06)", border: "1px solid rgba(252,211,77,0.20)" }}>
            <AlertTriangle size={11} style={{ color: "#F59E0B" }} className="shrink-0 mt-0.5" />
            <p className="text-[9px] font-bold leading-snug" style={{ color: "rgba(148,163,184,0.55)" }}>
              <span style={{ color: "#F59E0B" }} className="font-black">BSSID tracking limited — </span>
              Android requires GPS enabled to read access point MAC addresses. Enable location services for full evil twin detection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rogue AP Alert Banner ────────────────────────────────────────────────────

function RogueAlertsBanner({ alerts }: { alerts: RogueAlert[] }) {
  const [expanded, setExpanded] = useState(true);
  const highCount = alerts.filter(a => a.severity === "high").length;
  const alertTypeLabels: Record<RogueAlertType, string> = {
    EVIL_TWIN: "Evil Twin Detected", BSSID_CHANGED: "Hardware ID Changed",
    NEW_BSSID: "New Access Point",   SECURITY_DOWNGRADE: "Security Downgrade",
  };

  return (
    <div className="rounded-2xl border overflow-hidden"
         style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: "rgba(239,68,68,0.25)" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #EF4444, rgba(239,68,68,0.30))" }} />
      <div className="p-4">
        <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)" }}>
              <AlertOctagon size={14} style={{ color: "#EF4444" }} />
            </div>
            <div className="text-left">
              <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#EF4444" }}>
                Rogue AP {alerts.length > 1 ? "Threats" : "Threat"} Detected
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "rgba(148,163,184,0.45)" }}>
                {highCount} high-risk · {alerts.length - highCount} medium · tap to {expanded ? "collapse" : "expand"}
              </p>
            </div>
          </div>
          <ChevronRight size={14} style={{ color: "rgba(239,68,68,0.60)" }}
            className={cn("transition-transform", expanded && "rotate-90")} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="space-y-2 mt-4">
                {alerts.map((alert, idx) => {
                  const aColor = alert.severity === "high" ? "#EF4444" : "#F59E0B";
                  return (
                    <div key={idx} className="p-3.5 rounded-xl border"
                         style={{ background: `${aColor}08`, borderColor: `${aColor}20` }}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: aColor }}>
                          {alertTypeLabels[alert.type]}
                        </span>
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase border"
                              style={{ background: `${aColor}12`, borderColor: `${aColor}25`, color: aColor }}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="font-black text-[10px] mb-1" style={{ color: "#E2E8F0" }}>SSID: {alert.ssid}</p>
                      <p className="text-[9px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.55)" }}>{alert.description}</p>
                      {(alert.type === "BSSID_CHANGED" || alert.type === "EVIL_TWIN") && alert.previousBssid && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          <div className="p-2 rounded-lg" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}>
                            <p className="text-[7px] font-black uppercase tracking-wider mb-0.5" style={{ color: "#10B981" }}>
                              {alert.type === "EVIL_TWIN" ? "AP #1" : "Previously Known"}
                            </p>
                            <p className="text-[8px] font-bold truncate" style={{ color: "#E2E8F0" }}>
                              {alert.type === "EVIL_TWIN" ? alert.currentBssid : alert.previousBssid}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
                            <p className="text-[7px] font-black uppercase tracking-wider mb-0.5" style={{ color: "#EF4444" }}>
                              {alert.type === "EVIL_TWIN" ? "AP #2 (Suspect)" : "Current (Suspect)"}
                            </p>
                            <p className="text-[8px] font-bold truncate" style={{ color: "#E2E8F0" }}>
                              {alert.type === "EVIL_TWIN" ? alert.previousBssid : alert.currentBssid}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
                <p className="text-[9px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.55)" }}>
                  <span style={{ color: "#EF4444" }} className="font-black">Recommended action: </span>
                  Do not connect to flagged networks. Enable Privacy Shield VPN if already connected.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DataPoint({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[7px] font-black uppercase tracking-wider mb-1" style={{ color: "rgba(148,163,184,0.40)" }}>{label}</p>
      <p className="font-black text-[10px] uppercase" style={{ color }}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-3 flex flex-col gap-3"
         style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: `${color}20` }}>
      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
           style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-[8px] font-black uppercase tracking-wider mb-0.5 truncate" style={{ color: "rgba(148,163,184,0.40)" }}>{label}</p>
        <p className="text-lg font-black leading-none" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}
