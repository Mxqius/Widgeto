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

w-<kind> windows       ─ one per visible widget, index.html?w=<kind>
                         frameless · transparent · skipTaskbar · alwaysOnBottom
```

The manager is the single source of truth. Widget windows are **read-only replicas**: they never
write to the persisted store (they'd race each other over one shared localStorage key), they receive
the state over Tauri's event bus, and they report back only what the user did — a drag, a size
cycle, a hide.

Positions are stored **relative to each monitor's work area** (taskbar excluded), so docking is
correct on any display and survives resolution changes; the screen origin is added only when talking
to the OS.

## Design language

Uniform squircle tiles on a square grid, with two circular tiles for contrast. Every tile is either
flat near-black or flat white — no glass, no glow, no accent wash. There are no section headers or
uppercase labels: hierarchy comes from type size and weight, so the content *is* the widget. A
single magenta accent appears sparingly (meter tip, selected day, progress fill).

Recurring elements live in `src/widgets/parts.tsx`: `Say`/`Muted` for the mixed-weight typographic
sentences, `TickMeter` for tick-mark meters, `Line` for hairline scrubbers, `Stat` for big numerals
and `Row`/`Swatch` for thumbnail lists.

Tiles are solid by default. Dropping `backdrop-filter` from twelve always-on windows is also worth
about 26 MB of GPU memory; turn tile opacity below 100% in Settings and the blur comes back.

## The 12 widgets

Clock · Weather · System · Calendar · Tasks · Now Playing · Notes · Focus Timer · Markets ·
Quick Launch · Network · Power

**One of each — widgets cannot be duplicated.** `kind` is the identity, the store holds exactly one
entry per kind, and adding or removing just flips its `open` flag, so a widget keeps its position
and size while hidden. Three uniform square sizes (176 / 216 / 264 px) and a `theme` + `shape` per
kind are declared in `src/widgets/registry.ts`. Notes and Tasks keep their content.

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
| Manager list | Size, lock, show/hide, move to another display |

| Keys | Action |
| ---- | ------ |
| `Ctrl+K` | Widget library (toggle widgets on and off) |
| `Ctrl+,` | Settings |
| `Ctrl+G` | Auto-arrange |
| `Ctrl+D` | Dock everything |
| `Ctrl+L` | Lock / unlock everything |
| `Esc` | Close overlay |

## Settings

Appearance (accent, tile opacity, blur, radius, wallpaper) · Layout & docking (pull distance,
margins, snapping, arrange mode, spacing) · Widgets (formats, instances) · Desktop & window (layer,
show/hide all, manager always-on-top, reset) · Shortcuts · About.

## Source layout

```
src/
  lib/layout.ts         docking, alignment snapping, the four arrange algorithms
  lib/defaults.ts       default settings, dependency-free so widget windows can read them
  lib/desktop.ts        monitors, widget-window lifecycle, the event contract
  lib/useDesktopSync.ts reconciles OS windows against the store, one pass at a time
  store/useApp.ts       widgets + settings; persisted only in the manager
  components/           DesktopMap, ManagerChrome, WidgetLibrary, ui primitives
  screens/              Manager, WidgetWindow, Settings
  widgets/registry.ts   metadata only (no bodies) so the manager stays small
  widgets/loader.ts     one dynamic import per widget body
  widgets/              the 12 bodies + shared parts + prefs context
src-tauri/              Rust shell, capabilities, icons
```

## Prototype notes

Widget data is simulated — series wander plausibly rather than jumping. `host_info` in
`src-tauri/src/lib.rs` is the seam where real system telemetry would enter.

Window movement is driven from the frontend via `setPosition`, which is what makes snapping and
docking possible (a native drag would give up that control). On a slower machine a fast drag may
show slight lag behind the cursor.

**Memory is dominated by process count, not by code.** Each widget is its own WebView2 renderer and
each renderer costs roughly 80 MB no matter how little it runs, so twelve widgets sit near 1 GB.
Code-splitting cut the JS a widget window parses by ~76% (1539 KB to ~370 KB) and solid tiles cut
GPU memory, which together took the whole process tree from ~1676 MB to ~1479 MB — but the only
large lever left is fewer windows. A single fullscreen transparent overlay hosting every widget
would be roughly one renderer instead of twelve, at the cost of hit-testing for click-through.
