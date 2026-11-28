import { useApp } from "@/app/manager/store";
import { configOf } from "@/shared/widgets/config";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "../Field";
import { Range } from "@/app/manager/ui";
import { useT } from "@/app/manager/i18n";

export function NotesPanel({ kind }: { kind: WidgetKind }) {
  const t = useT();
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("notes", stored);

  return (
    <Field label={t("Text size")}>
      <div className="w-40">
        <Range
          min={10}
          max={18}
          value={c.fontSize}
          onChange={(v) => setConfig(kind, { fontSize: v })}
          format={(v) => `${v}px`}
        />
      </div>
    </Field>
  );
}
