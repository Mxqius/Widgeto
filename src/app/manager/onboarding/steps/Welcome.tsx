import { forwardRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, Clipboard, LayoutGrid, PanelTop } from "lucide-react";
import { byKind } from "@/app/manager/widgets/catalogue";
import type { WidgetKind } from "@/shared/types/widget";
import { MiniTile } from "../parts";
import { useT } from "@/app/manager/i18n";

/** A loose arc of tiles over the headline — a desktop in miniature. */
const HERO: { kind: WidgetKind; x: number; y: number; r: number; s: number }[] = [
  { kind: "weather", x: -150, y: 26, r: -9, s: 46 },
  { kind: "calendar", x: -84, y: -4, r: -4, s: 54 },
  { kind: "clock", x: 0, y: -16, r: 0, s: 66 },
  { kind: "music", x: 84, y: -4, r: 4, s: 54 },
  { kind: "tasks", x: 150, y: 26, r: 9, s: 46 },
];

const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Thirteen widgets",
    text: "Clock, weather, tasks, music, markets and more.",
  },
  {
    icon: PanelTop,
    title: "Dynamic Island",
    text: "Media, timers, the radio and quick answers up top.",
  },
  { icon: Clipboard, title: "Quick capture", text: "One shortcut to jot a note from anywhere." },
] as const;

export const Welcome = forwardRef<
  HTMLHeadingElement,
  { onStart: () => void; onSkip: () => void; still: boolean; replay: boolean }
>(function Welcome({ onStart, onSkip, still, replay }, ref) {
  const t = useT();
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mt-4 mb-9 h-24 w-90" aria-hidden>
        {HERO.map((tile, i) => (
          <motion.div
            key={tile.kind}
            className="absolute top-1/2 left-1/2"
            initial={still ? false : { opacity: 0, y: 30, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.08 + i * 0.06, type: "spring", stiffness: 260, damping: 20 }}
            style={{ marginLeft: tile.x - tile.s / 2, marginTop: tile.y - tile.s / 2 }}
          >
            <motion.div
              style={{ rotate: tile.r }}
              animate={still ? undefined : { y: [0, -5, 0] }}
              transition={{
                duration: 4 + i * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
              className="shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)]"
            >
              <MiniTile def={byKind(tile.kind)} size={tile.s} />
            </motion.div>
          </motion.div>
        ))}
      </div>

      <div className="label-xs mb-3">{replay ? t("Welcome back") : t("Welcome to Widgeto")}</div>
      <h1 ref={ref} tabIndex={-1} className="display max-w-110 text-[34px] text-white outline-none">
        {t("Desktop widgets, always on your screen.")}
      </h1>
      <p className="mt-3 max-w-100 text-[13.5px] leading-relaxed text-ink-400">
        {t("Let’s set up your desktop. It takes under a minute, and you can change all of it later in Settings.")}
      </p>

      <div className="mt-8 grid w-full max-w-145 grid-cols-3 gap-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="surface-flat rounded-2xl p-3.5 text-start">
            <div
              className="mb-2.5 grid size-7 place-items-center rounded-lg"
              style={{ background: "var(--accent-soft)" }}
            >
              <Icon size={14} style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-[12.5px] font-medium text-ink-100">{t(title)}</div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{t(text)}</div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary mt-8 h-10 px-5 text-[13.5px]" onClick={onStart}>
        {t("Get started")} <ArrowRight size={14} className="rtl:-scale-x-100" />
      </button>
      <button
        className="mt-2 rounded-md px-2 py-1 text-[12px] text-ink-500 transition-colors hover:text-ink-200"
        onClick={onSkip}
      >
        {replay ? t("Close") : t("Skip setup and show me everything")}
      </button>
    </div>
  );
});
