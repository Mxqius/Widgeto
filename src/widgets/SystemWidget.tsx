import { Pad, Stat, TickMeter } from "./parts";
import { useSeries } from "@/lib/hooks";
import type { WidgetBodyProps } from "./loader";

export default function SystemWidget({ size }: WidgetBodyProps) {
  const cpu = useSeries(26, 34, 26, 1200);
  const ram = useSeries(26, 61, 8, 3000);
  const now = Math.round(cpu[cpu.length - 1]);

  return (
    <Pad size={size} className="justify-between">
      <div>
        <Stat value={now} unit="%" size={size === "sm" ? 34 : size === "md" ? 42 : 52} />
        <div className="dim mt-1 text-[11px] font-semibold">CPU LOAD</div>
      </div>

      <div className="space-y-2.5">
        <TickMeter
          value={now}
          accent="var(--accent)"
          height={size === "sm" ? 26 : 36}
          ticks={size === "sm" ? 16 : 24}
        />
        <div className="flex items-baseline justify-between">
          <span className="dim text-[11px] font-semibold">MEMORY</span>
          <span className="numeral text-[15px]">{Math.round(ram[ram.length - 1])}%</span>
        </div>
      </div>
    </Pad>
  );
}
