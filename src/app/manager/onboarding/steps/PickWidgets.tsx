import { forwardRef } from "react";
import { cn } from "@/app/manager/ui";
import { WIDGETS } from "@/app/manager/widgets/catalogue";
import type { WidgetKind } from "@/shared/types/widget";
import { MiniTile, OptionCard, StepHeader } from "../parts";
import { PRESETS, presetOf, type Draft, type SetDraft } from "../draft";
import { digits, useT } from "@/app/manager/i18n";

export const PickWidgets = forwardRef<HTMLHeadingElement, { draft: Draft; set: SetDraft }>(
  function PickWidgets({ draft, set }, ref) {
    const t = useT();
    const active = presetOf(draft.picked);

    const toggle = (kind: WidgetKind) => {
      const next = new Set(draft.picked);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      set({ picked: next });
    };

    return (
      <>
        <StepHeader ref={ref} eyebrow={t("Your desktop")} title={t("Pick your widgets")}>
          {t("Start from a set or choose your own. You can add or remove any of them later from the board.")}
        </StepHeader>

        <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label={t("Presets")}>
          {PRESETS.map((p) => {
            const on = active?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => set({ picked: new Set(p.kinds) })}
                className={cn(
                  "inline-flex h-7.5 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors",
                  on
                    ? "border-(--accent)/55 bg-(--accent-soft) text-white"
                    : "border-white/7 bg-white/3 text-ink-300 hover:border-white/12 hover:text-ink-100",
                )}
              >
                {t(p.name)}
                <span className={cn("tabular-nums", on ? "text-white/60" : "text-ink-500")}>
                  {digits(p.kinds.length)}
                </span>
              </button>
            );
          })}
          {!active && draft.picked.size > 0 && (
            <span className="ms-1 text-[11.5px] text-ink-500">{t("Custom")}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 min-[860px]:grid-cols-3">
          {WIDGETS.map((def) => (
            <OptionCard
              key={def.kind}
              selected={draft.picked.has(def.kind)}
              onClick={() => toggle(def.kind)}
              className="flex items-center gap-3 p-2.5 pe-8"
            >
              <MiniTile def={def} size={34} />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-ink-100">{def.name}</span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-ink-500">
                  {def.description}
                </span>
              </span>
            </OptionCard>
          ))}
        </div>
      </>
    );
  },
);
