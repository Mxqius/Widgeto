import { BatteryLow, Zap } from "lucide-react";
import type { BatteryStats, Weather } from "@/shared/ipc/commands";
import { clock, mmss } from "../lib/format";
import type { Track } from "../data/useMedia";
import type { Focus } from "../data/useFocus";
import { Art, Equalizer, Ring } from "./parts";
import { WeatherGlyph } from "./glyphs";

/** Nothing going on: the time, and one quiet fact on the right. */
export function IdleCompact({ now, h24, battery, weather, temp }: {
  now: Date;
  h24: boolean;
  battery: BatteryStats | undefined;
  weather: Weather | undefined;
  temp: (c: number) => string;
}) {
  const pct = battery?.present ? Math.round(battery.percent) : null;
  let right: React.ReactNode;
  if (battery?.present && battery.charging) {
    right = (
      <span className="flex items-center gap-1 text-[12px] font-semibold tabular-nums text-[#4ade80]">
        <Zap size={12} className="fill-current" />
        {pct}%
      </span>
    );
  } else if (pct !== null && pct <= 20) {
    right = (
      <span className="flex items-center gap-1 text-[12px] font-semibold tabular-nums text-[#f87171]">
        <BatteryLow size={14} />
        {pct}%
      </span>
    );
  } else if (weather) {
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
    <div className="flex h-full items-center justify-between px-4">
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
