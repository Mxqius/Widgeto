import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowBigUp,
  Calendar,
  Check,
  ClipboardCheck,
  CloudSun,
  Cpu,
  Gauge,
  Mic,
  Music2,
  Pause,
  Play,
  Radio,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  StickyNote,
  Timer,
  Video,
  Volume1,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { GROW, SETTLE } from "../lib/spring";
import { pad, useDrift, useNow } from "../lib/hooks";
import { Cover, Equalizer } from "../widgets/ui";

/* ------------------------------------------------------------- the model -- */

type Base = "idle" | "media" | "timer";
export type ToastKind = "track" | "radio" | "copy" | "charging" | "focus" | "note" | "mic" | "camera" | "caps";
type Tab = "music" | "radio" | "focus" | "system" | "today";

/** The app's own shape table, in px. */
const SHAPES = {
  idle: { w: 176, h: 34, r: 17 },
  media: { w: 236, h: 34, r: 17 },
  timer: { w: 216, h: 34, r: 17 },
  volume: { w: 264, h: 38, r: 19 },
  toast: { w: 372, h: 70, r: 34 },
  expanded: { w: 468, h: 204, r: 40 },
} as const;
const DOT = 14;

export interface IslandState {
  base: Base;
  toast: ToastKind | null;
  volume: number | null;
  level: number;
  muted: boolean;
  expanded: boolean;
  tab: Tab;
  playing: boolean;
  focusLeft: number;
  focusRunning: boolean;
  mic: boolean;
  camera: boolean;
}

export function useIsland(initial: Partial<IslandState> = {}) {
  const [s, setS] = useState<IslandState>({
    base: "media",
    toast: null,
    volume: null,
    level: 62,
    muted: false,
    expanded: false,
    tab: "music",
    playing: true,
    focusLeft: 18 * 60 + 42,
    focusRunning: true,
    mic: false,
    camera: false,
    ...initial,
  });
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const volT = useRef<ReturnType<typeof setTimeout>>(undefined);

  const set = useCallback((p: Partial<IslandState>) => setS((x) => ({ ...x, ...p })), []);

  const toast = useCallback((kind: ToastKind) => {
    clearTimeout(toastT.current);
    setS((x) => ({
      ...x,
      toast: kind,
      volume: null,
      mic: kind === "mic" ? true : x.mic,
      camera: kind === "camera" ? true : x.camera,
      base: kind === "track" ? "media" : x.base,
      playing: kind === "track" ? true : x.playing,
    }));
    toastT.current = setTimeout(() => setS((x) => ({ ...x, toast: null })), 3200);
  }, []);

  const nudgeVolume = useCallback((delta: number) => {
    clearTimeout(volT.current);
    setS((x) => {
      const level = Math.max(0, Math.min(100, x.level + delta));
      return { ...x, level, muted: level === 0, volume: level, toast: null };
    });
    volT.current = setTimeout(() => setS((x) => ({ ...x, volume: null })), 1500);
  }, []);

  // the focus timer counts down while it runs
  useEffect(() => {
    if (!s.focusRunning) return;
    const t = setInterval(() => setS((x) => ({ ...x, focusLeft: x.focusLeft > 0 ? x.focusLeft - 1 : 25 * 60 })), 1000);
    return () => clearInterval(t);
  }, [s.focusRunning]);

  useEffect(() => () => {
    clearTimeout(toastT.current);
    clearTimeout(volT.current);
  }, []);

  return { s, set, toast, nudgeVolume };
}

export type IslandApi = ReturnType<typeof useIsland>;

/* ------------------------------------------------------------- the shape -- */

export function Island({ api, interactive = true }: { api: IslandApi; interactive?: boolean }) {
  const { s, set, nudgeVolume } = api;
  const mode = s.expanded ? "expanded" : s.toast ? "toast" : s.volume !== null ? "volume" : s.base;
  const dots = (s.mic ? 1 : 0) + (s.camera ? 1 : 0);
  const base = SHAPES[mode];
  const shape = { ...base, w: base.w + (mode === "expanded" || mode === "toast" ? 0 : dots * DOT) };

  // grow with a little overshoot; shrink stiff and critically damped
  const prev = useRef(shape);
  const growing = shape.w * shape.h >= prev.current.w * prev.current.h;
  useEffect(() => {
    prev.current = shape;
  });
  const sp = growing ? GROW : SETTLE;
  const transition = `${sp.ms}ms ${sp.easing}`;

  const leaveT = useRef<ReturnType<typeof setTimeout>>(undefined);

  // scrolling over the island changes the volume, as in the app — and must not scroll the page
  const el = useRef<HTMLDivElement>(null);
  const wheel = useRef({ interactive, expanded: s.expanded, nudgeVolume });
  wheel.current = { interactive, expanded: s.expanded, nudgeVolume };
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const on = (e: WheelEvent) => {
      const w = wheel.current;
      if (!w.interactive || w.expanded) return;
      e.preventDefault();
      w.nudgeVolume(e.deltaY < 0 ? 4 : -4);
    };
    node.addEventListener("wheel", on, { passive: false });
    return () => node.removeEventListener("wheel", on);
  }, []);

  return (
    <div
      ref={el}
      data-lenis-prevent={interactive && !s.expanded ? "" : undefined}
      className="island-shape relative"
      style={{
        width: shape.w,
        height: shape.h,
        borderRadius: shape.r,
        transition: `width ${transition}, height ${transition}, border-radius ${transition}`,
      }}
      onMouseEnter={() => {
        if (!interactive) return;
        clearTimeout(leaveT.current);
        set({ expanded: true });
      }}
      onMouseLeave={() => {
        if (!interactive) return;
        leaveT.current = setTimeout(() => set({ expanded: false }), 220);
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={mode === "toast" ? `toast-${s.toast}` : mode}
          className="absolute top-0 left-1/2"
          style={{ width: base.w + (mode === "expanded" || mode === "toast" ? 0 : dots * DOT), height: base.h, x: "-50%" }}
          initial={{ opacity: 0, filter: "blur(6px)", scale: 0.94 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1, transition: { delay: 0.07, duration: 0.28 } }}
          exit={{ opacity: 0, filter: "blur(6px)", scale: 0.96, transition: { duration: 0.12 } }}
        >
          {mode === "idle" && <IdleView s={s} />}
          {mode === "media" && <MediaView s={s} />}
          {mode === "timer" && <TimerView s={s} />}
          {mode === "volume" && <VolumeView s={s} />}
          {mode === "toast" && s.toast && <ToastView kind={s.toast} s={s} />}
          {mode === "expanded" && <ExpandedView api={api} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------------------------------------- the pieces -- */

function Dots({ s }: { s: IslandState }) {
  return (
    <>
      {s.camera && <span className="size-[7px] shrink-0 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80]" />}
      {s.mic && <span className="size-[7px] shrink-0 rounded-full bg-[#fb923c] shadow-[0_0_8px_#fb923c]" />}
    </>
  );
}

function Ring({ value, size = 18, stroke = 2.4, color = "#ff4dd8" }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}

const mmss = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

function IdleView({ s }: { s: IslandState }) {
  const now = useNow(1000);
  return (
    <div className="flex h-full items-center justify-between gap-2 px-4">
      <span className="text-[13px] font-semibold tabular-nums tracking-tight">
        {pad(now.getHours())}:{pad(now.getMinutes())}
      </span>
      <span className="flex items-center gap-1.5">
        <Dots s={s} />
        <span className="flex items-center gap-1 text-[12px] font-semibold tabular-nums text-white/80">
          <CloudSun size={13} /> 21°
        </span>
      </span>
    </div>
  );
}

function MediaView({ s }: { s: IslandState }) {
  return (
    <div className="flex h-full items-center justify-between gap-2 pr-3.5 pl-1.5">
      <Cover size={24} radius={8} className={s.playing ? "" : "opacity-60"} />
      <span className="flex items-center gap-2">
        <Dots s={s} />
        <Equalizer playing={s.playing} color="#a78bff" height={12} />
      </span>
    </div>
  );
}

function TimerView({ s }: { s: IslandState }) {
  return (
    <div className="flex h-full items-center justify-between gap-2 pr-4 pl-2">
      <Ring value={1 - s.focusLeft / (25 * 60)} />
      <span className="flex items-center gap-2">
        <Dots s={s} />
        <span className="text-[13px] font-semibold tabular-nums text-[#ff8fe6]">{mmss(s.focusLeft)}</span>
      </span>
    </div>
  );
}

function VolumeView({ s }: { s: IslandState }) {
  const v = s.volume ?? s.level;
  const Icon = v === 0 ? VolumeX : v < 50 ? Volume1 : Volume2;
  return (
    <div className="flex h-full items-center gap-3 px-4">
      <Icon size={15} className="shrink-0" />
      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-white transition-[width] duration-150" style={{ width: `${v}%` }} />
      </div>
      <span className="w-7 text-right text-[12px] font-semibold tabular-nums">{v}</span>
    </div>
  );
}

const TOASTS: Record<ToastKind, { icon: ReactNode; title: string; sub: string; trailing: ReactNode }> = {
  track: { icon: <Cover size={44} radius={12} />, title: "Night Drive", sub: "The Midnight", trailing: <Equalizer color="#a78bff" height={16} /> },
  charging: {
    icon: <Bubble bg="rgba(74,222,128,0.16)"><Zap size={20} className="fill-[#4ade80] text-[#4ade80]" /></Bubble>,
    title: "Charging",
    sub: "Plugged in",
    trailing: <span className="text-[15px] font-semibold tabular-nums text-[#4ade80]">82%</span>,
  },
  focus: {
    icon: <Bubble bg="rgba(255,77,216,0.16)"><Timer size={20} className="text-[#ff8fe6]" /></Bubble>,
    title: "Focus session done",
    sub: "Time for a short break",
    trailing: <span className="text-[15px] font-semibold tabular-nums text-[#ff8fe6]">25:00</span>,
  },
  note: {
    icon: <Bubble bg="rgba(250,204,21,0.15)"><StickyNote size={19} className="text-[#facc15]" /></Bubble>,
    title: "Note saved",
    sub: "“Call Sam about the deck”",
    trailing: <Check size={18} className="text-[#4ade80]" />,
  },
  mic: {
    icon: <Bubble bg="rgba(251,146,60,0.16)"><Mic size={19} className="text-[#fb923c]" /></Bubble>,
    title: "Microphone in use",
    sub: "Voice chat",
    trailing: <span className="size-2.5 rounded-full bg-[#fb923c] shadow-[0_0_10px_#fb923c]" />,
  },
  camera: {
    icon: <Bubble bg="rgba(74,222,128,0.16)"><Video size={19} className="text-[#4ade80]" /></Bubble>,
    title: "Camera in use",
    sub: "Video call",
    trailing: <span className="size-2.5 rounded-full bg-[#4ade80] shadow-[0_0_10px_#4ade80]" />,
  },
  radio: {
    icon: <StationTile name="Jazz Lounge" hue={262} size={44} radius={12} />,
    title: "Sunset Avenue",
    sub: "Jazz Lounge · Radio",
    trailing: <Equalizer color="#a78bff" height={16} />,
  },
  copy: {
    icon: <Bubble bg="rgba(96,165,250,0.16)"><ClipboardCheck size={19} className="text-[#60a5fa]" /></Bubble>,
    title: "github.com/Mxqius/Widgeto",
    sub: "Link copied",
    trailing: <Check size={18} className="text-[#60a5fa]" />,
  },
  caps: {
    icon: <Bubble bg="rgba(255,255,255,0.1)"><ArrowBigUp size={20} /></Bubble>,
    title: "Caps Lock",
    sub: "Typing in capitals",
    trailing: <span className="rounded-md bg-white/12 px-1.5 py-0.5 text-[11px] font-bold">ON</span>,
  },
};

function Bubble({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: bg }}>
      {children}
    </span>
  );
}

function ToastView({ kind }: { kind: ToastKind; s: IslandState }) {
  const t = TOASTS[kind];
  return (
    <div className="flex h-full items-center gap-3 pr-6 pl-3">
      {t.icon}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{t.title}</div>
        <div className="truncate text-[12px] text-white/55">{t.sub}</div>
      </div>
      {t.trailing}
    </div>
  );
}

/* -------------------------------------------------------- expanded panel -- */

const TABS: { id: Tab; icon: typeof Music2; label: string }[] = [
  { id: "music", icon: Music2, label: "Now playing" },
  { id: "radio", icon: Radio, label: "Radio" },
  { id: "focus", icon: Timer, label: "Focus" },
  { id: "system", icon: Gauge, label: "System" },
  { id: "today", icon: Calendar, label: "Today" },
];

function ExpandedView({ api }: { api: IslandApi }) {
  const { s, set } = api;
  const now = useNow(1000);
  return (
    <div className="flex h-full flex-col px-4 pt-3 pb-4">
      <div className="flex items-center gap-1">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            aria-label={label}
            title={label}
            onClick={() => set({ tab: id })}
            className={clsx(
              "grid size-7 place-items-center rounded-full transition-colors",
              s.tab === id ? "bg-white/14 text-white" : "text-white/45 hover:text-white/80",
            )}
          >
            <Icon size={14} />
          </button>
        ))}
        <span className="ml-auto text-[11.5px] font-medium text-white/50">
          {now.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <span className="text-[12px] font-semibold tabular-nums">
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </span>
      </div>
      <div className="relative mt-3 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={s.tab}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {s.tab === "music" && <MusicTab api={api} />}
            {s.tab === "radio" && <RadioTab />}
            {s.tab === "focus" && <FocusTab api={api} />}
            {s.tab === "system" && <SystemTab />}
            {s.tab === "today" && <TodayTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function MusicTab({ api }: { api: IslandApi }) {
  const { s, set } = api;
  const [t, setT] = useState(88);
  useEffect(() => {
    if (!s.playing) return;
    const id = setInterval(() => setT((x) => (x + 1) % 241), 1000);
    return () => clearInterval(id);
  }, [s.playing]);
  const VolIcon = s.muted ? VolumeX : s.level < 50 ? Volume1 : Volume2;
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center gap-3">
        <Cover size={46} radius={12} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">Night Drive</div>
          <div className="truncate text-[12px] text-white/55">The Midnight · Music app</div>
        </div>
        <Equalizer playing={s.playing} color="#a78bff" height={14} />
      </div>
      <div className="flex items-center gap-2.5 text-[10.5px] font-medium tabular-nums text-white/50">
        <span>{mmss(t)}</span>
        <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#a78bff] transition-[width] duration-1000 ease-linear" style={{ width: `${(t / 241) * 100}%` }} />
        </div>
        <span>-{mmss(241 - t)}</span>
      </div>
      <div className="flex items-center">
        <div className="flex items-center gap-4 text-white/85">
          <Shuffle size={14} className="text-white/45" />
          <SkipBack size={16} className="fill-current" />
          <button
            onClick={() => set({ playing: !s.playing })}
            className="grid size-9 place-items-center rounded-full bg-white text-black transition-transform active:scale-90"
            aria-label={s.playing ? "Pause" : "Play"}
          >
            {s.playing ? <Pause size={15} className="fill-current" /> : <Play size={15} className="ml-0.5 fill-current" />}
          </button>
          <SkipForward size={16} className="fill-current" />
          <Repeat size={14} className="text-white/45" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => set({ muted: !s.muted })} aria-label="Mute" className="text-white/70">
            <VolIcon size={14} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={s.muted ? 0 : s.level}
            onChange={(e) => set({ level: +e.target.value, muted: +e.target.value === 0 })}
            className="h-1 w-24 cursor-pointer accent-white"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}

/** A station without an icon: its initial on a gradient, as the app draws it. */
function StationTile({ name, hue, size, radius }: { name: string; hue: number; size: number; radius: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center font-extrabold text-white/90"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.round(size * 0.44),
        background: `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 60% 30%))`,
      }}
    >
      {name[0]}
    </span>
  );
}

const STATIONS = [
  { name: "Jazz Lounge", hue: 262 },
  { name: "Persian Classics", hue: 18 },
  { name: "Lo-fi Beats", hue: 190 },
  { name: "Morning News", hue: 210 },
  { name: "Golden Oldies", hue: 42 },
  { name: "Chill Wave", hue: 320 },
];

function RadioTab() {
  const [on, setOn] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [source, setSource] = useState("Favorites");
  const st = STATIONS[on];
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <StationTile name={st.name} hue={st.hue} size={40} radius={11} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{st.name}</div>
          <div className="truncate text-[12px] text-white/55">{playing ? "Sunset Avenue" : "Stopped"}</div>
        </div>
        <Equalizer playing={playing} color="#a78bff" height={14} />
        <div className="flex items-center gap-3 text-white/85">
          <button aria-label="Previous station" onClick={() => setOn((on + STATIONS.length - 1) % STATIONS.length)}>
            <SkipBack size={15} className="fill-current" />
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            className="grid size-8 place-items-center rounded-full bg-white text-black transition-transform active:scale-90"
            aria-label={playing ? "Stop" : "Play"}
          >
            {playing ? <Pause size={14} className="fill-current" /> : <Play size={14} className="ml-0.5 fill-current" />}
          </button>
          <button aria-label="Next station" onClick={() => setOn((on + 1) % STATIONS.length)}>
            <SkipForward size={15} className="fill-current" />
          </button>
        </div>
      </div>
      <div className="flex gap-1.5">
        {["Favorites", "Popular", "Iran", "Persian"].map((c) => (
          <button
            key={c}
            onClick={() => setSource(c)}
            className={clsx(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
              source === c ? "bg-[#7c5cff] text-white" : "bg-white/8 text-white/60",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-2">
        {STATIONS.map((x, i) => (
          <button
            key={x.name}
            onClick={() => {
              setOn(i);
              setPlaying(true);
            }}
            className="flex min-w-0 flex-col items-center gap-1"
          >
            <span className="rounded-[10px]" style={{ outline: i === on ? "2px solid #a78bff" : undefined, outlineOffset: 1.5 }}>
              <StationTile name={x.name} hue={x.hue} size={30} radius={9} />
            </span>
            <span className={clsx("w-full truncate text-center text-[9.5px] font-semibold", i === on ? "text-white" : "text-white/55")}>
              {x.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FocusTab({ api }: { api: IslandApi }) {
  const { s, set } = api;
  return (
    <div className="flex h-full items-center gap-5">
      <div className="relative grid place-items-center">
        <Ring value={1 - s.focusLeft / (25 * 60)} size={96} stroke={6} />
        <span className="absolute text-[20px] font-semibold tabular-nums">{mmss(s.focusLeft)}</span>
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex gap-1">
          {["Focus", "Break", "Long break"].map((m, i) => (
            <span
              key={m}
              className={clsx(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                i === 0 ? "bg-[#ff4dd8] text-white" : "bg-white/8 text-white/60",
              )}
            >
              {m}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => set({ focusRunning: !s.focusRunning })}
            className="h-8 rounded-full bg-white px-4 text-[12px] font-semibold text-black transition-transform active:scale-95"
          >
            {s.focusRunning ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => set({ focusLeft: 25 * 60, focusRunning: false })}
            className="h-8 rounded-full bg-white/10 px-4 text-[12px] font-semibold"
          >
            Reset
          </button>
        </div>
        <div className="text-[11.5px] text-white/50">3 sessions today</div>
      </div>
    </div>
  );
}

function Meter({ icon, label, value, text, color }: { icon: ReactNode; label: string; value: number; text: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] p-3">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-white/50">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-[17px] font-semibold tabular-nums">{text}</div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function SystemTab() {
  const cpu = useDrift(31, 8, 5, 90, 1000);
  const mem = useDrift(58, 2, 50, 70, 1800);
  const net = useDrift(2.4, 0.9, 0.2, 6, 900);
  return (
    <div className="grid h-full grid-cols-4 gap-2">
      <Meter icon={<Cpu size={11} />} label="CPU" value={cpu} text={`${Math.round(cpu)}%`} color="#ff4dd8" />
      <Meter icon={<Gauge size={11} />} label="MEM" value={mem} text={`${Math.round(mem)}%`} color="#a78bff" />
      <Meter icon={<Zap size={11} />} label="POWER" value={82} text="82%" color="#4ade80" />
      <Meter icon={<SkipForward size={11} className="rotate-90" />} label="NET" value={(net / 6) * 100} text={`${net.toFixed(1)}M`} color="#60a5fa" />
    </div>
  );
}

function TodayTab() {
  const now = useNow(1000);
  const date = useMemo(() => now.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" }), [now]);
  return (
    <div className="flex h-full items-center justify-between">
      <div>
        <div className="text-[44px] leading-none font-semibold tracking-tight tabular-nums">
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </div>
        <div className="mt-2 text-[13px] text-white/55">{date}</div>
      </div>
      <div className="text-right">
        <CloudSun size={34} className="ml-auto text-white/90" />
        <div className="mt-1 text-[20px] font-semibold">21°</div>
        <div className="text-[11.5px] text-white/50">Partly cloudy · Amsterdam</div>
      </div>
    </div>
  );
}
