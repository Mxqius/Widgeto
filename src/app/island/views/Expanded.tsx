import {
  ArrowDown, ArrowUp, BatteryCharging, BatteryMedium, CalendarDays, Cpu, Gauge, MemoryStick,
  Music, Pause, Play, RotateCcw, SkipBack, SkipForward, Timer,
} from "lucide-react";
import type { ReactNode } from "react";
import type { BatteryStats, NetStats, SystemStats, Weather } from "@/shared/ipc/commands";
import { ampm, appLabel, bytesPerSec, clock, mmss } from "../lib/format";
import type { Track } from "../data/useMedia";
import type { Focus, FocusMode } from "../data/useFocus";
import { Art, Bar, Equalizer, Ring } from "./parts";
import { WeatherGlyph } from "./glyphs";

export type Tab = "media" | "focus" | "system" | "today";

const TABS: { id: Tab; icon: typeof Music; label: string }[] = [
  { id: "media", icon: Music, label: "Now playing" },
  { id: "focus", icon: Timer, label: "Focus" },
  { id: "system", icon: Gauge, label: "System" },
  { id: "today", icon: CalendarDays, label: "Today" },
];

export interface ExpandedProps {
  tab: Tab;
  setTab: (t: Tab) => void;
  now: number;
  h24: boolean;
  track: Track;
  focus: Focus;
  battery: BatteryStats | undefined;
  system: SystemStats | undefined;
  net: NetStats | undefined;
  weather: Weather | undefined;
  temp: (c: number) => string;
}

export function Expanded(p: ExpandedProps) {
  const d = new Date(p.now);
  const i = TABS.findIndex((t) => t.id === p.tab);
  return (
    <div className="flex h-full flex-col px-4 pt-3 pb-4">
      <header className="flex h-7 shrink-0 items-center justify-between">
        <nav className="relative flex gap-1" role="tablist">
          <span className="island-tab-thumb" style={{ transform: `translateX(${i * 36}px)` }} />
          {TABS.map(({ id, icon: I, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={p.tab === id}
              title={label}
              onClick={() => p.setTab(id)}
              className={`island-tab ${p.tab === id ? "is-on" : ""}`}
            >
              <I size={14} />
            </button>
          ))}
        </nav>
        <span className="text-[11.5px] font-semibold text-white/45">
          {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          <span className="mx-1.5 text-white/20">·</span>
          <span className="tabular-nums text-white/80">{clock(d, p.h24)}</span>
        </span>
      </header>

      <div key={p.tab} className="island-panel min-h-0 flex-1 pt-3">
        {p.tab === "media" && <MediaPanel track={p.track} now={p.now} />}
        {p.tab === "focus" && <FocusPanel focus={p.focus} />}
        {p.tab === "system" && <SystemPanel system={p.system} net={p.net} battery={p.battery} />}
        {p.tab === "today" && (
          <TodayPanel now={d} h24={p.h24} weather={p.weather} temp={p.temp} battery={p.battery} />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- media */

function MediaPanel({ track, now }: { track: Track; now: number }) {
  const m = track.media;
  if (!m?.title) {
    return (
      <div className="flex h-full items-center gap-4">
        <Art src={null} size={92} radius={20} className="opacity-40" />
        <div>
          <div className="text-[15px] font-bold text-white/85">Nothing playing</div>
          <div className="mt-1 max-w-[250px] text-[12px] leading-snug font-medium text-white/45">
            Play something in Spotify, a browser tab or any media app and it shows up here.
          </div>
        </div>
      </div>
    );
  }

  const dur = m.durationSec ?? 0;
  const pos = track.positionAt(now);
  const tint = track.tint ?? "#fff";
  const src = appLabel(m.app);

  return (
    <div className="flex h-full items-center gap-4">
      <Art src={track.art} size={92} radius={20} className="island-art-lg" />
      <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch py-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold tracking-tight text-white">{m.title}</div>
            <div className="truncate text-[12.5px] font-medium text-white/55">
              {m.artist ?? src ?? "Unknown artist"}
            </div>
          </div>
          <div className="mt-1 shrink-0">
            <Equalizer playing={m.playing} colour={track.tint ?? undefined} height={16} />
          </div>
        </div>

        {dur > 0 ? (
          <div>
            <Bar value={pos / dur} colour={tint} height={4} />
            <div className="mt-1 flex justify-between text-[10px] font-semibold tabular-nums text-white/40">
              <span>{mmss(pos)}</span>
              <span>-{mmss(Math.max(0, dur - pos))}</span>
            </div>
          </div>
        ) : (
          <div className="text-[10.5px] font-semibold text-white/35">{src ?? "Live"}</div>
        )}

        <div className="flex items-center justify-center gap-6">
          <button className="island-icon-btn" title="Previous" onClick={() => void track.send("prev")}>
            <SkipBack size={18} className="fill-current" />
          </button>
          <button
            className="island-play"
            title={m.playing ? "Pause" : "Play"}
            onClick={() => void track.send("toggle")}
          >
            {m.playing ? (
              <Pause size={17} className="fill-current" />
            ) : (
              <Play size={17} className="ml-0.5 fill-current" />
            )}
          </button>
          <button className="island-icon-btn" title="Next" onClick={() => void track.send("next")}>
            <SkipForward size={18} className="fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- focus */

const MODES: { id: FocusMode; label: string }[] = [
  { id: "focus", label: "Focus" },
  { id: "short", label: "Break" },
  { id: "long", label: "Long break" },
];

function FocusPanel({ focus }: { focus: Focus }) {
  const lit = focus.done % 4 === 0 && focus.done > 0 ? 4 : focus.done % 4;
  return (
    <div className="flex h-full items-center gap-5">
      <Ring value={focus.progress} size={100} stroke={7}>
        <div className="text-center">
          <div className="text-[22px] leading-none font-bold tabular-nums text-white">{mmss(focus.left)}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/45">
            {focus.running ? "remaining" : focus.active ? "paused" : "ready"}
          </div>
        </div>
      </Ring>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => focus.setMode(m.id)}
              className={`island-chip ${focus.mode === m.id ? "is-on" : ""}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="island-pill-btn" onClick={focus.running ? focus.pause : focus.start}>
            {focus.running ? (
              <Pause size={13} className="fill-current" />
            ) : (
              <Play size={13} className="fill-current" />
            )}
            {focus.running ? "Pause" : focus.active ? "Resume" : "Start"}
          </button>
          <button className="island-icon-btn island-icon-btn-bg" title="Reset" onClick={focus.reset}>
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-white/45">
          <span className="flex gap-1">
            {[0, 1, 2, 3].map((n) => (
              <i
                key={n}
                className="block size-1.5 rounded-full transition-colors"
                style={{ background: n < lit ? "var(--accent)" : "rgba(255,255,255,0.16)" }}
              />
            ))}
          </span>
          {focus.done === 0
            ? "No sessions yet today"
            : `${focus.done} session${focus.done === 1 ? "" : "s"} today`}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- system */

function SystemPanel({ system, net, battery }: { system?: SystemStats; net?: NetStats; battery?: BatteryStats }) {
  const gb = (b: number) => (b / 1024 ** 3).toFixed(1);
  const left = (s: number) => `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m left`;
  return (
    <div className="grid h-full grid-cols-4 gap-2.5">
      <Stat
        icon={<Cpu size={12} />}
        label="CPU"
        value={system ? `${Math.round(system.cpu)}` : "–"}
        unit="%"
        bar={system ? system.cpu / 100 : 0}
        foot={system?.cpuCores.length ? `${system.cpuCores.length} cores` : undefined}
      />
      <Stat
        icon={<MemoryStick size={12} />}
        label="Memory"
        value={system ? `${Math.round(system.memPct)}` : "–"}
        unit="%"
        bar={system ? system.memPct / 100 : 0}
        foot={system ? `${gb(system.memUsed)} / ${gb(system.memTotal)} GB` : undefined}
      />
      {battery?.present ? (
        <Stat
          icon={battery.charging ? <BatteryCharging size={12} /> : <BatteryMedium size={12} />}
          label="Battery"
          value={`${Math.round(battery.percent)}`}
          unit="%"
          bar={battery.percent / 100}
          colour={battery.charging ? "#4ade80" : battery.percent <= 20 ? "#f87171" : undefined}
          foot={battery.charging ? "Charging" : battery.secsLeft ? left(battery.secsLeft) : "On battery"}
        />
      ) : (
        <Stat icon={<BatteryCharging size={12} />} label="Power" value="AC" bar={1} colour="#4ade80" foot="Plugged in" />
      )}
      <div className="island-stat">
        <div className="island-stat-label">
          <ArrowDown size={12} /> Network
        </div>
        <div className="mt-auto text-[15px] leading-tight font-bold tabular-nums text-white">
          {net ? bytesPerSec(net.downBps) : "–"}
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold tabular-nums text-white/45">
          <ArrowUp size={10} />
          {net ? bytesPerSec(net.upBps) : "–"}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, unit, bar, colour, foot }: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  bar: number;
  colour?: string;
  foot?: string;
}) {
  return (
    <div className="island-stat">
      <div className="island-stat-label">
        {icon} {label}
      </div>
      <div className="mt-auto flex items-baseline gap-0.5">
        <span className="text-[24px] leading-none font-bold tabular-nums text-white">{value}</span>
        {unit && <span className="text-[11px] font-semibold text-white/45">{unit}</span>}
      </div>
      <div className="mt-2">
        <Bar value={bar} colour={colour} height={3} />
      </div>
      {foot && <div className="mt-1.5 truncate text-[9.5px] font-semibold text-white/40">{foot}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- today */

function TodayPanel({ now, h24, weather, temp, battery }: {
  now: Date;
  h24: boolean;
  weather?: Weather;
  temp: (c: number) => string;
  battery?: BatteryStats;
}) {
  return (
    <div className="flex h-full items-center justify-between gap-4">
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[46px] leading-none font-bold tracking-tight tabular-nums text-white">
            {clock(now, h24)}
          </span>
          {!h24 && <span className="text-[13px] font-bold text-white/45">{ampm(now)}</span>}
        </div>
        <div className="mt-2 text-[13px] font-semibold text-white/55">
          {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {weather ? (
        <div className="island-card flex items-center gap-3">
          <WeatherGlyph icon={weather.icon} size={34} />
          <div className="min-w-0">
            <div className="text-[24px] leading-none font-bold tabular-nums text-white">{temp(weather.tempC)}</div>
            <div className="mt-1 max-w-[120px] truncate text-[11.5px] font-semibold text-white/60">
              {weather.condition}
            </div>
            <div className="max-w-[120px] truncate text-[10.5px] font-medium text-white/35">{weather.place}</div>
          </div>
        </div>
      ) : battery?.present ? (
        <div className="island-card text-right">
          <div className="text-[24px] leading-none font-bold tabular-nums text-white">
            {Math.round(battery.percent)}%
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/45">
            {battery.charging ? "Charging" : "Battery"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
