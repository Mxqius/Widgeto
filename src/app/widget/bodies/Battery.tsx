import { Plug, Zap } from "lucide-react";
import { Pad, Stat, TickMeter } from "../ui";
import { useBattery } from "../data/useLocalStats";
import { useWidgetConfig } from "../prefs";
import { bySize, isLg, isSm } from "../lib/scale";
import type { WidgetBodyProps } from "./props";

export default function BatteryWidget({ size }: WidgetBodyProps) {
  const cfg = useWidgetConfig("battery");
  const { data } = useBattery(cfg.refreshSec);
  const pct = data?.percent ?? 0;
  const small = isSm(size);

  // machines without a battery still deserve a sensible tile
  if (data && !data.present) {
    return (
      <Pad size={size} className="justify-between">
        <div>
          <Stat value="AC" size={small ? 30 : 40} />
          <div className="dim mt-0.5 text-[10.5px] font-semibold">MAINS POWER</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Plug size={14} style={{ color: "var(--accent)" }} />
          <span className="dim text-[11px] font-semibold">No battery detected</span>
        </div>
      </Pad>
    );
  }

  const mins = data?.secsLeft ? Math.round(data.secsLeft / 60) : null;
  const suffix = data?.charging ? "TO FULL" : "LEFT";
  const left =
    mins === null
      ? data?.full
        ? "FULL"
        : "ESTIMATING"
      : mins >= 60
        ? `${Math.floor(mins / 60)}H ${mins % 60}M ${suffix}`
        : `${mins} MIN ${suffix}`;

  return (
    <Pad size={size} className="justify-between">
      <div className="flex items-start justify-between">
        <div>
          <Stat value={Math.round(pct)} unit="%" size={bySize(size, 30, 40, 50)} />
          <div className="dim mt-0.5 text-[10.5px] font-semibold">{left}</div>
        </div>
        {data?.charging && (
          <span
            className="grid size-6 shrink-0 place-items-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)" }}
          >
            <Zap size={12} className="fill-current" style={{ color: "var(--accent)" }} />
          </span>
        )}
      </div>

      <TickMeter
        value={pct}
        accent="var(--accent)"
        height={bySize(size, 26, 42, 58)}
        ticks={small ? 14 : 24}
        labels={small ? undefined : ["0", "50", "100"]}
      />

      {isLg(size) && data?.health != null && (
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10.5px] font-semibold">HEALTH</span>
          <span className="numeral text-[13px]">{Math.round(data.health)}%</span>
        </div>
      )}
    </Pad>
  );
}
