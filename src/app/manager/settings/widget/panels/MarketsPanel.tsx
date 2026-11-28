import { useApp } from "@/app/manager/store";
import { configOf } from "@/shared/widgets/config";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "../Field";
import { useT } from "@/app/manager/i18n";

const MARKET_SYMBOLS = ["BTC", "ETH", "SOL", "ADA", "DOGE", "XRP", "DOT", "LINK", "AVAX", "MATIC"];

export function MarketsPanel({ kind }: { kind: WidgetKind }) {
  const t = useT();
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("markets", stored);

  const toggle = (sym: string) => {
    const has = c.symbols.includes(sym);
    const next = has ? c.symbols.filter((s) => s !== sym) : [...c.symbols, sym];
    if (next.length) setConfig(kind, { symbols: next.slice(0, 6) });
  };

  return (
    <Field label={t("Watchlist")} hint={t("Up to six. The first one leads the tile.")} stack>
      <div className="flex flex-wrap gap-1">
        {MARKET_SYMBOLS.map((sym) => {
          const on = c.symbols.includes(sym);
          return (
            <button
              key={sym}
              onClick={() => toggle(sym)}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
              style={
                on
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.06)", color: "var(--color-ink-400)" }
              }
            >
              {sym}
            </button>
          );
        })}
      </div>
    </Field>
  );
}
