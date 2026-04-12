import React, { useState } from "react";
import { 
  Hash, Lock, Calculator, Zap, Copy, CheckCircle,
  ShieldCheck, ShieldAlert, RefreshCw, Terminal, ArrowRight, X, Globe, Activity, AlertTriangle
} from "lucide-react";
import CryptoJS from "crypto-js";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import apiClient from "../../services/api";

type ToolType = "hash" | "password" | "subnet" | "ping";

export default function Toolkit() {
  const [activeTool, setActiveTool] = useState<ToolType>("hash");

  return (
    <div className="space-y-4 pb-20">
      
      {/* ── Tool Selection Matrix (Compact) ── */}
      <div className="flex justify-center">
        <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-x-auto no-scrollbar max-w-full">
          <ToolButton active={activeTool === "hash"} onClick={() => setActiveTool("hash")} icon={<Hash size={12} />} label="Hashes" />
          <ToolButton active={activeTool === "password"} onClick={() => setActiveTool("password")} icon={<Lock size={12} />} label="Entropy" />
          <ToolButton active={activeTool === "subnet"} onClick={() => setActiveTool("subnet")} icon={<Calculator size={12} />} label="Subnets" />
          <ToolButton active={activeTool === "ping"} onClick={() => setActiveTool("ping")} icon={<Zap size={12} />} label="Ping" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTool}
           initial={{ opacity: 0, scale: 0.99 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.99 }}
           className="enterprise-card min-h-[400px] flex flex-col p-3 md:p-4"
        >
          {activeTool === "hash" && <HashGenerator />}
          {activeTool === "password" && <PasswordChecker />}
          {activeTool === "subnet" && <SubnetCalculator />}
          {activeTool === "ping" && <PingTool />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "relative py-1.5 px-3 flex items-center justify-center gap-1.5 rounded-lg text-[7px] font-black uppercase tracking-wider transition-all min-w-[70px]", 
        active ? "text-white bg-blue-600 shadow-sm active:scale-95" : "text-[var(--text-secondary)] hover:text-slate-900"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HashGenerator() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const hashes = {
    MD5: input ? CryptoJS.MD5(input).toString() : "",
    SHA1: input ? CryptoJS.SHA1(input).toString() : "",
    SHA256: input ? CryptoJS.SHA256(input).toString() : "",
  };

  const copy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col items-center text-center">
         <div className="status-circle status-circle-blue w-6 h-6 mb-2">
            <Hash size={12} />
         </div>
         <h2 className="label-upper text-[10px] text-blue-500 font-black">Hash Factory</h2>
      </header>

      <div className="w-full space-y-1.5">
        <label className="label-upper text-[7px] text-blue-500 ml-1">Input Payload</label>
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
           <textarea 
             value={input} 
             onChange={(e) => setInput(e.target.value)} 
             placeholder="Payload..." 
             className="w-full h-16 p-3 bg-transparent border-none outline-none font-mono text-[10px] text-slate-900 dark:text-white resize-none"
           />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {Object.entries(hashes).map(([name, value]) => (
          <div key={name} className="p-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3 group">
            <div className="overflow-hidden">
              <span className="label-upper text-[6px] text-blue-500 block mb-0.5">{name}</span>
              <p className="font-mono text-[9px] truncate text-slate-800 dark:text-slate-300">
                {value || "Waiting..."}
              </p>
            </div>
            <button onClick={() => copy(value, name)} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-md transition-all shrink-0">
               {copied === name ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} className="text-[var(--text-secondary)]" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PasswordChecker() {
  const [password, setPassword] = useState("");
  const getStrength = (p: string) => {
    let s = 0; if (p.length > 8) s++; if (p.length > 12) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return Math.min(s, 5);
  };
  const s = getStrength(password);
  const info = [
    { label: "Vulnerable", color: "bg-red-500" }, { label: "High Risk", color: "bg-orange-500" }, 
    { label: "Med Risk", color: "bg-yellow-500" }, { label: "Good", color: "bg-blue-500" }, 
    { label: "Strong", color: "bg-emerald-500" }, { label: "Fortified", color: "bg-indigo-500" }
  ];

  return (
    <div className="space-y-4">
      <header className="flex flex-col items-center text-center">
         <div className="status-circle status-circle-amber w-6 h-6 mb-2">
            <Lock size={12} />
         </div>
         <h2 className="label-upper text-[10px] text-amber-500 font-black">Entropy Analysis</h2>
      </header>

      <div className="max-w-xl mx-auto w-full space-y-4">
        <input 
          type="text" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Pattern..." 
          className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-sm text-center text-slate-900 dark:text-white tracking-widest shadow-sm"
        />

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-center">
           <div className="flex justify-between items-end mb-1.5 px-1">
              <span className="label-upper text-[7px] text-blue-500">Security Index</span>
              <span className="font-metric font-black text-[9px]">{s * 20}%</span>
           </div>
           <div className="h-1 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
              <motion.div initial={{ width: 0 }} animate={{ width: `${(s / 5) * 100}%` }} className={cn("h-full transition-all duration-700", info[s].color)} />
           </div>
           <div className="flex items-center justify-center gap-2">
              <div className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0", s > 3 ? "status-circle-green" : "status-circle-red")}>
                 {s > 3 ? <ShieldCheck size={10} /> : <AlertTriangle size={10} />}
              </div>
              <p className="font-black text-[9px] uppercase tracking-tighter text-slate-900 dark:text-white">{info[s].label}</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function SubnetCalculator() {
  const [ip, setIp] = useState("192.168.1.1");
  const [mask, setMask] = useState("24");
  const toIP = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  const getSubnet = (iS: string, c: number) => {
    const p = iS.split(".").map(Number); if (p.length !== 4 || p.some(x => isNaN(x) || x<0 || x>255) || c<0 || c>32) return null;
    const iN = (p[0]<<24 | p[1]<<16 | p[2]<<8 | p[3]) >>> 0;
    const mN = c === 0 ? 0 : (~0 << (32 - c)) >>> 0;
    const nN = (iN & mN) >>> 0; const bN = (nN | ~mN) >>> 0;
    const fH = c >= 31 ? nN : (nN + 1) >>> 0; const lH = c >= 31 ? bN : (bN - 1) >>> 0;
    const tH = c >= 31 ? (c === 32 ? 1 : 2) : Math.pow(2, 32 - c) - 2;
    return { network: toIP(nN), broadcast: toIP(bN), first: toIP(fH), last: toIP(lH), total: tH.toLocaleString(), mask: toIP(mN) };
  };
  const res = getSubnet(ip, parseInt(mask) || 24);

  return (
    <div className="space-y-4">
      <header className="flex flex-col items-center text-center">
         <div className="status-circle status-circle-blue w-6 h-6 mb-2">
            <Calculator size={12} />
         </div>
         <h2 className="label-upper text-[10px] text-blue-500 font-black">Logical Scoping</h2>
      </header>

      <div className="w-full space-y-4">
        <div className="flex gap-2">
           <div className="flex-1">
              <label className="label-upper text-[7px] text-blue-500 mb-1 block ml-1">IP</label>
              <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-lg outline-none text-[9px] font-mono dark:text-white" />
           </div>
           <div className="w-14">
              <label className="label-upper text-[7px] text-blue-500 mb-1 block ml-1 text-center">MASK</label>
              <input type="number" min="0" max="32" value={mask} onChange={(e) => setMask(e.target.value)} className="w-full px-1 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-lg outline-none font-black text-center text-[10px] dark:text-white" />
           </div>
        </div>

        {res ? (
          <div className="grid grid-cols-2 gap-2">
             <ScopeBox label="NET" value={res.network} />
             <ScopeBox label="BCST" value={res.broadcast} />
             <ScopeBox label="START" value={res.first} />
             <ScopeBox label="END" value={res.last} />
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/10 text-red-500 text-[8px] font-black uppercase text-center">
             INVALID RANGE
          </div>
        )}
      </div>
    </div>
  );
}

function PingTool() {
  const [target, setTarget] = useState("google.com");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const start = async () => {
    setLoading(true); setResults([]);
    try {
      const res = await apiClient.get(`/api/network/ping/${encodeURIComponent(target)}?count=4`);
      setResults(res.data.results || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col items-center text-center">
         <div className="status-circle status-circle-blue w-6 h-6 mb-2">
            <Zap size={12} />
         </div>
         <h2 className="label-upper text-[10px] text-blue-500 font-black">TCP Pulse</h2>
      </header>

      <div className="w-full space-y-4">
         <div className="flex gap-1.5">
            <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="ipv4..." className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-[9px] font-black uppercase dark:text-white" />
            <button onClick={start} disabled={loading} className="px-4 py-1.5 bg-blue-600 rounded-lg text-white text-[8px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 active:scale-95 transition-all">
               {loading ? <RefreshCw size={10} className="animate-spin" /> : <Zap size={10} />}
               Go
            </button>
         </div>

         <div className="p-3 rounded-2xl bg-[#0d1117] border border-white/5 min-h-[120px] font-mono shadow-inner">
            <div className="space-y-1">
               {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                     <div className="flex items-center gap-2">
                        <div className={cn("w-1 h-1 rounded-full", r.status === "Reply" ? "bg-emerald-500" : "bg-red-500")} />
                        <span className="text-[8px] text-slate-400 font-black">P{i+1}</span>
                        <span className="text-[8px] font-bold text-slate-200 uppercase">{r.status}</span>
                     </div>
                     {r.status === "Reply" && <span className="font-metric text-blue-400 font-black text-[9px]">{r.time}ms</span>}
                  </div>
               ))}
               {!loading && results.length === 0 && <div className="text-[7px] text-slate-600 uppercase tracking-widest mt-8 text-center">Execute probe...</div>}
               {loading && <div className="text-blue-500 text-[7px] animate-pulse uppercase tracking-widest mt-8 text-center">Transmitting...</div>}
            </div>
         </div>
      </div>
    </div>
  );
}

function ScopeBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 active:border-blue-500/40 transition-all flex flex-col gap-0.5 shadow-sm">
       <span className="label-upper text-[6px] opacity-50">{label}</span>
       <span className="font-metric font-black text-slate-900 dark:text-blue-400 text-[9px] truncate tracking-tighter uppercase">{value}</span>
    </div>
  );
}
