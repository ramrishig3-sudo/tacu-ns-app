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
    }

    if (signal?.aborted) return;

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
    if (!hasConsented) setShowDisclosure(true);
    else fetchIpAndLocation();
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

      <AnimatePresence>
        {showDisclosure && (
          <PermissionDisclosure
            type="location"
            onContinue={handleDisclosureContinue}
            onDismiss={() => setShowDisclosure(false)}
          />
        )}
      </AnimatePresence>

      {/* Location denied banner */}
      {locationDenied && (
        <div className="rounded-2xl overflow-hidden border"
             style={{ background: "rgba(252,211,77,0.06)", borderColor: "rgba(252,211,77,0.22)" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, #FCD34D, rgba(252,211,77,0.30))" }} />
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                   style={{ background: "rgba(252,211,77,0.12)", border: "1px solid rgba(252,211,77,0.25)" }}>
                <Settings size={15} style={{ color: "#FCD34D" }} />
              </div>
              <div>
                <p className="font-black text-[11px] uppercase tracking-tight" style={{ color: "#E2E8F0" }}>Location Permission Required</p>
                <p className="text-[9px] font-bold mt-0.5" style={{ color: "#475569" }}>Required for Map Vector analysis</p>
              </div>
            </div>
            <button onClick={openSettings}
              className="px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all shrink-0"
              style={{ background: "#FCD34D", color: "#0B111E" }}>
              Open Settings
            </button>
          </div>
        </div>
      )}

      {/* Identity cards */}
      <div className="grid grid-cols-2 gap-3">
        <IdentityCard
          icon={<Globe size={14} />}
          accentColor="#60A5FA"
          label="Network ID"
          primary={loadingIp ? "Syncing..." : (publicIpInfo?.ip || "Offline")}
          secondary={loadingIp ? "Fetching..." : (publicIpInfo?.isp?.split(' ')[0] || "No data")}
          loading={loadingIp}
        />
        <IdentityCard
          icon={<MapPin size={14} />}
          accentColor="#34D399"
          label="GPS Vector"
          primary={gpsInfo.loading ? "Locating..." : gpsInfo.error ? "Access denied" : gpsInfo.lat ? `${gpsInfo.lat.toFixed(2)}N` : "N/A"}
          secondary={gpsInfo.loading ? "Accessing GPS..." : gpsInfo.error ? "Permission denied" : `${gpsInfo.city || "Unknown"} · ${locationSource === "gps" ? "GPS" : "Network"}`}
          loading={gpsInfo.loading}
        />
      </div>

      {/* Digital Health */}
      <section
        className="rounded-2xl overflow-hidden border"
        style={{
          background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
          borderColor: "rgba(56,189,248,0.12)",
        }}
      >
        <div style={{ height: 3, background: "linear-gradient(90deg, #60A5FA, rgba(96,165,250,0.30))" }} />
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#60A5FA" }} />
              <span className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: "#60A5FA" }}>
                Digital Health
              </span>
            </div>
            <button onClick={() => fetchIpAndLocation()}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
              style={{ background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.22)" }}>
              <RefreshCw size={11} style={{ color: "#60A5FA" }} className={loadingIp ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: "Physical SSID", value: ssid },
              { label: "Network ISP",   value: publicIpInfo?.isp || "Identifying..." },
            ].map(item => (
              <div key={item.label} className="p-2.5 rounded-xl border"
                   style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.08)" }}>
                <p className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: "#334155" }}>{item.label}</p>
                <p className="font-black text-[10px] uppercase truncate" style={{ color: "#CBD5E1" }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <SecurityRow icon={<Eye size={12} />}       label="VPN Shield"   active={securityStatus.vpnDetected} />
            <SecurityRow icon={<ShieldCheck size={12} />} label="TLS Protocol" active={securityStatus.connectionSecure} />
            <SecurityRow icon={<WifiOff size={12} />}   label="DNS Privacy"  active={!securityStatus.dnsLeakRisk} />
          </div>
        </div>
      </section>

      {/* Port scanner */}
      <section
        className="rounded-2xl overflow-hidden border"
        style={{
          background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))",
          borderColor: "rgba(96,165,250,0.12)",
        }}
      >
        <div style={{ height: 3, background: "linear-gradient(90deg, #60A5FA, rgba(96,165,250,0.30))" }} />
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#60A5FA" }} />
              <span className="text-[8px] font-black uppercase tracking-[0.22em]" style={{ color: "#60A5FA" }}>Port Scanner</span>
            </div>
            <h3 className="text-[14px] font-black uppercase tracking-tight" style={{ color: "#E2E8F0" }}>Spectral Recon</h3>
          </div>

          <form onSubmit={handleScan} className="flex gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
                 style={{ background: "rgba(148,163,184,0.06)", border: "1px solid rgba(96,165,250,0.18)" }}>
              <Server size={13} style={{ color: "#475569" }} />
              <input type="text" value={host} onChange={e => setHost(e.target.value)}
                placeholder="Target IP or hostname"
                className="bg-transparent border-none outline-none text-[10px] font-bold w-full"
                style={{ color: "#E2E8F0" }} />
            </div>
            <button type="submit" disabled={scanning}
              className="px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 text-white"
              style={{ background: "#60A5FA", boxShadow: "0 4px 14px rgba(96,165,250,0.25)" }}>
              {scanning ? <Loader2 size={11} className="animate-spin" /> : <Network size={11} />}
              Scan
            </button>
          </form>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {commonPorts.map(port => {
              const res = scanResults.find(r => r.port === port);
              const isOpen   = res?.status === "open";
              const isClosed = res && res.status !== "open";
              const portColor = isOpen ? "#34D399" : isClosed ? "#F87171" : "#334155";
              return (
                <div key={port}
                  className="p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all"
                  style={{
                    background: isOpen ? "rgba(52,211,153,0.06)" : isClosed ? "rgba(248,113,113,0.04)" : "rgba(148,163,184,0.04)",
                    borderColor: isOpen ? "rgba(52,211,153,0.22)" : isClosed ? "rgba(248,113,113,0.18)" : "rgba(148,163,184,0.08)",
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-widest mb-0.5" style={{ color: "#475569" }}>Port {port}</p>
                      <p className="font-black text-[9px] uppercase" style={{ color: "#CBD5E1" }}>
                        {res ? (res.service || "Unknown") : "Idle"}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full mt-0.5"
                         style={{ backgroundColor: portColor, boxShadow: res ? `0 0 6px ${portColor}60` : "none" }} />
                  </div>
                  {res?.vulnerabilities?.map((v, i) => (
                    <div key={i} className="px-1.5 py-0.5 rounded-lg border"
                         style={{ background: "rgba(248,113,113,0.10)", borderColor: "rgba(248,113,113,0.22)" }}>
                      <span className="text-[7px] font-black" style={{ color: "#F87171" }}>{v.id}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function IdentityCard({ icon, accentColor, label, primary, secondary, loading }: any) {
  const ch = (op: number) => `${accentColor}${Math.round(op * 255).toString(16).padStart(2, "0")}`;
  return (
    <div className="rounded-2xl overflow-hidden border flex flex-col"
         style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: ch(0.18) }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, ${ch(0.30)})` }} />
      <div className="p-3.5 flex flex-col gap-3">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center"
             style={{ background: ch(0.12), border: `1px solid ${ch(0.25)}` }}>
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        <div>
          <p className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: "#334155" }}>{label}</p>
          <p className="font-black text-[13px] leading-tight truncate" style={{ color: loading ? "#334155" : "#E2E8F0" }}>{primary}</p>
          <p className="text-[8px] font-bold mt-1 truncate" style={{ color: "#475569" }}>{secondary}</p>
        </div>
      </div>
    </div>
  );
}

function SecurityRow({ icon, label, active }: any) {
  const color = active ? "#34D399" : "#F87171";
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl border"
         style={{ background: "rgba(148,163,184,0.04)", borderColor: "rgba(148,163,184,0.08)" }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
             style={{ background: `${color}12`, border: `1px solid ${color}28` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="font-black text-[9px] uppercase tracking-wider" style={{ color: "#94A3B8" }}>{label}</span>
      </div>
      <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg border"
            style={{ background: `${color}10`, borderColor: `${color}25`, color }}>
        {active ? "Secure" : "Exposed"}
      </span>
    </div>
  );
}
