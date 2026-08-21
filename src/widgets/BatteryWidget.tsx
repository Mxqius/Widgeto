import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BatteryCharging, Zap } from "lucide-react";
import { Shell } from "./parts";
import type { SizeKey } from "@/lib/types";

export default function BatteryWidget({ size }: { size: SizeKey }) {
  const [pct, setPct] = useState(78);
  const [charging, setCharging] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setPct((v) => {
        const next = charging ? v + 1 : v - 1;
        if (next >= 100) setCharging(false);
        if (next <= 22) setCharging(true);
        return Math.max(20, Math.min(100, next));
      });
    }, 4000);
    return () => clearInterval(t);
  }, [charging]);

  const color = pct > 45 ? "#31d0aa" : pct > 20 ? "#f2b544" : "#ff6b6b";
  const hours = Math.floor((pct / 100) * 6.4);
  const mins = Math.round((((pct / 100) * 6.4) % 1) * 60);

  return (
    <Shell
      title="Power"
      icon={<BatteryCharging size={12} />}
      right={<span>{charging ? "charging" : "on battery"}</span>}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-[26px] w-[52px] shrink-0 items-center rounded-[7px] border-2 border-white/20 p-[3px]">
          <motion.div
            className="h-full rounded-[3px]"
            style={{ background: color }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
          <span className="absolute -right-[5px] h-[9px] w-[3px] rounded-r-sm bg-white/20" />
          {charging && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="absolute inset-0 grid place-items-center"
            >
              <Zap size={12} className="fill-white text-white drop-shadow" />
            </motion.span>
          )}
        </div>
        <div>
          <div className="flex items-baseline leading-none">
            <span className="text-[24px] font-semibold text-white tabular-nums">{pct}</span>
            <span className="ml-0.5 text-[13px] text-ink-400">%</span>
          </div>
          <div className="mt-1 text-[10.5px] text-ink-500">
            {hours}h {mins}m {charging ? "to full" : "remaining"}
          </div>
        </div>
      </div>

      {size !== "sm" && (
        <div className="mt-auto grid grid-cols-3 gap-1.5 pt-3">
          {[
            ["Health", "94%"],
            ["Cycles", "312"],
            ["Temp", "34°C"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1.5">
              <div className="text-[9px] text-ink-600">{k}</div>
              <div className="mt-0.5 font-mono text-[11px] text-ink-200 tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
