import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  fetchBattery, fetchNet, fetchSystem, fetchWeather,
  type BatteryStats,
} from "@/shared/ipc/commands";
import { ISLAND_EVT, ISLAND_SIDE_PAD, ISLAND_WINDOW, type Privacy } from "@/shared/island/protocol";
import type { IslandAlign } from "@/shared/types/settings";
import { isTauri } from "@/shared/lib/env";
import { invoke, useIslandBridge, useTauriEvent, type Simulate } from "./data/bridge";
import { useVolume } from "./data/useVolume";
import { useIslandMedia } from "./data/useMedia";
import { useFocus, type FocusMode } from "./data/useFocus";
import { useActivities, type Activity } from "./data/useActivities";
import { useAsk } from "./data/useAsk";
import { useNow, usePoll, useSettled } from "./data/usePoll";
import { SAMPLE_BATTERY, SAMPLE_NET, SAMPLE_SYSTEM, SAMPLE_WEATHER } from "./data/sample";
import { CALM, GROW, SETTLE } from "./lib/spring";
import { chime } from "./lib/chime";
import { IdleCompact, MediaCompact, PrivacyDots, TimerBubble, TimerCompact, VolumeHud } from "./views/Compact";
import { CAMERA_TONE, MIC_TONE } from "./views/glyphs";
import { Toast } from "./views/Toast";
import { TuckHandle } from "./views/TuckHandle";
import { Expanded, TAB_ORDER, type Tab } from "./views/Expanded";

type Mode = "hidden" | "tucked" | "idle" | "media" | "timer" | "volume" | "toast" | "expanded";

interface Shape {
  w: number;
  h: number;
  r: number;
}

const SHAPES: Record<Mode, Shape> = {
  hidden: { w: 150, h: 30, r: 15 },
  tucked: { w: 64, h: 8, r: 8 },
  idle: { w: 176, h: 34, r: 17 },
  media: { w: 236, h: 34, r: 17 },
  timer: { w: 216, h: 34, r: 17 },
  volume: { w: 264, h: 38, r: 19 },
  toast: { w: 372, h: 70, r: 34 },
  expanded: { w: 468, h: 192, r: 40 },
};

/** Extra pill width per privacy dot. */
const DOT_W = 13;
/** How long the volume pop-out lingers after the last change. */
const HUD_MS = 1400;
/** The Ask tab opens taller once there is an answer to read. */
const ASK_H = 264;
/** How long the hotkey holds the island open waiting for the field to take focus. */
const ASK_HOLD_MS = 4000;
/** One notch of the scroll wheel over the island. */
const WHEEL_STEP = 0.04;

/** The tucked handle reaches out a little under the pointer, to say "click me". */
const TUCKED_HOVER: Shape = { w: 92, h: 12, r: 10 };
/** Remembered across restarts: tucking it away is a choice, not a moment. */
const TUCK_KEY = "widgeto.island.tucked";
const readTucked = () => {
  try {
    return localStorage.getItem(TUCK_KEY) === "1";
  } catch {
    return false;
  }
};

/** Notch style: how far the top corners flare into the screen edge, from a share of the bottom radius. */
const EAR_MIN = 4;
const EAR_MAX = 32;
const earOf = (s: Shape, ratio: number) => Math.round(Math.min(EAR_MAX, Math.max(EAR_MIN, s.r * ratio)));

const BUBBLE = 34;
const BUBBLE_GAP = 8;

/** Bigger shapes grow with a little bounce; smaller ones settle flat. */
const area = (s: Shape) => s.w * s.h;

/** Hover out: close quickly, with just enough grace to forgive a pointer grazing the edge. (Hover in is a setting.) */
const CLOSE_DELAY = 120;

/** Where the island (and the bubble beside it) starts, in island units across its window. */
const leftOf = (align: IslandAlign, width: number, room: number) =>
  align === "left" ? ISLAND_SIDE_PAD : align === "right" ? room - ISLAND_SIDE_PAD - width : (room - width) / 2;

export default function Island() {
  const live = isTauri();
  const { cfg, nativeHover, fullscreen, volume: nativeVolume, privacy, caps, simulate } = useIslandBridge();

  /* ---------------------------------------------------------------- hover */
  const [domHover, setDomHover] = useState(false);
  // In the app the native watcher decides: once cursor events are switched
  // off, the page never hears the pointer leave.
  const hover = live ? nativeHover : domHover;
  const hoverRef = useRef(hover);
  hoverRef.current = hover;
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  // set to click-to-open, a click opens it and it stays until the pointer leaves
  const clickOnly = cfg.openOn === "click";
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    if (!hover) setClicked(false);
  }, [hover]);

  /* ----------------------------------------------------------------- tuck */
  // Tucked, the island shrinks to a slim handle on the top edge and stays out
  // of the way of tab strips and title bars: hovering it no longer opens it.
  const [tucked, setTuckedState] = useState(readTucked);
  const tuckedRef = useRef(tucked);
  tuckedRef.current = tucked;
  // which way it last moved: a squash on the way in, a drop on the way out
  const [tuckAnim, setTuckAnim] = useState<"in" | "out" | undefined>(undefined);
  // after coming back, wait for the pointer to leave before hover opens it
  const [hoverHold, setHoverHold] = useState(false);
  useEffect(() => {
    if (!hover) setHoverHold(false);
  }, [hover]);

  const setTucked = useCallback((next: boolean) => {
    if (next === tuckedRef.current) return;
    tuckedRef.current = next;
    setTuckedState(next);
    setTuckAnim(next ? "in" : "out");
    try {
      localStorage.setItem(TUCK_KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable: it just won't be remembered */
    }
    if (next) {
      (document.activeElement as HTMLElement | null)?.blur();
      setExpanded(false);
      setHud(false);
    } else {
      setHoverHold(hoverRef.current);
    }
  }, []);
  useTauriEvent<boolean | null>(ISLAND_EVT.tuck, (v) => setTucked(v ?? !tuckedRef.current));

  /* ------------------------------------------------------------------ ask */
  const ai = cfg.ai;
  const ask = useAsk(ai);
  // typing or waiting on an answer holds the island open after the pointer leaves
  const [askFocused, setAskFocused] = useState(false);
  const [askHold, setAskHold] = useState(false);
  const [askSignal, setAskSignal] = useState(0);
  const askOpening = useRef(false);
  const pinned = askFocused || askHold || ask.streaming;
  const onAskFocus = useCallback((f: boolean) => {
    setAskFocused(f);
    if (f) setAskHold(false);
  }, []);
  useEffect(() => {
    if (!askHold) return;
    const t = setTimeout(() => setAskHold(false), ASK_HOLD_MS);
    return () => clearTimeout(t);
  }, [askHold]);

  // the tabs switched on, in their usual order; Ask needs AI switched on too
  const hasAi = !!ai;
  const hiddenKey = cfg.hiddenTabs.join(",");
  const tabs = useMemo<Tab[]>(() => {
    const off = hiddenKey.split(",");
    const on = TAB_ORDER.filter((t) => (t === "ask" ? hasAi : !off.includes(t)));
    return on.length ? on : ["today"];
  }, [hasAi, hiddenKey]);
  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
  }, [tabs, tab]);

  const openAsk = useCallback(() => {
    // the Ask hotkey always brings it back
    setTucked(false);
    askOpening.current = true;
    setTab("ask");
    setAskHold(true);
    setExpanded(true);
    setAskSignal((n) => n + 1);
    if (isTauri()) {
      // the hotkey grants this app the foreground, so the field can take keys
      void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
        getCurrentWindow().setFocus().catch(() => {}),
      );
    }
  }, [setTucked]);
  useTauriEvent<null>(ISLAND_EVT.ask, () => openAsk());

  const closeAsk = useCallback(() => {
    setAskHold(false);
    (document.activeElement as HTMLElement | null)?.blur();
    setExpanded(false);
  }, []);

  const byPointer = clickOnly ? clicked && hover : hover && !hoverHold;
  const want = (byPointer || pinned) && !tucked;
  const openDelay = clickOnly ? 0 : cfg.openDelay;
  useEffect(() => {
    const t = setTimeout(() => setExpanded(want), want ? openDelay : CLOSE_DELAY);
    return () => clearTimeout(t);
    // the delay only matters on the way in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want]);
  const open = useCallback(() => {
    setClicked(true);
    setExpanded(true);
  }, []);

  /* ----------------------------------------------------------------- feeds */
  const track = useIslandMedia();
  const { data: battery } = usePoll(fetchBattery, 20_000, live, live ? undefined : SAMPLE_BATTERY);
  // the Weather widget's city: follow it as soon as it changes, once typing settles
  const place = useSettled(cfg.weatherPlace, 800);
  const weatherFn = useCallback(() => fetchWeather(place ?? ""), [place]);
  const { data: weatherRaw } = usePoll(
    weatherFn,
    15 * 60_000,
    live && !!place,
    live ? undefined : SAMPLE_WEATHER,
    place,
  );
  const weather = live && !place ? undefined : weatherRaw;

  // tucked, pop-outs wait (and go stale) instead of covering the top of the screen
  const activities = useActivities(expanded || tucked || (fullscreen && cfg.hideInFullscreen));
  const { push: queueActivity } = activities;
  // ...and the handle glows briefly in the activity's colour instead
  const [ping, setPing] = useState({ n: 0, tone: "#fff" });
  const push = useCallback(
    (a: Omit<Activity, "id" | "at">) => {
      queueActivity(a);
      if (tuckedRef.current) setPing((p) => ({ n: p.n + 1, tone: a.tone ?? "#fff" }));
    },
    [queueActivity],
  );

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

  const sysActive = expanded && tab === "system";
  const { data: system } = usePoll(fetchSystem, 2000, live && sysActive, live ? undefined : SAMPLE_SYSTEM);
  const { data: net } = usePoll(fetchNet, 2000, live && sysActive, live ? undefined : SAMPLE_NET);

  const now = useNow(1000);

  /* ---------------------------------------------------------------- volume */
  const [hud, setHud] = useState(false);
  const hudTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const allowHudRef = useRef(cfg.activities);
  allowHudRef.current = cfg.activities;
  const showHud = useCallback(() => {
    // the open panel already has a slider; a pop-out on top would be noise
    if (expandedRef.current || tuckedRef.current || !allowHudRef.current) return;
    setHud(true);
    clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setHud(false), HUD_MS);
  }, []);
  useEffect(() => () => clearTimeout(hudTimer.current), []);
  useEffect(() => {
    if (expanded) setHud(false);
  }, [expanded]);

  const volume = useVolume(nativeVolume, live, showHud);

  // changes made outside the island — the keyboard keys, the mixer
  const baseVolume = useRef(nativeVolume);
  useEffect(() => {
    const was = baseVolume.current;
    baseVolume.current = nativeVolume;
    if (!was || !nativeVolume) return;
    if (was.muted !== nativeVolume.muted || Math.abs(was.level - nativeVolume.level) > 0.004) showHud();
  }, [nativeVolume, showHud]);

  // scroll anywhere on the island to change the volume
  const wheelAcc = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    if (tucked || !cfg.wheelVolume) return;
    // the Ask tab scrolls its answer instead
    if (expanded && tab === "ask") return;
    wheelAcc.current += e.deltaY;
    if (Math.abs(wheelAcc.current) < 40) return;
    volume.nudge(wheelAcc.current < 0 ? WHEEL_STEP : -WHEEL_STEP);
    wheelAcc.current = 0;
  };

  /* ------------------------------------------------------------ activities */
  const allow = cfg.activities;
  useActivityTriggers({ allow, push, track, battery });
  usePresenceTriggers({ allow, push, privacy, caps });
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

  // a new version is out; the dialog is waiting in the manager
  useTauriEvent<string>(ISLAND_EVT.update, (version) => {
    if (!allowRef.current) return;
    push({
      icon: "update",
      title: `Widgeto ${version} is ready`,
      subtitle: "Open Widgeto from the tray to install",
      trailing: "New",
      tone: "#a78bff",
      ms: 7000,
    });
  });

  /* ------------------------------------------------------------ open on a tab */
  // pick the tab that matches what is going on, every time the island opens
  useEffect(() => {
    if (!expanded) return;
    if (askOpening.current) {
      askOpening.current = false;
      return;
    }
    // a conversation still being read keeps its place
    if (tab === "ask" && (ask.turns.length > 0 || ask.streaming)) return;
    if (cfg.defaultTab !== "auto" && tabs.includes(cfg.defaultTab)) return setTab(cfg.defaultTab);
    const wanted: Tab[] = [
      ...(track.media?.playing ? (["media"] as const) : []),
      ...(focus.active ? (["focus"] as const) : []),
      ...(track.media?.title ? (["media"] as const) : []),
      "today",
    ];
    setTab(wanted.find((t) => tabs.includes(t)) ?? tabs[0]);
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  /* ------------------------------------------------------------------ mode */
  const hidden = fullscreen && cfg.hideInFullscreen && !expanded;
  const toast = activities.current;
  const playing = !!track.media?.playing;
  const mode: Mode = hidden
    ? "hidden"
    : tucked
      ? "tucked"
      : expanded
        ? "expanded"
        : hud
          ? "volume"
          : toast
            ? "toast"
            : playing
              ? "media"
              : focus.active
                ? "timer"
                : "idle";
  const bubble = mode === "media" && focus.active;

  // the pill grows a little to make room for the privacy dots
  const camOn = privacy.camera.length > 0;
  const micOn = privacy.mic.length > 0;
  const compact = mode === "idle" || mode === "media" || mode === "timer";
  const extra = compact ? (camOn ? DOT_W : 0) + (micOn ? DOT_W : 0) + (camOn || micOn ? 4 : 0) : 0;
  const base = mode === "tucked" && hover ? TUCKED_HOVER : SHAPES[mode];

  // the window, in island units: everything inside is drawn at `scale`
  const scale = cfg.scale;
  const room = { w: ISLAND_WINDOW.width / scale, h: ISLAND_WINDOW.height / scale };
  const notch = cfg.style === "notch";
  const top = notch ? 0 : cfg.top;

  const shape = useMemo<Shape>(
    () => ({
      w: base.w + extra,
      h: mode === "expanded" && tab === "ask" && (ask.turns.length > 0 || ask.streaming) ? ASK_H : base.h,
      r: base.r,
    }),
    [base, extra, mode, tab, ask.turns.length, ask.streaming],
  );

  // the spring follows the direction of the change
  const prevShape = useRef(shape);
  const motion = cfg.reduceMotion ? CALM : area(shape) >= area(prevShape.current) ? GROW : SETTLE;
  useEffect(() => {
    prevShape.current = shape;
  }, [shape]);

  // the notch hangs from the top edge itself, and flares into it at the corners
  const ear = notch ? earOf(shape, cfg.earSize) : 0;
  // the island and its bubble are placed as a pair on the chosen side
  const pairW = shape.w + (bubble ? BUBBLE_GAP + BUBBLE : 0);
  const x = leftOf(cfg.align, pairW, room.w);

  /* ------------------------------------------------------ native hit area */
  const shapeRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  useHitReport({ live, mode, shape, x, pairW, top, ear, scale, shapeRef, bubbleRef });

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
          tabs={tabs}
          setTab={setTab}
          onTuck={() => setTucked(true)}
          now={now}
          h24={cfg.clock24h}
          track={track}
          focus={focus}
          battery={battery}
          system={system}
          net={net}
          weather={weather}
          temp={temp}
          volume={volume}
          privacy={privacy}
          ai={ai}
          ask={ask}
          askSignal={askSignal}
          onAskFocus={onAskFocus}
          onClose={closeAsk}
        />
      );
      break;
    case "volume":
      content = <VolumeHud v={volume.vol} />;
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
    case "tucked":
      content = (
        <TuckHandle
          hover={hover}
          tone={playing ? (track.tint ?? "#fff") : focus.active ? "var(--accent)" : null}
          live={playing || focus.active}
          ping={ping}
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
        <IdleCompact
          now={new Date(now)}
          h24={cfg.clock24h}
          show={cfg.idle}
          battery={battery}
          weather={weather}
          temp={temp}
        />
      );
  }

  const transition = `${motion.ms}ms ${motion.easing}`;
  const radius = Math.round(shape.r * cfg.roundness);
  // tucked, or as a notch, it hangs from the top edge: square on top, round underneath
  const corner = mode === "tucked" || notch ? 0 : radius;
  const lift = mode === "tucked" && !notch ? `translateY(${-top}px)` : hidden ? "translateY(-56px) scale(0.7)" : "none";
  const moves = `width ${transition}, height ${transition}, left ${transition}, transform ${transition}`;

  return (
    <div
      className="island-stage"
      data-style={notch ? "notch" : "pill"}
      data-mode={mode}
      data-tuck={tuckAnim}
      data-reduce={cfg.reduceMotion || undefined}
      style={{
        // drawn in island units and zoomed, so the hit maths stays in one space
        zoom: scale,
        width: `${100 / scale}%`,
        height: `${100 / scale}%`,
        ["--island-bg" as string]: `rgba(0, 0, 0, ${cfg.opacity})`,
      }}
    >
      <div
        ref={shapeRef}
        className="island-shape"
        style={{
          top,
          left: x,
          width: shape.w,
          height: shape.h,
          borderRadius: `${corner}px ${corner}px ${radius}px ${radius}px`,
          transition: `${moves}, border-radius ${transition}, opacity 260ms ease, box-shadow 400ms ease`,
          transform: lift,
        }}
        onMouseEnter={live ? undefined : () => setDomHover(true)}
        onMouseLeave={live ? undefined : () => setDomHover(false)}
        onClick={() => {
          if (tucked) setTucked(false);
          else if (!expanded) open();
        }}
        // right-click tucks it into the top edge, and brings it back
        onContextMenu={(e) => {
          e.preventDefault();
          setTucked(!tucked);
        }}
        onWheel={onWheel}
      >
        <Crossfade k={key} w={shape.w - extra} h={shape.h} shift={-extra / 2}>
          {content}
        </Crossfade>
        {extra > 0 && <PrivacyDots camera={camOn} mic={micOn} />}
      </div>

      {notch && (
        // the two concave fillets that join the notch to the top edge; they
        // ride the same spring as the shape, so they stay glued to its corners
        <div
          className="island-ears"
          aria-hidden
          style={{
            left: x,
            width: shape.w,
            height: ear,
            transition: `${moves}, opacity 260ms ease`,
            transform: lift,
          }}
        >
          <i />
          <i />
        </div>
      )}

      <div
        ref={bubbleRef}
        className="island-bubble"
        style={{
          top,
          // tucked in behind the island's end until it has something to show
          left: bubble ? x + shape.w + BUBBLE_GAP : x + shape.w - BUBBLE,
          transition: `left ${transition}, transform ${transition}, opacity 220ms ease`,
          opacity: bubble ? 1 : 0,
          transform: bubble ? "scale(1)" : "scale(0.4)",
        }}
        onMouseEnter={live ? undefined : () => setDomHover(true)}
        onMouseLeave={live ? undefined : () => setDomHover(false)}
        onClick={open}
      >
        {focus.active && <TimerBubble focus={focus} />}
      </div>

      {simulate && import.meta.env.DEV && (
        <DevPanel push={push} simulate={simulate} nudge={volume.nudge} openAsk={openAsk} tuck={() => setTucked(!tucked)} />
      )}
    </div>
  );
}

/* ====================================================================== */

/**
 * Keeps the outgoing view for a moment so it can fade while the new one fades
 * in. Each layer is laid out at its own target size and centred, so content
 * never reflows while the shape morphs around it — the shape reveals it.
 */
function Crossfade({ k, w, h, shift = 0, children }: {
  k: string;
  w: number;
  h: number;
  /** horizontal offset from centre, to leave room for the privacy dots */
  shift?: number;
  children: ReactNode;
}) {
  type Layer = { k: string; node: ReactNode; w: number; h: number; shift: number };
  const [leaving, setLeaving] = useState<Layer[]>([]);
  const prev = useRef<Layer>({ k, node: children, w, h, shift });

  useLayoutEffect(() => {
    if (prev.current.k === k) return;
    const old = prev.current;
    setLeaving((l) => [...l.filter((x) => x.k !== old.k && x.k !== k), old]);
    const t = setTimeout(() => setLeaving((l) => l.filter((x) => x !== old)), 160);
    return () => clearTimeout(t);
  }, [k]);
  useLayoutEffect(() => {
    prev.current = { k, node: children, w, h, shift };
  });

  return (
    <>
      {leaving.map((l) => (
        <div
          key={l.k}
          className="island-layer is-leaving"
          style={{ width: l.w, height: l.h, marginLeft: l.shift }}
          aria-hidden
        >
          {l.node}
        </div>
      ))}
      <div key={k} className="island-layer is-entering" style={{ width: w, height: h, marginLeft: shift }}>
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

/**
 * Pop-outs for things the native watcher sees: an app starting to use the
 * microphone or camera, and Caps Lock. The first reading is the baseline, so
 * a call already running when the app starts does not announce itself.
 */
function usePresenceTriggers({ allow, push, privacy, caps }: {
  allow: boolean;
  push: (a: Omit<Activity, "id" | "at">) => void;
  privacy: Privacy;
  caps: boolean | undefined;
}) {
  const lastPrivacy = useRef<Privacy | null>(null);
  useEffect(() => {
    const was = lastPrivacy.current;
    lastPrivacy.current = privacy;
    if (!was || !allow) return;
    const fresh = (now: string[], then: string[]) => now.filter((a) => !then.includes(a));
    const cam = fresh(privacy.camera, was.camera);
    const mic = fresh(privacy.mic, was.mic);
    if (cam.length) {
      push({ icon: "camera", title: cam.join(", "), subtitle: "Camera is on", tone: CAMERA_TONE, ms: 2600 });
    } else if (mic.length) {
      push({ icon: "mic", title: mic.join(", "), subtitle: "Microphone is on", tone: MIC_TONE, ms: 2600 });
    }
  }, [privacy, allow, push]);

  const lastCaps = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    const was = lastCaps.current;
    lastCaps.current = caps;
    if (was === undefined || caps === undefined || was === caps || !allow) return;
    push({
      icon: "caps",
      title: caps ? "Caps Lock on" : "Caps Lock off",
      subtitle: "Keyboard",
      tone: caps ? "#fff" : "rgba(255,255,255,0.5)",
      ms: 1300,
    });
  }, [caps, allow, push]);
}

/* ====================================================================== */

/**
 * Tells the native watcher where the island is, so the window passes clicks
 * through everywhere else. Reports the union of where the shape is now and
 * where it is heading, extended to the very top of the screen so throwing the
 * pointer at the top edge counts. The page is zoomed, so island units are
 * turned into window pixels on the way out.
 */
function useHitReport({ live, mode, shape, x, pairW, top, ear, scale, shapeRef, bubbleRef }: {
  live: boolean;
  mode: Mode;
  shape: Shape;
  /** left of the island, in island units */
  x: number;
  /** the island plus its bubble, in island units */
  pairW: number;
  top: number;
  ear: number;
  scale: number;
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
          const tuck = mode === "tucked";
          let x0 = (x - ear) * scale;
          let x1 = (x + pairW + ear) * scale;
          let y1 = ((tuck ? 0 : top) + shape.h) * scale;
          for (const el of [shapeRef.current, bubbleRef.current]) {
            const r = el?.getBoundingClientRect();
            if (!r || r.width === 0 || el?.style.opacity === "0") continue;
            x0 = Math.min(x0, r.left);
            x1 = Math.max(x1, r.right);
            y1 = Math.max(y1, r.bottom);
          }
          // the handle is thin; give the pointer a little more to land on
          const pad = tuck ? 6 : 4;
          rect = { x: Math.round(x0 - pad), y: 0, w: Math.round(x1 - x0 + pad * 2), h: Math.round(y1 + pad) };
        }
        const sig = JSON.stringify(rect);
        if (sig === last.current) return;
        last.current = sig;
        void invoke("island_hit", { rect }).catch(() => {});
      });
    },
    [live, mode, shape, x, pairW, top, ear, scale, shapeRef, bubbleRef],
  );

  useEffect(() => {
    report();
    const el = shapeRef.current;
    if (!el || !live) return;
    // follow the shape through its spring so the hit area never lags behind
    const ro = new ResizeObserver(report);
    ro.observe(el);
    // a move with no change of size (sliding into the top edge) ends here
    el.addEventListener("transitionend", report);
    el.addEventListener("animationend", report);
    return () => {
      ro.disconnect();
      el.removeEventListener("transitionend", report);
      el.removeEventListener("animationend", report);
    };
  }, [report, shapeRef, live]);
}

/* ====================================================================== */

/** Browser-only: fire each kind of pop-out to look at it. */
function DevPanel({ push, simulate, nudge, openAsk, tuck }: {
  push: (a: Omit<Activity, "id" | "at">) => void;
  simulate: Simulate;
  nudge: (d: number) => void;
  openAsk: () => void;
  tuck: () => void;
}) {
  const fire: Record<string, Omit<Activity, "id" | "at">> = {
    track: { icon: "track", title: "Sunset", subtitle: "The Midnight", art: null },
    charging: { icon: "charging", title: "Charging", subtitle: "Power connected", trailing: "64%", tone: "#4ade80" },
    low: { icon: "battery", title: "Battery low", subtitle: "Plug in soon", trailing: "10%", tone: "#f87171" },
    focus: { icon: "focus", title: "Focus session done", subtitle: "Time for a break", tone: "var(--accent)" },
    note: { icon: "note", title: "Call the bank about the card", subtitle: "Saved to Notes", tone: "#fbbf24" },
    update: { icon: "update", title: "Widgeto 0.2.0 is ready", subtitle: "Open Widgeto from the tray to install", trailing: "New", tone: "#a78bff", ms: 7000 },
  };
  return (
    <div className="island-dev">
      {Object.entries(fire).map(([k, a]) => (
        <button key={k} onClick={() => push(a)}>
          {k}
        </button>
      ))}
      <button onClick={() => nudge(0.06)}>vol+</button>
      <button onClick={() => simulate.setVolume((v) => v && { ...v, level: Math.max(0, v.level - 0.06) })}>
        keys-
      </button>
      <button
        onClick={() =>
          simulate.setPrivacy((p) => (p.mic.length ? { mic: [], camera: [] } : { mic: ["Zoom"], camera: ["Zoom"] }))
        }
      >
        zoom
      </button>
      <button onClick={() => simulate.setCaps((c) => !c)}>caps</button>
      <button onClick={openAsk}>ask</button>
      <button onClick={tuck}>tuck</button>
      <button onClick={() => simulate.setCfg((c) => ({ ...c, style: c.style === "notch" ? "pill" : "notch" }))}>
        shape
      </button>
    </div>
  );
}
