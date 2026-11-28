import { useApp } from "@/app/manager/store";
import { POLLING, configOf } from "@/shared/widgets/config";
import { Range } from "@/app/manager/ui";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "./Field";
import { useT } from "@/app/manager/i18n";

/** How often this widget asks for fresh data. Only polling kinds show it. */
export function RefreshRateSection({ kind }: { kind: WidgetKind }) {
  const t = useT();
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const bounds = POLLING[kind];
  if (!bounds) return null;

  const current = (configOf(kind, stored) as { refreshSec?: number }).refreshSec ?? bounds.min;
  const label = (v: number) => (v >= 60 ? t("{n}m", { n: Math.round(v / 60) }) : t("{n}s", { n: v }));

  return (
    <Field label={t("Refresh every")} hint={t("Slower means less background work.")}>
      <div className="w-40">
        <Range
          min={bounds.min}
          max={bounds.max}
          step={bounds.max > 300 ? 30 : 1}
          value={Math.min(bounds.max, Math.max(bounds.min, current))}
          onChange={(v) => setConfig(kind, { refreshSec: v })}
          format={label}
        />
      </div>
    </Field>
  );
}
