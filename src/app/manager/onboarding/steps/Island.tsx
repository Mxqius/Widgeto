import { forwardRef, useId } from "react";
import { Toggle, cn } from "@/app/manager/ui";
import type { IslandStyle } from "@/shared/types/settings";
import { OptionCard, StepHeader } from "../parts";
import type { Draft, SetDraft } from "../draft";
import { useT } from "@/app/manager/i18n";

const STYLES = [
  { value: "pill", name: "Pill", text: "Floats just below the top edge." },
  { value: "notch", name: "Notch", text: "Hangs from the top edge, like a camera notch." },
] as const satisfies readonly { value: IslandStyle; name: string; text: string }[];

export const Island = forwardRef<HTMLHeadingElement, { draft: Draft; set: SetDraft }>(
  function Island({ draft, set }, ref) {
    const t = useT();
    return (
      <>
        <StepHeader ref={ref} eyebrow={t("Top of the screen")} title={t("Dynamic Island")}>
          {t("A small black shape at the top of your screen for what’s playing, timers, the radio and quick answers. Hover it to open.")}
        </StepHeader>

        <div className="surface-flat mb-4 flex items-center justify-between gap-6 rounded-2xl px-4 py-3">
          <div>
            <div className="text-[13px] font-medium text-ink-100">{t("Show the Dynamic Island")}</div>
            <div className="mt-0.5 text-[11.5px] text-ink-500">
              {t("Turn it off if you’d rather keep the top of the screen clear.")}
            </div>
          </div>
          <Toggle checked={draft.island} onChange={(v) => set({ island: v })} />
        </div>

        <div
          className={cn(
            "transition-opacity duration-200",
            !draft.island && "pointer-events-none opacity-35",
          )}
          aria-disabled={!draft.island}
        >
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <OptionCard
                key={s.value}
                selected={draft.islandStyle === s.value}
                disabled={!draft.island}
                onClick={() => set({ islandStyle: s.value })}
                className="overflow-hidden p-0"
              >
                <Mock shape={s.value} />
                <span className="block px-3.5 pt-2.5 pb-3">
                  <span className="block text-[13px] font-medium text-ink-100">{t(s.name)}</span>
                  <span className="block text-[11.5px] text-ink-500">{t(s.text)}</span>
                </span>
              </OptionCard>
            ))}
          </div>

          <div className="surface-flat mt-2 flex items-center justify-between gap-6 rounded-2xl px-4 py-3">
            <div>
              <div className="text-[13px] font-medium text-ink-100">{t("Clipboard peek")}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-500">
                {t("Shows what you just copied for a moment.")}
              </div>
            </div>
            <Toggle checked={draft.islandClipboard} onChange={(v) => set({ islandClipboard: v })} />
          </div>
        </div>
      </>
    );
  },
);

/** The top strip of a screen, with the island drawn in the chosen shape. */
function Mock({ shape }: { shape: IslandStyle }) {
  const id = useId();
  const notch = shape === "notch";
  return (
    // a picture of a screen: drawn left-to-right in every language, so the
    // clock text stays inside the island instead of anchoring from its end
    <svg viewBox="0 0 240 92" direction="ltr" className="block w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d1b3a" />
          <stop offset="1" stopColor="#0c2a32" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.75" cy="1.1" r="0.8">
          <stop offset="0" style={{ stopColor: "var(--accent)", stopOpacity: 0.45 }} />
          <stop offset="1" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <rect width="240" height="92" fill={`url(#${id}-sky)`} />
      <rect width="240" height="92" fill={`url(#${id}-glow)`} />
      {/* the bezel edge the notch hangs from */}
      <rect width="240" height="3" fill="#000" opacity="0.9" />

      {notch ? (
        <path
          d="M64 0 H176 Q166 0 166 10 V16 Q166 30 152 30 H88 Q74 30 74 16 V10 Q74 0 64 0 Z"
          fill="#000"
        />
      ) : (
        <rect x="74" y="12" width="92" height="26" rx="13" fill="#000" />
      )}

      <text
        x="88"
        y={notch ? 20 : 29}
        fill="#fff"
        fontSize="10"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
      >
        9:41
      </text>
      <circle cx="152" cy={notch ? 16.5 : 25} r="3.5" style={{ fill: "var(--accent)" }} />

      {/* a couple of tiles on the desktop below, for scale */}
      <rect x="18" y="52" width="30" height="30" rx="9" fill="#fbfbfa" opacity="0.9" />
      <rect x="54" y="52" width="30" height="30" rx="9" fill="#0a0a0b" opacity="0.9" />
    </svg>
  );
}
