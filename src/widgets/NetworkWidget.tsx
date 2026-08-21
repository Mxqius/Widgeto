import { Activity, ArrowDown, ArrowUp, Wifi } from "lucide-react";
import { Shell, Spark } from "./parts";
import { useSeries } from "@/lib/hooks";
import type { SizeKey } from "@/lib/types";

export default function NetworkWidget({ size }: { size: SizeKey }) {
  const down = useSeries(30, 42, 40, 800);
  const up = useSeries(30, 12, 16, 800);

  const d = down[down.length - 1];
  const u = up[up.length - 1];
  const mb = (v: number) => (v / 8).toFixed(1);

  return (
    <Shell
      title="Network"
      icon={<Activity size={12} />}
      right={
        <span className="flex items-center gap-1">
          <Wifi size={10} /> 5 GHz
        </span>
      }
    >
      <div className="flex items-center gap-4">
        <Stat icon={<ArrowDown size={11} />} value={mb(d)} color="#4aa8ff" label="down" />
        <Stat icon={<ArrowUp size={11} />} value={mb(u)} color="#31d0aa" label="up" />
        {size !== "sm" && (
          <div className="ml-auto pr-12 text-right">
            <div className="font-mono text-[11px] text-ink-200 tabular-nums">18 ms</div>
            <div className="text-[9.5px] text-ink-600">latency</div>
          </div>
        )}
      </div>

      <div className="relative mt-auto -mx-1">
        <Spark data={down} color="#4aa8ff" height={size === "lg" ? 62 : 42} />
        <div className="absolute inset-x-0 bottom-0">
          <Spark data={up} color="#31d0aa" height={size === "lg" ? 40 : 26} fill={false} />
        </div>
      </div>
    </Shell>
  );
}

function Stat({
  icon,
  value,
  color,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  color: string;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span style={{ color }} className="self-center">
          {icon}
        </span>
        <span className="font-mono text-[17px] leading-none font-semibold text-white tabular-nums">
          {value}
        </span>
        <span className="text-[9.5px] text-ink-500">MB/s</span>
      </div>
      <div className="mt-1 text-[9.5px] text-ink-600">{label}</div>
    </div>
  );
}
