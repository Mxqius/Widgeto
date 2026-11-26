import { useApp } from "@/app/manager/store";
import { configOf } from "@/shared/widgets/config";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "../Field";
import { Toggle } from "@/app/manager/ui";

export function ClockPanel({ kind }: { kind: WidgetKind }) {
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("clock", stored);

  return (
    <>
      <Field label="Label" hint="Small caption under the dial.">
        <input
          className="field h-7 w-28 text-[12px]"
          value={c.label}
          maxLength={6}
          onChange={(e) => setConfig(kind, { label: e.target.value })}
        />
      </Field>
      <Field label="Second hand">
        <Toggle checked={c.showSeconds} onChange={(v) => setConfig(kind, { showSeconds: v })} />
      </Field>
    </>
  );
}
