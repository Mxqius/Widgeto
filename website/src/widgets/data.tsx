import { ArrowDown, ArrowUp, CloudSun, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useDrift, useHistory } from "../lib/hooks";
import { Muted, Pad, Say, Stat, TickMeter } from "./ui";

/* ---------------------------------------------------------------- weather -- */

export function WeatherWidget() {
  return (
    <Pad className="justify-center gap-1">
      <Say>
        <span className="text-[25px]">21°C</span> <span className="text-[17px]"><Muted>now</Muted></span>
      </Say>
      <Say>
        <span className="text-[17px]"><Muted>in</Muted></span> <span className="text-[25px]">Amsterdam</span>
      </Say>
      <Say>
        <span className="text-[17px]"><Muted>feels</Muted></span> <span className="text-[25px]">20°</span>
      </Say>
      <div className="mt-1.5 flex items-center gap-1.5">
        <CloudSun size={20} strokeWidth={2} className="shrink-0" />
        <Say className="text-[25px]">partly</Say>
      </div>
    </Pad>
  );
}

/* ----------------------------------------------------------------- system -- */

export function SystemWidget() {
  const cpu = useDrift(34, 9, 6, 92, 1100);
  const mem = useDrift(9.4, 0.25, 7.8, 12.6, 2200);
  return (
    <Pad className="justify-between">
      <div>
        <Stat value={Math.round(cpu)} unit="%" size={40} />
        <div className="dim mt-0.5 text-[10.5px] font-semibold">CPU · 16 CORES</div>
      </div>
      <TickMeter value={cpu} height={34} ticks={24} />
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10.5px] font-semibold">MEM</span>
          <span className="numeral text-[13px]">{mem.toFixed(1)}/32G</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10.5px] font-semibold">DISK</span>
          <span className="numeral text-[13px]">61%</span>
        </div>
      </div>
    </Pad>
  );
}

/* ---------------------------------------------------------------- markets -- */

function Row({ sym, name, price, change }: { sym: string; name: string; price: number; change: number }) {
  const up = change >= 0;
  return (
    <div className="flex items-baseline justify-between">
      <div>
        <div className="text-[12px] font-semibold">{sym}</div>
        <div className="dim text-[10px]">{name}</div>
      </div>
      <div className="text-right">
        <div className="numeral text-[12px]">{price.toLocaleString("en", { maximumFractionDigits: 2, minimumFractionDigits: price < 1000 ? 2 : 0 })}</div>
        <div className="text-[10px] font-semibold tabular-nums" style={{ color: up ? "#3ddc84" : "#f87171" }}>
          {up ? "+" : ""}
          {change.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export function MarketsWidget() {
  const btc = useDrift(94210, 140, 92800, 95800, 1600);
  const eth = useDrift(3182, 9, 3120, 3240, 1900);
  const sol = useDrift(188.4, 0.7, 184, 193, 2100);
  const pct = ((btc - 92000) / 92000) * 100;
  const up = pct >= 0;
  return (
    <Pad className="gap-3">
      <div>
        <div className="dim text-[10px] font-semibold">BTC</div>
        <div className="numeral text-[28px] leading-tight">{Math.round(btc).toLocaleString("en")}</div>
        <div className="flex items-center gap-1 text-[11px] font-semibold tabular-nums" style={{ color: up ? "#3ddc84" : "#f87171" }}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {up ? "+" : ""}
          {pct.toFixed(2)}%
        </div>
      </div>
      <div className="mt-auto space-y-2 border-t border-white/10 pt-2.5">
        <Row sym="ETH" name="ethereum" price={eth} change={((eth - 3217) / 3217) * 100} />
        <Row sym="SOL" name="solana" price={sol} change={((sol - 186.9) / 186.9) * 100} />
      </div>
    </Pad>
  );
}

/* ---------------------------------------------------------------- network -- */

export function NetworkWidget() {
  const down = useHistory(22, () => 0.6 + Math.random() * 4.2, 800);
  const up = useDrift(320, 120, 40, 900, 900);
  const now = down[down.length - 1];
  const peak = Math.max(...down);
  return (
    <Pad className="justify-between">
      <div>
        <Stat value={now.toFixed(1)} unit="MB/s" size={36} />
        <div className="dim mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold">
          <ArrowDown size={11} /> DOWN
        </div>
      </div>
      <div className="flex h-[38px] items-end gap-[2px]">
        {down.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-[1px] transition-[height] duration-500"
            style={{
              height: `${Math.max(10, (v / peak) * 100)}%`,
              background: i === down.length - 1 ? "var(--accent)" : "currentColor",
              opacity: i === down.length - 1 ? 1 : 0.2 + (i / down.length) * 0.4,
            }}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="dim flex items-center gap-1 text-[10.5px] font-semibold">
          <ArrowUp size={11} /> UP
        </span>
        <span className="numeral text-[13px]">
          {Math.round(up)}
          <span className="dim ml-0.5 text-[10px]">KB/s</span>
        </span>
      </div>
    </Pad>
  );
}

/* ---------------------------------------------------------------- battery -- */

export function BatteryWidget() {
  const pct = useDrift(82, 0.4, 78, 88, 3000);
  return (
    <Pad className="justify-between">
      <div>
        <Stat value={Math.round(pct)} unit="%" size={40} />
        <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-[#4ade80]">
          <Zap size={11} className="fill-current" /> CHARGING · 38 MIN
        </div>
      </div>
      <TickMeter value={pct} height={40} ticks={24} labels={["0", "50", "100"]} />
    </Pad>
  );
}
