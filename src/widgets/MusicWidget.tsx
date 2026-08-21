import { AudioLines, Music, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Line } from "./parts";
import { useMedia } from "@/lib/queries";
import { mediaControl } from "@/lib/data";
import { pad } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

/** Turns "Spotify.exe" / an AUMID into something worth showing. */
function appLabel(id: string | null) {
  if (!id) return null;
  const last = id.split("!").pop() ?? id;
  return last.replace(/\.exe$/i, "").replace(/^App$/i, "");
}

/**
 * Follows the system media session, so whatever is actually playing — Spotify,
 * a browser tab, a local player — shows up here with working transport.
 */
export default function MusicWidget({ size }: WidgetBodyProps) {
  const { data, refetch } = useMedia();
  const small = size === "sm";

  const send = async (a: "toggle" | "next" | "prev") => {
    try {
      await mediaControl(a);
    } catch {
      /* nothing is playing, or the source refused the command */
    }
    setTimeout(() => void refetch(), 250);
  };

  const title = data?.title;
  const hasTrack = !!title;
  const pos = data?.positionSec ?? 0;
  const dur = data?.durationSec ?? 0;
  const pct = dur > 0 ? (pos / dur) * 100 : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${pad(s % 60)}`;

  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 text-center">
        {hasTrack ? (
          <>
            {data?.playing ? (
              <AudioLines
                size={small ? 15 : 18}
                style={{ color: "var(--accent)" }}
                className="mb-1 shrink-0"
              />
            ) : (
              <Music size={small ? 15 : 18} className="dim mb-1 shrink-0" />
            )}
            <div
              className="line-clamp-2 w-full font-bold tracking-tight"
              style={{ fontSize: small ? 12 : 13.5, lineHeight: 1.25 }}
            >
              {title}
            </div>
            {data?.artist && (
              <div className="dim w-full truncate text-[10.5px] font-medium">{data.artist}</div>
            )}
            {!small && data?.app && (
              <div className="dimmer w-full truncate text-[9.5px] font-semibold">
                {appLabel(data.app)}
              </div>
            )}
          </>
        ) : (
          <>
            <Music size={small ? 16 : 20} className="dimmer mb-1" />
            <div className="dim text-[11.5px] font-semibold">Nothing playing</div>
            {!small && (
              <div className="dimmer text-[10px] font-medium">Start a track to control it here</div>
            )}
          </>
        )}
      </div>

      {hasTrack && dur > 0 && (
        <div className="mb-2" data-nodrag>
          <Line value={pct} accent="#fff" />
          <div className="dimmer mt-1 flex justify-between text-[9px] font-semibold tabular-nums">
            <span>{fmt(pos)}</span>
            <span>{fmt(dur)}</span>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-center gap-2" data-nodrag>
        <button
          onClick={() => send("prev")}
          className="dim transition-opacity hover:opacity-100 disabled:opacity-20"
          disabled={!hasTrack}
          title="Previous"
        >
          <SkipBack size={small ? 13 : 15} className="fill-current" />
        </button>
        <button
          onClick={() => send("toggle")}
          className="grid place-items-center rounded-full bg-white text-black transition-transform active:scale-95 disabled:opacity-20"
          style={{ width: small ? 26 : 30, height: small ? 26 : 30 }}
          disabled={!hasTrack}
          title={data?.playing ? "Pause" : "Play"}
        >
          {data?.playing ? (
            <Pause size={small ? 12 : 13} className="fill-current" />
          ) : (
            <Play size={small ? 12 : 13} className="ml-0.5 fill-current" />
          )}
        </button>
        <button
          onClick={() => send("next")}
          className="dim transition-opacity hover:opacity-100 disabled:opacity-20"
          disabled={!hasTrack}
          title="Next"
        >
          <SkipForward size={small ? 13 : 15} className="fill-current" />
        </button>
      </div>
    </div>
  );
}
