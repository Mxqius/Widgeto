import { useApp } from "@/app/manager/store";
import { configOf } from "@/shared/widgets/config";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "../Field";
import { useT } from "@/app/manager/i18n";

export function WeatherPanel({ kind }: { kind: WidgetKind }) {
  const t = useT();
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("weather", stored);

  return (
    <Field label={t("City")} hint={t("Any place name — resolved by the server.")}>
      <input
        className="field h-7 w-40 text-[12px]"
        dir="auto"
        value={c.place}
        onChange={(e) => setConfig(kind, { place: e.target.value })}
      />
    </Field>
  );
}
