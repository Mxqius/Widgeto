import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Shell, Spark } from "./parts";
import type { SizeKey } from "@/lib/types";

interface Row {
  sym: string;
  name: string;
  price: number;
  chg: number;
  data: number[];
}

const seedSeries = (base: number, n = 24) => {
  let v = base;
  return Array.from({ length: n }, () => {
    v += (Math.random() - 0.48) * base * 0.012;
    return v;
  });
};

const INITIAL: Row[] = [
  { sym: "BTC", name: "Bitcoin", price: 94_210, chg: 2.4, data: seedSeries(94_210) },
  { sym: "ETH", name: "Ethereum", price: 3_182, chg: -1.1, data: seedSeries(3_182) },
  { sym: "NVDA", name: "Nvidia", price: 184.2, chg: 0.8, data: seedSeries(184) },
  { sym: "AAPL", name: "Apple", price: 241.6, chg: -0.3, data: seedSeries(241) },
];

export default function MarketsWidget({ size }: { size: SizeKey }) {
  const [rows, setRows] = useState(INITIAL);
  const limit = size === "sm" ? 2 : size === "md" ? 3 : 4;

  useEffect(() => {
    const t = setInterval(() => {
      setRows((rs) =>
        rs.map((r) => {
          const drift = (Math.random() - 0.5) * r.price * 0.004;
          const price = r.price + drift;
          return {
            ...r,
            price,
            chg: +(r.chg + drift / r.price * 100).toFixed(2),
            data: [...r.data.slice(1), price],
          };
        }),
      );
    }, 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <Shell title="Markets" icon={<TrendingUp size={12} />} right={<span>live</span>}>
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-1">
        {rows.slice(0, limit).map((r) => {
          const up = r.chg >= 0;
          const color = up ? "#31d0aa" : "#ff6b6b";
          return (
            <div key={r.sym} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/4">
              <div className="w-11 shrink-0">
                <div className="text-[12px] font-semibold text-ink-100">{r.sym}</div>
                {size !== "sm" && <div className="truncate text-[9.5px] text-ink-600">{r.name}</div>}
              </div>
              <div className="h-6 min-w-0 flex-1 opacity-90">
                <Spark data={r.data} color={color} height={24} fill={false} />
              </div>
              <div className="w-[74px] shrink-0 text-right">
                <motion.div
                  key={Math.round(r.price)}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-[11.5px] text-ink-100 tabular-nums"
                >
                  {r.price >= 1000
                    ? r.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : r.price.toFixed(2)}
                </motion.div>
                <div
                  className="flex items-center justify-end gap-0.5 font-mono text-[9.5px] tabular-nums"
                  style={{ color }}
                >
                  {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {up ? "+" : ""}
                  {r.chg.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
