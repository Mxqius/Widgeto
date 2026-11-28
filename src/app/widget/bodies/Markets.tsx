import { TrendingDown, TrendingUp } from "lucide-react";
import { ListRow, Pad, Stat } from "../ui";
import { useWidgetConfig } from "../prefs";
import { useMarkets } from "../data/useRemote";
import { money } from "../lib/format";
import { bySize, isSm } from "../lib/scale";
import type { WidgetBodyProps } from "./props";
import { digits, useT } from "../i18n";

const DOWN = "#ff6b6b";

export default function MarketsWidget({ size }: WidgetBodyProps) {
  const t = useT();
  const cfg = useWidgetConfig("markets");
  const { assets: rows, live } = useMarkets(cfg.symbols, cfg.refreshSec);

  const lead = rows[0];
  if (!lead) return null;
  const up = lead.change24h >= 0;
  const rest = isSm(size) ? 1 : 2;

  return (
    <Pad size={size} className="justify-between">
      <div>
        <div className="dim text-[11px] font-semibold">
          {lead.symbol}
          {!live && <span className="dimmer"> · {t("sample")}</span>}
        </div>
        <Stat value={money(lead.price)} size={bySize(size, 25, 31, 39)} />
        <div
          className="mt-1 flex items-center gap-1 text-[12px] font-semibold tabular-nums"
          style={{ color: up ? "var(--accent)" : DOWN }}
        >
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span dir="ltr">
            {up ? "+" : ""}
            {digits(`${lead.change24h.toFixed(2)}%`)}
          </span>
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="rule h-px w-full" />
        {rows.slice(1, 1 + rest).map((r) => (
          <ListRow
            key={r.symbol}
            title={r.symbol}
            meta={isSm(size) ? undefined : r.name}
            right={
              <div className="text-end">
                <div className="numeral text-[12px]">{money(r.price)}</div>
                <div
                  className="text-[10px] font-semibold tabular-nums"
                  style={{ color: r.change24h >= 0 ? "var(--accent)" : DOWN }}
                >
                  <span dir="ltr">
                    {r.change24h >= 0 ? "+" : ""}
                    {digits(`${r.change24h.toFixed(2)}%`)}
                  </span>
                </div>
              </div>
            }
          />
        ))}
      </div>
    </Pad>
  );
}
