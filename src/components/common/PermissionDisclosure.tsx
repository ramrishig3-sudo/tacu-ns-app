import React from "react";
import { motion } from "motion/react";
import { MapPin, Wifi, ShieldCheck, ArrowRight, X } from "lucide-react";

interface Props {
  onContinue: () => void;
  onDismiss: () => void;
  type: "wifi" | "location";
}

/**
 * Play Store Prominent Disclosure Modal
 * Must be shown BEFORE requesting sensitive permissions (Location / WiFi).
 * Complies with Google Play Policy: https://support.google.com/googleplay/android-developer/answer/9799955
 */
export default function PermissionDisclosure({ onContinue, onDismiss, type }: Props) {
  const isWifi = type === "wifi";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onDismiss}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-sm bg-white dark:bg-[#111827] rounded-[28px] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header Bar */}
        <div className="h-1.5 w-full bg-blue-600" />

        <div className="p-6 space-y-5">
          {/* Icon */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              {isWifi ? <Wifi size={20} className="text-white" /> : <MapPin size={20} className="text-white" />}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Permission Required</p>
              <h2 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                {isWifi ? "WiFi & Location Access" : "Location Access"}
              </h2>
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-relaxed bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800/50">
              "This app uses location access ONLY while the app is in use to scan nearby WiFi networks. No location data is stored or shared."
            </p>

            <div className="space-y-2 pt-1">
              {[
                { title: "Why location is needed", text: "To scan nearby WiFi networks and identify signal strength." },
                { title: "What happens to data", text: "Data is processed locally on your device for analysis." },
                { title: "What is NOT done", text: "We do not store or share your location or tracking history." }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck size={10} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 leading-none mb-1">{item.title}</p>
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={onContinue}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              Continue
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
