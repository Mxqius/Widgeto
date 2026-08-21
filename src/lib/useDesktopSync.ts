import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@/store/useApp";
import { sizeOf } from "@/widgets/registry";
import type { WidgetKind } from "./types";
import {
  EVT,
  applied,
  applyLayer,
  closeWidgetWindow,
  labelFor,
  listAreas,
  moveWidgetWindow,
  openWidgetWindow,
  resizeWidgetWindow,
  type ActionPayload,
  type Applied,
  type ConfigPayload,
  type MovedPayload,
} from "./desktop";
import { isTauri } from "./utils";
import { fetchBattery } from "./data";

/** Monitor layout rarely changes; polling often just burns IPC. */
const MONITOR_POLL_MS = 30_000;

/**
 * Keeps the real OS windows in step with the store: spawns and closes widget
 * windows, pushes position/size/layer changes out, and takes drag results and
 * button presses back in from the widget windows.
 */
export function useDesktopSync() {
  const widgets = useApp((s) => s.widgets);
  const layer = useApp((s) => s.settings.layer);
  const setAreas = useApp((s) => s.setAreas);

  // Reconciliation only cares about these fields — not every settings tweak.
  const signature = useMemo(
    () =>
      widgets
        .map((w) =>
          w.open ? `${w.kind}:${Math.round(w.x)}:${Math.round(w.y)}:${w.size}:${w.display}` : "",
        )
        .filter(Boolean)
        .join("|") + `#${layer}`,
    [widgets, layer],
  );

  /* -------------------------------------------------- monitors --------- */
  useEffect(() => {
    let alive = true;
    const read = async () => {
      const areas = await listAreas();
      if (alive) setAreas(areas);
    };
    void read();
    const t = setInterval(read, MONITOR_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [setAreas]);

  /* --------------------------------------- inbound events from widgets - */
  useEffect(() => {
    if (!isTauri()) return;
    const uns: Array<() => void> = [];
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");

      uns.push(
        await listen<{ kind: WidgetKind }>(EVT.hello, (e) => {
          void broadcast(e.payload.kind);
        }),
      );

      uns.push(
        await listen<MovedPayload>(EVT.moved, (e) => {
          const { kind, x, y, dock, display } = e.payload;
          // the window is already there — record it so we do not move it back
          const a = applied.get(kind);
          if (a) {
            a.x = Math.round(x);
            a.y = Math.round(y);
            a.display = display;
          }
          const st = useApp.getState();
          if (st.widgets.find((w) => w.kind === kind)?.display !== display) {
            st.setDisplay(kind, display);
          }
          st.move(kind, x, y, dock);
        }),
      );

      uns.push(
        await listen<ActionPayload>(EVT.action, (e) => {
          const { kind, action } = e.payload;
          const st = useApp.getState();
          if (action === "hide") st.setOpen(kind, false);
          if (action === "cycle-size") st.cycleSize(kind);
          if (action === "lock") st.toggleLock(kind);
        }),
      );
    })();
    return () => uns.forEach((u) => u());
  }, []);

  /* ------------------------------------------- outbound reconciliation -
   * Runs strictly one at a time. Creating a webview window takes a moment, so
   * a re-render mid-flight must not abort the pass — it queues another one.  */
  const running = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    if (!isTauri()) return;

    const pass = async () => {
      if (running.current) {
        pending.current = true;
        return;
      }
      running.current = true;
      try {
        do {
          pending.current = false;
          await reconcile(applied);
        } while (pending.current);
      } finally {
        running.current = false;
      }
    };

    void pass();
  }, [signature]);

  /* ------------------------------- one battery read for the whole app -- */
  const powerSaver = useApp((s) => s.settings.powerSaver);
  useEffect(() => {
    let alive = true;
    const read = async () => {
      const before = batteryState.onBattery;
      await refreshBatteryState(powerSaver === "onBattery");
      // only re-push when the answer actually flipped
      if (alive && before !== batteryState.onBattery) void broadcastAll();
    };
    void read();
    const t = setInterval(read, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [powerSaver]);

  /* ----------------- shared appearance settings -> every open widget --- */
  const appearance = useApp((s) => s.settings);
  useEffect(() => {
    if (!isTauri()) return;
    // coalesce slider drags into one push per frame batch
    const t = setTimeout(() => void broadcastAll(), 80);
    return () => clearTimeout(t);
  }, [appearance]);

}

/** One full pass: create, close, move, resize and re-layer every widget window. */
async function reconcile(applied: Map<WidgetKind, Applied>) {
  const { widgets, areas, settings } = useApp.getState();
  const touched: WidgetKind[] = [];

  for (const [kind] of applied) {
    const w = widgets.find((i) => i.kind === kind);
    if (!w || !w.open) {
      applied.delete(kind);
      await closeWidgetWindow(kind);
    }
  }

  for (const w of widgets) {
    if (!w.open) continue;
    const area = areas[w.display] ?? areas[0];
    if (!area) continue;

    const x = Math.round(w.x);
    const y = Math.round(w.y);
    const screenX = x + area.x;
    const screenY = y + area.y;
    const prev = applied.get(w.kind);

    if (!prev) {
      // reserve the slot before awaiting so a queued pass cannot double-create
      applied.set(w.kind, { x, y, size: w.size, layer: settings.layer, display: w.display });
      await openWidgetWindow({ ...w, x: screenX, y: screenY }, settings.layer === "desktop");
      await moveWidgetWindow(w.kind, screenX, screenY);
      await applyLayer(w.kind, settings.layer);
      await broadcast(w.kind);
      continue;
    }

    if (prev.size !== w.size) {
      await resizeWidgetWindow(w.kind, w.size);
      prev.size = w.size;
      touched.push(w.kind);
    }
    if (prev.x !== x || prev.y !== y || prev.display !== w.display) {
      await moveWidgetWindow(w.kind, screenX, screenY);
      prev.x = x;
      prev.y = y;
      prev.display = w.display;
      touched.push(w.kind);
    }
    if (prev.layer !== settings.layer) {
      await applyLayer(w.kind, settings.layer);
      prev.layer = settings.layer;
    }
  }

  // only the windows that actually changed need a fresh config
  await Promise.all([...new Set(touched)].map(broadcast));
}

/** Push just this widget's slice of state to its own window. */
export async function broadcast(kind: WidgetKind) {
  if (!isTauri()) return;
  const { widgets, settings, areas } = useApp.getState();
  const widget = widgets.find((w) => w.kind === kind);
  if (!widget) return;
  const area = areas[widget.display] ?? areas[0];
  if (!area) return;

  const payload: ConfigPayload = {
    widget,
    settings,
    area,
    areas,
    onBattery: batteryState.onBattery,
    neighbours: widgets
      .filter((o) => o.kind !== kind && o.open && o.display === widget.display)
      .map((o) => {
        const [w, h] = sizeOf(o.kind, o.size);
        return { x: o.x, y: o.y, w, h };
      }),
  };

  const { emitTo } = await import("@tauri-apps/api/event");
  try {
    await emitTo(labelFor(kind), EVT.config(kind), payload);
  } catch {
    /* window not up yet — it says hello when it is */
  }
}

/** Re-send config to every visible widget (used when shared settings change). */
export async function broadcastAll() {
  const open = useApp.getState().widgets.filter((w) => w.open);
  await Promise.all(open.map((w) => broadcast(w.kind)));
}

/**
 * One battery reading for the whole app, refreshed slowly and only when the
 * power saver is actually set to care about it.
 */
export const batteryState = { onBattery: false };

export async function refreshBatteryState(enabled: boolean) {
  if (!enabled || !isTauri()) {
    batteryState.onBattery = false;
    return;
  }
  try {
    const b = await fetchBattery();
    batteryState.onBattery = b.present && !b.charging;
  } catch {
    batteryState.onBattery = false;
  }
}
