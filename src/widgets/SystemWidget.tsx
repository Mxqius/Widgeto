import { Pad, Stat, TickMeter } from "./parts";
import { useSystem, useTrail } from "@/lib/queries";
import { useWidgetConfig } from "./prefs";
import type { WidgetBodyProps } from "./loader";

const gb = (bytes: number) => bytes / 1_000_000_000;

export default function SystemWidget({ size }: WidgetBodyProps) {
  const cfg = useWidgetConfig("system");
  const { data } = useSystem(cfg.refreshSec);
  const cpu = data?.cpu ?? 0;
  useTrail(cpu);

  const small = size === "sm";
  const hours = Math.floor((data?.uptimeSec ?? 0) / 3600);

  return (
    <Pad size={size} className="justify-between">
      <div>
        <Stat value={Math.round(cpu)} unit="%" size={small ? 30 : size === "md" ? 40 : 50} />
        <div className="dim mt-0.5 text-[10.5px] font-semibold">
          CPU{data?.cpuCores.length ? ` · ${data.cpuCores.length} CORES` : ""}
        </div>
      </div>

      <TickMeter
        value={cpu}
        accent="var(--accent)"
        height={small ? 22 : size === "md" ? 34 : 46}
        ticks={small ? 14 : 24}
      />

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10.5px] font-semibold">MEM</span>
          <span className="numeral text-[13px]">
            {data ? `${gb(data.memUsed).toFixed(1)}/${gb(data.memTotal).toFixed(0)}G` : "—"}
          </span>
        </div>
        {!small && (
          <div className="flex items-baseline justify-between">
            <span className="dim text-[10.5px] font-semibold">DISK</span>
            <span className="numeral text-[13px]">
              {data ? `${Math.round(data.diskPct)}%` : "—"}
            </span>
          </div>
        )}
        {size === "lg" && (
          <div className="flex items-baseline justify-between">
            <span className="dim text-[10.5px] font-semibold">UPTIME</span>
            <span className="numeral text-[13px]">{hours}h</span>
          </div>
        )}
      </div>
    </Pad>
  );
}
