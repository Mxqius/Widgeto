import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@/app/manager/store";
import { sizeOf } from "@/shared/widgets/kinds";
import type { WidgetKind } from "@/shared/types/widget";
import {
  EVT,
  labelFor,
  widgetSettingsOf,
  WIDGET_SETTING_KEYS,
  type ActionPayload,
  type ConfigPayload,
  type ConfigSetPayload,
  type MovedPayload,
} from "@/shared/desktop/protocol";
import {
  applied,
  applyLayer,
  closeWidgetWindow,
  listAreas,
  moveWidgetWindow,
  openWidgetWindow,
  resizeWidgetWindow,
  type Applied,
} from "./windows";
import { isTauri } from "@/shared/lib/env";
import { fetchBattery } from "@/shared/ipc/commands";

/** Monitor layout rarely changes; polling often just burns IPC. */
const MONITOR_POLL_MS = 30_000;

/**
 * Keeps the real OS windows in step with the store: spawns and closes widget
 * windows, pushes position/size/layer changes out, and takes drag results and
 * button presses back in from the widget windows.
 *
 * Lives in `ManagerRuntime`, which stays mounted while the manager is parked
 * in the tray — the visible UI unmounts, this does not.
 */
export function useDesktopSync() {
  const widgets = useApp((s) => s.widgets);
  const layer = useApp((s) => s.settings.layer);
  const onboarded = useApp((s) => s.settings.onboarded);
  const setAreas = useApp((s) => s.setAreas);

  // Reconciliation only cares about these fields — not every settings tweak.
  // Until first-run setup is done the desktop is held empty, so the widgets
  // the user picks appear together at the end rather than all thirteen at once.
  const signature = useMemo(
    () =>
      (onboarded ? widgets : [])
        .map((w) =>
          w.open ? `${w.kind}:${Math.round(w.x)}:${Math.round(w.y)}:${w.size}:${w.display}` : "",
        )
        .filter(Boolean)
        .join("|") + `#${layer}#${onboarded}`,
    [widgets, layer, onboarded],
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
    let alive = true;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");

      const add = (u: () => void) => (alive ? uns.push(u) : u());

      add(
        await listen<{ kind: WidgetKind }>(EVT.hello, (e) => {
          void broadcast(e.payload.kind);
        }),
      );

      add(
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

      add(
        await listen<ConfigSetPayload>(EVT.config_set, (e) => {
          const { kind, patch } = e.payload;
          useApp.getState().setConfig(kind, patch);
        }),
      );

      add(
        await listen<ActionPayload>(EVT.action, (e) => {
          const { kind, action } = e.payload;
          const st = useApp.getState();
          if (action === "hide") st.setOpen(kind, false);
          if (action === "cycle-size") st.cycleSize(kind);
          if (action === "lock") st.toggleLock(kind);
        }),
      );
    })();
    return () => {
      alive = false;
      uns.forEach((u) => u());
    };
  }, []);

  /* ------------------------------------------- outbound reconciliation -
   * Runs strictly one at a time. Creating a webview window takes a moment, so
   * a re-render mid-flight must not abort the pass — it queues another one.  */
  const running = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;

    const pass = async () => {
      if (running.current) {
        pending.current = true;
        return;
      }
      running.current = true;
      try {
        do {
          pending.current = false;
          if (cancelled) return;
          await reconcile(applied);
        } while (pending.current);
      } finally {
        running.current = false;
      }
    };

    void pass();
    return () => {
      cancelled = true;
    };
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

  /* ----------------- shared appearance settings -> every open widget ---
   * Keyed on the slice widgets actually read, not the whole settings object.
   * Depending on the object meant changing an arrange mode or an update
   * preference re-pushed config to all thirteen windows and re-rendered every
   * one of them.                                                          */
  const settings = useApp((s) => s.settings);
  const widgetFacing = useMemo(
    () => WIDGET_SETTING_KEYS.map((k) => String(settings[k])).join("|"),
    [settings],
  );
  useEffect(() => {
    if (!isTauri()) return;
    // coalesce slider drags into one push per frame batch
    const t = setTimeout(() => void broadcastAll(), 80);
    return () => clearTimeout(t);
  }, [widgetFacing]);

  /* --------------- per-widget appearance and config -> its window ------
   * Position and size reach the window through the reconcile pass above, but
   * accent, ground, alpha and a widget's own config change nothing about the
   * OS window — only what is painted inside it — so they were never pushed at
   * all, and a colour override sat in the store until something else happened
   * to move the widget.
   *
   * Diffed against what was last sent and settled on a short timer, so a drag
   * through the colour picker costs one emit rather than one per frame, and
   * the twelve widgets it did not touch cost nothing.                      */
  const sent = useRef(new Map<WidgetKind, string>());
  useEffect(() => {
    if (!isTauri()) return;
    const t = setTimeout(() => {
      for (const w of widgets) {
        if (!w.open) {
          sent.current.delete(w.kind);
          continue;
        }
        const look = JSON.stringify([w.accent, w.theme, w.alpha, w.config]);
        if (sent.current.get(w.kind) === look) continue;
        sent.current.set(w.kind, look);
        void broadcast(w.kind);
      }
    }, 80);
    return () => clearTimeout(t);
  }, [widgets]);
}

/** One full pass: create, close, move, resize and re-layer every widget window. */
async function reconcile(applied: Map<WidgetKind, Applied>) {
  const { areas, settings } = useApp.getState();
  // nothing goes on the desktop until first-run setup is done
  const widgets = settings.onboarded ? useApp.getState().widgets : [];
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
      // deliberately not awaited: every widget a redock touched should glide at
      // the same time, not queue up behind the one before it
      const glide = !settings.reduceMotion && prev.display === w.display;
      const move = moveWidgetWindow(w.kind, screenX, screenY, glide);
      if (!glide) await move;
      else void move.catch(() => {});
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
    settings: widgetSettingsOf(settings),
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
