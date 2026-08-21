import { motion } from "motion/react";
import { useNow } from "@/lib/hooks";
import { useApp } from "@/store/useApp";
import { pad } from "@/lib/utils";
import type { SizeKey } from "@/lib/types";

export default function ClockWidget({ size }: { size: SizeKey }) {
  const now = useNow(1000);
  const h24 = useApp((s) => s.settings.clock24h);

  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours();
  const secDeg = s * 6;
  const minDeg = m * 6 + s * 0.1;
  const hourDeg = (h % 12) * 30 + m * 0.5;

  const hh = h24 ? pad(h) : pad(((h + 11) % 12) + 1);
  const compact = size === "sm";

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* dial */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full p-4 opacity-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
        {Array.from({ length: 60 }).map((_, i) => {
          const major = i % 5 === 0;
          const a = (i * 6 * Math.PI) / 180;
          const r1 = major ? 38 : 41.5;
          const r2 = 44;
          return (
            <line
              key={i}
              x1={50 + Math.sin(a) * r1}
              y1={50 - Math.cos(a) * r1}
              x2={50 + Math.sin(a) * r2}
              y2={50 - Math.cos(a) * r2}
              stroke={major ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.1)"}
              strokeWidth={major ? 1.4 : 0.7}
              strokeLinecap="round"
            />
          );
        })}

        <g style={{ transform: `rotate(${hourDeg}deg)`, transformOrigin: "50px 50px" }}>
          <rect x="48.6" y="27" width="2.8" height="25" rx="1.4" fill="rgba(255,255,255,0.92)" />
        </g>
        <g style={{ transform: `rotate(${minDeg}deg)`, transformOrigin: "50px 50px" }}>
          <rect x="49.1" y="17" width="1.8" height="35" rx="0.9" fill="rgba(255,255,255,0.75)" />
        </g>
        <motion.g
          animate={{ rotate: secDeg }}
          transition={{ type: "spring", stiffness: 340, damping: 18 }}
          style={{ transformOrigin: "50px 50px" }}
        >
          <rect x="49.6" y="14" width="0.9" height="40" rx="0.45" fill="var(--accent)" />
          <circle cx="50" cy="50" r="2.4" fill="var(--accent)" />
        </motion.g>
        <circle cx="50" cy="50" r="1" fill="#0d0e10" />
      </svg>

      {/* digital readout */}
      <div className="pointer-events-none relative z-10 flex flex-col items-center">
        <div
          className="rounded-lg border border-white/[0.07] bg-ink-950/55 px-2 py-1 backdrop-blur-sm"
          style={{ marginTop: compact ? 44 : 58 }}
        >
          <div className="font-mono text-[13px] leading-none font-medium tracking-tight text-white tabular-nums">
            {hh}:{pad(m)}
            <span className="text-ink-500">:{pad(s)}</span>
            {!h24 && <span className="ml-1 text-[9px] text-ink-400">{h < 12 ? "AM" : "PM"}</span>}
          </div>
        </div>
        {!compact && (
          <div className="mt-1.5 text-[10.5px] font-medium text-ink-400">
            {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          </div>
        )}
      </div>
    </div>
  );
}
