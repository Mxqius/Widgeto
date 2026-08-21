import { Cpu } from "lucide-react";
import { Bar, Ring, Shell, Spark } from "./parts";
import { useSeries } from "@/lib/hooks";
import type { SizeKey } from "@/lib/types";

export default function SystemWidget({ size }: { size: SizeKey }) {
  const cpu = useSeries(28, 34, 26, 900);
  const ram = useSeries(28, 61, 8, 2200);
  const now = cpu[cpu.length - 1];

  return (
    <Shell title="System" icon={<Cpu size={12} />} right={<span>live</span>}>
      <div className="flex items-center gap-3.5">
        <Ring value={now} size={size === "sm" ? 48 : 58} label={`${Math.round(now)}%`} sub="CPU" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Bar label="Memory" value={ram[ram.length - 1]} color="#4aa8ff" />
          <Bar label="Disk" value={47} color="#f2b544" />
          {size === "lg" && <Bar label="GPU" value={22} color="#e05fd0" />}
        </div>
      </div>

      {size !== "sm" && (
        <div className="mt-auto -mx-1 pt-2">
          <Spark data={cpu} height={size === "lg" ? 46 : 32} />
        </div>
      )}
    </Shell>
  );
}
