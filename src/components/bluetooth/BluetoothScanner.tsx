import React, { useState, useRef, useEffect } from "react";
import {
  Bluetooth, ChevronDown, ChevronUp, RefreshCw, StopCircle,
  BookOpen, Shield, Smartphone, Headphones, Cpu, Monitor,
  Volume2, Activity, Link2, Zap
} from "lucide-react";
import { BleClient, ScanResult } from "@capacitor-community/bluetooth-le";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type DeviceType = "phone" | "audio" | "wearable" | "iot" | "computer" | "tv" | "unknown";

interface BleDevice {
  deviceId: string; name: string; rssi: number;
  manufacturer: string | null; deviceType: DeviceType;
  isBonded: boolean; rssiHistory: number[]; firstSeen: number;
}

const accent = "#38BDF8";
const ch = (op: number) => `${accent}${Math.round(op * 255).toString(16).padStart(2, "0")}`;
const CARD_BG = "linear-gradient(145deg, rgba(13,21,42,0.90), rgba(8,14,28,0.95))";

const MANUFACTURER_MAP: Record<number, { brand: string; type: DeviceType }> = {
  0x004C: { brand: "Apple",     type: "phone"    }, 0x0075: { brand: "Samsung",   type: "phone"    },
  0x00E0: { brand: "Google",    type: "phone"    }, 0x01D5: { brand: "Xiaomi",    type: "phone"    },
  0x0157: { brand: "Huawei",    type: "phone"    }, 0x0006: { brand: "Microsoft", type: "computer" },
  0x0059: { brand: "Nordic",    type: "iot"      }, 0x0002: { brand: "Ericsson",  type: "iot"      },
  0x000F: { brand: "Broadcom",  type: "iot"      }, 0x0087: { brand: "Garmin",    type: "wearable" },
  0x0171: { brand: "Amazfit",   type: "wearable" }, 0x038F: { brand: "Bose",      type: "audio"    },
  0x008A: { brand: "Jabra",     type: "audio"    }, 0x01FF: { brand: "JBL",       type: "audio"    },
};

const SERVICE_TYPE_MAP: Record<string, DeviceType> = {
  "0000180d": "wearable", "00001826": "wearable", "0000110b": "audio",
  "0000111e": "audio",    "00001108": "audio",    "00001812": "iot", "0000180a": "iot",
};

function classifyDevice(result: ScanResult): { deviceType: DeviceType; manufacturer: string | null } {
  let deviceType: DeviceType = "unknown";
  let manufacturer: string | null = null;
  if (result.manufacturerData) {
    for (const key of Object.keys(result.manufacturerData)) {
      const hint = MANUFACTURER_MAP[parseInt(key)];
      if (hint) { manufacturer = hint.brand; deviceType = hint.type; break; }
    }
  }
  if (deviceType === "unknown" && result.uuids?.length) {
    for (const uuid of result.uuids) {
      const short = uuid.replace(/-/g, "").toLowerCase().slice(0, 8);
      const t = SERVICE_TYPE_MAP[short];
      if (t) { deviceType = t; break; }
    }
  }
  const name = (result.device.name || result.localName || "").toLowerCase();
  if (deviceType === "unknown" && name) {
    if (/watch|band|fit|tracker|polar|garmin|amazfit|galaxy watch|mi band/.test(name)) deviceType = "wearable";
    else if (/airpod|bud|tws|headphone|earphone|headset|jbl|bose|sony|beat|jabra|sennheiser|anker|soundcore/.test(name)) deviceType = "audio";
    else if (/speaker|soundbar|homepod|echo|alexa/.test(name)) deviceType = "audio";
    else if (/phone|iphone|samsung|xiaomi|redmi|oneplus|pixel|oppo|vivo|realme|huawei/.test(name)) deviceType = "phone";
    else if (/laptop|macbook|thinkpad|dell|hp|asus|lenovo|surface/.test(name)) deviceType = "computer";
    else if (/tv|television|chromecast|firetv/.test(name)) deviceType = "tv";
    else if (/sensor|beacon|tag|lock|bulb|plug|switch|iot|esp/.test(name)) deviceType = "iot";
  }
  return { deviceType, manufacturer };
}

const TYPE_CONFIG: Record<DeviceType, { label: string; color: string; Icon: React.ElementType }> = {
  phone:    { label: "Phone",    color: "#38BDF8", Icon: Smartphone },
  audio:    { label: "Audio",    color: "#34D399", Icon: Headphones },
  wearable: { label: "Wearable", color: "#A78BFA", Icon: Activity   },
  iot:      { label: "IoT",      color: "#F59E0B", Icon: Cpu        },
  computer: { label: "Computer", color: "#60A5FA", Icon: Monitor    },
  tv:       { label: "TV",       color: "#F472B6", Icon: Volume2    },
  unknown:  { label: "BLE",      color: "#94A3B8", Icon: Bluetooth  },
};

function signalQuality(rssi: number) {
  if (rssi >= -60) return { label: "Excellent", color: "#22C55E", bars: 4 };
  if (rssi >= -70) return { label: "Good",      color: "#38BDF8", bars: 3 };
  if (rssi >= -80) return { label: "Fair",      color: "#F59E0B", bars: 2 };
  return                  { label: "Weak",      color: "#EF4444", bars: 1 };
}

function SignalBars({ bars, color }: { bars: number; color: string }) {
  return (
    <div className="flex items-end gap-[2px]">
      {[1, 2, 3, 4].map(b => (
        <div key={b} style={{ width: 4, height: 4 + b * 4, borderRadius: 2,
          background: b <= bars ? color : "rgba(148,163,184,0.18)" }} />
      ))}
    </div>
  );
}

function LearningBox() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden"
         style={{ borderColor: ch(0.25), background: ch(0.05) }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen size={14} style={{ color: accent }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>What is BLE Scanner?</span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: accent }} /> : <ChevronDown size={14} style={{ color: accent }} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
            <div className="px-4 pb-4 space-y-2">
              <p className="text-[10px] font-bold leading-relaxed" style={{ color: "rgba(148,163,184,0.60)" }}>
                Passively detects all Bluetooth Low Energy devices broadcasting nearby — phones, earbuds, smartwatches, IoT sensors, and more.
              </p>
              {[
                { Icon: Zap,    t: "Real-time RSSI",  b: "Signal strength in dBm — stronger = closer. Chart tracks signal changes over time." },
                { Icon: Cpu,    t: "Device Type ID",  b: "Identifies device type from manufacturer data, BLE service UUIDs, and device name patterns." },
                { Icon: Shield, t: "Passive Only",    b: "Your device does NOT connect to any scanned device — completely safe and undetectable." },
              ].map(({ Icon, t, b }) => (
                <div key={t} className="flex gap-2.5 p-2.5 rounded-xl border"
                     style={{ background: ch(0.05), borderColor: ch(0.15) }}>
                  <Icon size={13} className="shrink-0 mt-0.5" style={{ color: accent }} />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#E2E8F0" }}>{t}</p>
                    <p className="text-[9px] font-bold mt-0.5 leading-relaxed" style={{ color: "rgba(148,163,184,0.55)" }}>{b}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SignalChart({ device }: { device: BleDevice }) {
  const cfg = TYPE_CONFIG[device.deviceType];
  const chartData = device.rssiHistory.map((rssi, i) => ({ i, rssi }));
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ background: CARD_BG, borderColor: `${cfg.color}25` }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}30)` }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.40)" }}>Signal History</p>
            <p className="text-[12px] font-black mt-0.5 truncate" style={{ color: "#E2E8F0" }}>{device.name}</p>
          </div>
          <span className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider"
                style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
            {device.rssi} dBm · {signalQuality(device.rssi).label}
          </span>
        </div>
        <div style={{ height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rssiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={cfg.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <YAxis domain={[-100, -30]} hide />
              <Tooltip content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="px-2 py-1 rounded-lg text-[9px] font-black border"
                       style={{ background: "rgba(8,14,28,0.95)", borderColor: `${cfg.color}30`, color: cfg.color }}>
                    {payload[0].value} dBm
                  </div>
                ) : null} />
              <Area type="monotone" dataKey="rssi" stroke={cfg.color} strokeWidth={2}
                fill="url(#rssiGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function DeviceRow({ device, selected, onSelect }: { device: BleDevice; selected: boolean; onSelect: () => void }) {
  const cfg = TYPE_CONFIG[device.deviceType];
  const sig = signalQuality(device.rssi);
  const { Icon } = cfg;
  return (
    <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      onClick={onSelect} className="w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all"
      style={{ background: selected ? `${cfg.color}0D` : "rgba(148,163,184,0.04)",
               borderColor: selected ? `${cfg.color}50` : "rgba(148,163,184,0.10)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
          <Icon size={15} style={{ color: cfg.color }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[11px] font-black truncate" style={{ color: "#E2E8F0" }}>{device.name}</p>
            {device.isBonded && <Link2 size={9} style={{ color: "#22C55E" }} />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded"
                  style={{ background: `${cfg.color}15`, color: cfg.color }}>{cfg.label}</span>
            {device.manufacturer && (
              <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.45)" }}>
                {device.manufacturer}
              </span>
            )}
            <span className="text-[8px] font-bold truncate" style={{ color: "rgba(148,163,184,0.40)", maxWidth: 120 }}>
              {device.deviceId.length > 17 ? device.deviceId.slice(0, 17) + "…" : device.deviceId}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0 ml-2">
        <div className="text-right">
          <p className="text-[10px] font-black" style={{ color: sig.color }}>{device.rssi} dBm</p>
          <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.40)" }}>{sig.label}</p>
        </div>
        <SignalBars bars={sig.bars} color={sig.color} />
      </div>
    </motion.button>
  );
}

const SCAN_DURATION = 12000;
const MAX_HISTORY   = 25;

export default function BluetoothScanner() {
  const [scanning, setScanning]         = useState(false);
  const [devices, setDevices]           = useState<BleDevice[]>([]);
  const [bondedDevices, setBondedDevices] = useState<BleDevice[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devMapRef = useRef<Map<string, BleDevice>>(new Map());

  useEffect(() => {
    (async () => {
      try {
        await BleClient.initialize({ androidNeverForLocation: true });
        const bonded = await BleClient.getBondedDevices();
        setBondedDevices(bonded.map(d => ({
          deviceId: d.deviceId, name: d.name || "Paired Device", rssi: 0,
          manufacturer: null, deviceType: "unknown" as DeviceType,
          isBonded: true, rssiHistory: [], firstSeen: Date.now(),
        })));
      } catch {}
    })();
  }, []);

  const handleScanResult = (result: ScanResult) => {
    const id   = result.device.deviceId;
    const rssi = result.rssi ?? -99;
    const { deviceType, manufacturer } = classifyDevice(result);
    const existing = devMapRef.current.get(id);
    if (existing) {
      existing.rssi        = rssi;
      existing.deviceType  = deviceType !== "unknown" ? deviceType : existing.deviceType;
      existing.manufacturer= manufacturer ?? existing.manufacturer;
      existing.rssiHistory = [...existing.rssiHistory.slice(-(MAX_HISTORY - 1)), rssi];
    } else {
      const bondedMatch = bondedDevices.find(b => b.deviceId === id);
      devMapRef.current.set(id, {
        deviceId: id,
        name: result.device.name || result.localName || bondedMatch?.name || "Unidentified Device",
        rssi, manufacturer, deviceType, isBonded: !!bondedMatch,
        rssiHistory: [rssi], firstSeen: Date.now(),
      });
    }
    setDevices([...devMapRef.current.values()].sort((a, b) => b.rssi - a.rssi));
  };

  const startScan = async () => {
    setError(null); setDevices([]); setSelectedId(null);
    devMapRef.current.clear(); setScanning(true);
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      await BleClient.requestLEScan({}, handleScanResult);
      timerRef.current = setTimeout(stopScan, SCAN_DURATION);
    } catch (e: any) {
      const msg: string = (e?.message ?? String(e)).toLowerCase();
      if (msg.includes("permission") || msg.includes("denied"))
        setError("Bluetooth permission denied. Please allow Bluetooth access in device settings.");
      else if (msg.includes("disabled") || msg.includes("turned off") || msg.includes("not enabled"))
        setError("Bluetooth is turned off. Please enable Bluetooth and try again.");
      else
        setError("Could not start scan. Ensure Bluetooth is enabled and permission is granted.");
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    try { await BleClient.stopLeScan(); } catch {}
    setScanning(false);
  };

  const selectedDevice = selectedId ? devices.find(d => d.deviceId === selectedId) ?? null : null;
  const counts = devices.reduce((acc, d) => { acc[d.deviceType] = (acc[d.deviceType] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-4 pb-20">

      {/* Header card */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: ch(0.18) }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${ch(0.30)})` }} />
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: ch(0.12), border: `1px solid ${ch(0.25)}` }}>
            <Bluetooth size={16} style={{ color: accent }} />
          </div>
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: "rgba(148,163,184,0.40)" }}>RF Spectrum</p>
            <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>BLE Scanner</p>
          </div>
          {scanning && (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                 style={{ background: ch(0.10), border: `1px solid ${ch(0.22)}` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
              <span className="text-[6.5px] font-black uppercase tracking-widest" style={{ color: accent }}>Live</span>
            </div>
          )}
        </div>
      </div>

      <LearningBox />

      {/* Paired devices */}
      {bondedDevices.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: "rgba(34,197,94,0.22)" }}>
          <div style={{ height: 2, background: "linear-gradient(90deg, #22C55E, rgba(34,197,94,0.30))" }} />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={13} style={{ color: "#22C55E" }} />
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#E2E8F0" }}>Paired Devices</p>
              <span className="ml-auto px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase"
                    style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                {bondedDevices.length} paired
              </span>
            </div>
            <div className="space-y-2">
              {bondedDevices.map(dev => {
                const cfg = TYPE_CONFIG[dev.deviceType];
                const { Icon } = cfg;
                return (
                  <div key={dev.deviceId} className="flex items-center gap-3 p-2.5 rounded-xl border"
                       style={{ background: "rgba(34,197,94,0.05)", borderColor: "rgba(34,197,94,0.20)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                         style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
                      <Icon size={14} style={{ color: "#22C55E" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black truncate" style={{ color: "#E2E8F0" }}>{dev.name}</p>
                      <p className="text-[8px] font-bold truncate mt-0.5" style={{ color: "rgba(148,163,184,0.45)" }}>
                        {dev.deviceId.length > 20 ? dev.deviceId.slice(0, 20) + "…" : dev.deviceId}
                      </p>
                    </div>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>Paired</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Scan control card */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: ch(0.15) }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${ch(0.25)})` }} />
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-black text-sm uppercase tracking-tight" style={{ color: "#E2E8F0" }}>BLE Device Scanner</p>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(148,163,184,0.45)" }}>
                Passive scan · {SCAN_DURATION / 1000}s · tap device for chart
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: ch(0.12), border: `1px solid ${ch(0.25)}` }}>
              <Bluetooth size={18} style={{ color: accent }} />
            </div>
          </div>

          {devices.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(Object.entries(counts) as [DeviceType, number][]).map(([type, count]) => {
                const cfg = TYPE_CONFIG[type];
                const { Icon } = cfg;
                return (
                  <span key={type} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase"
                        style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
                    <Icon size={9} /> {count} {cfg.label}
                  </span>
                );
              })}
            </div>
          )}

          {scanning ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-xl border"
                   style={{ background: ch(0.06), borderColor: ch(0.25) }}>
                <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: accent }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
                  Scanning — {devices.length} device{devices.length !== 1 ? "s" : ""} found
                </span>
              </div>
              <button onClick={stopScan}
                className="w-full py-3 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                style={{ borderColor: "rgba(239,68,68,0.40)", color: "#EF4444", background: "rgba(239,68,68,0.06)" }}>
                <StopCircle size={14} /> Stop Scan
              </button>
            </div>
          ) : (
            <button onClick={startScan}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              style={{ background: accent, color: "#fff", boxShadow: `0 4px 16px ${ch(0.30)}` }}>
              <RefreshCw size={14} /> Start Scan
            </button>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-xl border"
                 style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.30)" }}>
              <p className="text-[10px] font-bold" style={{ color: "#EF4444" }}>{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Signal chart for selected device */}
      <AnimatePresence>
        {selectedDevice && selectedDevice.rssiHistory.length >= 2 && (
          <SignalChart key={selectedDevice.deviceId} device={selectedDevice} />
        )}
      </AnimatePresence>

      {/* Nearby device list */}
      <AnimatePresence>
        {devices.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: ch(0.15) }}>
            <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${ch(0.25)})` }} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#E2E8F0" }}>Nearby BLE Devices</p>
                <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase"
                      style={{ background: ch(0.12), color: accent }}>
                  {devices.length} found
                </span>
              </div>
              <div className="space-y-2">
                {devices.map(dev => (
                  <DeviceRow key={dev.deviceId} device={dev} selected={selectedId === dev.deviceId}
                    onSelect={() => setSelectedId(prev => prev === dev.deviceId ? null : dev.deviceId)} />
                ))}
              </div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-center mt-3"
                 style={{ color: "rgba(148,163,184,0.35)" }}>
                Tap any device to view signal history chart
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!scanning && devices.length === 0 && !error && (
        <div className="rounded-2xl border flex flex-col items-center justify-center py-12 text-center"
             style={{ background: CARD_BG, borderColor: ch(0.12) }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
               style={{ background: ch(0.08), border: `1px solid ${ch(0.20)}` }}>
            <Bluetooth size={24} style={{ color: accent, opacity: 0.6 }} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
            Tap Start Scan to detect nearby BLE devices
          </p>
        </div>
      )}
    </div>
  );
}
