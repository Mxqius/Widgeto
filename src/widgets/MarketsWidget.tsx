import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Pad, Row, Stat } from "./parts";
import { useWidgetConfig, useWidgetPrefs } from "./prefs";
import { getMarkets, setApiBase, type Asset } from "@/lib/api";
import type { WidgetBodyProps } from "./loader";

const SAMPLE: Asset[] = [
  { symbol: "BTC", name: "bitcoin", price: 94_210, change24h: 2.4 },
  { symbol: "ETH", name: "ethereum", price: 3_182, change24h: -1.1 },
  { symbol: "SOL", name: "solana", price: 188.4, change24h: 0.8 },
];

export default function MarketsWidget({ size }: WidgetBodyProps) {
  const { apiBase } = useWidgetPrefs();
  const cfg = useWidgetConfig("markets");
  const [rows, setRows] = useState<Asset[]>(SAMPLE);
  const [live, setLive] = useState(false);

  const symbolKey = cfg.symbols.join(",");
  useEffect(() => {
    let alive = true;
    setApiBase(apiBase);
    const load = async () => {
      const res = await getMarkets(symbolKey.split(","));
      if (alive && res?.assets?.length) {
        setRows(res.assets);
        setLive(true);
      }
    };
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [symbolKey, apiBase]);

  const lead = rows[0];
  if (!lead) return null;
  const up = lead.change24h >= 0;
  const rest = size === "sm" ? 1 : 2;
  const money = (n: number) =>
    n >= 1000 ? Math.round(n).toLocaleString() : n.toFixed(2);

  return (
    <Pad size={size} className="justify-between">
      <div>
        <div className="dim text-[11px] font-semibold">
          {lead.symbol}
          {!live && <span className="dimmer"> · sample</span>}
        </div>
        <Stat value={money(lead.price)} size={size === "sm" ? 25 : size === "md" ? 31 : 39} />
        <div
          className="mt-1 flex items-center gap-1 text-[12px] font-semibold tabular-nums"
          style={{ color: up ? "var(--accent)" : "#ff6b6b" }}
        >
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {up ? "+" : ""}
          {lead.change24h.toFixed(2)}%
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="rule h-px w-full" />
        {rows.slice(1, 1 + rest).map((r) => (
          <Row
            key={r.symbol}
            title={r.symbol}
            meta={size === "sm" ? undefined : r.name}
            right={
              <div className="text-right">
                <div className="numeral text-[12px]">{money(r.price)}</div>
                <div
                  className="text-[10px] font-semibold tabular-nums"
                  style={{ color: r.change24h >= 0 ? "var(--accent)" : "#ff6b6b" }}
                >
                  {r.change24h >= 0 ? "+" : ""}
                  {r.change24h.toFixed(2)}%
                </div>
              </div>
            }
          />
        ))}
      </div>
    </Pad>
  );
}
