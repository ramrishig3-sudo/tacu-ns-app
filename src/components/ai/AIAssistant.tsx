import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  User, 
  Bot, 
  Shield, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  Terminal,
  Cpu,
  RefreshCw,
  Paperclip,
  FileText,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import apiClient from "../../services/api";

export default function AIAssistant() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([
    { role: "bot", content: "Hello! I'm TacU- NS AI. How can I help you secure your network today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"beginner" | "expert">("beginner");
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const userMessage = input || (attachedFile ? `Analyzing file: ${attachedFile.name}` : "");
    const fullPrompt = attachedFile 
      ? `[ATTACHED_FILE: ${attachedFile.name}]\nContent:\n${attachedFile.content}\n\nUser Question: ${input || "Analyze this file for security risks."}`
      : input;

    setInput("");
    setAttachedFile(null);
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      // Get correlated risk data for AI context
      const correlatedRisk = localStorage.getItem("last_correlated_risk");
      const context = correlatedRisk || undefined;

      // Call backend AI proxy (Groq) — NO API KEY on frontend
      const response = await apiClient.post("/api/ai-chat", {
        message: fullPrompt,
        mode,
        context,
      });

      const botMessage = response.data?.message || 
        response.data?.error || 
        "I'm sorry, I couldn't process that request.";
      
      setMessages(prev => [...prev, { role: "bot", content: botMessage }]);
    } catch (error: any) {
      console.error("AI Error:", error);
      const errorMsg = error.response?.data?.error || 
        "Failed to connect to the AI service. Please check your connection and try again.";
      setMessages(prev => [...prev, { role: "bot", content: `⚠️ ${errorMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-1"
      >
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-600/10 border border-blue-500/20">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="cyber-subtitle !text-lg md:!text-xl bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">AI Security Assistant</h3>
            <p className="cyber-text-s">Powered by Neural Engine • Real-time threat analysis</p>
          </div>
        </div>

        <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 backdrop-blur-xl border-dashed">
          <button 
            onClick={() => setMode("beginner")}
            className={cn(
              "px-3 py-1 md:px-4 md:py-1.5 rounded-lg cyber-text-xs transition-all",
              mode === "beginner" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-white"
            )}
          >
            Beginner
          </button>
          <button 
            onClick={() => setMode("expert")}
            className={cn(
              "px-3 py-1 md:px-4 md:py-1.5 rounded-lg cyber-text-xs transition-all",
              mode === "expert" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-white"
            )}
          >
            Expert
          </button>
        </div>
      </motion.div>

      <div className="flex-1 overflow-hidden flex flex-col cyber-card border-dashed">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 blur-[100px] -ml-32 -mb-32" />
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 md:space-y-6 pr-3 custom-scrollbar relative z-10"
        >
          {messages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex gap-3 max-w-[95%] md:max-w-[90%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 shadow-lg border transition-transform hover:scale-110",
                msg.role === "user" 
                  ? "bg-blue-600 text-white border-blue-400/30" 
                  : "bg-black/60 text-blue-500 border-white/10"
              )}>
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={cn(
                "p-3 md:p-4 rounded-[16px] md:rounded-[20px] text-[11px] md:text-xs leading-relaxed relative overflow-hidden",
                msg.role === "user" 
                  ? "bg-blue-600/10 border border-blue-600/30 text-blue-50" 
                  : "glass-card text-slate-200"
              )}>
                {msg.role === "bot" && (
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-blue-500/50" />
                )}
                <div className="prose prose-invert prose-sm max-w-none font-medium text-[11px] md:text-xs">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-blue-500 animate-pulse">
                <Bot size={16} />
              </div>
              <div className="p-3 md:p-4 rounded-[16px] md:rounded-[20px] glass-card flex items-center gap-2">
                <div className="flex gap-1">
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 rounded-full bg-blue-500" />
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 rounded-full bg-blue-500" />
                  <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 rounded-full bg-blue-500" />
                </div>
                <span className="cyber-text-xs !tracking-normal">Processing with TacU- NS AI...</span>
              </div>
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSend} className="mt-4 md:mt-6 relative z-10">
          <div className="absolute -inset-4 bg-blue-600/5 blur-3xl rounded-[40px] pointer-events-none" />
          
          <AnimatePresence>
            {attachedFile && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full mb-3 md:mb-4 left-0 right-0 p-2 md:p-3 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-between backdrop-blur-2xl shadow-2xl"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                    <FileText size={14} />
                  </div>
                  <div>
                    <p className="cyber-text-xs text-blue-400 mb-0.5">Attached Asset</p>
                    <p className="text-[10px] md:text-xs font-bold truncate max-w-[150px] md:max-w-[200px] text-white">{attachedFile.name}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-center bg-black/60 border border-white/10 rounded-xl md:rounded-2xl p-1 md:p-1.5 backdrop-blur-3xl focus-within:border-blue-500/50 transition-all shadow-2xl">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.json,.log,.csv"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 md:p-3 hover:bg-white/5 rounded-lg md:rounded-xl text-slate-500 hover:text-blue-400 transition-all active:scale-90"
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a threat..." 
              className="bg-transparent border-none outline-none flex-1 px-3 md:px-4 py-2 md:py-3 text-[11px] md:text-xs font-medium placeholder:text-slate-600 text-white"
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center transition-all shadow-xl shadow-blue-600/30 active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
