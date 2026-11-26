import type { ReactNode } from "react";
import {
  ArrowBigUp,
  Clock,
  Mic,
  Music2,
  StickyNote,
  Timer,
  Video,
  Volume1,
  Volume2,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { Reveal, SectionHead } from "../components/Reveal";
import { Island, useIsland, type ToastKind } from "../components/Island";
import { Wallpaper } from "../components/DesktopMock";

function Chip({ onClick, active, children }: { onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex h-9 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-medium transition-all active:scale-95",
        active ? "bg-white text-black" : "bg-white/[0.06] text-ink-200 ring-1 ring-white/10 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

const POPS: { kind: ToastKind; label: string; icon: ReactNode }[] = [
  { kind: "track", label: "New track", icon: <Music2 size={14} /> },
  { kind: "charging", label: "Charger in", icon: <Zap size={14} /> },
  { kind: "focus", label: "Focus done", icon: <Timer size={14} /> },
  { kind: "note", label: "Note captured", icon: <StickyNote size={14} /> },
  { kind: "mic", label: "Mic turns on", icon: <Mic size={14} /> },
  { kind: "camera", label: "Camera turns on", icon: <Video size={14} /> },
  { kind: "caps", label: "Caps Lock", icon: <ArrowBigUp size={14} /> },
];

const STATES = [
  ["Idle", "The time, plus one quiet fact: charging, low battery, or the outside temperature."],
  ["Music", "The album cover and a live equaliser tinted with the cover's own colour."],
  ["Focus timer", "A progress ring and the time left, splitting into its own bubble beside music."],
  ["Hover", "Opens into a panel: Now playing, Focus, System, Today — and Ask AI."],
  ["Volume", "Change it from the keyboard, the mixer, or by scrolling over the island."],
  ["Privacy", "A green dot while an app uses the camera, an orange one for the microphone."],
];

export function IslandSection() {
  const api = useIsland({ base: "idle", focusRunning: true });
  const { s, set, toast, nudgeVolume } = api;

  return (
    <section id="island" className="relative overflow-hidden py-28 sm:py-36">
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#ff4dd8] opacity-[0.07] blur-[140px]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHead
          center
          eyebrow="Dynamic Island"
          title={
            <>
              A black pill that grows into
              <br />
              <span className="text-gradient">whatever is going on.</span>
            </>
          }
        >
          It sits at the top of your main display, and every shape change is driven by real spring physics. This one
          is the real thing, more or less — try it.
        </SectionHead>

        <Reveal delay={0.1} className="mt-14">
          <div className="relative overflow-hidden rounded-[32px] ring-1 ring-white/10">
            <Wallpaper />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />
            <div className="relative flex h-[340px] justify-center pt-4 sm:h-[380px]">
              <div className="origin-top scale-[0.72] sm:scale-100">
                <Island api={api} />
              </div>
            </div>
            <div className="relative -mt-24 flex flex-col items-center gap-4 px-4 pb-7">
              <div className="flex flex-wrap justify-center gap-2">
                <span className="self-center px-1 text-[12px] font-semibold tracking-wider text-white/50 uppercase">Show</span>
                <Chip active={!s.toast && s.base === "idle"} onClick={() => set({ base: "idle", toast: null })}>
                  <Clock size={14} /> Idle
                </Chip>
                <Chip active={!s.toast && s.base === "media"} onClick={() => set({ base: "media", toast: null })}>
                  <Music2 size={14} /> Music
                </Chip>
                <Chip active={!s.toast && s.base === "timer"} onClick={() => set({ base: "timer", toast: null })}>
                  <Timer size={14} /> Focus timer
                </Chip>
                <Chip onClick={() => nudgeVolume(-10)}>
                  <Volume1 size={14} /> Vol −
                </Chip>
                <Chip onClick={() => nudgeVolume(10)}>
                  <Volume2 size={14} /> Vol +
                </Chip>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="self-center px-1 text-[12px] font-semibold tracking-wider text-white/50 uppercase">Pop out</span>
                {POPS.map((p) => (
                  <Chip key={p.kind} active={s.toast === p.kind} onClick={() => toast(p.kind)}>
                    {p.icon} {p.label}
                  </Chip>
                ))}
                {(s.mic || s.camera) && (
                  <Chip onClick={() => set({ mic: false, camera: false })}>Clear privacy dots</Chip>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-[28px] bg-white/[0.07] ring-1 ring-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
          {STATES.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.05} className="bg-ink-950 p-7">
              <h3 className="text-[16px] font-semibold">{t}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-300">{d}</p>
            </Reveal>
          ))}
        </div>

        <p className="mt-6 text-center text-[13.5px] text-ink-400">
          A small native watcher makes everything except the island click-through, and tucks it away while a full-screen
          game, video or presentation is in front.
        </p>
      </div>
    </section>
  );
}
