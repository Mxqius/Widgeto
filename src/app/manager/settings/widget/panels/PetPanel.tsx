import { useApp } from "@/app/manager/store";
import { configOf } from "@/shared/widgets/config";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "../Field";
import { Range } from "@/app/manager/ui";
import { useT } from "@/app/manager/i18n";

export function PetPanel({ kind }: { kind: WidgetKind }) {
  const t = useT();
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("pet", stored);

  return (
    <>
      <Field label={t("Species")} stack>
        <div className="flex gap-1">
          {(["cat", "bun", "blob", "fox"] as const).map((sp) => (
            <button
              key={sp}
              onClick={() => setConfig(kind, { species: sp })}
              className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold capitalize transition-colors"
              style={
                c.species === sp
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.06)", color: "var(--color-ink-400)" }
              }
            >
              {t(sp)}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("Name")}>
        <input
          className="field h-7 w-32 text-[12px]"
          dir="auto"
          value={c.name}
          maxLength={14}
          onChange={(e) => setConfig(kind, { name: e.target.value })}
        />
      </Field>
      <Field label={t("Colour")}>
        <div className="w-40">
          <Range
            min={0}
            max={359}
            value={c.hue}
            onChange={(v) => setConfig(kind, { hue: v })}
            format={(v) => `${v}°`}
          />
        </div>
      </Field>
    </>
  );
}
