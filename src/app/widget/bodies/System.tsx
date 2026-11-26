import { Pad, Stat, TickMeter } from "../ui";
import { useSystem } from "../data/useLocalStats";
import { useWidgetConfig } from "../prefs";
import { gigabytes } from "../lib/format";
import { bySize, isLg, isSm } from "../lib/scale";
import type { WidgetBodyProps } from "./props";

const DASH = "—";

export default function SystemWidget({ size }: WidgetBodyProps) {
  const cfg = useWidgetConfig("system");
  const { data } = useSystem(cfg.refreshSec);
  const cpu = data?.cpu ?? 0;

  const small = isSm(size);
  const hours = Math.floor((data?.uptimeSec ?? 0) / 3600);

  return (
    <Pad size={size} className="justify-between">
      <div>
        <Stat value={Math.round(cpu)} unit="%" size={bySize(size, 30, 40, 50)} />
        <div className="dim mt-0.5 text-[10.5px] font-semibold">
          CPU{data?.cpuCores.length ? ` · ${data.cpuCores.length} CORES` : ""}
        </div>
      </div>

      <TickMeter
        value={cpu}
        accent="var(--accent)"
        height={bySize(size, 22, 34, 46)}
        ticks={small ? 14 : 24}
      />

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10.5px] font-semibold">MEM</span>
          <span className="numeral text-[13px]">
            {data
              ? `${gigabytes(data.memUsed).toFixed(1)}/${gigabytes(data.memTotal).toFixed(0)}G`
              : DASH}
          </span>
        </div>
        {!small && (
          <div className="flex items-baseline justify-between">
            <span className="dim text-[10.5px] font-semibold">DISK</span>
            <span className="numeral text-[13px]">{data ? `${Math.round(data.diskPct)}%` : DASH}</span>
          </div>
        )}
        {isLg(size) && (
          <div className="flex items-baseline justify-between">
            <span className="dim text-[10.5px] font-semibold">UPTIME</span>
            <span className="numeral text-[13px]">{hours}h</span>
          </div>
        )}
      </div>
    </Pad>
  );
}
