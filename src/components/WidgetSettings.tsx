import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Range, Toggle } from "./ui";
import { useApp } from "@/store/useApp";
import { POLLING, configOf, type QuickLink } from "@/widgets/config";
import { byKind } from "@/widgets/registry";
import { cn } from "@/lib/utils";
import type { WidgetKind } from "@/lib/types";

/** Row scaffolding shared by every panel. */
function Field({
  label,
  hint,
  children,
  stack,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  stack?: boolean;
}) {
  return (
    <div
      className={
        stack
          ? "flex flex-col gap-1.5 py-2"
          : "flex items-center justify-between gap-4 py-2"
      }
    >
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-ink-100">{label}</div>
        {hint && <div className="text-[10.5px] text-ink-500">{hint}</div>}
      </div>
      <div className={stack ? "" : "shrink-0"}>{children}</div>
    </div>
  );
}

const MARKET_SYMBOLS = ["BTC", "ETH", "SOL", "ADA", "DOGE", "XRP", "DOT", "LINK", "AVAX", "MATIC"];

const SWATCHES = [
  "#ff4dd8", "#ff5b2e", "#ffb020", "#3ddc84",
  "#4aa8ff", "#7c6cff", "#ff6b8b", "#e8e8e8",
];

/** Colour and ground, offered for every widget. */
function Appearance({ kind }: { kind: WidgetKind }) {
  const w = useApp((s) => s.widgets.find((i) => i.kind === kind));
  const setAppearance = useApp((s) => s.setAppearance);
  const def = byKind(kind);
  const accent = w?.accent ?? def.accent;
  const theme = w?.theme ?? def.theme;

  return (
    <>
      <Field label="Colour" hint="Tints meters, highlights and progress." stack>
        <div className="flex flex-wrap items-center gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => setAppearance(kind, { accent: c, theme: w?.theme })}
              title={c}
              className={cn(
                "size-[22px] rounded-full transition-transform hover:scale-110",
                accent.toLowerCase() === c.toLowerCase() &&
                  "ring-2 ring-white/70 ring-offset-2 ring-offset-ink-900",
              )}
              style={{ background: c }}
            />
          ))}
          <label
            className="relative size-[22px] cursor-pointer overflow-hidden rounded-full border border-white/15"
            title="Custom colour"
            style={{
              background:
                "conic-gradient(#ff4dd8,#ff5b2e,#ffb020,#3ddc84,#4aa8ff,#7c6cff,#ff4dd8)",
            }}
          >
            <input
              type="color"
              value={accent}
              onChange={(e) => setAppearance(kind, { accent: e.target.value, theme: w?.theme })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          {w?.accent && (
            <button
              className="btn h-6 px-2 text-[11px]"
              onClick={() => setAppearance(kind, { accent: undefined, theme: w?.theme })}
            >
              Reset
            </button>
          )}
        </div>
      </Field>

      <Field label="Ground" hint="Flat black or flat white tile.">
        <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/[0.03] p-0.5">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAppearance(kind, { accent: w?.accent, theme: t })}
              className={cn(
                "h-6 rounded-md px-2.5 text-[11px] font-semibold capitalize transition-colors",
                theme === t ? "bg-white/12 text-white" : "text-ink-500 hover:text-ink-300",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

/** Everything one widget exposes: shared appearance, then its own options. */
export default function WidgetSettings({ kind }: { kind: WidgetKind }) {
  return (
    <>
      <Appearance kind={kind} />
      <div className="my-1 h-px bg-white/6" />
      <RefreshRate kind={kind} />
      <KindSettings kind={kind} />
    </>
  );
}

function KindSettings({ kind }: { kind: WidgetKind }) {
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);

  switch (kind) {
    case "clock": {
      const c = configOf("clock", stored);
      return (
        <>
          <Field label="Label" hint="Small caption under the dial.">
            <input
              className="field h-7 w-28 text-[12px]"
              value={c.label}
              maxLength={6}
              onChange={(e) => setConfig(kind, { label: e.target.value })}
            />
          </Field>
          <Field label="Second hand">
            <Toggle checked={c.showSeconds} onChange={(v) => setConfig(kind, { showSeconds: v })} />
          </Field>
        </>
      );
    }

    case "weather": {
      const c = configOf("weather", stored);
      return (
        <Field label="City" hint="Any place name — resolved by the server.">
          <input
            className="field h-7 w-40 text-[12px]"
            value={c.place}
            onChange={(e) => setConfig(kind, { place: e.target.value })}
          />
        </Field>
      );
    }

    case "notes": {
      const c = configOf("notes", stored);
      return (
        <Field label="Text size">
          <div className="w-40">
            <Range
              min={10}
              max={18}
              value={c.fontSize}
              onChange={(v) => setConfig(kind, { fontSize: v })}
              format={(v) => `${v}px`}
            />
          </div>
        </Field>
      );
    }

    case "pomodoro": {
      const c = configOf("pomodoro", stored);
      return (
        <>
          {(
            [
              ["focusMin", "Focus", 5, 90],
              ["shortMin", "Short break", 1, 30],
              ["longMin", "Long break", 5, 60],
            ] as const
          ).map(([key, label, min, max]) => (
            <Field key={key} label={label}>
              <div className="w-40">
                <Range
                  min={min}
                  max={max}
                  value={c[key]}
                  onChange={(v) => setConfig(kind, { [key]: v })}
                  format={(v) => `${v}m`}
                />
              </div>
            </Field>
          ))}
        </>
      );
    }

    case "markets": {
      const c = configOf("markets", stored);
      const toggle = (sym: string) => {
        const has = c.symbols.includes(sym);
        const next = has ? c.symbols.filter((s) => s !== sym) : [...c.symbols, sym];
        if (next.length) setConfig(kind, { symbols: next.slice(0, 6) });
      };
      return (
        <Field label="Watchlist" hint="Up to six. The first one leads the tile." stack>
          <div className="flex flex-wrap gap-1">
            {MARKET_SYMBOLS.map((sym) => {
              const on = c.symbols.includes(sym);
              return (
                <button
                  key={sym}
                  onClick={() => toggle(sym)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  style={
                    on
                      ? { background: "var(--accent)", color: "#fff" }
                      : { background: "rgba(255,255,255,0.06)", color: "var(--color-ink-400)" }
                  }
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </Field>
      );
    }

    case "calendar":
      return <CalendarSources kind={kind} />;

    case "launcher":
      return <LauncherLinks kind={kind} />;

    case "pet": {
      const c = configOf("pet", stored);
      return (
        <>
          <Field label="Species" stack>
            <div className="flex gap-1">
              {(["cat", "bun", "blob", "fox"] as const).map((sp) => (
                <button
                  key={sp}
                  onClick={() => setConfig(kind, { species: sp })}
                  className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold capitalize transition-colors"
                  style={
                    c.species === sp
                      ? { background: "var(--accent)", color: "#fff" }
                      : { background: "rgba(255,255,255,0.06)", color: "var(--color-ink-400)" }
                  }
                >
                  {sp}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Name">
            <input
              className="field h-7 w-32 text-[12px]"
              value={c.name}
              maxLength={14}
              onChange={(e) => setConfig(kind, { name: e.target.value })}
            />
          </Field>
          <Field label="Colour">
            <div className="w-40">
              <Range
                min={0}
                max={359}
                value={c.hue}
                onChange={(v) => setConfig(kind, { hue: v })}
                format={(v) => `${v}°`}
              />
            </div>
          </Field>
        </>
      );
    }

    default:
      return <div className="pb-1 text-[11px] text-ink-600">No other options.</div>;
  }
}

/** Editable list of sites/apps for Quick Launch. */
function LauncherLinks({ kind }: { kind: WidgetKind }) {
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("launcher", stored);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const save = (links: QuickLink[]) => setConfig(kind, { links });

  const add = () => {
    const u = url.trim();
    if (!u) return;

    // a drive path, a UNC share or an existing protocol is left alone; only a
    // bare domain gets https:// put in front of it
    const isPath = /^[a-zA-Z]:[\\/]/.test(u) || u.startsWith("\\\\") || u.startsWith("/");
    const hasProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(u);
    const target = isPath || hasProto ? u : `https://${u}`;

    let label = name.trim();
    if (!label) {
      if (isPath) {
        label = u.split(/[\\/]/).pop()?.replace(/\.(exe|lnk|bat|cmd)$/i, "") || u;
      } else {
        try {
          label = new URL(target).hostname.replace(/^www\./, "");
        } catch {
          label = u;
        }
      }
    }
    save([...c.links, { name: label, url: target }]);
    setName("");
    setUrl("");
  };

  return (
    <div className="py-1.5">
      <div className="mb-1.5 text-[12px] font-medium text-ink-100">
        Shortcuts
        <span className="ml-1.5 text-[10.5px] text-ink-500">
          a site, an .exe, a folder, or any app:// link
        </span>
      </div>

      <div className="mb-2 space-y-1">
        {c.links.map((l, i) => (
          <div
            key={`${l.url}-${i}`}
            className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1.5"
          >
            <span className="w-24 shrink-0 truncate text-[11.5px] font-medium text-ink-100">
              {l.name}
            </span>
            <span className="min-w-0 flex-1 truncate text-[10.5px] text-ink-500">{l.url}</span>
            <button
              title="Remove"
              onClick={() => save(c.links.filter((_, n) => n !== i))}
              className="shrink-0 text-ink-600 transition-colors hover:text-red-300"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {c.links.length === 0 && (
          <div className="px-1 py-2 text-[11px] text-ink-500">Nothing pinned yet.</div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          className="field h-7 w-24 text-[12px]"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          className="field h-7 flex-1 text-[12px]"
          placeholder="figma.com or C:\App\app.exe"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn h-7 px-2" onClick={add} title="Add shortcut">
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

/** Local .ics files feeding the calendar. No account, no sync, no auth. */
function CalendarSources({ kind }: { kind: WidgetKind }) {
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("calendar", stored);

  const pick = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({
        multiple: true,
        filters: [{ name: "Calendar", extensions: ["ics"] }],
      });
      if (!picked) return;
      const list = Array.isArray(picked) ? picked : [picked];
      const next = [...new Set([...c.sources, ...list])];
      setConfig(kind, { sources: next });
    } catch {
      /* the picker is only available in the desktop app */
    }
  };

  return (
    <>
      <div className="py-1.5">
        <div className="mb-1.5 text-[12px] font-medium text-ink-100">
          Calendar files
          <span className="ml-1.5 text-[10.5px] text-ink-500">
            .ics exported from any calendar app
          </span>
        </div>

        <div className="mb-2 space-y-1">
          {c.sources.map((path) => (
            <div
              key={path}
              className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-[11px] text-ink-300" title={path}>
                {path.split(/[\/]/).pop()}
              </span>
              <button
                title="Remove"
                onClick={() =>
                  setConfig(kind, { sources: c.sources.filter((p) => p !== path) })
                }
                className="shrink-0 text-ink-600 transition-colors hover:text-red-300"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {c.sources.length === 0 && (
            <div className="px-1 py-2 text-[11px] text-ink-500">
              No calendars yet — the tile shows date facts instead.
            </div>
          )}
        </div>

        <button className="btn h-7 px-2 text-[12px]" onClick={pick}>
          <Plus size={12} /> Add .ics file
        </button>
      </div>

      <Field label="Look ahead" hint="How far forward events are collected.">
        <div className="w-40">
          <Range
            min={1}
            max={60}
            value={c.days}
            onChange={(v) => setConfig(kind, { days: v })}
            format={(v) => `${v}d`}
          />
        </div>
      </Field>
    </>
  );
}

/** How often this widget asks for fresh data. Only polling kinds show it. */
function RefreshRate({ kind }: { kind: WidgetKind }) {
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const bounds = POLLING[kind];
  if (!bounds) return null;

  const current = (configOf(kind, stored) as { refreshSec?: number }).refreshSec ?? bounds.min;
  const label = (v: number) => (v >= 60 ? `${Math.round(v / 60)}m` : `${v}s`);

  return (
    <Field label="Refresh every" hint="Slower means less background work.">
      <div className="w-40">
        <Range
          min={bounds.min}
          max={bounds.max}
          step={bounds.max > 300 ? 30 : 1}
          value={Math.min(bounds.max, Math.max(bounds.min, current))}
          onChange={(v) => setConfig(kind, { refreshSec: v })}
          format={label}
        />
      </div>
    </Field>
  );
}
