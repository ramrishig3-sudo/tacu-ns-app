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
        className="cyber-card"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -mr-48 -mt-48 group-hover:bg-blue-600/20 transition-colors duration-700" />
        
        <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-10 relative z-10">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-600/10 border border-blue-500/20">
            <Mail size={32} />
          </div>
          <div>
            <h3 className="cyber-title bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Email Header Analyzer</h3>
            <p className="cyber-text-s">Paste raw email headers to analyze origin and security authentication.</p>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 relative z-10">
          <div className="relative group/textarea">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl md:rounded-2xl blur opacity-0 group-focus-within/textarea:opacity-100 transition duration-500" />
            <textarea 
              value={rawHeader}
              onChange={(e) => setRawHeader(e.target.value)}
              placeholder="Paste raw email header here..."
              className="relative w-full h-40 md:h-56 bg-black/40 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 outline-none focus:border-blue-500/50 transition-all font-mono text-[10px] md:text-xs leading-relaxed text-slate-300 custom-scrollbar"
            />
          </div>
          <button 
            onClick={analyzeHeader}
            className="w-full cyber-btn bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20"
          >
            <Zap size={18} className="animate-pulse" />
            Initiate Deep Analysis
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
              <div className="cyber-card">
                <h4 className="cyber-subtitle mb-4 md:mb-6 flex items-center gap-2">
                  <Info size={18} className="text-blue-500" />
                  Message Details
                </h4>
                <div className="space-y-3 md:space-y-4">
                  <DetailRow label="Subject" value={analysis.subject} />
                  <DetailRow label="From" value={analysis.from} />
                  <DetailRow label="To" value={analysis.to} />
                  <DetailRow label="Date" value={analysis.date} />
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
                    <div key={i} className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3 md:gap-4">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold text-[10px] md:text-xs">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] md:text-xs font-bold text-slate-300 truncate">From: {hop.from}</p>
                        <p className="cyber-text-xs mt-1">By: {hop.by}</p>
                      </div>
                      <div className="cyber-text-xs text-right">
                        {hop.time}
                      </div>
                    </div>
                  )) : (
                    <p className="cyber-text-s italic">No delivery hops found in header.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Score */}
            <div className="space-y-6 md:space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="cyber-card text-center border-dashed"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[80px] -mr-24 -mt-24" />
                
                <h4 className="cyber-text-xs mb-6 md:mb-8">Trustworthiness Index</h4>
                <div className="relative w-32 h-32 md:w-48 md:h-48 mx-auto mb-6 md:mb-10">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-white/5"
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
                        "transition-colors duration-1000",
                        analysis.score > 70 ? "text-emerald-500" : analysis.score > 40 ? "text-amber-500" : "text-red-500"
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-3xl md:text-5xl font-black tracking-tighter"
                    >
                      {analysis.score}
                    </motion.span>
                    <span className="cyber-text-xs mt-1">Security Points</span>
                  </div>
                  {/* Glow Effect */}
                  <div className={cn(
                    "absolute inset-0 rounded-full blur-3xl opacity-20 animate-pulse",
                    analysis.score > 70 ? "bg-emerald-500" : analysis.score > 40 ? "bg-amber-500" : "bg-red-500"
                  )} />
                </div>

                <div className="space-y-2 md:space-y-3 relative z-10">
                  <SecurityBadge label="SPF Protocol" status={analysis.spf} />
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
