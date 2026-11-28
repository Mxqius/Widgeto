import { forwardRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { WIDGETS } from "@/app/manager/widgets/catalogue";
import { MiniTile } from "../parts";
import { presetOf, type Draft } from "../draft";
import { useT } from "@/app/manager/i18n";

const TIPS = [
  ["Drag", "any widget to move it. Let go near an edge to dock it."],
  ["Ctrl+,", "opens settings from the manager."],
  ["Close", "keeps Widgeto running in the tray."],
] as const;

export const Done = forwardRef<
  HTMLHeadingElement,
  { draft: Draft; onFinish: () => void; still: boolean; replay: boolean }
>(function Done({ draft, onFinish, still, replay }, ref) {
  const t = useT();
  const picked = WIDGETS.filter((w) => draft.picked.has(w.kind));
  const preset = presetOf(draft.picked);

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={still ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.05 }}
        className="mt-2 mb-5 grid size-14 place-items-center rounded-full"
        style={{ background: "var(--accent)", boxShadow: "0 0 44px -6px var(--accent)" }}
      >
        <Check size={26} strokeWidth={3} className="text-white" />
      </motion.div>

      <h2 ref={ref} tabIndex={-1} className="display text-[28px] text-white outline-none">
        {t("You’re all set")}
      </h2>
      <p className="mt-2 text-[13px] text-ink-400">
        {preset && preset.id !== "all"
          ? picked.length === 1
            ? t("This widget is going on your desktop, from the {set} set.", { set: t(preset.name) })
            : t("These {n} widgets are going on your desktop, from the {set} set.", { n: picked.length, set: t(preset.name) })
          : picked.length === 1
            ? t("This widget is going on your desktop.")
            : t("These {n} widgets are going on your desktop.", { n: picked.length })}
      </p>

      <div className="mt-5 flex max-w-130 flex-wrap justify-center gap-2">
        {picked.map((def, i) => (
          <motion.div
            key={def.kind}
            title={def.name}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.035, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <MiniTile def={def} size={40} />
          </motion.div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        <span className="chip">
          <span className="size-2 rounded-full" style={{ background: "var(--accent)" }} />
          {t("Accent")}
        </span>
        <span className="chip">{draft.clock24h ? t("24-hour clock") : t("12-hour clock")}</span>
        <span className="chip">{draft.temperatureUnit === "C" ? t("Celsius") : t("Fahrenheit")}</span>
        <span className="chip">
          {draft.island
            ? t("Island · {shape}", { shape: draft.islandStyle === "pill" ? t("Pill") : t("Notch") })
            : t("Island off")}
        </span>
      </div>

      <div className="surface-flat mt-7 w-full max-w-115 divide-y divide-white/5 rounded-2xl text-start">
        {TIPS.map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 px-4 py-2.5">
            <kbd dir="ltr" className="chip w-15 shrink-0 justify-center font-mono text-[10.5px]">{k === "Ctrl+," ? k : t(k)}</kbd>
            <span className="text-[12px] text-ink-400">{t(v)}</span>
          </div>
        ))}
      </div>

      <button className="btn btn-primary mt-7 h-10 px-5 text-[13.5px]" onClick={onFinish}>
        {replay ? t("Apply") : t("Open my desktop")} <ArrowRight size={14} className="rtl:-scale-x-100" />
      </button>
    </div>
  );
});
