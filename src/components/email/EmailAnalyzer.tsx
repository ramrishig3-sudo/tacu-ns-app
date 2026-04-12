import React, { useState } from "react";
import { 
  Mail, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Activity, 
  Globe, 
  Search,
  FileText,
  Zap,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

export default function EmailAnalyzer() {
  const [rawHeader, setRawHeader] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);

  const analyzeHeader = () => {
    if (!rawHeader) return;

    const results: any = {
      spf: "None",
      dkim: "None",
      dmarc: "None",
      received: [],
      from: "Unknown",
      to: "Unknown",
      subject: "Unknown",
      date: "Unknown",
      score: 0,
    };

    // Regex parsing
    const fromMatch = rawHeader.match(/From: (.*)/i);
    if (fromMatch) results.from = fromMatch[1];

    const toMatch = rawHeader.match(/To: (.*)/i);
    if (toMatch) results.to = toMatch[1];

    const subjectMatch = rawHeader.match(/Subject: (.*)/i);
    if (subjectMatch) results.subject = subjectMatch[1];

    const dateMatch = rawHeader.match(/Date: (.*)/i);
    if (dateMatch) results.date = dateMatch[1];

    // Security Checks
    if (rawHeader.toLowerCase().includes("spf=pass")) {
      results.spf = "Pass";
      results.score += 30;
    } else if (rawHeader.toLowerCase().includes("spf=fail")) {
      results.spf = "Fail";
      results.score -= 20;
    }

    if (rawHeader.toLowerCase().includes("dkim=pass")) {
      results.dkim = "Pass";
      results.score += 30;
    } else if (rawHeader.toLowerCase().includes("dkim=fail")) {
      results.dkim = "Fail";
      results.score -= 20;
    }

    if (rawHeader.toLowerCase().includes("dmarc=pass")) {
      results.dmarc = "Pass";
      results.score += 40;
    } else if (rawHeader.toLowerCase().includes("dmarc=fail")) {
      results.dmarc = "Fail";
      results.score -= 30;
    }

    // Extract Received hops
    const receivedMatches = rawHeader.matchAll(/Received: from (.*) by (.*) with (.*) id (.*); (.*)/gi);
    for (const match of receivedMatches) {
      results.received.push({
        from: match[1],
        by: match[2],
        with: match[3],
        time: match[5],
      });
    }

    setAnalysis(results);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 md:p-12 rounded-[40px] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 relative overflow-hidden group shadow-2xl shadow-slate-200/50 dark:shadow-none"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -mr-48 -mt-48 transition-colors duration-1000" />
        
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-[32px] bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xl transition-all duration-700 mb-8 rotate-3 group-hover:rotate-0">
            <Mail size={40} className="drop-shadow-sm" />
          </div>
          
          <h3 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-4">
            Header Intelligence
          </h3>
          <p className="text-slate-500 font-bold text-sm md:text-base max-w-lg mx-auto leading-relaxed mb-8 opacity-60">
            Analyzing deep email origin vectors and authentication <br className="hidden md:block" /> integrity for sub-surface threat detection.
          </p>
        </div>

        <div className="space-y-6 relative z-10 max-w-2xl mx-auto">
          <div className="relative group">
            <textarea 
              value={rawHeader}
              onChange={(e) => setRawHeader(e.target.value)}
              placeholder="Paste raw email header..."
              className="w-full h-40 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-[32px] p-6 outline-none focus:border-blue-500/50 transition-all font-mono text-xs leading-relaxed text-slate-600 dark:text-slate-300 custom-scrollbar shadow-inner"
            />
          </div>
          <button 
            onClick={analyzeHeader}
            className="w-full h-16 rounded-[24px] bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-[0.98]"
          >
            <Zap size={20} />
            Execute Analysis
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {analysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8"
          >
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              {/* Basic Info */}
              <div className="cyber-card p-4 md:p-5">
                <h4 className="cyber-subtitle mb-3 md:mb-4 flex items-center gap-2">
                  <Info size={16} className="text-blue-500" />
                  Message Topology
                </h4>
                <div className="space-y-2.5 md:space-y-3">
                  <DetailRow label="Subject" value={analysis.subject} />
                  <DetailRow label="Origin" value={analysis.from} />
                  <DetailRow label="Destination" value={analysis.to} />
                  <DetailRow label="Timestamp" value={analysis.date} />
                </div>
              </div>

              {/* Hops */}
              <div className="cyber-card">
                <h4 className="cyber-subtitle mb-4 md:mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-blue-500" />
                  Delivery Path (Hops)
                </h4>
                <div className="space-y-3 md:space-y-4">
                  {analysis.received.length > 0 ? analysis.received.map((hop: any, i: number) => (
                    <div key={i} className="p-2.5 md:p-3 rounded-lg bg-white/5 border border-white/5 flex items-center gap-2.5 md:gap-3">
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold text-[9px] md:text-xs">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] md:text-xs font-bold text-slate-300 truncate">Srv: {hop.from}</p>
                        <p className="text-[8px] text-slate-500 leading-none mt-0.5">By: {hop.by}</p>
                      </div>
                      <div className="text-[8px] text-slate-500 text-right whitespace-nowrap">
                        {hop.time.split(' ').slice(0, 3).join(' ')}
                      </div>
                    </div>
                  )) : (
                    <p className="cyber-text-s italic">No delivery hops found in header.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Score */}
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-10 rounded-[40px] bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-center relative overflow-hidden shadow-2xl"
              >
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Trust Integrity Factor</h4>
                <div className="relative w-48 h-48 mx-auto mb-10">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-slate-100 dark:text-white/5"
                    />
                    <motion.circle
                      cx="50" cy="50" r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray="283"
                      initial={{ strokeDashoffset: 283 }}
                      animate={{ strokeDashoffset: 283 - (283 * analysis.score) / 100 }}
                      transition={{ duration: 2, ease: "circOut" }}
                      className={cn(
                        "transition-colors duration-1000 shadow-xl",
                        analysis.score > 70 ? "text-emerald-500" : analysis.score > 40 ? "text-amber-500" : "text-red-500"
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white"
                    >
                      {analysis.score}
                    </motion.span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">S-FACTOR</span>
                  </div>
                </div>

                <div className="space-y-3 relative z-10">
                  <SecurityBadge label="SPF Header" status={analysis.spf} />
                  <SecurityBadge label="DKIM Signature" status={analysis.dkim} />
                  <SecurityBadge label="DMARC Policy" status={analysis.dmarc} />
                </div>
              </motion.div>

              <div className={cn(
                "p-6 md:p-8 rounded-2xl md:rounded-3xl border backdrop-blur-xl transition-all duration-500",
                analysis.score > 70 
                  ? "bg-emerald-500/10 border-emerald-500/20" 
                  : analysis.score > 40 
                  ? "bg-amber-500/10 border-amber-500/20" 
                  : "bg-red-500/10 border-red-500/20"
              )}>
                <h4 className="cyber-subtitle mb-3 md:mb-4 flex items-center gap-2">
                  <Shield size={18} className={cn(
                    analysis.score > 70 ? "text-emerald-500" : analysis.score > 40 ? "text-amber-500" : "text-red-500"
                  )} />
                  Verdict: {analysis.score > 70 ? "Trusted" : analysis.score > 40 ? "Suspicious" : "Untrusted"}
                </h4>
                <p className="text-[11px] md:text-sm text-slate-300 leading-relaxed">
                  {analysis.score > 70 
                    ? "This email appears to be authentic and passed all security checks. It is safe to interact with." 
                    : analysis.score > 40 
                    ? "Moderate risk. Some authentication checks failed. This could be a spoofing attempt or a misconfigured server. Proceed with caution." 
                    : "High risk! This email failed critical authentication checks. It is highly likely to be a phishing or spoofing attempt. Do not click any links."}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 md:py-2 border-b border-white/5 last:border-0">
      <span className="cyber-text-xs">{label}</span>
      <span className="font-medium text-xs md:text-sm truncate" title={value}>{value}</span>
    </div>
  );
}

function SecurityBadge({ label, status }: any) {
  const colors: any = {
    Pass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Fail: "bg-red-500/10 text-red-500 border-red-500/20",
    None: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  };

  return (
    <div className={cn("flex items-center justify-between p-2 md:p-3 rounded-lg md:rounded-xl border", colors[status])}>
      <span className="text-[10px] md:text-xs font-bold">{label}</span>
      <div className="flex items-center gap-1.5 md:gap-2">
        {status === "Pass" ? <CheckCircle size={14} /> : status === "Fail" ? <AlertTriangle size={14} /> : <Info size={14} />}
        <span className="cyber-text-xs !text-inherit">{status}</span>
      </div>
    </div>
  );
}
