import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { MotionConfig, animate, motion, useMotionValue } from "motion/react";
import { Folder, Globe, Search, Terminal, Wifi, Volume2, BatteryCharging } from "lucide-react";
import { Widget, type Kind } from "../widgets";
import { Island, useIsland, type IslandApi } from "./Island";
import { LogoMark } from "./Logo";
import { pad, useNow } from "../lib/hooks";

/** The mock is laid out on a fixed 1200 × 675 screen and scaled to fit. */
const W = 1200;
const H = 675;
const BAR = 48;
const M = 22;
const T = 150;

const LAYOUT: { kind: Kind; x: number; y: number }[] = [
  { kind: "clock", x: M, y: 66 },
  { kind: "weather", x: M + T + 14, y: 66 },
  { kind: "system", x: M, y: 66 + T + 14 },
  { kind: "calendar", x: M + T + 14, y: 66 + T + 14 },
  { kind: "markets", x: W - M - 2 * T - 14, y: 66 },
  { kind: "music", x: W - M - T, y: 66 },
  { kind: "notes", x: W - M - 2 * T - 14, y: 66 + T + 14 },
  { kind: "pet", x: W - M - T, y: 66 + T + 14 },
  { kind: "pomodoro", x: W - M - T, y: 66 + 2 * (T + 14) },
];

export function Wallpaper({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-[#0e0a22]" />
      <div className="absolute -top-1/3 -left-1/4 h-[120%] w-[80%] rounded-full bg-[#5b3df5] opacity-60 blur-[120px]" />
      <div className="absolute -right-1/4 -bottom-1/2 h-[110%] w-[70%] rounded-full bg-[#ff4dd8] opacity-35 blur-[140px]" />
      <div className="absolute top-1/4 left-1/3 h-1/2 w-1/3 rounded-full bg-[#2dd4bf] opacity-15 blur-[110px]" />
      <svg className="absolute inset-0 h-full w-full opacity-[0.18] mix-blend-overlay">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}

function Taskbar() {
  const now = useNow(10_000);
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-center border-t border-white/10 bg-black/45 backdrop-blur-2xl"
      style={{ height: BAR }}
    >
      <div className="flex items-center gap-1.5">
        {[Search, Globe, Folder, Terminal].map((Icon, i) => (
          <span key={i} className="grid size-9 place-items-center rounded-md text-white/85 hover:bg-white/10">
            <Icon size={17} />
          </span>
        ))}
        <span className="grid size-9 place-items-center rounded-md bg-white/10">
          <LogoMark size={20} />
        </span>
      </div>
      <div className="absolute right-4 flex items-center gap-3 text-white/85">
        <Wifi size={14} />
        <Volume2 size={14} />
        <BatteryCharging size={15} />
        <div className="text-right text-[11px] leading-tight tabular-nums">
          <div>
            {pad(now.getHours())}:{pad(now.getMinutes())}
          </div>
          <div className="text-white/60">{now.toLocaleDateString("en-GB")}</div>
        </div>
      </div>
    </div>
  );
}

/** A widget you can pick up and drop; near an edge it docks itself to the margin. */
function DraggableTile({
  kind,
  x,
  y,
  stage,
  z,
  onLift,
}: {
  kind: Kind;
  x: number;
  y: number;
  stage: RefObject<HTMLDivElement | null>;
  z: number;
  onLift: () => void;
}) {
  const dx = useMotionValue(0);
  const dy = useMotionValue(0);
  const [dragging, setDragging] = useState(false);

  const settle = () => {
    setDragging(false);
    let fx = x + dx.get();
    let fy = y + dy.get();
    const SNAP = 44;
    if (fx < M + SNAP) fx = M;
    if (fx > W - M - T - SNAP) fx = W - M - T;
    if (fy < 66 + SNAP) fy = 66;
    if (fy > H - BAR - M - T - SNAP) fy = H - BAR - M - T;
    const spring = { type: "spring", stiffness: 520, damping: 34 } as const;
    animate(dx, fx - x, spring);
    animate(dy, fy - y, spring);
  };

  return (
    <motion.div
      className="absolute cursor-grab active:cursor-grabbing"
      style={{ left: x, top: y, x: dx, y: dy, zIndex: z }}
      drag
      dragConstraints={stage}
      dragElastic={0.04}
      dragMomentum={false}
      onDragStart={() => {
        setDragging(true);
        onLift();
      }}
      onDragEnd={settle}
      animate={{ scale: dragging ? 1.04 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <div
        className="rounded-[30px] transition-shadow duration-300"
        style={{ boxShadow: dragging ? "0 30px 60px -18px rgba(0,0,0,0.75)" : "0 14px 30px -16px rgba(0,0,0,0.6)" }}
      >
        <Widget kind={kind} size={T} />
      </div>
    </motion.div>
  );
}

/** Steps the island through a few of its states while nobody is touching it. */
function useAutoplay(api: IslandApi, enabled: boolean) {
  const { s, set, toast, nudgeVolume } = api;
  const busy = s.expanded;
  useEffect(() => {
    if (!enabled || busy) return;
    const steps: [number, () => void][] = [
      [2200, () => toast("track")],
      [6000, () => nudgeVolume(6)],
      [6450, () => nudgeVolume(6)],
      [6900, () => nudgeVolume(6)],
      [9200, () => set({ base: "timer" })],
      [12200, () => toast("charging")],
      [16400, () => set({ base: "idle" })],
      [19200, () => toast("note")],
      [23400, () => set({ base: "media", level: 62 })],
    ];
    const timers = steps.map(([ms, fn]) => setTimeout(fn, ms));
    const loop = setTimeout(() => set({ base: "media" }), 26000);
    const again = setInterval(() => {
      steps.forEach(([ms, fn]) => timers.push(setTimeout(fn, ms)));
    }, 26000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(loop);
      clearInterval(again);
    };
    // restart the loop whenever the panel closes again
  }, [enabled, busy, set, toast, nudgeVolume]);
}

export function DesktopMock({ children }: { children?: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [order, setOrder] = useState<Kind[]>(LAYOUT.map((l) => l.kind));
  const api = useIsland({ base: "media" });
  const [visible, setVisible] = useState(true);
  useAutoplay(api, visible);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const small = scale < 0.62;

  return (
    <div ref={host} className="relative w-full" style={{ height: H * scale }}>
      <MotionConfig transformPagePoint={(p) => ({ x: p.x / scale, y: p.y / scale })}>
        <div
          ref={stage}
          className="absolute top-0 left-0 overflow-hidden rounded-[22px] ring-1 ring-white/12"
          style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
        >
          <Wallpaper />
          {LAYOUT.filter((l) => !small || ["clock", "weather", "system", "calendar", "music", "pet", "markets", "notes"].includes(l.kind)).map((l) => (
            <DraggableTile
              key={l.kind}
              {...l}
              stage={stage}
              z={10 + order.indexOf(l.kind)}
              onLift={() => setOrder((o) => [...o.filter((k) => k !== l.kind), l.kind])}
            />
          ))}
          <div className="absolute top-2 left-1/2 z-40 -translate-x-1/2">
            <Island api={api} />
          </div>
          <Taskbar />
          {children}
        </div>
      </MotionConfig>
    </div>
  );
}
