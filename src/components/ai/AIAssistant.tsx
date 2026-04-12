import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Send, User, Bot, Loader2, Cpu, Paperclip, FileText, X, ArrowRight
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import apiClient from "../../services/api";

export default function AIAssistant() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([
    { role: "bot", content: "System online. I am TacU- NS AI. How can I assist with your infrastructure security today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"beginner" | "expert">("beginner");
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Requirement: Store only last 10 messages (max) for the backend
  const conversationHistory = useMemo(() => messages.slice(-10), [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFile({ name: file.name, content: content.substring(0, 5000) });
    };
    reader.readAsText(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input && !attachedFile) || loading) return;

    const userMessageContent = input || (attachedFile ? `Analyzing file: ${attachedFile.name}` : "");
    const fullPrompt = attachedFile 
      ? `[ATTACHED_FILE: ${attachedFile.name}]\nContent:\n${attachedFile.content}\n\nUser Question: ${input || "Analyze this file for security risks."}`
      : input;

    setInput("");
    setAttachedFile(null);
    
    const newUserMessage = { role: "user" as const, content: userMessageContent };
    
    // Manage local history (we keep it all locally for scroll, but trim for API)
    setMessages(prev => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const correlatedRisk = localStorage.getItem("last_correlated_risk");
      
      // Sending pruned history to backend
      const response = await apiClient.post("/api/ai-chat", {
        message: fullPrompt,
        messages: conversationHistory, // Send the last 10 contextual items
        mode,
        context: correlatedRisk || undefined,
      });
      
      const botMessage = response.data?.message || "AI service is temporarily unavailable. Please try again.";
      if (isMounted.current) {
        setMessages(prev => [...prev, { role: "bot", content: botMessage }]);
      }
    } catch (error: any) {
      if (isMounted.current) {
        setMessages(prev => [...prev, { 
          role: "bot", 
          content: "⚠️ AI service is temporarily unavailable. Please check your connection and try again." 
        }]);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] max-w-5xl mx-auto w-full gap-4 md:gap-8">
      
      {/* ── High Density Header ── */}
      <section className="enterprise-card flex items-center gap-4 py-4">
         <div className="status-circle status-circle-blue w-8 h-8 shrink-0">
            <Cpu size={16} />
         </div>
         <div className="flex-1">
            <h2 className="metric-medium text-sm">Neural Core</h2>
            <p className="label-upper mt-0.5 scale-90 origin-left uppercase">Vector correlation</p>
         </div>
         <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg scale-90">
            <button onClick={() => setMode("beginner")} className={cn("px-3 py-1 rounded-md text-[7px] font-black uppercase tracking-wider transition-all", mode === "beginner" ? "bg-blue-600 text-white shadow-sm" : "text-[var(--text-secondary)]")}>Basic</button>
            <button onClick={() => setMode("expert")} className={cn("px-3 py-1 rounded-md text-[7px] font-black uppercase tracking-wider transition-all", mode === "expert" ? "bg-blue-600 text-white shadow-sm" : "text-[var(--text-secondary)]")}>Expert</button>
         </div>
      </section>

      {/* ── Chat Matrix (Compact Bubbles) ── */}
      <section className="enterprise-card flex-1 flex flex-col p-0 overflow-hidden relative">
         <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar relative z-10">
             {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center"><Loader2 size={14} className="animate-spin text-blue-500" /></div>
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-white/5">
                   <span className="label-upper text-blue-500 text-[9px]">Analyzing global telemetry...</span>
                </div>
              </div>
            )}
         </div>

         {/* ── Input Terminal (Compact) ── */}
         <footer className="p-4 md:p-6 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]">
            <AnimatePresence>
               {attachedFile && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-4 right-4 mb-3 p-3 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-between backdrop-blur-xl">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <FileText size={14} className="text-blue-500 shrink-0" />
                        <span className="text-[9px] font-black uppercase truncate">{attachedFile.name}</span>
                     </div>
                     <button onClick={() => setAttachedFile(null)} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                  </motion.div>
               )}
            </AnimatePresence>

             <form onSubmit={handleSend} className="flex gap-2">
               <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
               <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-blue-600 active:scale-90 transition-all">
                  <Paperclip size={16} />
               </button>
               <div className="flex-1 flex items-center px-3 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5">
                  <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Query core..." className="w-full bg-transparent border-none outline-none py-2 text-[11px] font-bold dark:text-white" />
               </div>
               <button disabled={loading} type="submit" className="p-2.5 bg-blue-600 text-white rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  <Send size={16} />
               </button>
            </form>
         </footer>
      </section>
    </div>
  );
}

// REQUIREMENT: Optimize rendering to avoid unnecessary re-renders
const ChatBubble = React.memo(({ msg }: { msg: { role: "user" | "bot"; content: string } }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "")}>
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-colors", 
        msg.role === "user" ? "status-circle-blue" : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500")}>
        {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
      </div>
      <div className={cn("max-w-[88%] p-3 rounded-xl shadow-sm text-[11px] leading-relaxed transition-colors", 
        msg.role === "user" ? "bg-blue-600 text-white font-bold" : "bg-white dark:bg-[#1A1F2E] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100")}>
        <div className={cn("prose prose-xs font-bold tracking-tight max-w-none break-words", 
           msg.role === "user" ? "prose-invert" : "dark:prose-invert")}>
           <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
});
