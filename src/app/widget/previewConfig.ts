import type { SizeKey, WidgetKind } from "@/shared/types/widget";
import { BROWSER_AREA } from "@/shared/desktop/area";
import { widgetSettingsOf, type ConfigPayload } from "@/shared/desktop/protocol";
import { DEFAULT_SETTINGS } from "@/shared/settings/defaults";

/**
 * Outside Tauri there is no manager to talk to, so render a default tile.
 * `&size=`, `&accent=` and `&theme=` let the browser preview exercise each
 * tile size and the per-widget appearance overrides.
 */
export function previewConfig(kind: WidgetKind): ConfigPayload {
  const p = new URLSearchParams(window.location.search);
  const q = p.get("size");
  const size: SizeKey = q === "sm" || q === "lg" ? q : "md";
  const t = p.get("theme");
  const accent = p.get("accent") ?? undefined;
  const theme = t === "dark" || t === "light" ? t : undefined;
  return {
    widget: {
      kind,
      size,
      x: 0,
      y: 0,
      z: 1,
      locked: false,
      dock: null,
      alpha: 1,
      open: true,
      display: 0,
      accent: accent ? `#${accent.replace(/^#/, "")}` : undefined,
      theme,
    },
    settings: widgetSettingsOf(DEFAULT_SETTINGS),
    area: BROWSER_AREA,
    areas: [BROWSER_AREA],
    neighbours: [],
    onBattery: false,
  };
}
