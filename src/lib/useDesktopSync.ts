import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@/store/useApp";
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
  type MovedPayload,
} from "./desktop";
import { isTauri } from "./utils";

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
        .map((w) => `${w.id}:${w.open ? 1 : 0}:${Math.round(w.x)}:${Math.round(w.y)}:${w.size}:${w.display}`)
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
    const t = setInterval(read, 8000);
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
        await listen<{ id: string }>(EVT.hello, (e) => {
          void broadcast(e.payload.id);
        }),
      );

      uns.push(
        await listen<MovedPayload>(EVT.moved, (e) => {
          const { id, x, y, dock } = e.payload;
          // the window is already there — record it so we do not move it back
          const a = applied.get(id);
          if (a) {
            a.x = Math.round(x);
            a.y = Math.round(y);
          }
          useApp.getState().move(id, x, y, dock);
        }),
      );

      uns.push(
        await listen<ActionPayload>(EVT.action, (e) => {
          const { id, kind } = e.payload;
          const st = useApp.getState();
          if (kind === "close") st.setOpen(id, false);
          if (kind === "cycle-size") st.cycleSize(id);
          if (kind === "lock") st.toggleLock(id);
        }),
      );
    })();
    return () => uns.forEach((u) => u());
  }, []);

  /* ------------------------------------------- outbound reconciliation -
   * Runs strictly one at a time. Creating a webview window takes a moment, so
   * a re-render mid-flight must not abort the pass — it queues another one.  */
  const running = useRef(false);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    const pass = async () => {
      if (running.current) {
        pending.current = signature;
        return;
      }
      running.current = true;
      try {
        do {
          pending.current = null;
          await reconcile(applied);
        } while (pending.current !== null);
      } finally {
        running.current = false;
      }
    };

    void pass();
  }, [signature]);

  /* ------------------------------------ tear the desktop down on exit -- */
  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    (async () => {
      const { getCurrentWindow, getAllWindows } = await import("@tauri-apps/api/window");
      un = await getCurrentWindow().onCloseRequested(async () => {
        const all = await getAllWindows();
        await Promise.all(all.filter((w) => w.label.startsWith("w-")).map((w) => w.close()));
      });
    })();
    return () => un?.();
  }, []);
}

/** One full pass: create, close, move, resize and re-layer every widget window. */
async function reconcile(applied: Map<string, Applied>) {
  const { widgets, areas, settings } = useApp.getState();

  for (const [id] of applied) {
    const w = widgets.find((i) => i.id === id);
    if (!w || !w.open) {
      applied.delete(id);
      await closeWidgetWindow(id);
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
    const prev = applied.get(w.id);

    if (!prev) {
      // reserve the slot before awaiting so a queued pass cannot double-create
      applied.set(w.id, { x, y, size: w.size, layer: settings.layer });
      await openWidgetWindow({ ...w, x: screenX, y: screenY }, settings.layer === "desktop");
      await moveWidgetWindow(w.id, screenX, screenY);
      await applyLayer(w.id, settings.layer);
      await broadcast(w.id);
      continue;
    }

    if (prev.size !== w.size) {
      await resizeWidgetWindow(w.id, w.kind, w.size);
      prev.size = w.size;
    }
    if (prev.x !== x || prev.y !== y) {
      await moveWidgetWindow(w.id, screenX, screenY);
      prev.x = x;
      prev.y = y;
    }
    if (prev.layer !== settings.layer) {
      await applyLayer(w.id, settings.layer);
      prev.layer = settings.layer;
    }
  }

  await broadcastAll();
}

/** Push the current store snapshot to one widget window. */
async function broadcast(id: string) {
  if (!isTauri()) return;
  const { emitTo } = await import("@tauri-apps/api/event");
  const { widgets, settings, areas } = useApp.getState();
  try {
    await emitTo(labelFor(id), EVT.config(id), { widgets, settings, areas });
  } catch {
    /* window not up yet — it says hello when it is */
  }
}

async function broadcastAll() {
  const open = useApp.getState().widgets.filter((w) => w.open);
  await Promise.all(open.map((w) => broadcast(w.id)));
}
