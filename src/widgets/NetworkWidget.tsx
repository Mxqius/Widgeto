import { ArrowDown, ArrowUp } from "lucide-react";
import { Pad, Stat, TickMeter } from "./parts";
import { useSeries } from "@/lib/hooks";
import type { WidgetBodyProps } from "./loader";

export default function NetworkWidget({ size }: WidgetBodyProps) {
  const down = useSeries(24, 42, 40, 1100);
  const up = useSeries(24, 12, 16, 1100);
  const d = down[down.length - 1] / 8;
  const u = up[up.length - 1] / 8;

  return (
    <Pad size={size} className="justify-between">
      <div>
        <Stat
          value={d.toFixed(1)}
          unit="MB/S"
          size={size === "sm" ? 30 : size === "md" ? 38 : 46}
        />
        <div className="dim mt-1 flex items-center gap-1 text-[11px] font-semibold">
          <ArrowDown size={11} /> DOWN
        </div>
      </div>

      <TickMeter
        value={Math.min(100, d * 8)}
        accent="var(--accent)"
        height={size === "sm" ? 30 : 42}
        ticks={size === "sm" ? 16 : 24}
      />

      <div className="flex items-baseline justify-between">
        <span className="dim flex items-center gap-1 text-[11px] font-semibold">
          <ArrowUp size={11} /> UP
        </span>
        <span className="numeral text-[15px]">{u.toFixed(1)}</span>
      </div>
    </Pad>
  );
}
