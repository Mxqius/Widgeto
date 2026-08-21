import { ArrowDown, ArrowUp } from "lucide-react";
import { Pad, Stat, TickMeter } from "./parts";
import { useNet, useTrail } from "@/lib/queries";
import type { WidgetBodyProps } from "./loader";

/** Bytes per second in the largest sensible unit. */
function rate(bps: number): [string, string] {
  if (bps >= 1_000_000) return [(bps / 1_048_576).toFixed(1), "MB/S"];
  if (bps >= 1_000) return [(bps / 1024).toFixed(0), "KB/S"];
  return [Math.round(bps).toString(), "B/S"];
}

export default function NetworkWidget({ size }: WidgetBodyProps) {
  const { data } = useNet();
  const down = data?.downBps ?? 0;
  const up = data?.upBps ?? 0;
  const trail = useTrail(down);

  // scale the meter against the busiest moment we have seen, so an idle link
  // is not permanently pinned at zero
  const peak = Math.max(...trail, 64 * 1024);
  const [dv, du] = rate(down);
  const [uv, uu] = rate(up);
  const small = size === "sm";

  return (
    <Pad size={size} className="justify-between">
      <div>
        <Stat value={dv} unit={du} size={small ? 26 : size === "md" ? 34 : 42} />
        <div className="dim mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold">
          <ArrowDown size={10} /> DOWN
        </div>
      </div>

      <TickMeter
        value={(down / peak) * 100}
        accent="var(--accent)"
        height={small ? 22 : size === "md" ? 34 : 46}
        ticks={small ? 14 : 24}
      />

      <div className="flex items-baseline justify-between">
        <span className="dim flex items-center gap-1 text-[10.5px] font-semibold">
          <ArrowUp size={10} /> UP
        </span>
        <span className="numeral text-[13px]">
          {uv}
          <span className="dim ml-0.5 text-[9.5px]">{uu}</span>
        </span>
      </div>

      {size === "lg" && data && (
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10.5px] font-semibold">SESSION</span>
          <span className="numeral text-[13px]">
            {(data.totalRx / 1_000_000_000).toFixed(1)} GB
          </span>
        </div>
      )}
    </Pad>
  );
}
