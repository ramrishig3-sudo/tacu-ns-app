import { Bot, Zap, Sparkles } from "lucide-react";

const accent = "#C084FC";
const ch = (op: number) => `${accent}${Math.round(op * 255).toString(16).padStart(2, "0")}`;

export default function AIAssistant() {
  return (
    <div className="space-y-4 pb-20">

      {/* Header card */}
      <div className="rounded-2xl border overflow-hidden"
           style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: ch(0.18) }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.30)})` }} />
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: ch(0.12), border: `1px solid ${ch(0.25)}` }}>
            <Bot size={16} style={{ color: accent }} />
          </div>
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.22em]"
               style={{ color: "rgba(148,163,184,0.40)" }}>Neural Core</p>
            <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>AI Assistant</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
               style={{ background: ch(0.08), border: `1px solid ${ch(0.20)}` }}>
            <Sparkles size={8} style={{ color: accent }} />
            <span className="text-[6.5px] font-black uppercase tracking-widest" style={{ color: accent }}>Beta</span>
          </div>
        </div>
      </div>

      {/* Coming Soon card */}
      <div className="rounded-2xl border overflow-hidden"
           style={{ background: "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))", borderColor: ch(0.15) }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.25)})` }} />
        <div className="flex flex-col items-center justify-center gap-6 text-center p-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{ background: ch(0.10), border: `1px solid ${ch(0.22)}`, boxShadow: `0 0 30px ${ch(0.12)}` }}>
            <Zap size={32} style={{ color: accent }} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tight" style={{ color: "#E2E8F0" }}>Coming Soon</h3>
            <p className="text-sm font-bold max-w-xs" style={{ color: "rgba(148,163,184,0.60)" }}>
              AI Assistant is under development and will be available in the next update.
            </p>
          </div>
          <div className="px-4 py-2 rounded-full"
               style={{ background: ch(0.10), border: `1px solid ${ch(0.22)}` }}>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
              Next Update
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
