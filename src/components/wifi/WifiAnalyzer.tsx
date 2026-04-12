import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Wifi as WifiIcon,
  ShieldCheck,
  ShieldAlert,
  Signal,
  RefreshCw,
  Loader2,
  AlertTriangle,
  BarChart3,
  Zap,
  Radio,
  Search,
  X,
  Info,
  ChevronRight,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { Capacitor } from "@capacitor/core";
import { CapacitorWifi as WifiPlugin } from "@capgo/capacitor-wifi";
import { Geolocation } from "@capacitor/geolocation";
import { NativeSettings, AndroidSettings } from "capacitor-native-settings";
import PermissionDisclosure from "../common/PermissionDisclosure";

// ─── Types ───
interface WifiNetwork {
  id: string;
  ssid: string;
  bssid: string;
  signalPercent: number;
  frequency: number;
  channel: number;
  security: string;
  band: "2.4 GHz" | "5 GHz";
  isConnected: boolean;
  vendor: string;
  rssi: number;
  risk?: "safe" | "vulnerable" | "critical";
}

interface SecurityIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation: string;
}


export default function WifiAnalyzer() {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [filterBand, setFilterBand] = useState<"all" | "2.4 GHz" | "5 GHz">("all");
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const isMounted = useRef(true);
  const [hasConsented, setHasConsented] = useState(() =>
    localStorage.getItem("wifi_disclosure_accepted") === "true"
  );
  
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [locationServicesOn, setLocationServicesOn] = useState(true);
  const [androidScanLimit, setAndroidScanLimit] = useState(false);

  // Open Android app settings so user can grant permission manually
  const openSettings = async () => {
    try {
      await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
    } catch {
      // Fallback: show instructions if native API unavailable
      setError("Please open Android Settings → Apps → TacU-NS → Permissions and enable Location.");
    }
  };

  const doScan = useCallback(async (signal?: AbortSignal) => {
    if (Capacitor.getPlatform() === "web") {
      setError("WiFi scanning requires a physical Android device. Not supported in browser.");
      return;
    }
    setScanning(true);
    setError(null);
    setPermissionDenied(false);
    setAndroidScanLimit(false);

    try {
      // Step 1: Check WiFi Enabled
      const { enabled } = await WifiPlugin.isEnabled();
      if (signal?.aborted) return;
      setWifiEnabled(enabled);
      if (!enabled) {
        setError("WiFi is currently disabled. Please enable it to scan.");
        setScanning(false);
        return;
      }

      // Step 2: Check Location Permissions
      const perms = await Geolocation.checkPermissions();
      if (signal?.aborted) return;
      if (perms.location !== "granted") {
        setPermissionDenied(true);
        setScanning(false);
        return;
      }

      // Step 3: Get Connected SSID
      let currentSsid: string | null = null;
      try {
        const ssidRes = await WifiPlugin.getSsid();
        currentSsid = ssidRes.ssid || null;
      } catch (e) {
        console.warn("Could not fetch current SSID");
      }

      // Step 4: Perform Scan
      const result = await WifiPlugin.getAvailableNetworks();
      if (signal?.aborted) return;
      
      if (result && result.networks) {
        if (result.networks.length === 0) {
          // Check if Location Services are actually ON (not just permission)
          setAndroidScanLimit(true);
          setError("Location services are required to scan nearby WiFi networks.");
        }
        
        setNetworks(result.networks.map((n: any) => {
          const rssi = n.rssi || -99;
          const signalPercent = Math.max(0, Math.min(100, Math.floor(((rssi + 90) / 60) * 100)));
          
          return {
            id: n.bssid || n.ssid,
            ssid: n.ssid || "(HIDDEN)",
            bssid: n.bssid || "00:00:00:00:00:00",
            signalPercent,
            rssi,
            frequency: n.frequency || 2400,
            channel: Math.floor(((n.frequency || 2412) - 2407) / 5) || 1,
            security: n.securityTypes?.join("/") || "SECURE",
            band: (n.frequency || 2412) > 4000 ? "5 GHz" : "2.4 GHz",
            isConnected: currentSsid !== null && n.ssid === currentSsid,
            vendor: "Verified Node",
            risk: (n.securityTypes || []).includes(0) ? "vulnerable" : "safe"
          };
        }));
      }
    } catch (e: any) {
      if (signal?.aborted) return;
      if (e.message?.toLowerCase().includes("permission")) {
        setPermissionDenied(true);
      } else {
        setError("Unable to scan WiFi networks. Please check permissions and GPS.");
      }
    } finally {
      if (isMounted.current && !signal?.aborted) setScanning(false);
    }
  }, []);

  const handleScan = useCallback(async () => {
    if (!hasConsented) {
      setShowDisclosure(true);
    } else {
      doScan();
    }
  }, [hasConsented, doScan]);

  const handleDisclosureContinue = () => {
    localStorage.setItem("wifi_disclosure_accepted", "true");
    setHasConsented(true);
    setShowDisclosure(false);
    doScan();
  };

  useEffect(() => {
    const controller = new AbortController();
    if (hasConsented) {
      doScan(controller.signal);
    }
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

  return (
    <div className="space-y-6 pb-20">

      {/* ── Permission Disclosure Modal ── */}
      <AnimatePresence>
        {showDisclosure && (
          <PermissionDisclosure
            type="wifi"
            onContinue={handleDisclosureContinue}
            onDismiss={() => setShowDisclosure(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Permission Denied Card ── */}
      {permissionDenied && (
        <section className="enterprise-card border-amber-500/20 bg-amber-500/5">
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Settings size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Permission Required</h3>
               <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Location permission is required to scan WiFi networks.
              </p>
            </div>
            <button
              onClick={openSettings}
              className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              Open Settings
            </button>
          </div>
        </section>
      )}

      {/* ── Active Uplink Telemetry (High Density) ── */}
      {connectedNetwork && (
        <section className="enterprise-card flex flex-col items-center py-6 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500" />
          <div className="status-circle status-circle-green mb-4 shadow-lg shadow-emerald-500/10 w-8 h-8">
            <WifiIcon size={16} />
          </div>
          
          <div className="text-center mb-6 px-1">
            <p className="label-upper mb-1 opacity-60">Connected SSID</p>
            <h2 className="metric-medium text-lg uppercase tracking-tight truncate max-w-[200px]">{connectedNetwork.ssid}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[7px] font-black uppercase">Active</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[7px] font-black uppercase text-[var(--text-secondary)] font-metric">{connectedNetwork.bssid}</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-4 gap-1 pt-4 border-t border-slate-200 dark:border-white/5">
             <DataPoint label="SEC" value={connectedNetwork.security.split('[')[0]} status="green" />
             <DataPoint label="SIG" value={`${connectedNetwork.signalPercent}%`} status="green" />
             <DataPoint label="BAND" value={connectedNetwork.band.split(' ')[0]} status="blue" />
             <DataPoint label="CH" value={connectedNetwork.channel} status="amber" />
          </div>
        </section>
      )}

      {/* ── Quick Diagnostic Grid (2-Column Mobile) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <MetricCard label="Total SSIDs" value={networks.length} icon={<Search size={16} />} status="blue" />
         <MetricCard label="Secure Cores" value={networks.filter(n => n.risk === "safe").length} icon={<ShieldCheck size={16} />} status="green" />
         <MetricCard label="Vulnerable" value={networks.filter(n => n.risk === "vulnerable" || n.risk === "critical").length} icon={<ShieldAlert size={16} />} status="red" />
         <MetricCard label="5GHz Nodes" value={networks.filter(n => n.band === "5 GHz").length} icon={<Zap size={16} />} status="amber" />
      </div>

      {/* ── Critical Alerts (High Density) ── */}
      {issues.length > 0 && (
        <section className="enterprise-card border-red-500/15 bg-red-500/5">
           <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="text-red-500 shadow-sm" size={12} />
              <h3 className="label-upper text-red-500">Exceptions</h3>
           </div>
           <div className="space-y-1.5">
              {issues.map(issue => (
                <div key={issue.id} className="p-2.5 rounded-xl bg-white dark:bg-[#0B0F1A] border border-red-500/10 flex items-center justify-between gap-3">
                   <div className="flex items-center gap-2 overflow-hidden">
                      <AlertTriangle className="text-red-500 shrink-0" size={12} />
                      <div className="truncate">
                         <h4 className="font-black text-[9px] text-slate-900 dark:text-white uppercase truncate tracking-tight">{issue.title}</h4>
                      </div>
                   </div>
                   <div className="px-2 py-0.5 rounded bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[7px] font-black uppercase text-emerald-600 shrink-0">
                      FIX RECOMMENDED
                   </div>
                </div>
              ))}
           </div>
        </section>
      )}

      {/* ── Surrounding Matrix ── */}
      <section className="enterprise-card">
         <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <h3 className="metric-medium text-lg">Spectral Matrix</h3>
               </div>
               <button onClick={handleScan} disabled={scanning} className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-blue-500 active:scale-90 transition-all">
                  <RefreshCw size={16} className={scanning ? "animate-spin" : ""} />
               </button>
            </div>
            <div className="flex p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-x-auto no-scrollbar">
               {["all", "2.4 GHz", "5 GHz"].map(b => (
                 <button key={b} onClick={() => setFilterBand(b as any)} className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all", filterBand === b ? "bg-blue-600 text-white shadow-sm" : "text-[var(--text-secondary)]")}>{b}</button>
               ))}
            </div>
         </div>

         <div className="space-y-2">
             {error && (
              <div className="py-10 text-center space-y-3">
                <AlertTriangle size={32} className="mx-auto text-amber-500" />
                <p className="label-upper text-amber-500 max-w-[200px] mx-auto leading-relaxed">{error}</p>
                {androidScanLimit && (
                  <div className="flex flex-col items-center gap-4 mt-4">
                     <p className="text-[10px] font-bold text-slate-500 max-w-[220px]">Location permission is required to scan WiFi networks.</p>
                     <button onClick={openSettings} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Enable Location</button>
                  </div>
                )}
                {!wifiEnabled && (
                  <button onClick={openSettings} className="px-5 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Enable WiFi</button>
                )}
              </div>
            )}
            {networks.length === 0 && !scanning && !error && (
              <div className="py-10 text-center space-y-3">
                <Radio size={32} className="mx-auto text-slate-300 dark:text-white/10" />
                <p className="label-upper opacity-40">No signals detected. Tap scan to refresh.</p>
                <button onClick={handleScan} className="px-5 py-2 border border-slate-200 dark:border-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Retry Scan</button>
              </div>
            )}
            {scanning && (
               <div className="py-10 text-center space-y-3">
                 <Loader2 size={32} className="mx-auto text-blue-500 animate-spin" />
                 <p className="label-upper text-blue-500">Scanning networks...</p>
               </div>
            )}
            {networks.filter(n => filterBand === "all" || n.band === filterBand).map(network => (
              <button 
                key={network.id} 
                onClick={() => setSelectedNetwork(network)}
                className={cn("w-full p-3 rounded-xl border transition-all flex items-center justify-between group text-left", network.isConnected ? "bg-emerald-500/5 border-emerald-500/30" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-blue-500/30")}
              >
                 <div className="flex items-center gap-3 overflow-hidden">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", network.signalPercent > 80 ? "status-circle-green" : network.signalPercent > 50 ? "status-circle-amber" : "status-circle-red")}>
                       <Signal size={14} />
                    </div>
                    <div className="truncate">
                       <h4 className="font-black text-[10px] text-slate-900 dark:text-white uppercase truncate">{network.ssid}</h4>
                       <p className="label-upper text-[8px] opacity-60">CH {network.channel} • {network.band} • {network.rssi} dBm</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 shrink-0">
                    <div className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase border", 
                       network.risk === "safe" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : 
                       network.risk === "vulnerable" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                       {network.risk === "safe" ? "SECURE" : network.risk === "vulnerable" ? "OPEN" : "WEP/LEGACY"}
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-all translate-x-1 group-hover:translate-x-0" />
                 </div>
              </button>
            ))}
         </div>
      </section>

      {/* ── Channel Spectrum (Shrunken) ── */}
      <section className="enterprise-card py-4 overflow-hidden">
         <h3 className="label-upper text-blue-500 mb-4 flex items-center gap-2">
            <BarChart3 size={12} />
            Spectral Congestion
         </h3>
         <div className="flex items-end gap-1 h-12 px-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(ch => {
               const count = networks.filter(n => n.channel === ch).length;
               const height = (count / 4) * 100;
               return (
                 <div key={ch} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(10, height)}%` }} className={cn("w-full rounded-t-[1px]", count > 2 ? "bg-red-500" : count > 0 ? "bg-blue-600" : "bg-slate-200 dark:bg-white/5")} />
                    <span className="text-[6px] font-bold opacity-30">{ch}</span>
                 </div>
               );
            })}
         </div>
      </section>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedNetwork && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedNetwork(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 100 }} 
              className="relative w-full max-w-sm bg-white dark:bg-[#111827] rounded-[32px] overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl"
            >
              <div className="p-6">
                <header className="flex items-center justify-between mb-8">
                  <div className={cn("status-circle w-10 h-10", selectedNetwork.risk === "safe" ? "status-circle-green" : "status-circle-red")}>
                    <WifiIcon size={20} />
                  </div>
                  <button onClick={() => setSelectedNetwork(null)} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-red-500 transition-all">
                    <X size={16} />
                  </button>
                </header>

                <div className="space-y-6">
                  <div>
                    <p className="label-upper opacity-40 mb-1">Network Identity</p>
                    <h2 className="text-xl font-black uppercase tracking-tight truncate">{selectedNetwork.ssid}</h2>
                    <p className="font-metric text-[9px] text-slate-500 mt-1">{selectedNetwork.bssid}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <DetailBox label="Risk Level" value={selectedNetwork.risk?.toUpperCase() || "UNKNOWN"} color={selectedNetwork.risk === "safe" ? "text-emerald-500" : "text-red-500"} />
                    <DetailBox label="Security" value={selectedNetwork.security.split('[')[0]} />
                    <DetailBox label="Channel" value={selectedNetwork.channel.toString()} />
                    <DetailBox label="Strength" value={`${selectedNetwork.signalPercent}% (${selectedNetwork.rssi} dBm)`} />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    <h3 className="label-upper text-blue-500 mb-2 flex items-center gap-2">
                       <Info size={12} />
                       Recommendations
                    </h3>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                      {selectedNetwork.risk === "safe" 
                        ? "This network uses modern encryption protocols. Safe for tactical data transmission." 
                        : "VULNERABILITY DETECTED. Avoid transmitting sensitive packets. Enable VPN Shield before proceeding."}
                    </p>
                  </div>

                  <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                    Connect to Node
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

function DataPoint({ label, value, status }: any) {
  const statusColors: any = {
    green: "text-emerald-500",
    blue: "text-blue-500",
    amber: "text-amber-500"
  };
  return (
    <div className="text-center">
       <p className="label-upper mb-1 opacity-60 text-[8px]">{label}</p>
       <p className={cn("font-black text-[10px] uppercase tracking-tight", statusColors[status])}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value, icon, status }: any) {
  const statusMap: any = {
    green: "status-circle-green",
    red: "status-circle-red",
    blue: "status-circle-blue",
    amber: "status-circle-amber"
  };
  return (
    <div className="enterprise-card p-3 flex flex-col gap-3 shadow-sm min-h-[80px]">
       <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", statusMap[status])}>
          {React.cloneElement(icon, { size: 12 })}
       </div>
       <div>
          <p className="label-upper mb-0.5 truncate opacity-60 text-[8px]">{label}</p>
          <p className="metric-medium text-lg leading-none">{value}</p>
       </div>
    </div>
  );
}

function DetailBox({ label, value, color }: any) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
      <p className="label-upper text-[7px] opacity-40 mb-1">{label}</p>
      <p className={cn("font-black text-[10px] uppercase truncate", color ? color : "text-slate-900 dark:text-white")}>{value}</p>
    </div>
  );
}
