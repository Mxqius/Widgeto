import { useApp } from "@/app/manager/store";
import { configOf } from "@/shared/widgets/config";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "../Field";
import { Range } from "@/app/manager/ui";
import { useT } from "@/app/manager/i18n";

export function PomodoroPanel({ kind }: { kind: WidgetKind }) {
  const t = useT();
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("pomodoro", stored);

  return (
    <>
      {(
        [
          ["focusMin", "Focus", 5, 90],
          ["shortMin", "Short break", 1, 30],
          ["longMin", "Long break", 5, 60],
        ] as const
      ).map(([key, label, min, max]) => (
        <Field key={key} label={t(label)}>
          <div className="w-40">
            <Range
              min={min}
              max={max}
              value={c[key]}
              onChange={(v) => setConfig(kind, { [key]: v })}
              format={(v) => t("{n}m", { n: v })}
            />
          </div>
        </Field>
      ))}
    </>
  );
}
