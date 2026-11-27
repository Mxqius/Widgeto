import { BatteryLow, BatteryMedium, Zap } from "lucide-react";
import type { BatteryStats, Volume, Weather } from "@/shared/ipc/commands";
import type { IslandIdle } from "@/shared/types/settings";
import { clock, mmss } from "../lib/format";
import type { Track } from "../data/useMedia";
import type { Focus } from "../data/useFocus";
import { Art, Equalizer, Ring } from "./parts";
import { CAMERA_TONE, MIC_TONE, VolumeGlyph, WeatherGlyph } from "./glyphs";
import type { RadioRemote } from "../data/useIslandRadio";
import { StationIcon } from "@/shared/radio/StationIcon";

/**
 * Nothing going on: the time, and one quiet fact on the right — the one the
 * user picked, or on "auto" whichever matters most right now.
 */
export function IdleCompact({ now, h24, show, battery, weather, temp }: {
  now: Date;
  h24: boolean;
  show: IslandIdle;
  battery: BatteryStats | undefined;
  weather: Weather | undefined;
  temp: (c: number) => string;
}) {
  const pct = battery?.present ? Math.round(battery.percent) : null;
  const auto = show === "auto";
  let right: React.ReactNode;
  if (show === "none") {
    right = null;
  } else if (show === "battery" && pct !== null && !battery?.charging && pct > 20) {
    right = (
      <span className="flex items-center gap-1 text-[12px] font-semibold tabular-nums text-white/80">
        <BatteryMedium size={14} />
        {pct}%
      </span>
    );
  } else if ((auto || show === "battery") && battery?.present && battery.charging) {
    right = (
      <span className="flex items-center gap-1 text-[12px] font-semibold tabular-nums text-[#4ade80]">
        <Zap size={12} className="fill-current" />
        {pct}%
      </span>
    );
  } else if ((auto || show === "battery") && pct !== null && pct <= 20) {
    right = (
      <span className="flex items-center gap-1 text-[12px] font-semibold tabular-nums text-[#f87171]">
        <BatteryLow size={14} />
        {pct}%
      </span>
    );
  } else if ((auto || show === "weather") && weather) {
    right = (
      <span className="flex items-center gap-1 text-[12px] font-semibold tabular-nums text-white/80">
        <WeatherGlyph icon={weather.icon} size={13} />
        {temp(weather.tempC)}
      </span>
    );
  } else {
    right = (
      <span className="text-[11.5px] font-semibold text-white/55">
        {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
      </span>
    );
  }

  return (
    <div className={`flex h-full items-center px-4 ${right ? "justify-between" : "justify-center"}`}>
      <span className="text-[13px] font-semibold tabular-nums tracking-tight text-white">{clock(now, h24)}</span>
      {right}
    </div>
  );
}

/** Music is playing: the cover on the left, the bars on the right. */
export function MediaCompact({ track }: { track: Track }) {
  return (
    <div className="flex h-full items-center justify-between pl-1.5 pr-3.5">
      <Art src={track.art} size={24} radius={8} className={track.media?.playing ? "" : "opacity-60"} />
      <Equalizer playing={!!track.media?.playing} colour={track.tint ?? undefined} />
    </div>
  );
}

/** The radio is on and nothing else is playing: the station's icon, then the bars. */
export function RadioCompact({ radio }: { radio: RadioRemote }) {
  const r = radio.state;
  return (
    <div className="flex h-full items-center justify-between pl-1.5 pr-3.5">
      <StationIcon station={r.station} size={24} radius={8} className={r.playing ? "" : "opacity-60"} />
      <Equalizer playing={r.playing} />
    </div>
  );
}

/** A focus session is running and nothing else is. */
export function TimerCompact({ focus }: { focus: Focus }) {
  return (
    <div className="flex h-full items-center justify-between pl-2 pr-4">
      <span className="flex items-center gap-2">
        <Ring value={focus.progress} size={22} stroke={3} />
        <span className="text-[11.5px] font-semibold capitalize text-white/60">
          {focus.mode === "focus" ? "Focus" : "Break"}
        </span>
      </span>
      <span
        className="text-[13px] font-bold tabular-nums"
        style={{ color: focus.running ? "var(--accent)" : "rgba(255,255,255,0.55)" }}
      >
        {mmss(focus.left)}
      </span>
    </div>
  );
}

/** The detached second bubble, when music and a timer run at once. */
export function TimerBubble({ focus }: { focus: Focus }) {
  return (
    <div className="grid h-full w-full place-items-center">
      <Ring value={focus.progress} size={24} stroke={3} />
    </div>
  );
}

/** The volume pop-out: what the keys, the mixer or a scroll just did. */
export function VolumeHud({ v }: { v: Volume | undefined }) {
  const level = v ? (v.muted ? 0 : v.level) : 0;
  return (
    <div className="flex h-full items-center gap-3 px-4">
      <VolumeGlyph v={v} size={16} className="shrink-0 text-white" />
      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${level * 100}%`, transition: "width 140ms ease-out" }}
        />
      </div>
      <span className="w-7 text-right text-[12px] font-bold tabular-nums text-white">
        {v?.muted ? "Off" : Math.round(level * 100)}
      </span>
    </div>
  );
}

/** Green for the camera, orange for the mic — at the right end of the pill. */
export function PrivacyDots({ camera, mic }: { camera: boolean; mic: boolean }) {
  return (
    <span className="island-privacy" aria-label={[camera && "Camera in use", mic && "Microphone in use"].filter(Boolean).join(", ")}>
      {camera && <i className="island-privacy-dot" style={{ background: CAMERA_TONE, color: CAMERA_TONE }} />}
      {mic && <i className="island-privacy-dot" style={{ background: MIC_TONE, color: MIC_TONE }} />}
    </span>
  );
}
