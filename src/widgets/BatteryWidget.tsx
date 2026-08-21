import { Plug, Zap } from "lucide-react";
import { Pad, Stat, TickMeter } from "./parts";
import { useBattery } from "@/lib/queries";
import { useWidgetConfig } from "./prefs";
import type { WidgetBodyProps } from "./loader";

export default function BatteryWidget({ size }: WidgetBodyProps) {
  const cfg = useWidgetConfig("battery");
  const { data } = useBattery(cfg.refreshSec);
  const pct = data?.percent ?? 0;
  const small = size === "sm";

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
  const left =
    mins === null
      ? data?.full
        ? "FULL"
        : "ESTIMATING"
      : mins >= 60
        ? `${Math.floor(mins / 60)}H ${mins % 60}M ${data?.charging ? "TO FULL" : "LEFT"}`
        : `${mins} MIN ${data?.charging ? "TO FULL" : "LEFT"}`;

  return (
    <Pad size={size} className="justify-between">
      <div className="flex items-start justify-between">
        <div>
          <Stat value={Math.round(pct)} unit="%" size={small ? 30 : size === "md" ? 40 : 50} />
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
        height={small ? 26 : size === "md" ? 42 : 58}
        ticks={small ? 14 : 24}
        labels={small ? undefined : ["0", "50", "100"]}
      />

      {size === "lg" && data?.health != null && (
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10.5px] font-semibold">HEALTH</span>
          <span className="numeral text-[13px]">{Math.round(data.health)}%</span>
        </div>
      )}
    </Pad>
  );
}
