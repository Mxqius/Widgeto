import { useApp } from "@/app/manager/store";
import { configOf } from "@/shared/widgets/config";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "../Field";

export function WeatherPanel({ kind }: { kind: WidgetKind }) {
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("weather", stored);

  return (
    <Field label="City" hint="Any place name — resolved by the server.">
      <input
        className="field h-7 w-40 text-[12px]"
        value={c.place}
        onChange={(e) => setConfig(kind, { place: e.target.value })}
      />
    </Field>
  );
}
