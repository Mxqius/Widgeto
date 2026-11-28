import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Check, Command, Compass, KeyRound, Languages, Moon, PanelTop, RefreshCw, Sparkles, StickyNote, Sun, Users } from "lucide-react";
import clsx from "clsx";
import { Reveal, SectionHead } from "../components/Reveal";
import { LogoMark } from "../components/Logo";
import { Tile } from "../widgets/ui";
import { CalendarWidget } from "../widgets/time";
import { SystemWidget } from "../widgets/data";

function Card({ className, icon, title, text, children, delay = 0 }: {
  className?: string;
  icon: ReactNode;
  title: string;
  text: ReactNode;
  children?: ReactNode;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={clsx("card relative flex flex-col overflow-hidden p-7", className)}>
      <div className="flex items-center gap-2.5 text-[#c9bcff]">
        {icon}
        <h3 className="text-[16px] font-semibold text-white">{title}</h3>
      </div>
      <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-300">{text}</p>
      {children && <div className="mt-6 flex flex-1 items-end">{children}</div>}
    </Reveal>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-white/[0.07] px-2.5 font-sans text-[13px] font-semibold text-ink-100 shadow-[inset_0_-2px_0_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(255,255,255,0.1)]">
      {children}
    </kbd>
  );
}

/* ---------------------------------------------------------------- ask ai -- */

const ANSWER =
  "Mitochondria turn the food you eat into ATP — the small, rechargeable battery every cell spends to move, build and think.";

function AskDemo() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= ANSWER.length + 40 ? 0 : x + 1)), 38);
    return () => clearInterval(t);
  }, []);
  const shown = ANSWER.slice(0, Math.min(n, ANSWER.length));
  return (
    <div className="island-shape w-full rounded-[32px] p-4">
      <div className="flex items-center gap-2 text-[12px] text-white/50">
        <Sparkles size={13} className="text-[#c9bcff]" /> Ask
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px]">Ctrl + Shift + Space</span>
      </div>
      <div className="mt-3 ml-auto w-max max-w-[85%] rounded-2xl rounded-br-md bg-[#7c5cff] px-3.5 py-2 text-[13.5px]">
        What do mitochondria do? One line.
      </div>
      <div className="mt-2.5 max-w-[92%] rounded-2xl rounded-bl-md bg-white/[0.07] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white/90">
        {shown}
        {n < ANSWER.length && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-white" />}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Summarise", "Fix grammar", "Translate", "Explain"].map((q) => (
          <span key={q} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11.5px] text-white/65 ring-1 ring-white/10">
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- capture -- */

function CaptureDemo() {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setSaved((s) => !s), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-1.5">
        <Kbd>Ctrl</Kbd>
        <span className="text-ink-500">+</span>
        <Kbd>Shift</Kbd>
        <span className="text-ink-500">+</span>
        <Kbd>N</Kbd>
      </div>
      <div className="flex h-12 items-center gap-3 rounded-2xl bg-[#0a0a0b] px-4 ring-1 ring-white/10">
        <StickyNote size={16} className="text-[#facc15]" />
        <span className="flex-1 truncate text-[14px]">Call Sam about the deck</span>
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.span key="s" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-[12px] font-semibold text-[#4ade80]">
              <Check size={14} /> Saved
            </motion.span>
          ) : (
            <motion.span key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] text-ink-500">
              Enter
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- profiles -- */

const PROFILES = [
  { name: "Work", count: 7 },
  { name: "Focus", count: 3 },
  { name: "Gaming", count: 2 },
];

function ProfilesDemo() {
  const [p, setP] = useState(0);
  return (
    <div className="w-full">
      <div className="flex gap-2">
        {PROFILES.map((x, i) => (
          <button
            key={x.name}
            onClick={() => setP(i)}
            className={clsx(
              "h-9 rounded-full px-4 text-[13px] font-semibold transition-all",
              p === i ? "bg-white text-black" : "bg-white/[0.06] text-ink-300 ring-1 ring-white/10 hover:text-white",
            )}
          >
            {x.name}
          </button>
        ))}
      </div>
      <div className="mt-4 flex h-14 items-end gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.span
            key={i}
            className="h-full flex-1 rounded-xl bg-gradient-to-b from-white/20 to-white/5 ring-1 ring-white/10"
            animate={{ opacity: i < PROFILES[p].count ? 1 : 0.12, scaleY: i < PROFILES[p].count ? 1 : 0.5 }}
            style={{ originY: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.03 }}
          />
        ))}
      </div>
      <div className="mt-2 text-[12px] text-ink-400">
        {PROFILES[p].count} widgets on the desktop
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ appearance -- */

const ACCENTS = ["#ff4dd8", "#7c5cff", "#3ddc84", "#ff5b2e", "#60a5fa", "#facc15"];

function AppearanceDemo() {
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [light, setLight] = useState(false);
  return (
    <div className="flex w-full items-end justify-between gap-4">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a}
              onClick={() => setAccent(a)}
              aria-label={`Accent ${a}`}
              className="size-7 rounded-full transition-transform hover:scale-110"
              style={{ background: a, boxShadow: accent === a ? `0 0 0 2px #08090a, 0 0 0 4px ${a}` : undefined }}
            />
          ))}
        </div>
        <div className="flex gap-1 rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
          {[false, true].map((l) => (
            <button
              key={String(l)}
              onClick={() => setLight(l)}
              className={clsx(
                "flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors",
                light === l ? "bg-white text-black" : "text-ink-300",
              )}
            >
              {l ? <Sun size={13} /> : <Moon size={13} />}
              {l ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>
      <Tile theme={light ? "light" : "dark"} accent={accent} size={140}>
        {light ? <CalendarWidget /> : <SystemWidget />}
      </Tile>
    </div>
  );
}

/* ---------------------------------------------------------------- update -- */

function UpdateDemo() {
  return (
    <div className="w-full rounded-2xl bg-[#0d0e10] p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <LogoMark size={34} />
        <div>
          <div className="text-[14px] font-semibold">A new version is ready</div>
          <div className="text-[12px] text-ink-400">Signed, checked against GitHub Releases</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="btn btn-primary h-8 px-3 text-[12px]">Download & Install</span>
        <span className="btn btn-ghost h-8 px-3 text-[12px]">Remind me later</span>
        <span className="btn h-8 px-3 text-[12px] text-ink-400">Skip</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ tray -- */

function TrayDemo() {
  return (
    <div className="w-full">
      <div className="ml-auto w-56 rounded-xl bg-[#1c1d21]/95 p-1.5 text-[13px] shadow-2xl ring-1 ring-white/10">
        {["Open Widgeto", "Show all widgets", "Hide all widgets", "Tuck the island", "Quit"].map((t, i) => (
          <div key={t} className={clsx("rounded-md px-3 py-1.5", i === 0 ? "bg-white/[0.07] font-semibold" : "text-ink-200", i === 4 && "mt-1 border-t border-white/10 pt-2")}>
            {t}
          </div>
        ))}
      </div>
      <div className="mt-2 ml-auto flex w-max items-center gap-2 rounded-lg bg-black/40 px-2.5 py-1.5 ring-1 ring-white/10">
        <LogoMark size={16} />
        <span className="text-[11px] text-ink-400">tray</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- language -- */

const FA_DATE = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long" });
const FA_TIME = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false });

function LanguageDemo() {
  const [fa, setFa] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setFa((v) => !v), 3200);
    return () => clearInterval(id);
  }, []);
  const now = new Date();
  return (
    <div className="flex w-full flex-wrap items-end justify-between gap-4">
      <div className="flex rounded-lg bg-white/[0.05] p-1 text-[12.5px] ring-1 ring-white/10">
        {["System", "English", "فارسی"].map((l, i) => (
          <span
            key={l}
            className={clsx(
              "rounded-md px-2.5 py-1 transition-colors",
              (fa ? i === 2 : i === 1) ? "bg-white/[0.12] font-semibold text-white" : "text-ink-400",
            )}
          >
            {l}
          </span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={fa ? "fa" : "en"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          dir={fa ? "rtl" : "ltr"}
          lang={fa ? "fa" : "en"}
          className="w-44 rounded-2xl bg-[#fbfbfa] p-3.5 text-black shadow-xl"
        >
          <div className="text-[26px] leading-none font-bold tabular-nums">
            {fa ? FA_TIME.format(now) : now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="mt-1.5 text-[11.5px] font-semibold text-black/55">
            {fa ? FA_DATE.format(now) : now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------- tour -- */

const TOUR = ["Widgets", "Look", "Island", "Done"];

function TourDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % TOUR.length), 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-1.5">
        {TOUR.map((t, i) => (
          <div key={t}>
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full rounded-full bg-[#ff4dd8]"
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div className={clsx("mt-1.5 text-[11.5px]", i === step ? "font-semibold text-white" : "text-ink-400")}>{t}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-2.5 ring-1 ring-white/10">
        <span className="text-[12.5px] text-ink-300">{step === TOUR.length - 1 ? "Your widgets are on the desktop" : "Pick what you want on screen"}</span>
        <span className="rounded-full bg-[#ff4dd8] px-2.5 py-1 text-[11.5px] font-semibold text-white">
          {step === TOUR.length - 1 ? "Done" : "Continue"}
        </span>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          center
          eyebrow="Everything else"
          title={
            <>
              Small things, <span className="text-ink-400">done properly.</span>
            </>
          }
        >
          A manager that gets out of the way, and the details that make widgets worth keeping on screen.
        </SectionHead>

        <div className="mt-16 grid gap-4 md:grid-cols-6">
          <Card
            className="md:col-span-4"
            icon={<Bot size={18} />}
            title="Ask AI, from the island"
            text={
              <>
                An Ask tab that streams answers from Claude, any OpenAI-compatible API, or a local model through Ollama or
                LM Studio, with highlighted code and a chat you can drag bigger. Requests run in the native core; API keys
                live in Windows Credential Manager and never reach a web view.
              </>
            }
          >
            <AskDemo />
          </Card>
          <Card className="md:col-span-2" icon={<KeyRound size={18} />} title="Capture from anywhere" text="A global hotkey opens a quick bar. Type, hit Enter, and the note lands in your Notes widget; Ctrl+Enter makes it a task instead. Nothing is lost if the widget isn't on screen." delay={0.05}>
            <CaptureDemo />
          </Card>
          <Card className="md:col-span-2" icon={<Users size={18} />} title="Profiles" text="Save the desktop as Work, Focus or Gaming, and switch the whole set in one click.">
            <ProfilesDemo />
          </Card>
          <Card className="md:col-span-4" icon={<Sparkles size={18} />} title="Make every tile yours" text="Per-widget accent colour, dark or light ground, size, transparency and refresh rate — plus settings of its own for each kind." delay={0.05}>
            <AppearanceDemo />
          </Card>
          <Card className="md:col-span-3" icon={<PanelTop size={18} />} title="Lives in the tray" text="Close the manager and it parks in the tray. The widgets stay on the desktop, it can start with Windows, and opening it again never starts a second copy.">
            <TrayDemo />
          </Card>
          <Card className="md:col-span-3" icon={<RefreshCw size={18} />} title="Signed auto-updates" text="Checks GitHub Releases at launch and every few hours, with no telemetry. When a version is ready, the island tells you — even with Widgeto tucked in the tray." delay={0.05}>
            <UpdateDemo />
          </Card>
          <Card className="md:col-span-3" icon={<Languages size={18} />} title="English and Persian" text="Every window speaks Persian too, right to left, in the Vazirmatn font, with Jalali dates and Persian digits. By default it follows your Windows display language.">
            <LanguageDemo />
          </Card>
          <Card className="md:col-span-3" icon={<Compass size={18} />} title="A short welcome tour" text="A first run walks you through picking widgets, the look and the island, then puts everything on the desktop at once. Replay it any time from About." delay={0.05}>
            <TourDemo />
          </Card>
        </div>

        <Reveal className="mt-4">
          <div className="card flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
              <Command size={18} className="text-[#c9bcff]" />
            </span>
            <div className="flex-1">
              <h3 className="text-[16px] font-semibold">A keyboard-first manager</h3>
              <p className="mt-1 text-[14.5px] text-ink-300">Search, arrange, dock, lock and hide without reaching for the mouse.</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Kbd>Ctrl</Kbd>
              <Kbd>Alt</Kbd>
              <Kbd>H</Kbd>
              <span className="ml-2 text-[12.5px] text-ink-400">tuck the island</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
