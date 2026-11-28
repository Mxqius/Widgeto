import {
  ArrowDown, ArrowUp, BatteryCharging, BatteryMedium, CalendarDays, ChevronsUp, Cpu, Gauge, MemoryStick,
  Music, Pause, Play, Radio, Repeat, Repeat1, RotateCcw, Shuffle, SkipBack, SkipForward, Sparkles, Timer,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { BatteryStats, NetStats, SystemStats, Weather } from "@/shared/ipc/commands";
import type { Privacy } from "@/shared/island/protocol";
import { ampm, appLabel, bytesPerSec, clock, mmss } from "../lib/format";
import type { Track } from "../data/useMedia";
import type { Focus, FocusMode } from "../data/useFocus";
import type { VolumeCtl } from "../data/useVolume";
import type { AskState } from "../data/useAsk";
import type { AiTarget } from "@/shared/ai/client";
import type { IslandTab } from "@/shared/types/settings";
import { AskPanel } from "./AskPanel";
import { RadioPanel } from "./RadioPanel";
import type { RadioRemote } from "../data/useIslandRadio";
import { Art, Bar, Equalizer, Ring, Slider } from "./parts";
import { CAMERA_TONE, MIC_TONE, VolumeGlyph, WeatherGlyph } from "./glyphs";
import { fmtDate } from "@/shared/i18n/format";
import { getLang, isRtl } from "@/shared/i18n/locale";
import { conditionLabel } from "@/shared/i18n/weather";
import { digits, useT } from "../i18n";

export type Tab = IslandTab;

const TABS = [
  { id: "media", icon: Music, label: "Now playing" },
  { id: "radio", icon: Radio, label: "Radio" },
  { id: "focus", icon: Timer, label: "Focus" },
  { id: "system", icon: Gauge, label: "System" },
  { id: "today", icon: CalendarDays, label: "Today" },
  { id: "ask", icon: Sparkles, label: "Ask AI" },
] as const satisfies readonly { id: Tab; icon: typeof Music; label: string }[];

/** Every tab, in the order the strip shows them. */
export const TAB_ORDER: Tab[] = TABS.map((x) => x.id);

export interface ExpandedProps {
  tab: Tab;
  /** the tabs switched on */
  tabs: Tab[];
  setTab: (t: Tab) => void;
  now: number;
  h24: boolean;
  track: Track;
  radio: RadioRemote;
  focus: Focus;
  battery: BatteryStats | undefined;
  system: SystemStats | undefined;
  net: NetStats | undefined;
  weather: Weather | undefined;
  temp: (c: number) => string;
  volume: VolumeCtl;
  privacy: Privacy;
  /** null while Ask AI is off, which also hides its tab */
  ai: AiTarget | null;
  ask: AskState;
  askSignal: number;
  onAskFocus: (focused: boolean) => void;
  onClose: () => void;
  /** shrink the island into a handle on the top edge */
  onTuck: () => void;
}

export function Expanded(p: ExpandedProps) {
  const t = useT();
  const d = new Date(p.now);
  const tabs = TABS.filter((x) => p.tabs.includes(x.id) && (x.id !== "ask" || p.ai));
  const i = tabs.findIndex((x) => x.id === p.tab);
  // the strip runs the other way in Persian, and so must the thumb under it
  const dir = isRtl(getLang()) ? -1 : 1;
  return (
    <div className="flex h-full flex-col px-4 pt-3 pb-4">
      <header className="flex h-7 shrink-0 items-center justify-between">
        <nav className="relative flex gap-1" role="tablist">
          <span className="island-tab-thumb" style={{ transform: `translateX(${dir * i * 36}px)` }} />
          {tabs.map(({ id, icon: I, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={p.tab === id}
              title={t(label)}
              onClick={() => p.setTab(id)}
              className={`island-tab ${p.tab === id ? "is-on" : ""}`}
            >
              <I size={14} />
            </button>
          ))}
        </nav>
        <span className="flex items-center text-[11.5px] font-semibold text-white/45">
          <PrivacyChip privacy={p.privacy} />
          {fmtDate(d, { weekday: "short", day: "numeric", month: "short" })}
          <span className="mx-1.5 text-white/20">·</span>
          <span className="tabular-nums text-white/80">{clock(d, p.h24)}</span>
          <button
            type="button"
            title={t("Tuck away (right-click the island works too)")}
            aria-label={t("Tuck the island into the top edge")}
            onClick={(e) => {
              e.stopPropagation();
              p.onTuck();
            }}
            className="island-tuck-btn"
          >
            <ChevronsUp size={14} />
          </button>
        </span>
      </header>

      <div key={p.tab} className="island-panel min-h-0 flex-1 pt-3">
        {p.tab === "media" && <MediaPanel track={p.track} now={p.now} volume={p.volume} />}
        {p.tab === "radio" && <RadioPanel radio={p.radio} onFocusChange={p.onAskFocus} />}
        {p.tab === "focus" && <FocusPanel focus={p.focus} />}
        {p.tab === "system" && <SystemPanel system={p.system} net={p.net} battery={p.battery} />}
        {p.tab === "today" && (
          <TodayPanel now={d} h24={p.h24} weather={p.weather} temp={p.temp} battery={p.battery} />
        )}
        {p.tab === "ask" && p.ai && (
          <AskPanel
            ask={p.ask}
            ai={p.ai}
            focusSignal={p.askSignal}
            onFocusChange={p.onAskFocus}
            onClose={p.onClose}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- media */

function MediaPanel({ track, now, volume }: { track: Track; now: number; volume: VolumeCtl }) {
  const t = useT();
  const m = track.media;
  const [scrub, setScrub] = useState<number | null>(null);

  if (!m?.title) {
    return (
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center gap-3">
          <Art src={null} size={46} radius={12} className="opacity-40" />
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-white/85">{t("Nothing playing")}</div>
            <div className="truncate text-[11.5px] font-medium text-white/45">
              {t("Play in Spotify, Telegram, a browser or any player")}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <VolumeControl volume={volume} wide />
        </div>
      </div>
    );
  }

  const dur = m.durationSec ?? 0;
  const pos = scrub !== null ? scrub * dur : track.positionAt(now);
  const tint = track.tint ?? "#fff";
  const src = appLabel(m.app);
  // a flag the player did not send means "probably fine", not "disabled"
  const can = (flag: boolean | null | undefined) => flag !== false;
  const repeat = m.repeat ?? "none";
  const by = [m.artist ?? m.album, src].filter(Boolean).join(" · ");

  return (
    <div className="flex h-full flex-col justify-between">
      {/* what is playing */}
      <div className="flex items-center gap-3">
        <Art src={track.art} size={46} radius={12} className="island-art-lg" />
        <div className="min-w-0 flex-1">
          <div dir="auto" className="truncate text-start text-[14px] font-bold tracking-tight text-white">{m.title}</div>
          <div dir="auto" className="truncate text-start text-[11.5px] font-medium text-white/50">{by || t("Unknown artist")}</div>
        </div>
        <Equalizer playing={m.playing} colour={track.tint ?? undefined} height={14} />
      </div>

      {/* where it is: drag to seek, times either side */}
      {dur > 0 ? (
        <div dir="ltr" className="flex items-center gap-2.5 text-[10px] font-semibold tabular-nums text-white/40">
          <span className={`w-8 ${scrub !== null ? "text-white/85" : ""}`}>{mmss(pos)}</span>
          <div className="flex-1">
            <Slider
              label={t("Seek")}
              value={pos / dur}
              colour={tint}
              disabled={!can(m.canSeek)}
              glide="1s linear"
              onChange={setScrub}
              onCommit={(f) => {
                setScrub(null);
                track.seek(f * dur);
              }}
            />
          </div>
          <span className="w-8 text-right">-{mmss(Math.max(0, dur - pos))}</span>
        </div>
      ) : (
        <div className="text-[10px] font-semibold text-white/35">{t("Live · no timeline")}</div>
      )}

      {/* transport on the left, volume on the right; transport keeps its order in every language */}
      <div className="flex items-center justify-between">
        <div dir="ltr" className="flex items-center gap-1">
          <button
            className={`island-icon-btn island-icon-sm island-toggle ${m.shuffle ? "is-on" : ""}`}
            title={m.shuffle ? t("Shuffle on") : t("Shuffle off")}
            disabled={!can(m.canShuffle) || m.shuffle == null}
            onClick={() => void track.send("shuffle")}
          >
            <Shuffle size={13} />
          </button>
          <button
            className="island-icon-btn island-icon-sm"
            title={t("Previous")}
            disabled={!can(m.canPrev)}
            onClick={() => void track.send("prev")}
          >
            <SkipBack size={16} className="fill-current" />
          </button>
          <button
            className="island-play island-play-sm"
            title={m.playing ? t("Pause") : t("Play")}
            onClick={() => void track.send("toggle")}
          >
            {m.playing ? <Pause size={15} className="fill-current" /> : <Play size={15} className="ml-0.5 fill-current" />}
          </button>
          <button
            className="island-icon-btn island-icon-sm"
            title={t("Next")}
            disabled={!can(m.canNext)}
            onClick={() => void track.send("next")}
          >
            <SkipForward size={16} className="fill-current" />
          </button>
          <button
            className={`island-icon-btn island-icon-sm island-toggle ${repeat !== "none" ? "is-on" : ""}`}
            title={repeat === "track" ? t("Repeat this track") : repeat === "list" ? t("Repeat all") : t("Repeat off")}
            disabled={!can(m.canRepeat) || m.repeat == null}
            onClick={() => void track.send("repeat")}
          >
            {repeat === "track" ? <Repeat1 size={13} /> : <Repeat size={13} />}
          </button>
        </div>
        <VolumeControl volume={volume} />
      </div>
    </div>
  );
}

/** Mute button and a short system-volume slider; the level shows on hover. */
function VolumeControl({ volume, wide }: { volume: VolumeCtl; wide?: boolean }) {
  const v = volume.vol;
  const level = v ? (v.muted ? 0 : v.level) : 0;
  const t = useT();
  return (
    <div className="flex items-center gap-1.5" title={v ? t("Volume {n}%", { n: Math.round(level * 100) }) : undefined}>
      <button
        className="island-icon-btn island-icon-sm text-white/70"
        title={v?.muted ? t("Unmute") : t("Mute")}
        disabled={!v}
        onClick={volume.toggleMute}
      >
        <VolumeGlyph v={v} size={14} />
      </button>
      <div className={wide ? "w-40" : "w-24"}>
        <Slider label={t("Volume")} value={level} disabled={!v} onChange={volume.set} />
      </div>
    </div>
  );
}

/** "● Mic · Zoom" in the header while something is listening or watching. */
function PrivacyChip({ privacy }: { privacy: Privacy }) {
  const t = useT();
  const items = [
    ...privacy.camera.map((a) => ({ a, tone: CAMERA_TONE, what: t("Camera") })),
    ...privacy.mic.filter((a) => !privacy.camera.includes(a)).map((a) => ({ a, tone: MIC_TONE, what: t("Mic") })),
  ];
  if (!items.length) return null;
  const first = items[0];
  return (
    <span className="me-2.5 flex items-center gap-1.5 rounded-full bg-white/8 px-2 py-0.5 text-[10.5px] text-white/70">
      <i className="island-privacy-dot" style={{ background: first.tone, color: first.tone }} />
      {first.what} · {first.a}
      {items.length > 1 ? ` +${digits(items.length - 1)}` : ""}
    </span>
  );
}

/* ---------------------------------------------------------------- focus */

const MODES = [
  { id: "focus", label: "Focus" },
  { id: "short", label: "Break" },
  { id: "long", label: "Long break" },
] as const satisfies readonly { id: FocusMode; label: string }[];

function FocusPanel({ focus }: { focus: Focus }) {
  const t = useT();
  const lit = focus.done % 4 === 0 && focus.done > 0 ? 4 : focus.done % 4;
  return (
    <div className="flex h-full items-center gap-5">
      <Ring value={focus.progress} size={100} stroke={7}>
        <div className="text-center">
          <div className="text-[22px] leading-none font-bold tabular-nums text-white">{mmss(focus.left)}</div>
          <div className="mt-1 text-[10px] font-semibold text-white/45">
            {focus.running ? t("remaining") : focus.active ? t("paused") : t("ready")}
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
              {t(m.label)}
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
            {focus.running ? t("Pause") : focus.active ? t("Resume") : t("Start")}
          </button>
          <button className="island-icon-btn island-icon-btn-bg" title={t("Reset")} onClick={focus.reset}>
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
            ? t("No sessions yet today")
            : focus.done === 1
              ? t("{n} session today", { n: 1 })
              : t("{n} sessions today", { n: focus.done })}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- system */

function SystemPanel({ system, net, battery }: { system?: SystemStats; net?: NetStats; battery?: BatteryStats }) {
  const t = useT();
  const gb = (b: number) => (b / 1024 ** 3).toFixed(1);
  const left = (s: number) => t("{h}h {m}m left", { h: Math.floor(s / 3600), m: Math.round((s % 3600) / 60) });
  return (
    <div className="grid h-full grid-cols-4 gap-2.5">
      <Stat
        icon={<Cpu size={12} />}
        label={t("CPU")}
        value={system ? digits(Math.round(system.cpu)) : "–"}
        unit="%"
        bar={system ? system.cpu / 100 : 0}
        foot={system?.cpuCores.length ? t("{n} cores", { n: system.cpuCores.length }) : undefined}
      />
      <Stat
        icon={<MemoryStick size={12} />}
        label={t("Memory")}
        value={system ? digits(Math.round(system.memPct)) : "–"}
        unit="%"
        bar={system ? system.memPct / 100 : 0}
        foot={system ? t("{used} / {total} GB", { used: digits(gb(system.memUsed)), total: digits(gb(system.memTotal)) }) : undefined}
      />
      {battery?.present ? (
        <Stat
          icon={battery.charging ? <BatteryCharging size={12} /> : <BatteryMedium size={12} />}
          label={t("Battery")}
          value={digits(Math.round(battery.percent))}
          unit="%"
          bar={battery.percent / 100}
          colour={battery.charging ? "#4ade80" : battery.percent <= 20 ? "#f87171" : undefined}
          foot={battery.charging ? t("Charging") : battery.secsLeft ? left(battery.secsLeft) : t("On battery")}
        />
      ) : (
        <Stat icon={<BatteryCharging size={12} />} label={t("Power")} value={t("AC")} bar={1} colour="#4ade80" foot={t("Plugged in")} />
      )}
      <div className="island-stat">
        <div className="island-stat-label">
          <ArrowDown size={12} /> {t("Network")}
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
  const t = useT();
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
          {fmtDate(now, { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {weather ? (
        <div className="island-card flex items-center gap-3">
          <WeatherGlyph icon={weather.icon} size={34} />
          <div className="min-w-0">
            <div className="text-[24px] leading-none font-bold tabular-nums text-white">{temp(weather.tempC)}</div>
            <div className="mt-1 max-w-[120px] truncate text-[11.5px] font-semibold text-white/60">
              {conditionLabel(weather.condition)}
            </div>
            <div dir="auto" className="max-w-[120px] truncate text-start text-[10.5px] font-medium text-white/35">{weather.place}</div>
          </div>
        </div>
      ) : battery?.present ? (
        <div className="island-card text-end">
          <div className="text-[24px] leading-none font-bold tabular-nums text-white">
            {digits(`${Math.round(battery.percent)}%`)}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/45">
            {battery.charging ? t("Charging") : t("Battery")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
