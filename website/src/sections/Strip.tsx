import { Sparkles } from "lucide-react";

const ITEMS = [
  "Each widget is its own window",
  "Dynamic Island",
  "Auto-dock & alignment guides",
  "Four auto-arrange modes",
  "Multi-monitor aware",
  "Lives in the tray",
  "Global capture hotkey",
  "English & فارسی",
  "Profiles",
  "Ask AI",
  "Low-memory mode",
  "Signed auto-updates",
  "No telemetry",
];

/** A slow, endless ribbon of what's inside. */
export function Strip() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-white/[0.015] py-5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max gap-10" style={{ animation: "marquee 48s linear infinite" }}>
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-10 text-[15px] font-medium whitespace-nowrap text-ink-300">
            {t}
            <Sparkles size={14} className="text-[#a08bff]" />
          </span>
        ))}
      </div>
    </div>
  );
}
