import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Pad, Stat, TickMeter } from "./parts";
import type { WidgetBodyProps } from "./loader";

export default function BatteryWidget({ size }: WidgetBodyProps) {
  const [pct, setPct] = useState(68);
  const [charging, setCharging] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setPct((v) => {
        const next = charging ? v + 1 : v - 1;
        if (next >= 100) setCharging(false);
        if (next <= 22) setCharging(true);
        return Math.max(20, Math.min(100, next));
      });
    }, 5000);
    return () => clearInterval(t);
  }, [charging]);

  const mins = Math.round((pct / 100) * 66);

  return (
    <Pad size={size} className="justify-between">
      <div className="flex items-start justify-between">
        <div>
          <Stat value={pct} unit="%" size={size === "sm" ? 34 : size === "md" ? 42 : 52} />
          <div className="dim mt-1 text-[11px] font-semibold">{mins} MIN LEFT</div>
        </div>
        {charging && (
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)" }}
          >
            <Zap size={13} className="fill-current" style={{ color: "var(--accent)" }} />
          </span>
        )}
      </div>

      <TickMeter
        value={pct}
        accent="var(--accent)"
        height={size === "sm" ? 44 : size === "md" ? 58 : 76}
        ticks={size === "sm" ? 18 : 26}
        labels={["0", "50", "100"]}
      />
    </Pad>
  );
}
