import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import { Welcome } from "./steps/Welcome";
import { PickWidgets } from "./steps/PickWidgets";
import { MakeItYours } from "./steps/MakeItYours";
import { Island } from "./steps/Island";
import { Done } from "./steps/Done";
import { STARTER, presetOf, sameSet, type Draft } from "./draft";
import { useT } from "@/app/manager/i18n";

import { getLang, isRtl } from "@/shared/i18n/locale";
const STEPS = ["welcome", "widgets", "style", "island", "done"] as const;
type Step = (typeof STEPS)[number];

/** The steps the progress bar names; the welcome screen stands outside it. */
const TRACK = [
  { id: "widgets", label: "Widgets" },
  { id: "style", label: "Look" },
  { id: "island", label: "Island" },
  { id: "done", label: "Done" },
] as const satisfies readonly { id: Step; label: string }[];

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * First-run setup. Takes over the manager below the title bar until it is
 * finished or skipped; until then the desktop is held empty (see
 * `useDesktopSync` and `useIslandSync`), so what the user picks here is the
 * first thing that appears.
 *
 * Also reachable again from Settings → About as a replay, which leaves the
 * desktop alone unless the user applies a different set of widgets.
 */
export default function Onboarding({ replay = false }: { replay?: boolean }) {
  const t = useT();
  const reduceSetting = useApp((s) => s.settings.reduceMotion);
  const still = useReducedMotion() || reduceSetting;

  const [draft, setDraftState] = useState<Draft>(() => {
    const st = useApp.getState();
    const s = st.settings;
    const open = st.widgets.filter((w) => w.open).map((w) => w.kind);
    return {
      picked: new Set(replay && open.length ? open : STARTER),
      clock24h: s.clock24h,
      temperatureUnit: s.temperatureUnit,
      island: s.island,
      islandStyle: s.islandStyle,
      islandClipboard: s.islandClipboard,
    };
  });
  const setDraft = useCallback(
    (patch: Partial<Draft>) => setDraftState((d) => ({ ...d, ...patch })),
    [],
  );

  // the accent is applied live; a replay that is closed puts it back
  const startAccent = useRef(useApp.getState().settings.accent);

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  // forward slides in from the reading end: the right in English, the left in Persian
  const flow = isRtl(getLang()) ? -1 : 1;
  const step = STEPS[index];
  const canNext = step !== "widgets" || draft.picked.size > 0;

  const go = useCallback(
    (to: number) => {
      const target = Math.max(0, Math.min(STEPS.length - 1, to));
      setDir(target >= index ? 1 : -1);
      setIndex(target);
    },
    [index],
  );

  const finish = useCallback(() => {
    const st = useApp.getState();
    const open = st.widgets.filter((w) => w.open).map((w) => w.kind);
    // a replay that kept the same widgets leaves the desktop exactly as it is
    if (!replay || !sameSet(draft.picked, open)) {
      const preset = presetOf(draft.picked);
      useApp.setState({
        widgets: st.widgets.map((w) => ({ ...w, open: draft.picked.has(w.kind), dock: null })),
        activeProfile: preset && preset.id !== "all" ? preset.id : null,
      });
      // placed before the desktop is released, so each widget opens where it stays
      useApp.getState().autoArrangeNow();
    }
    st.update({
      clock24h: draft.clock24h,
      temperatureUnit: draft.temperatureUnit,
      island: draft.island,
      islandStyle: draft.islandStyle,
      islandClipboard: draft.islandClipboard,
      onboarded: true,
    });
    st.setOnboardingReplay(false);
  }, [draft, replay]);

  const skip = useCallback(() => {
    const st = useApp.getState();
    if (replay) {
      st.update({ accent: startAccent.current });
      st.setOnboardingReplay(false);
      return;
    }
    // everything, as Widgeto has always started
    st.update({ onboarded: true });
  }, [replay]);

  const next = useCallback(() => {
    if (!canNext) return;
    if (step === "done") finish();
    else go(index + 1);
  }, [canNext, step, finish, go, index]);

  const back = useCallback(() => {
    if (index > 0) go(index - 1);
    else if (replay) skip();
  }, [index, go, replay, skip]);

  // Enter moves on, Esc steps back — unless a control has the key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target;
      const inControl =
        el instanceof HTMLElement &&
        (["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A"].includes(el.tagName) ||
          el.getAttribute("role") === "switch");
      if (e.key === "Enter" && !inControl) {
        e.preventDefault();
        next();
      } else if (e.key === "Escape") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back]);

  // each step's heading takes focus as it lands, so it is announced and
  // keyboard users start from the top of the new content
  const heading = useRef<HTMLHeadingElement>(null);
  const focusHeading = () => heading.current?.focus({ preventScroll: true });

  const centred = step === "welcome" || step === "done";
  const trackAt = TRACK.findIndex((x) => x.id === step);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="absolute inset-0 z-650 flex overflow-hidden bg-ink-950/80 p-5 backdrop-blur-md"
    >
      {/* accent glow and a faint dot field, behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-500"
        style={{
          background:
            "radial-gradient(640px 380px at 50% 115%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%)," +
            "radial-gradient(420px 260px at 85% -10%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 80%)",
        }}
      />

      <section
        aria-label={t("Set up Widgeto")}
        className="relative mx-auto my-auto flex h-full max-h-180 w-full max-w-195 flex-col overflow-hidden
                   rounded-[28px] border border-white/7 bg-ink-900/75 backdrop-blur-2xl
                   shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95),0_1px_0_rgba(255,255,255,0.04)_inset]"
      >
        {/* -------------------------------------------------------- header */}
        <header className="flex h-14 shrink-0 items-center gap-4 px-6">
          <div
            className={cn(
              "flex flex-1 items-center gap-3 transition-opacity duration-300",
              step === "welcome" && "pointer-events-none opacity-0",
            )}
            aria-hidden={step === "welcome"}
          >
            <ol className="flex flex-1 items-center gap-1.5" aria-label={t("Progress")}>
              {TRACK.map((item, i) => {
                const reached = i <= trackAt;
                return (
                  <li
                    key={item.id}
                    className="flex-1"
                    aria-current={i === trackAt ? "step" : undefined}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={i > trackAt}
                      onClick={() => go(STEPS.indexOf(item.id))}
                      className="group block w-full text-start disabled:cursor-default"
                    >
                      <span className="block h-1 overflow-hidden rounded-full bg-white/8">
                        <motion.span
                          className="block h-full rounded-full"
                          style={{ background: "var(--accent)" }}
                          initial={false}
                          animate={{ width: reached ? "100%" : "0%" }}
                          transition={{ duration: still ? 0 : 0.4, ease: EASE }}
                        />
                      </span>
                      <span
                        className={cn(
                          "mt-1.5 block text-[10.5px] font-medium transition-colors",
                          i === trackAt
                            ? "text-ink-100"
                            : reached
                              ? "text-ink-400"
                              : "text-ink-600",
                        )}
                      >
                        {t(item.label)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          {step !== "welcome" && step !== "done" && (
            <button
              className="rounded-md px-2 py-1 text-[12px] text-ink-500 transition-colors hover:text-ink-200"
              onClick={skip}
            >
              {replay ? t("Close") : t("Skip setup")}
            </button>
          )}
        </header>

        {/* ---------------------------------------------------------- body */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: still ? 0 : d * flow * 32 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: still ? 0 : d * flow * -32 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: still ? 0.12 : 0.26, ease: EASE }}
              onAnimationComplete={(def) => def === "center" && focusHeading()}
              className={cn("w-full px-9 pb-7", centred ? "my-auto pt-2" : "pt-3")}
            >
              {step === "welcome" && (
                <Welcome ref={heading} onStart={next} onSkip={skip} still={still} replay={replay} />
              )}
              {step === "widgets" && <PickWidgets ref={heading} draft={draft} set={setDraft} />}
              {step === "style" && <MakeItYours ref={heading} draft={draft} set={setDraft} />}
              {step === "island" && <Island ref={heading} draft={draft} set={setDraft} />}
              {step === "done" && (
                <Done ref={heading} draft={draft} onFinish={finish} still={still} replay={replay} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* -------------------------------------------------------- footer */}
        {step !== "welcome" && (
          <footer className="flex h-16 shrink-0 items-center gap-2 border-t border-white/6 px-6">
            <button className="btn" onClick={back}>
              <ArrowLeft size={14} className="rtl:-scale-x-100" /> {t("Back")}
            </button>
            <div className="flex-1" />
            {step === "widgets" && (
              <span className="me-2 text-[12px] tabular-nums text-ink-500" aria-live="polite">
                {draft.picked.size === 0 ? t("Pick at least one") : t("{n} selected", { n: draft.picked.size })}
              </span>
            )}
            {step !== "done" && (
              <button
                className={cn("btn btn-primary px-4", !canNext && "pointer-events-none opacity-40")}
                onClick={next}
                disabled={!canNext}
              >
                {t("Continue")} <ArrowRight size={14} className="rtl:-scale-x-100" />
              </button>
            )}
          </footer>
        )}
      </section>
    </motion.div>
  );
}
