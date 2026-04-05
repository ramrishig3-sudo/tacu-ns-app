import React, { useState } from "react";
import { 
  Terminal, Hash, Lock, Calculator, Zap, Copy, CheckCircle,
  Shield, Key, ShieldAlert, ShieldCheck, Activity, Globe, Loader2
} from "lucide-react";
import CryptoJS from "crypto-js";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import apiClient from "../../services/api";

export default function Toolkit() {
  const [activeTool, setActiveTool] = useState<"hash" | "password" | "subnet" | "ping">("hash");

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap gap-2 md:gap-3">
        <ToolTab id="hash" label="Hash Generator" icon={Hash} active={activeTool === "hash"} onClick={() => setActiveTool("hash")} />
        <ToolTab id="password" label="Password Checker" icon={Lock} active={activeTool === "password"} onClick={() => setActiveTool("password")} />
        <ToolTab id="subnet" label="Subnet Calculator" icon={Calculator} active={activeTool === "subnet"} onClick={() => setActiveTool("subnet")} />
        <ToolTab id="ping" label="Ping Tool" icon={Zap} active={activeTool === "ping"} onClick={() => setActiveTool("ping")} />
      </div>

      <div className="cyber-card">
        {activeTool === "hash" && <HashGenerator />}
        {activeTool === "password" && <PasswordChecker />}
        {activeTool === "subnet" && <SubnetCalculator />}
        {activeTool === "ping" && <PingTool />}
      </div>
    </div>
  );
}

function ToolTab({ id, label, icon: Icon, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl border transition-all duration-300 font-bold text-[10px] md:text-xs",
        active 
          ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20" 
          : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

// ─── Hash Generator (already real) ─────────────────────────
function HashGenerator() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const hashes = {
    MD5: CryptoJS.MD5(input).toString(),
    SHA1: CryptoJS.SHA1(input).toString(),
    SHA256: CryptoJS.SHA256(input).toString(),
    SHA512: CryptoJS.SHA512(input).toString(),
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h3 className="cyber-subtitle !text-lg md:!text-xl mb-1">Hash Generator</h3>
        <p className="cyber-text-s">Generate cryptographic hashes for any text input.</p>
      </div>
      <div className="space-y-2 md:space-y-3">
        <label className="cyber-text-xs">Input Text</label>
        <textarea 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          className="cyber-input w-full h-24 md:h-32 p-3 md:p-4 font-mono"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {Object.entries(hashes).map(([name, value]) => (
          <div key={name} className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 group relative">
            <div className="flex items-center justify-between mb-2">
              <span className="cyber-text-xs !text-blue-500">{name}</span>
              <button onClick={() => copyToClipboard(value, name)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                {copied === name ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
            <p className="text-[10px] font-mono break-all text-slate-300">{value || "Waiting for input..."}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Password Checker (already real) ───────────────────────
function PasswordChecker() {
  const [password, setPassword] = useState("");

  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 8) score += 1;
    if (pass.length > 12) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getStrength(password);
  const labels = ["Very Weak", "Weak", "Moderate", "Strong", "Very Strong", "Unbreakable"];
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500", "bg-indigo-500"];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h3 className="cyber-subtitle !text-lg md:!text-xl mb-1">Password Strength Checker</h3>
        <p className="cyber-text-s">Analyze your password security and entropy.</p>
      </div>
      <div className="space-y-4">
        <div className="relative">
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password to check..." className="cyber-input w-full pl-10 font-mono" />
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between cyber-text-xs !tracking-normal">
            <span className={cn("transition-colors", strength > 2 ? "text-emerald-500" : "text-red-500")}>{labels[strength]}</span>
            <span className="text-slate-500">{strength * 20}% Secure</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div initial={false} animate={{ width: `${(strength / 5) * 100}%` }} className={cn("h-full transition-colors", colors[strength])} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <CheckItem label="Length > 8" active={password.length > 8} />
          <CheckItem label="Uppercase" active={/[A-Z]/.test(password)} />
          <CheckItem label="Numbers" active={/[0-9]/.test(password)} />
          <CheckItem label="Symbols" active={/[^A-Za-z0-9]/.test(password)} />
        </div>
      </div>
      <div className="p-3 md:p-4 rounded-xl bg-blue-600/5 border border-blue-600/10 flex items-center gap-3 md:gap-4">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500 shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="font-bold text-[11px] md:text-sm">Security Recommendation</h4>
          <p className="cyber-text-s">{strength < 3 ? "Your password is too weak. Use a mix of uppercase, lowercase, numbers, and special characters." : "Great password! Consider using a password manager to keep it secure."}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Subnet Calculator (NOW REAL — dynamic CIDR math) ──────
function SubnetCalculator() {
  const [ip, setIp] = useState("192.168.1.1");
  const [mask, setMask] = useState("24");

  // Real CIDR calculation
  const calculateSubnet = (ipStr: string, cidr: number) => {
    const parts = ipStr.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return null;
    }
    if (cidr < 0 || cidr > 32) return null;

    const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    const maskNum = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    const networkNum = (ipNum & maskNum) >>> 0;
    const broadcastNum = (networkNum | ~maskNum) >>> 0;
    const firstHost = cidr >= 31 ? networkNum : (networkNum + 1) >>> 0;
    const lastHost = cidr >= 31 ? broadcastNum : (broadcastNum - 1) >>> 0;
    const totalHosts = cidr >= 31 ? (cidr === 32 ? 1 : 2) : Math.pow(2, 32 - cidr) - 2;

    const toIP = (num: number) =>
      `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;

    return {
      network: toIP(networkNum),
      broadcast: toIP(broadcastNum),
      firstHost: toIP(firstHost),
      lastHost: toIP(lastHost),
      totalHosts: totalHosts.toLocaleString(),
      subnetMask: toIP(maskNum),
      wildcardMask: toIP((~maskNum) >>> 0),
    };
  };

  const result = calculateSubnet(ip, parseInt(mask) || 24);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h3 className="cyber-subtitle !text-lg md:!text-xl mb-1">Subnet Calculator</h3>
        <p className="cyber-text-s">Calculate network ranges, broadcast addresses, and host counts.</p>
      </div>
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="cyber-text-xs">IP Address</label>
          <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} className="cyber-input w-full font-mono" />
        </div>
        <div className="w-full md:w-24 space-y-1.5">
          <label className="cyber-text-xs">CIDR</label>
          <input type="number" min="0" max="32" value={mask} onChange={(e) => setMask(e.target.value)} className="cyber-input w-full font-mono" />
        </div>
      </div>
      {result ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          <ResultRow label="Network Address" value={result.network} />
          <ResultRow label="Broadcast Address" value={result.broadcast} />
          <ResultRow label="First Host" value={result.firstHost} />
          <ResultRow label="Last Host" value={result.lastHost} />
          <ResultRow label="Total Hosts" value={result.totalHosts} />
          <ResultRow label="Subnet Mask" value={result.subnetMask} />
          <ResultRow label="Wildcard Mask" value={result.wildcardMask} />
          <ResultRow label="CIDR Notation" value={`/${mask}`} />
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          Invalid IP address or CIDR mask. Please enter a valid IPv4 address (e.g., 192.168.1.1) and CIDR (0-32).
        </div>
      )}
    </div>
  );
}

// ─── Ping Tool (NOW REAL — uses backend TCP ping) ──────────
function PingTool() {
  const [host, setHost] = useState("google.com");
  const [pings, setPings] = useState<{ seq: number; time: number; status: string }[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPing = async () => {
    setIsPinging(true);
    setPings([]);
    setStats(null);
    setError(null);

    try {
      const response = await apiClient.get(`/api/network/ping/${encodeURIComponent(host)}?count=4`);
      const data = response.data;
      setPings(data.results);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Ping failed");
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h3 className="cyber-subtitle !text-lg md:!text-xl mb-1">TCP Ping Tool</h3>
        <p className="cyber-text-s">Check host reachability and round-trip latency via TCP port 80.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
        <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="Enter host or IP..." className="flex-1 cyber-input font-mono" />
        <button onClick={startPing} disabled={isPinging} className="cyber-btn bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white">
          {isPinging ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          {isPinging ? "Pinging..." : "Ping"}
        </button>
      </div>

      <div className="bg-slate-900/50 rounded-xl p-3 md:p-4 border border-white/5 font-mono text-[9px] md:text-[10px] space-y-1 min-h-[120px] md:min-h-[160px]">
        <p className="text-blue-400">TCP ping {host} (port 80):</p>
        
        {error && <p className="text-red-400">Error: {error}</p>}
        
        {pings.map((p) => (
          <p key={p.seq} className={p.status === "Reply" ? "text-slate-300" : "text-red-400"}>
            {p.status === "Reply"
              ? `seq=${p.seq} ${p.status} from ${host}: time=${p.time}ms`
              : `seq=${p.seq} ${p.status}: Request timed out`}
          </p>
        ))}
        
        {isPinging && (
          <p className="text-slate-500 animate-pulse">Sending ping requests...</p>
        )}
        
        {stats && (
          <div className="pt-2 md:pt-3 border-t border-white/5 mt-2 md:mt-3">
            <p className="text-emerald-500">Ping statistics for {host}:</p>
            <p className="text-slate-400">
              Packets: Sent = {stats.sent}, Received = {stats.received}, Lost = {stats.lost} ({stats.lossPercent}% loss)
            </p>
            {stats.avgTime >= 0 && (
              <p className="text-slate-400">
                Round-trip: min = {stats.minTime}ms, avg = {stats.avgTime}ms, max = {stats.maxTime}ms
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckItem({ label, active }: any) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl border transition-all",
      active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-white/5 border-white/10 text-slate-500"
    )}>
      {active ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
      <span className="text-[10px] md:text-xs font-bold">{label}</span>
    </div>
  );
}

function ResultRow({ label, value }: any) {
  return (
    <div className="flex items-center justify-between p-2.5 md:p-3 rounded-lg md:rounded-xl bg-white/5 border border-white/10">
      <span className="cyber-text-xs !text-slate-400">{label}</span>
      <span className="font-mono font-bold text-blue-400 text-[10px] md:text-xs">{value}</span>
    </div>
  );
}
