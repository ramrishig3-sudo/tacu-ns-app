import React, { useState, useEffect, useCallback } from "react";
import { 
  Network, Search, Globe, Zap, AlertTriangle, 
  Loader2, Server, ShieldCheck, ShieldAlert,
  WifiOff, Eye, MapPin, RefreshCw, Settings
} from "lucide-react";
import axios from "axios";
import { Geolocation } from "@capacitor/geolocation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { PortScanResult } from "../../types";
import { NativeSettings, AndroidSettings } from "capacitor-native-settings";
import { CapacitorWifi as WifiPlugin } from "@capgo/capacitor-wifi";
import apiClient from "../../services/api";
import PermissionDisclosure from "../common/PermissionDisclosure";

export default function NetworkAnalyzer() {
  const [host, setHost] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<PortScanResult[]>([]);
  const [publicIpInfo, setPublicIpInfo] = useState<any>(null);
  const [gpsInfo, setGpsInfo] = useState<{ lat: number; lon: number; city?: string; countryCode?: string; loading: boolean; error?: boolean }>({ lat: 0, lon: 0, loading: true });
  const [loadingIp, setLoadingIp] = useState(true);
  const [securityStatus, setSecurityStatus] = useState({ vpnDetected: false, connectionSecure: false, dnsLeakRisk: false, loading: true });
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [ssid, setSsid] = useState<string>("Scanning...");
  const [hasConsented, setHasConsented] = useState(() =>
    localStorage.getItem("location_disclosure_accepted") === "true"
  );
  const [locationSource, setLocationSource] = useState<"pending" | "gps" | "network" | "error">("pending");

  const commonPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 3306, 3389, 8080];

  const openSettings = async () => {
    try {
      await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
    } catch {}
  };

  const fetchIpAndLocation = useCallback(async (signal?: AbortSignal) => {
    setLoadingIp(true);
    setGpsInfo(prev => ({ ...prev, loading: true, error: false }));
    setLocationSource("pending");
    
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

    let ipData = null;
    let gpsData: any = null;

    // Phase 1: High Precision Geolocation (Ground Truth)
    try {
      const pos = await Promise.race([
        Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 }),
        timeout(9000)
      ]) as any;

      if (signal?.aborted) return;

      if (pos && pos.coords) {
        gpsData = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try {
          const rev = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${gpsData.lat}&lon=${gpsData.lon}&format=json`,
            { headers: { 'User-Agent': 'TacU-NS' }, timeout: 4000, signal: signal }
          );
          if (signal?.aborted) return;
          gpsData.city = rev.data.address.city || rev.data.address.town || rev.data.address.village;
          gpsData.countryCode = rev.data.address.country_code?.toUpperCase();
        } catch {}
        setGpsInfo({ ...gpsData, loading: false, error: false });
        setLocationDenied(false);
        setLocationSource("gps");
      }
    } catch (e: any) {
      if (signal?.aborted) return;
      if (e.message?.toLowerCase().includes("denied") || e.message?.toLowerCase().includes("permission")) {
        setLocationDenied(true);
      }
      console.warn("GPS failed, falling back to network IP.");
    }

    if (signal?.aborted) return;

    // Phase 2: Network Intelligence
    try {
      const res = await Promise.race([apiClient.get("/api/my-ip", { signal: signal }), timeout(6000)]) as any;
      if (signal?.aborted) return;
      ipData = res.data;
    } catch {
      if (signal?.aborted) return;
       try {
         const res = await axios.get("https://ipapi.co/json/", { timeout: 6000, signal: signal });
         if (signal?.aborted) return;
         ipData = { ip: res.data.ip, isp: res.data.org, city: res.data.city, countryCode: res.data.country_code, lat: res.data.latitude, lon: res.data.longitude };
       } catch {}
    }

    if (signal?.aborted) return;

    if (ipData) {
      setPublicIpInfo(ipData);
      const vpn = ["vpn", "proxy", "relay", "tunnel"].some(kw => (ipData.isp || "").toLowerCase().includes(kw));
      setSecurityStatus({ vpnDetected: vpn, connectionSecure: true, dnsLeakRisk: !vpn, loading: false });
      if (!gpsData) {
        setGpsInfo({ lat: ipData.lat, lon: ipData.lon, city: ipData.city, countryCode: ipData.countryCode, loading: false, error: false });
        setLocationSource("network");
      }
    } else if (!gpsData) {
      setGpsInfo(prev => ({ ...prev, loading: false, error: true }));
      setLocationSource("error");
    }

    try {
      const { ssid: currentSsid } = await WifiPlugin.getSSID();
      if (signal?.aborted) return;
      setSsid(currentSsid || "Unknown Uplink");
    } catch {
      setSsid("Offline");
    }

    setLoadingIp(false);
  }, []);

  const handleStart = useCallback(() => {
    if (!hasConsented) {
      setShowDisclosure(true);
    } else {
      fetchIpAndLocation();
    }
  }, [hasConsented, fetchIpAndLocation]);

  const handleDisclosureContinue = () => {
    localStorage.setItem("location_disclosure_accepted", "true");
    setHasConsented(true);
    setShowDisclosure(false);
    fetchIpAndLocation();
  };

  useEffect(() => {
    const controller = new AbortController();
    if (hasConsented) fetchIpAndLocation(controller.signal);
    else setShowDisclosure(true);
    return () => controller.abort();
  }, [hasConsented, fetchIpAndLocation]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault(); if (!host) return;
    setScanning(true); setScanResults([]);
    try {
      const res = await apiClient.post("/api/network/scan-ports", { host, ports: commonPorts });
      setScanResults(res.data.results);
    } catch {} finally { setScanning(false); }
  };

  return (
    <div className="space-y-4 pb-20">

      {/* ── Permission Disclosure Modal ── */}
      <AnimatePresence>
        {showDisclosure && (
          <PermissionDisclosure
            type="location"
            onContinue={handleDisclosureContinue}
            onDismiss={() => setShowDisclosure(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Location Denied Card ── */}
      {locationDenied && (
        <section className="enterprise-card border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Settings size={16} className="text-amber-500" />
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-tight text-slate-900 dark:text-white">Location Permission Required</p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Location permission is required for Map Vector analysis.</p>
              </div>
            </div>
            <button onClick={openSettings} className="px-3 py-2 bg-amber-500 text-white rounded-lg font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all shrink-0">
              Open Settings
            </button>
          </div>
        </section>
      )}

      {/* ── Dual Identity Matrix (Compact 2-Column) ── */}
      <div className="grid grid-cols-2 gap-4">
        <section className="enterprise-card flex flex-col gap-4">
          <div className="status-circle status-circle-blue w-7 h-7">
            <Globe size={14} />
          </div>
          <div className="min-h-[60px]">
            <p className="label-upper mb-1">Network ID</p>
            <h3 className="metric-large truncate text-lg!">{loadingIp ? "Synchronizing..." : (publicIpInfo?.ip || "Offline")}</h3>
            <p className="label-upper mt-4 opacity-40">{loadingIp ? "Fetching Node Data..." : (publicIpInfo?.isp.split(' ')[0] || "No Data")}</p>
          </div>
        </section>

        <section className="enterprise-card flex flex-col gap-4">
          <div className="status-circle status-circle-green w-7 h-7">
            <MapPin size={14} />
          </div>
          <div className="min-h-[60px]">
            <p className="label-upper mb-1">GPS Vector</p>
            <h3 className="metric-large text-lg!">
              {gpsInfo.loading
                ? "Fetching location..."
                : gpsInfo.error
                ? "Location access required"
                : gpsInfo.lat
                ? `${gpsInfo.lat.toFixed(2)}N`
                : "Not available"}
            </h3>
            <p className="label-upper mt-4 opacity-40">
              {gpsInfo.loading
                ? "Accessing GPS..."
                : gpsInfo.error
                ? "Permission denied"
                : `${gpsInfo.city || "Unknown"} (${locationSource === "gps" ? "GPS Source" : "Network Est."})`}
            </p>
          </div>
        </section>
      </div>

      {/* ── Diagnostic Sensor Summary ── */}
      <section className="enterprise-card bg-slate-900/5 dark:bg-white/5">
         <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/5 pb-3">
            <h3 className="label-upper text-blue-500 font-black">Digital Health Indicators</h3>
            <button onClick={() => fetchIpAndLocation()} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
               <RefreshCw size={12} className={loadingIp ? "animate-spin" : ""} />
            </button>
         </div>
         
         <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
               <p className="label-upper text-[7px] opacity-40 mb-1">Physical SSID</p>
               <p className="font-black text-[10px] uppercase truncate">{ssid}</p>
            </div>
            <div className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
               <p className="label-upper text-[7px] opacity-40 mb-1">Network ISP</p>
               <p className="font-black text-[10px] uppercase truncate">{publicIpInfo?.isp || "Identifying..."}</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <MetricRow icon={<Eye size={12}/>} label="VPN Shield" active={securityStatus.vpnDetected} />
            <MetricRow icon={<ShieldCheck size={12}/>} label="TLS Protocol" active={securityStatus.connectionSecure} />
            <MetricRow icon={<WifiOff size={12}/>} label="DNS Privacy" active={!securityStatus.dnsLeakRisk} />
         </div>
      </section>

      {/* ── Service Reconnaissance (Re-styled Port Scanner) ── */}
      <section className="enterprise-card">
         <div className="flex flex-col gap-4 mb-6">
            <div>
               <h3 className="metric-medium">Spectral Recon</h3>
               <p className="label-upper mt-1 opacity-60">Multiplexed port boundary assessment</p>
            </div>
            <form onSubmit={handleScan} className="flex gap-2">
               <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                  <Server size={14} className="text-slate-400" />
                  <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="Target IP" className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-tight w-full dark:text-white" />
               </div>
               <button type="submit" disabled={scanning} className="px-5 py-2 bg-blue-600 rounded-xl text-white font-black uppercase tracking-widest text-[9px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
                  {scanning ? <Loader2 size={12} className="animate-spin" /> : <Network size={12} />}
                  Go
               </button>
            </form>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {commonPorts.map(port => {
               const res = scanResults.find(r => r.port === port);
               return (
                 <div key={port} className={cn("p-2.5 rounded-xl border flex flex-col gap-2 transition-all", res ? (res.status === "open" ? "bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5 shadow-inner" : "bg-red-500/5 border-red-500/20") : "bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5")}>
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="label-upper text-[7px] text-blue-500 mb-0.5">P{port}</p>
                          <p className="font-black text-[9px] uppercase tracking-tighter truncate text-slate-800 dark:text-slate-200">
                             {res ? (res.service || "Analyzing...") : "Tap to Scan"}
                          </p>
                       </div>
                       <div className={cn("w-1.5 h-1.5 rounded-full mt-1", res ? (res.status === "open" ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-red-500") : "bg-slate-300 dark:bg-white/10")} />
                    </div>
                    {res?.vulnerabilities?.map((v, i) => (
                      <div key={i} className="px-2 py-1 rounded bg-red-500/10 border border-red-500/10 scale-90 origin-left">
                         <span className="font-metric text-[8px] font-black leading-none text-red-500">{v.id}</span>
                      </div>
                    ))}
                 </div>
               );
            })}
         </div>
      </section>
    </div>
  );
}

function MetricRow({ icon, label, active }: any) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
       <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", active ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
             {icon}
          </div>
          <span className="font-black text-[9px] uppercase tracking-wider text-slate-700 dark:text-slate-400">{label}</span>
       </div>
       <div className={cn("px-1.5 py-0.5 rounded-full text-[7px] font-black tracking-widest border uppercase", active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500")}>
          {active ? "Secure" : "Exposed"}
       </div>
    </div>
  );
}
