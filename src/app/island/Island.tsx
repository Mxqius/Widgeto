import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  fetchBattery, fetchNet, fetchSystem, fetchWeather,
  type BatteryStats,
} from "@/shared/ipc/commands";
import { ISLAND_TOP, ISLAND_WINDOW } from "@/shared/island/protocol";
import { isTauri } from "@/shared/lib/env";
import { invoke, useIslandBridge, useTauriEvent } from "./data/bridge";
import { useIslandMedia } from "./data/useMedia";
import { useFocus, type FocusMode } from "./data/useFocus";
import { useActivities, type Activity } from "./data/useActivities";
import { useNow, usePoll } from "./data/usePoll";
import { SAMPLE_BATTERY, SAMPLE_NET, SAMPLE_SYSTEM, SAMPLE_WEATHER } from "./data/sample";
import { CALM, GROW, SETTLE } from "./lib/spring";
import { chime } from "./lib/chime";
import { IdleCompact, MediaCompact, TimerBubble, TimerCompact } from "./views/Compact";
import { Toast } from "./views/Toast";
import { Expanded, type Tab } from "./views/Expanded";

type Mode = "hidden" | "idle" | "media" | "timer" | "toast" | "expanded";

interface Shape {
  w: number;
  h: number;
  r: number;
}

const SHAPES: Record<Mode, Shape> = {
  hidden: { w: 150, h: 30, r: 15 },
  idle: { w: 176, h: 34, r: 17 },
  media: { w: 236, h: 34, r: 17 },
  timer: { w: 216, h: 34, r: 17 },
  toast: { w: 372, h: 70, r: 34 },
  expanded: { w: 468, h: 192, r: 40 },
};

const BUBBLE = 34;
const BUBBLE_GAP = 8;

/** Bigger shapes grow with a little bounce; smaller ones settle flat. */
const area = (s: Shape) => s.w * s.h;

/** Hover in: open almost at once. Hover out: linger, so a stray exit forgives. */
const OPEN_DELAY = 70;
const CLOSE_DELAY = 420;

export default function Island() {
  const live = isTauri();
  const { cfg, nativeHover, fullscreen } = useIslandBridge();

  /* ---------------------------------------------------------------- hover */
  const [domHover, setDomHover] = useState(false);
  // In the app the native watcher decides: once cursor events are switched
  // off, the page never hears the pointer leave.
  const hover = live ? nativeHover : domHover;
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setExpanded(hover), hover ? OPEN_DELAY : CLOSE_DELAY);
    return () => clearTimeout(t);
  }, [hover]);

  /* ----------------------------------------------------------------- feeds */
  const track = useIslandMedia();
  const { data: battery } = usePoll(fetchBattery, 20_000, live, live ? undefined : SAMPLE_BATTERY);
  const place = cfg.weatherPlace;
  const weatherFn = useCallback(() => fetchWeather(place ?? ""), [place]);
  const { data: weatherRaw } = usePoll(weatherFn, 15 * 60_000, live && !!place, live ? undefined : SAMPLE_WEATHER);
  const weather = live && !place ? undefined : weatherRaw;

  const activities = useActivities(expanded || (fullscreen && cfg.hideInFullscreen));
  const { push } = activities;

  const onFocusDone = useCallback(
    (m: FocusMode) => {
      chime();
      push(
        m === "focus"
          ? { icon: "focus", title: "Focus session done", subtitle: "Time for a break", tone: "var(--accent)" }
          : { icon: "break", title: "Break's over", subtitle: "Ready when you are", tone: "#60a5fa" },
      );
    },
    [push],
  );
  const focus = useFocus(cfg.focus, onFocusDone);

  const [tab, setTab] = useState<Tab>("today");
  const sysActive = expanded && tab === "system";
  const { data: system } = usePoll(fetchSystem, 2000, live && sysActive, live ? undefined : SAMPLE_SYSTEM);
  const { data: net } = usePoll(fetchNet, 2000, live && sysActive, live ? undefined : SAMPLE_NET);

  const now = useNow(1000);

  /* ------------------------------------------------------------ activities */
  const allow = cfg.activities;
  useActivityTriggers({ allow, push, track, battery });
  const allowRef = useRef(allow);
  allowRef.current = allow;
  useTauriEvent<string>("notes:append", (line) => {
    if (!allowRef.current) return;
    const task = line.startsWith("- [ ] ");
    push({
      icon: "note",
      title: task ? line.slice(6) : line,
      subtitle: task ? "Added as a task" : "Saved to Notes",
      tone: "#fbbf24",
    });
  });

  /* ------------------------------------------------------------ open on a tab */
  // pick the tab that matches what is going on, every time the island opens
  useEffect(() => {
    if (!expanded) return;
    setTab(track.media?.playing ? "media" : focus.active ? "focus" : track.media?.title ? "media" : "today");
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  /* ------------------------------------------------------------------ mode */
  const hidden = fullscreen && cfg.hideInFullscreen && !expanded;
  const toast = activities.current;
  const playing = !!track.media?.playing;
  const mode: Mode = hidden
    ? "hidden"
    : expanded
      ? "expanded"
      : toast
        ? "toast"
        : playing
          ? "media"
          : focus.active
            ? "timer"
            : "idle";
  const bubble = mode === "media" && focus.active;
  const shape = SHAPES[mode];

  // the spring follows the direction of the change
  const prevShape = useRef(shape);
  const motion = cfg.reduceMotion ? CALM : area(shape) >= area(prevShape.current) ? GROW : SETTLE;
  useEffect(() => {
    prevShape.current = shape;
  }, [shape]);

  /* ------------------------------------------------------ native hit area */
  const shapeRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  useHitReport({ live, mode, shape, bubble, shapeRef, bubbleRef });

  /* ---------------------------------------------------------------- render */
  const temp = useCallback(
    (c: number) => `${Math.round(cfg.temperatureUnit === "F" ? c * 1.8 + 32 : c)}°`,
    [cfg.temperatureUnit],
  );

  let content: ReactNode;
  let key: string = mode;
  switch (mode) {
    case "expanded":
      content = (
        <Expanded
          tab={tab}
          setTab={setTab}
          now={now}
          h24={cfg.clock24h}
          track={track}
          focus={focus}
          battery={battery}
          system={system}
          net={net}
          weather={weather}
          temp={temp}
        />
      );
      break;
    case "toast":
      key = `toast-${toast!.id}`;
      // a cover usually lands a beat after its title; show it as soon as it does
      content = (
        <Toast
          a={toast!}
          art={toast!.icon === "track" ? (track.art ?? toast!.art ?? null) : null}
          playing={playing}
          tint={track.tint}
        />
      );
      break;
    case "media":
      content = <MediaCompact track={track} />;
      break;
    case "timer":
      content = <TimerCompact focus={focus} />;
      break;
    default:
      content = (
        <IdleCompact now={new Date(now)} h24={cfg.clock24h} battery={battery} weather={weather} temp={temp} />
      );
  }

  const transition = `${motion.ms}ms ${motion.easing}`;

  return (
    <div className="island-stage" data-mode={mode} data-reduce={cfg.reduceMotion || undefined}>
      <div
        ref={shapeRef}
        className="island-shape"
        style={{
          width: shape.w,
          height: shape.h,
          borderRadius: shape.r,
          transition: `width ${transition}, height ${transition}, border-radius ${transition}, transform ${transition}, opacity 260ms ease, box-shadow 400ms ease`,
          // when a bubble sits beside it, the pair is centred together
          transform: `translateX(calc(-50% - ${bubble ? (BUBBLE + BUBBLE_GAP) / 2 : 0}px))${hidden ? " translateY(-56px) scale(0.7)" : ""}`,
        }}
        onMouseEnter={live ? undefined : () => setDomHover(true)}
        onMouseLeave={live ? undefined : () => setDomHover(false)}
        onClick={() => !expanded && setExpanded(true)}
      >
        <Crossfade k={key} w={shape.w} h={shape.h}>
          {content}
        </Crossfade>
      </div>

      <div
        ref={bubbleRef}
        className="island-bubble"
        style={{
          transition: `transform ${transition}, opacity 220ms ease`,
          opacity: bubble ? 1 : 0,
          transform: bubble
            ? `translateX(${(SHAPES.media.w + BUBBLE_GAP - BUBBLE) / 2}px) scale(1)`
            : `translateX(${SHAPES.media.w / 2 - BUBBLE}px) scale(0.4)`,
        }}
        onMouseEnter={live ? undefined : () => setDomHover(true)}
        onMouseLeave={live ? undefined : () => setDomHover(false)}
        onClick={() => setExpanded(true)}
      >
        {focus.active && <TimerBubble focus={focus} />}
      </div>

      {!live && import.meta.env.DEV && <DevPanel push={push} />}
    </div>
  );
}

/* ====================================================================== */

/**
 * Keeps the outgoing view for a moment so it can fade while the new one fades
 * in. Each layer is laid out at its own target size and centred, so content
 * never reflows while the shape morphs around it — the shape reveals it.
 */
function Crossfade({ k, w, h, children }: { k: string; w: number; h: number; children: ReactNode }) {
  type Layer = { k: string; node: ReactNode; w: number; h: number };
  const [leaving, setLeaving] = useState<Layer[]>([]);
  const prev = useRef<Layer>({ k, node: children, w, h });

  useLayoutEffect(() => {
    if (prev.current.k === k) return;
    const old = prev.current;
    setLeaving((l) => [...l.filter((x) => x.k !== old.k && x.k !== k), old]);
    const t = setTimeout(() => setLeaving((l) => l.filter((x) => x !== old)), 240);
    return () => clearTimeout(t);
  }, [k]);
  useLayoutEffect(() => {
    prev.current = { k, node: children, w, h };
  });

  return (
    <>
      {leaving.map((l) => (
        <div key={l.k} className="island-layer is-leaving" style={{ width: l.w, height: l.h }} aria-hidden>
          {l.node}
        </div>
      ))}
      <div key={k} className="island-layer is-entering" style={{ width: w, height: h }}>
        {children}
      </div>
    </>
  );
}

/* ====================================================================== */

/** Turns changes in the feeds into pop-outs. */
function useActivityTriggers({ allow, push, track, battery }: {
  allow: boolean;
  push: (a: Omit<Activity, "id" | "at">) => void;
  track: ReturnType<typeof useIslandMedia>;
  battery: BatteryStats | undefined;
}) {
  // a new track — but not the first one we see, or the one already on at launch
  const lastKey = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const k = track.key;
    if (lastKey.current === undefined) {
      if (track.media) lastKey.current = k;
      return;
    }
    if (k && k !== lastKey.current && allow && track.media?.playing) {
      push({
        icon: "track",
        title: track.media.title ?? "",
        subtitle: track.media.artist ?? "Now playing",
        art: track.art,
      });
    }
    if (k) lastKey.current = k;
  }, [track.key, track.media, track.art, allow, push]);

  // charger in / out, and low battery once per threshold
  const lastBatt = useRef<BatteryStats | undefined>(undefined);
  useEffect(() => {
    const was = lastBatt.current;
    lastBatt.current = battery;
    if (!battery?.present || !was?.present || !allow) return;
    const pct = Math.round(battery.percent);
    if (battery.charging && !was.charging) {
      push({ icon: "charging", title: "Charging", subtitle: "Power connected", trailing: `${pct}%`, tone: "#4ade80" });
    } else if (!battery.charging && was.charging) {
      push({ icon: "unplugged", title: "On battery", subtitle: "Power disconnected", trailing: `${pct}%`, tone: "#e5e7eb" });
    } else if (!battery.charging) {
      for (const t of [20, 10, 5]) {
        if (was.percent > t && battery.percent <= t) {
          push({ icon: "battery", title: "Battery low", subtitle: "Plug in soon", trailing: `${pct}%`, tone: "#f87171" });
          break;
        }
      }
    }
  }, [battery, allow, push]);
}

/* ====================================================================== */

/**
 * Tells the native watcher where the island is, so the window passes clicks
 * through everywhere else. Reports the union of where the shape is now and
 * where it is heading, extended to the very top of the screen so throwing the
 * pointer at the top edge counts.
 */
function useHitReport({ live, mode, shape, bubble, shapeRef, bubbleRef }: {
  live: boolean;
  mode: Mode;
  shape: Shape;
  bubble: boolean;
  shapeRef: React.RefObject<HTMLDivElement | null>;
  bubbleRef: React.RefObject<HTMLDivElement | null>;
}) {
  const last = useRef("");
  const frame = useRef(0);

  const report = useMemo(
    () => () => {
      if (!live) return;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        let rect: { x: number; y: number; w: number; h: number } | null = null;
        if (mode !== "hidden") {
          const W = ISLAND_WINDOW.width;
          const shift = bubble ? (BUBBLE + BUBBLE_GAP) / 2 : 0;
          let x0 = (W - shape.w) / 2 - shift;
          let x1 = x0 + shape.w;
          let y1 = ISLAND_TOP + shape.h;
          for (const el of [shapeRef.current, bubble ? bubbleRef.current : null]) {
            const r = el?.getBoundingClientRect();
            if (!r || r.width === 0) continue;
            x0 = Math.min(x0, r.left);
            x1 = Math.max(x1, r.right);
            y1 = Math.max(y1, r.bottom);
          }
          if (bubble) x1 = Math.max(x1, W / 2 + (SHAPES.media.w + BUBBLE_GAP + BUBBLE) / 2);
          const pad = 4;
          rect = { x: Math.round(x0 - pad), y: 0, w: Math.round(x1 - x0 + pad * 2), h: Math.round(y1 + pad) };
        }
        const sig = JSON.stringify(rect);
        if (sig === last.current) return;
        last.current = sig;
        void invoke("island_hit", { rect }).catch(() => {});
      });
    },
    [live, mode, shape, bubble, shapeRef, bubbleRef],
  );

  useEffect(() => {
    report();
    const el = shapeRef.current;
    if (!el || !live) return;
    // follow the shape through its spring so the hit area never lags behind
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [report, shapeRef, live]);
}

/* ====================================================================== */

/** Browser-only: fire each kind of pop-out to look at it. */
function DevPanel({ push }: { push: (a: Omit<Activity, "id" | "at">) => void }) {
  const fire: Record<string, Omit<Activity, "id" | "at">> = {
    track: { icon: "track", title: "Sunset", subtitle: "The Midnight", art: null },
    charging: { icon: "charging", title: "Charging", subtitle: "Power connected", trailing: "64%", tone: "#4ade80" },
    low: { icon: "battery", title: "Battery low", subtitle: "Plug in soon", trailing: "10%", tone: "#f87171" },
    focus: { icon: "focus", title: "Focus session done", subtitle: "Time for a break", tone: "var(--accent)" },
    note: { icon: "note", title: "Call the bank about the card", subtitle: "Saved to Notes", tone: "#fbbf24" },
  };
  return (
    <div className="island-dev">
      {Object.entries(fire).map(([k, a]) => (
        <button key={k} onClick={() => push(a)}>
          {k}
        </button>
      ))}
    </div>
  );
}
