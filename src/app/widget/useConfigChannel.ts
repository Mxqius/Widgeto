import { useCallback, useEffect, useState } from "react";
import type { WidgetKind } from "@/shared/types/widget";
import { EVT, type ActionPayload, type ConfigPayload } from "@/shared/desktop/protocol";
import { isTauri } from "@/shared/lib/env";
import { previewConfig } from "./previewConfig";

/**
 * The widget window's only link to the rest of the app: the manager pushes
 * this window's slice of state over the event bus, and button presses go back
 * the same way. Deliberately not the zustand store — this window needs one
 * record, and importing the store would pull the whole manager model with it.
 */
export function useConfigChannel(kind: WidgetKind) {
  const [cfg, setCfg] = useState<ConfigPayload | null>(() =>
    isTauri() ? null : previewConfig(kind),
  );

  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    let alive = true;
    (async () => {
      const { listen, emit } = await import("@tauri-apps/api/event");
      const off = await listen<ConfigPayload>(EVT.config(kind), (e) => {
        if (alive) setCfg(e.payload);
      });
      if (alive) un = off;
      else off();
      await emit(EVT.hello, { kind });
    })();
    return () => {
      alive = false;
      un?.();
    };
  }, [kind]);

  /* --------------------------------------------------------------- theme */
  const accent = cfg?.settings.accent;
  const widgetAlpha = cfg?.settings.widgetAlpha;
  const blur = cfg?.settings.blur;
  const lowMemory = cfg?.settings.lowMemory;

  useEffect(() => {
    if (accent === undefined) return;
    const r = document.documentElement.style;
    r.setProperty("--accent", accent);
    r.setProperty("--widget-alpha", String(widgetAlpha));
    // Low-memory mode drops the blur: every translucent tile otherwise needs
    // its own compositing layer plus a snapshot of what is behind it.
    r.setProperty("--widget-blur", lowMemory ? "0px" : `${blur}px`);
  }, [accent, widgetAlpha, blur, lowMemory]);

  const send = useCallback(
    async (action: ActionPayload["action"]) => {
      if (!isTauri()) return;
      const { emit } = await import("@tauri-apps/api/event");
      await emit(EVT.action, { kind, action } satisfies ActionPayload);
    },
    [kind],
  );

  return { cfg, setCfg, send };
}
