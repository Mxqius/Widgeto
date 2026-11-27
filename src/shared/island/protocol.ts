/**
 * The Dynamic Island is its own window kind: one always-on-top strip at the
 * top centre of the primary display. The manager owns its lifetime and pushes
 * it a small config; everything else — media, battery, the focus timer — the
 * island reads for itself.
 */
import type { AiTarget } from "@/shared/ai/client";
import type { IslandAlign, IslandIdle, IslandStyle, IslandTab } from "@/shared/types/settings";

export const ISLAND_LABEL = "island";

/**
 * The OS window is fixed at the largest the island can get — a stretched-out
 * Ask chat at the biggest scale — and the island morphs inside it. Everything
 * outside the island's shape is click-through, so the spare room costs nothing
 * but a little transparent surface.
 */
export const ISLAND_WINDOW = { width: 820, height: 600 } as const;

/** Room kept between the island and the window's side when it hugs one: enough for the notch's widest corner. */
export const ISLAND_SIDE_PAD = 36;

export const ISLAND_EVT = {
  /** manager -> island: here is your config */
  config: "island:config",
  /** island -> manager: I am up, send me my config */
  hello: "island:hello",
  /** native -> island: the pointer entered or left the island's shape */
  hover: "island:hover",
  /** native -> island: a full-screen app or presentation took over */
  fullscreen: "island:fullscreen",
  /** native -> island: the system volume or mute changed */
  volume: "island:volume",
  /** native -> island: which apps are using the mic and camera */
  privacy: "island:privacy",
  /** native -> island: Caps Lock toggled */
  caps: "island:caps",
  /** manager -> island: the Ask hotkey was pressed */
  ask: "island:ask",
  /** manager or tray -> island: tuck into the top edge (true), come back (false) or toggle (null) */
  tuck: "island:tuck",
  /** manager -> island: a newer version is ready to install (payload: the version) */
  update: "island:update",
} as const;

/** Apps using the microphone and the camera right now. */
export interface Privacy {
  mic: string[];
  camera: string[];
}

export interface IslandConfig {
  accent: string;
  clock24h: boolean;
  temperatureUnit: "C" | "F";
  reduceMotion: boolean;
  /** brief pop-outs for track changes, charging, timers and captured notes */
  activities: boolean;
  /** slide away while a full-screen app or game is in front */
  hideInFullscreen: boolean;
  /** a floating pill, or a notch hanging from the top edge */
  style: IslandStyle;
  /** which side of its window the island hugs; the window itself is placed by the manager */
  align: IslandAlign;
  /** gap above the pill, in island units */
  top: number;
  scale: number;
  roundness: number;
  opacity: number;
  earSize: number;
  openOn: "hover" | "click";
  openDelay: number;
  wheelVolume: boolean;
  defaultTab: "auto" | IslandTab;
  /** tabs the user switched off; Ask is governed by `ai` */
  hiddenTabs: IslandTab[];
  idle: IslandIdle;
  /** the Weather widget's place, reused so the island needs no setting of its own */
  weatherPlace: string | null;
  focus: { focusMin: number; shortMin: number; longMin: number };
  /** null while Ask AI is switched off */
  ai: (AiTarget & { hotkey: string }) | null;
}
