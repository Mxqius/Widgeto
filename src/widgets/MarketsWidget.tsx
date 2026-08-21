import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Pad, Row, Stat } from "./parts";
import type { WidgetBodyProps } from "./loader";

interface Tick {
  sym: string;
  name: string;
  price: number;
  chg: number;
}

const INITIAL: Tick[] = [
  { sym: "BTC", name: "Bitcoin", price: 94_210, chg: 2.4 },
  { sym: "ETH", name: "Ethereum", price: 3_182, chg: -1.1 },
  { sym: "NVDA", name: "Nvidia", price: 184.2, chg: 0.8 },
];

export default function MarketsWidget({ size }: WidgetBodyProps) {
  const [rows, setRows] = useState(INITIAL);

  useEffect(() => {
    const t = setInterval(() => {
      setRows((rs) =>
        rs.map((r) => {
          const drift = (Math.random() - 0.5) * r.price * 0.004;
          return {
            ...r,
            price: r.price + drift,
            chg: +(r.chg + (drift / r.price) * 100).toFixed(2),
          };
        }),
      );
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const lead = rows[0];
  const up = lead.chg >= 0;
  const rest = size === "sm" ? 1 : size === "md" ? 2 : 2;

  return (
    <Pad size={size} className="justify-between">
      <div>
        <div className="dim text-[11px] font-semibold">{lead.sym}</div>
        <Stat
          value={Math.round(lead.price).toLocaleString()}
          size={size === "sm" ? 26 : size === "md" ? 32 : 40}
        />
        <div
          className="mt-1 flex items-center gap-1 text-[12px] font-semibold tabular-nums"
          style={{ color: up ? "var(--accent)" : "#ff6b6b" }}
        >
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {up ? "+" : ""}
          {lead.chg.toFixed(2)}%
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="rule h-px w-full" />
        {rows.slice(1, 1 + rest).map((r) => (
          <Row
            key={r.sym}
            title={r.sym}
            meta={size === "sm" ? undefined : r.name}
            right={
              <div className="text-right">
                <div className="numeral text-[12px]">
                  {r.price >= 1000
                    ? Math.round(r.price).toLocaleString()
                    : r.price.toFixed(2)}
                </div>
                <div
                  className="text-[10px] font-semibold tabular-nums"
                  style={{ color: r.chg >= 0 ? "var(--accent)" : "#ff6b6b" }}
                >
                  {r.chg >= 0 ? "+" : ""}
                  {r.chg.toFixed(2)}%
                </div>
              </div>
            }
          />
        ))}
      </div>
    </Pad>
  );
}
