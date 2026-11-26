import { Check } from "lucide-react";
import type { Activity } from "../data/useActivities";
import { Art, Equalizer } from "./parts";
import { ActivityGlyph } from "./glyphs";

/** A live activity: what just happened, for a few seconds. */
export function Toast({ a, art, playing, tint }: {
  a: Activity;
  art: string | null;
  playing: boolean;
  tint: string | null;
}) {
  const tone = a.tone ?? "var(--accent)";
  return (
    <div className="flex h-full items-center gap-3 pl-3 pr-5">
      {a.icon === "track" ? (
        <Art src={art} size={46} radius={14} />
      ) : (
        <div
          className="grid size-[46px] shrink-0 place-items-center rounded-full"
          style={{ background: `color-mix(in srgb, ${tone} 18%, transparent)`, color: tone }}
        >
          <ActivityGlyph icon={a.icon} size={21} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold text-white/50">{a.subtitle}</div>
        <div className="truncate text-[14px] font-bold tracking-tight text-white">{a.title}</div>
      </div>
      {a.icon === "track" ? (
        <Equalizer playing={playing} colour={tint ?? undefined} height={18} />
      ) : a.trailing ? (
        <span className="shrink-0 text-[17px] font-bold tabular-nums" style={{ color: tone }}>
          {a.trailing}
        </span>
      ) : (
        <Check size={18} style={{ color: tone }} className="shrink-0" />
      )}
    </div>
  );
}
