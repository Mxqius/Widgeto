import type { DockZone } from "@/shared/types/geometry";
import type { Settings } from "@/shared/types/settings";
import type { WidgetInstance, WidgetKind } from "@/shared/types/widget";
import type { Area } from "./area";
import { resolveLang, type Lang } from "@/shared/i18n/locale";

/** One widget per kind, so the kind is the window label. */
export const labelFor = (kind: WidgetKind) => `w-${kind}`;

export const EVT = {
  /** manager -> one widget window: your config changed */
  config: (kind: WidgetKind) => `widget:config:${kind}`,
  /** widget window -> manager: I was dragged, here is where I landed */
  moved: "widget:moved",
  /** widget window -> manager: hide me / resize me / lock me */
  action: "widget:action",
  /** widget window -> manager: I am up, send me my config */
  hello: "widget:hello",
  /** widget window -> manager: persist this change to my own settings */
  config_set: "widget:config",
} as const;

/**
 * The shared settings a widget window actually reads. Broadcasting the whole
 * `Settings` object meant every unrelated tweak — an arrange mode, an update
 * preference — re-pushed config to all thirteen windows and re-rendered them.
 */
export interface WidgetSettings {
  /** resolved by the manager, so "system" is never sent */
  language: Lang;
  accent: string;
  widgetAlpha: number;
  blur: number;
  radius: number;
  margin: number;
  gridSize: number;
  snapToGrid: boolean;
  autoDock: boolean;
  dockThreshold: number;
  alignGuides: boolean;
  lockAll: boolean;
  clock24h: boolean;
  temperatureUnit: "C" | "F";
  powerSaver: Settings["powerSaver"];
  lowMemory: boolean;
  /** honour the user's ask for less movement: snap hard instead of gliding */
  reduceMotion: boolean;
}

export const WIDGET_SETTING_KEYS = [
  "language", "accent", "widgetAlpha", "blur", "radius", "margin", "gridSize",
  "snapToGrid", "autoDock", "dockThreshold", "alignGuides", "lockAll",
  "clock24h", "temperatureUnit", "powerSaver", "lowMemory", "reduceMotion",
] as const satisfies readonly (keyof WidgetSettings)[];

/** Narrow the full settings object down to the slice widgets consume. */
export function widgetSettingsOf(s: Settings): WidgetSettings {
  return {
    language: resolveLang(s.language),
    accent: s.accent,
    widgetAlpha: s.widgetAlpha,
    blur: s.blur,
    radius: s.radius,
    margin: s.margin,
    gridSize: s.gridSize,
    snapToGrid: s.snapToGrid,
    autoDock: s.autoDock,
    dockThreshold: s.dockThreshold,
    alignGuides: s.alignGuides,
    lockAll: s.lockAll,
    clock24h: s.clock24h,
    temperatureUnit: s.temperatureUnit,
    powerSaver: s.powerSaver,
    lowMemory: s.lowMemory,
    reduceMotion: s.reduceMotion,
  };
}

/**
 * What a widget window needs to render and drag itself — just its own record,
 * the shared settings and its monitor, rather than the whole store.
 */
export interface ConfigPayload {
  widget: WidgetInstance;
  settings: WidgetSettings;
  /** the widget's own monitor */
  area: Area;
  /** every monitor, so a drag can carry the widget onto another one */
  areas: Area[];
  /** rects of the other visible widgets on the same display, for alignment */
  neighbours: { x: number; y: number; w: number; h: number }[];
  /** read once by the manager and pushed out, for the power saver */
  onBattery: boolean;
}

export interface MovedPayload {
  kind: WidgetKind;
  /** position local to `display`'s work area */
  x: number;
  y: number;
  dock: DockZone | null;
  /** which monitor the widget was dropped on */
  display: number;
}

export interface ActionPayload {
  kind: WidgetKind;
  action: "hide" | "cycle-size" | "lock";
}

export interface ConfigSetPayload {
  kind: WidgetKind;
  patch: Record<string, unknown>;
}
