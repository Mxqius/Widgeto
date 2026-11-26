import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Circle, Columns3, Grid3x3, Layers, Magnet, Monitor, Ruler } from "lucide-react";
import clsx from "clsx";
import { Reveal, SectionHead } from "../components/Reveal";
import { Wallpaper } from "../components/DesktopMock";
import { Widget, type Kind } from "../widgets";

const W = 960;
const H = 520;
const T = 110;
const STEP = T + 14;
const M = 24;

const KINDS: Kind[] = ["clock", "weather", "system", "music", "calendar", "notes", "markets", "pet"];

type Mode = "grid" | "columns" | "cascade" | "ring";

const MODES: { id: Mode; label: string; icon: typeof Grid3x3 }[] = [
  { id: "grid", label: "Grid", icon: Grid3x3 },
  { id: "columns", label: "Columns", icon: Columns3 },
  { id: "cascade", label: "Cascade", icon: Layers },
  { id: "ring", label: "Ring", icon: Circle },
];

function place(mode: Mode, i: number): { x: number; y: number } {
  switch (mode) {
    case "grid":
      return { x: M + (i % 4) * STEP, y: M + Math.floor(i / 4) * STEP };
    case "columns":
      return { x: W - M - T - Math.floor(i / 4) * STEP, y: M + (i % 4) * STEP };
    case "cascade":
      return { x: 250 + i * 46, y: 40 + i * 42 };
    case "ring": {
      const a = (i / KINDS.length) * Math.PI * 2 - Math.PI / 2;
      return { x: W / 2 + Math.cos(a) * 250 - T / 2, y: H / 2 + Math.sin(a) * 180 - T / 2 };
    }
  }
}

const POINTS = [
  { icon: Magnet, title: "Auto-dock", text: "Drop a widget near a corner, an edge or a neighbour and it takes its place." },
  { icon: Ruler, title: "Alignment guides", text: "Guides light up as you drag, so a row of tiles lines up without trying." },
  { icon: Monitor, title: "Multi-monitor aware", text: "Every display's work area is tracked on its own, taskbar and all." },
];

export function ArrangeSection() {
  const [mode, setMode] = useState<Mode>("grid");
  const [auto, setAuto] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // cycle through the modes until someone picks one
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setMode((m) => MODES[(MODES.findIndex((x) => x.id === m) + 1) % MODES.length].id);
    }, 2800);
    return () => clearInterval(t);
  }, [auto]);

  return (
    <section id="arrange" className="relative py-28 sm:py-36">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1fr_1.35fr]">
        <div>
          <SectionHead
            eyebrow="Layout"
            title={
              <>
                Docks itself.
                <br />
                <span className="text-ink-400">Arranges itself.</span>
              </>
            }
          >
            Place widgets by hand with magnetic edges, or let Widgeto lay out the whole desktop in one click — four ways.
          </SectionHead>
          <div className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={0.08 * i} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
                  <Icon size={18} className="text-[#c9bcff]" />
                </span>
                <div>
                  <h3 className="text-[15.5px] font-semibold">{title}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-ink-300">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.1}>
          <LayoutGroup>
            <div className="mb-4 flex flex-wrap gap-1.5 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/10 sm:w-max">
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setAuto(false);
                    setMode(id);
                  }}
                  className={clsx(
                    "relative flex h-9 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13.5px] font-medium transition-colors",
                    mode === id ? "text-black" : "text-ink-300 hover:text-white",
                  )}
                >
                  {mode === id && (
                    <motion.span layoutId="arrange-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                  )}
                  <Icon size={14} className="relative" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
          <div ref={host} className="relative w-full" style={{ height: H * scale }}>
            <div
              className="absolute top-0 left-0 overflow-hidden rounded-[24px] ring-1 ring-white/12"
              style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
            >
              <Wallpaper />
              {KINDS.map((k, i) => {
                const p = place(mode, i);
                return (
                  <motion.div
                    key={k}
                    className="absolute top-0 left-0"
                    initial={false}
                    animate={{ x: p.x, y: p.y }}
                    transition={{ type: "spring", stiffness: 210, damping: 24, delay: i * 0.025 }}
                    style={{ zIndex: i }}
                  >
                    <div className="rounded-[30px] shadow-[0_18px_36px_-16px_rgba(0,0,0,0.7)]">
                      <Widget kind={k} size={T} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
