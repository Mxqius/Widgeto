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
| Data      | TanStack Query over Tauri commands; fetching in Rust |
| Bundler   | Vite 7                                              |

## Run it

```bash
npm install
```

```bash
npm run app
```

There is no separate service to start — the data layer lives inside the Rust core.

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

## Tray

Widgeto lives in the system tray. Closing the manager window parks it there — the widgets stay on
the desktop. Left-click the tray icon to bring the manager back; right-click for **Open Widgeto**,
**Show all widgets**, **Hide all widgets** and **Quit**. Quit from the tray is the only thing that
actually exits.

## The manager

A 420x640 window. The top of the first screen counts what is live and offers Arrange / Dock / Lock /
All-or-None; below that, one row per widget. Tapping a widget's icon puts it on the desktop or takes
it off, S/M/L sets its size, and the sliders button expands that widget's own settings inline. An
active/all filter keeps the list short once you have chosen your set. There is no layout canvas —
you place a widget by dragging the widget itself.

## Per-widget settings

| Widget | Settings |
| ------ | -------- |
| Quick Launch | Add and remove shortcuts — a site, an `.exe`, a folder, or an `app://` link. Favicons resolve automatically. |
| Weather | City, resolved by the server's geocoder |
| Markets | Watchlist, up to six tickers |
| Clock | Caption text, second hand on/off |
| Focus Timer | Focus / short / long durations |
| Notes | Text size |
| Pet | Species (cat / bun / blob / fox), name and colour |

## Data layer

Everything is fetched **in-process by the Rust core** and exposed as Tauri commands, so there is no
sidecar, no port, no CORS and nothing extra to run or ship.

| Command | Source |
| ------- | ------ |
| `weather(place)` | Open-Meteo geocoding + forecast |
| `markets(symbols)` | CoinGecko simple price |
| `system_stats()` | `sysinfo` — CPU per core, memory, disk, uptime |
| `net_stats()` | `sysinfo` — real throughput, measured between polls |
| `battery_stats()` | `starship-battery` — charge, health, time remaining |
| `media_now()` / `media_control(a)` | Windows media session (SMTC) |
| `launch(target)` | opens a URL, a file, a folder or an executable |
| `quote()` | quote of the day, deterministic per day |
| `whereami()` | coarse IP location |
| `data_health()` | cache size, surfaced in Settings |

**No widget is faked.** System, Network and Power read the real machine; Now Playing follows the
actual media session and its transport buttons drive it; Clock, Calendar, Tasks, Notes and Focus
Timer are real locally; Weather and Markets come from live upstreams. Quick Launch opens real
sites, files and applications.

Both upstreams are keyless. Every call goes through a TTL cache in `src-tauri/src/cache.rs` that
doubles as a fallback: on an upstream failure the last good value is returned instead, and each
response carries `source: "live" | "cache" | "stale"` plus an age, so a tile can say it is showing
the last known value. Only a cold cache can fail, and the widget then shows sample data.

On the client the commands are wrapped in TanStack Query (`src/lib/queries.ts`), which owns the
refetch intervals, retries and per-window caching. **axios is deliberately absent** — with the data
layer in-process there is no HTTP for it to do; it would only wrap `invoke` in a second cache.

Live checks against the real upstreams live next to the code:

```bash
npm run test:data
```

The machine probes are covered too, and those need no network:

```bash
cd src-tauri && cargo test
```

## Design language## Design language

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
Quick Launch · Network · Power · **Pet**

The Pet is a small resident creature in one of four shapes: it breathes and blinks on its own, its
ears perk up and its eyes follow your cursor, it bounces and throws hearts when you click it, gets
properly excited (stars, wider grin) if you pet it three times in four seconds, and dozes off after
a while alone — waking the moment you touch it again.

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
| On the desktop | Drag a widget to move it · hover for resize / lock / remove |
| Manager map | Drag a card to place it · double-click to show/hide |
| Manager list | Size, lock, show/hide, move to another display |

| Keys | Action |
| ---- | ------ |
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
  lib/data.ts           typed wrappers over the Rust data commands
  lib/queries.ts        TanStack Query hooks, sample-data fallbacks
  widgets/config.ts     per-widget settings and their defaults
  widgets/registry.ts   metadata only (no bodies) so the manager stays small
  widgets/loader.ts     one dynamic import per widget body
  widgets/              the 12 bodies + shared parts + prefs context
src-tauri/src/data.rs   network data commands (weather, markets, quote, …)
src-tauri/src/system.rs local machine: cpu, memory, disk, network, battery,
                        media session, and launching things
src-tauri/src/cache.rs  TTL cache with stale fallback
src-tauri/              Rust shell, tray, capabilities, icons
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
