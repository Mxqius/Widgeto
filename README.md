# Widgeto

Desktop widgets that live **on your desktop**, not inside an app window. Each widget is its own
frameless, transparent, always-on-desktop OS window. The main app window is a manager: it places,
sizes, docks, shows and hides them.

## Stack

| Layer     | Choice                                              |
| --------- | --------------------------------------------------- |
| Shell     | Tauri 2 (Rust), one webview window per widget       |
| UI        | React 19 + [Base UI](https://base-ui.com) primitives |
| Styling   | Tailwind CSS v4 (`@theme` tokens, no config file)   |
| Motion    | Motion 13 (`motion/react`)                          |
| State     | Zustand + `persist`, owned by the manager window    |
| Bundler   | Vite 7                                              |

## Run it

```bash
npm install
```

```bash
npm run app
```

Browser-only preview of the manager (no real desktop windows, but the map, docking, arranging and
every widget render):

```bash
npm run dev
```

> The dev server uses **port 3420**. Ports 1420 and 5273 fall inside Windows' excluded port ranges
> on this machine, so Tauri's default was moved. Change it in `vite.config.ts` and
> `src-tauri/tauri.conf.json` together.

## How it fits together

```
main window            ─ the manager: owns all state, persists it
  └── DesktopMap       ─ scaled live map of the monitor work area
  └── useDesktopSync   ─ reconciles OS windows against the store

w-<id> windows         ─ one per visible widget, index.html?w=<id>
                         frameless · transparent · skipTaskbar · alwaysOnBottom
```

The manager is the single source of truth. Widget windows are **read-only replicas**: they never
write to the persisted store (they'd race each other over one shared localStorage key), they receive
the state over Tauri's event bus, and they report back only what the user did — a drag, a size
cycle, a hide.

Positions are stored **relative to each monitor's work area** (taskbar excluded), so docking is
correct on any display and survives resolution changes; the screen origin is added only when talking
to the OS.

## The 12 widgets

Clock · Weather · System · Calendar · Tasks · Now Playing · Notes · Focus Timer · Markets ·
Quick Launch · Network · Power

Three sizes each (S/M/L, defined in `src/widgets/registry.tsx`), each with its own accent colour.
Notes and Tasks keep their content per instance.

## Placement features

**Auto-dock** — drag a widget (on the desktop, or its card on the manager's map) near any of the 9
zones (4 corners, 4 edges, centre) and it is captured magnetically. Docked widgets re-anchor when
the work area changes. Pull distance is configurable.

**Alignment guides** — edges and centres snap to neighbouring widgets with dashed guides, falling
back to grid snapping. Docking wins over aligning, which wins over the grid.

**Auto-arrange** — four packing modes, applied per display:

- `grid` — shelf packing in reading order, verified to produce zero overlaps
- `columns` — balanced columns, each widget to the shortest one
- `cascade` — offset stack
- `ring` — elliptical orbit

**Desktop layer** — pin widgets behind other windows (`alwaysOnBottom`, the default), leave them
normal, or float them on top.

**Multi-monitor** — every monitor's work area is tracked; widgets carry a display index and the
manager gets a tab per display.

## Interacting

| Where | Action |
| ----- | ------ |
| On the desktop | Drag a widget to move it · hover for resize/lock/hide · double-click cycles size |
| Manager map | Drag a card to place it · double-click to show/hide |
| Manager list | Size, lock, show/hide, delete, move to another display |

| Keys | Action |
| ---- | ------ |
| `Ctrl+K` | Widget library |
| `Ctrl+,` | Settings |
| `Ctrl+G` | Auto-arrange |
| `Ctrl+D` | Dock everything |
| `Ctrl+L` | Lock / unlock everything |
| `Esc` | Close overlay |

## Settings

Appearance (accent, glass opacity, blur, radius, wallpaper) · Layout & docking (pull distance,
margins, snapping, arrange mode, spacing) · Widgets (formats, instances) · Desktop & window (layer,
show/hide all, manager always-on-top, reset) · Shortcuts · About.

## Source layout

```
src/
  lib/layout.ts         docking, alignment snapping, the four arrange algorithms
  lib/desktop.ts        monitors, widget-window lifecycle, the event contract
  lib/useDesktopSync.ts reconciles OS windows against the store, one pass at a time
  store/useApp.ts       widgets + settings; persisted only in the manager
  components/           DesktopMap, ManagerChrome, WidgetLibrary, ui primitives
  screens/              Manager, WidgetWindow, Settings
  widgets/              registry + the 12 widget bodies + shared parts
src-tauri/              Rust shell, capabilities, icons
```

## Prototype notes

Widget data is simulated — series wander plausibly rather than jumping. `host_info` in
`src-tauri/src/lib.rs` is the seam where real system telemetry would enter.

Window movement is driven from the frontend via `setPosition`, which is what makes snapping and
docking possible (a native drag would give up that control). On a slower machine a fast drag may
show slight lag behind the cursor.
