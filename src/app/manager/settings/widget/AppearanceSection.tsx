import { useState } from "react";
import { useApp } from "@/app/manager/store";
import { useFrameCommit } from "@/app/manager/lib/frameCommit";
import { lookOf } from "@/shared/widgets/kinds";
import { cn } from "@/app/manager/ui";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "./Field";
import { useT } from "@/app/manager/i18n";

const SWATCHES = [
  "#ff4dd8", "#ff5b2e", "#ffb020", "#3ddc84",
  "#4aa8ff", "#7c6cff", "#ff6b8b", "#e8e8e8",
];

const RAINBOW = "conic-gradient(#ff4dd8,#ff5b2e,#ffb020,#3ddc84,#4aa8ff,#7c6cff,#ff4dd8)";

/** Colour and ground, offered for every widget. */
export function AppearanceSection({ kind }: { kind: WidgetKind }) {
  const t = useT();
  // Two narrow selectors rather than the widget record: this section is open
  // while the widget is being dragged around the desktop, and subscribing to
  // the whole object re-rendered it on every frame of the drag.
  const accentOverride = useApp((s) => s.widgets.find((i) => i.kind === kind)?.accent);
  const themeOverride = useApp((s) => s.widgets.find((i) => i.kind === kind)?.theme);
  const setAppearance = useApp((s) => s.setAppearance);

  const def = lookOf(kind);
  const accent = accentOverride ?? def.accent;
  const theme = themeOverride ?? def.theme;

  /**
   * The picker's own value while it is being dragged. It is tracked locally so
   * the input stays controlled and never has an older value pushed back at it
   * mid-drag, while the store — and everything hanging off it — only sees one
   * value per frame.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const commitAccent = useFrameCommit<string>((v) => setAppearance(kind, { accent: v }));

  const pick = (accent: string | undefined) => {
    setDraft(null);
    setAppearance(kind, { accent });
  };

  return (
    <>
      <Field label={t("Colour")} hint={t("Tints meters, highlights and progress.")} stack>
        <div className="flex flex-wrap items-center gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => pick(c)}
              title={c}
              className={cn(
                "size-5.5 rounded-full transition-transform hover:scale-110",
                accent.toLowerCase() === c.toLowerCase() &&
                  "ring-2 ring-white/70 ring-offset-2 ring-offset-ink-900",
              )}
              style={{ background: c }}
            />
          ))}
          <label
            className="relative size-5.5 cursor-pointer overflow-hidden rounded-full border border-white/15"
            title={t("Custom colour")}
            style={{ background: RAINBOW }}
          >
            <input
              type="color"
              value={draft ?? accent}
              onChange={(e) => {
                setDraft(e.target.value);
                commitAccent(e.target.value);
              }}
              onBlur={() => setDraft(null)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          {accentOverride && (
            <button className="btn h-6 px-2 text-[11px]" onClick={() => pick(undefined)}>
              {t("Reset")}
            </button>
          )}
        </div>
      </Field>

      <Field label={t("Ground")} hint={t("Flat black or flat white tile.")}>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/3 p-0.5">
          {(["dark", "light"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setAppearance(kind, { theme: g })}
              className={cn(
                "h-6 rounded-md px-2.5 text-[11px] font-semibold capitalize transition-colors",
                theme === g ? "bg-white/12 text-white" : "text-ink-500 hover:text-ink-300",
              )}
            >
              {t(g)}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}
