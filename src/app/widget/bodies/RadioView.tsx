import { Heart, Loader2, Play, Radio, SkipBack, SkipForward, Square } from "lucide-react";
import { isSm } from "../lib/scale";
import { useRadio } from "@/shared/radio/useRadio";
import { isFavorite, stationMeta } from "@/shared/radio/protocol";
import { StationIcon } from "@/shared/radio/StationIcon";
import type { SizeKey } from "@/shared/types/widget";
import { useT } from "../i18n";

/**
 * A remote for the radio that plays in the manager window: closing this
 * widget does not stop it. Stations are found and saved in the widget's
 * settings; here they are played and stepped through.
 */
export default function RadioView({ size }: { size: SizeKey }) {
  const t = useT();
  const { state: r, send } = useRadio();
  const small = isSm(size);
  const st = r.station;
  const on = r.playing || r.buffering;
  const fav = isFavorite(r, st?.id);
  const canStep = r.favorites.length > 1 || (r.favorites.length === 1 && r.favorites[0].id !== st?.id);

  const line = r.error ?? (r.buffering ? t("Connecting…") : r.playing ? (r.nowTitle ?? t("Live")) : st ? t("Stopped") : null);

  return (
    <div className="flex h-full w-full flex-col p-4">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 text-center">
        {st ? (
          <>
            <StationIcon station={st} size={small ? 30 : 40} radius={small ? 8 : 10} className="mb-1" />
            <div
              dir="auto"
              className="line-clamp-2 w-full font-bold tracking-tight"
              style={{ fontSize: small ? 12 : 13.5, lineHeight: 1.25 }}
            >
              {st.name}
            </div>
            {line && (
              <div
                dir="auto"
                className="w-full truncate text-[10.5px] font-medium"
                style={r.error ? { color: "#fca5a5" } : r.playing && r.nowTitle ? undefined : { opacity: 0.55 }}
              >
                {line}
              </div>
            )}
            {!small && stationMeta(st) && (
              <div className="dimmer w-full truncate text-[9.5px] font-semibold">{stationMeta(st)}</div>
            )}
          </>
        ) : (
          <>
            <Radio size={small ? 16 : 20} className="dimmer mb-1" />
            <div className="dim text-[11.5px] font-semibold">{t("No station yet")}</div>
            {!small && (
              <div className="dimmer text-[10px] font-medium">{t("Find stations in this widget’s settings")}</div>
            )}
          </>
        )}
      </div>

      {!small && r.favorites.length > 1 && (
        <div className="mb-2.5 flex justify-center gap-1.5 overflow-hidden" data-nodrag>
          {r.favorites.slice(0, 6).map((f) => (
            <button
              key={f.id}
              title={f.name}
              onClick={() => send({ type: "play", station: f })}
              className="rounded-[7px] transition-all hover:opacity-100 active:scale-95"
              style={{
                opacity: f.id === st?.id ? 1 : 0.55,
                outline: f.id === st?.id ? "1.5px solid var(--accent)" : undefined,
                outlineOffset: 1.5,
              }}
            >
              <StationIcon station={f} size={20} radius={6} />
            </button>
          ))}
        </div>
      )}

      {/* transport reads left to right in every language */}
      <div dir="ltr" className="flex shrink-0 items-center justify-center gap-2" data-nodrag>
        <button
          onClick={() => send({ type: "prev" })}
          className="dim transition-opacity hover:opacity-100 disabled:opacity-20"
          disabled={!canStep}
          title={t("Previous favorite")}
        >
          <SkipBack size={small ? 13 : 15} className="fill-current" />
        </button>
        <button
          onClick={() => send({ type: "toggle" })}
          className="grid place-items-center rounded-full bg-white text-black transition-transform active:scale-95 disabled:opacity-20"
          style={{ width: small ? 26 : 30, height: small ? 26 : 30 }}
          disabled={!st && r.favorites.length === 0}
          title={on ? t("Stop") : t("Play")}
        >
          {r.buffering ? (
            <Loader2 size={small ? 12 : 13} className="animate-spin" />
          ) : on ? (
            <Square size={small ? 10 : 11} className="fill-current" />
          ) : (
            <Play size={small ? 12 : 13} className="ml-0.5 fill-current" />
          )}
        </button>
        <button
          onClick={() => send({ type: "next" })}
          className="dim transition-opacity hover:opacity-100 disabled:opacity-20"
          disabled={!canStep}
          title={t("Next favorite")}
        >
          <SkipForward size={small ? 13 : 15} className="fill-current" />
        </button>
        {!small && st && (
          <button
            onClick={() => send({ type: "favorite", station: st })}
            className="absolute bottom-4 transition-opacity [inset-inline-end:1rem] hover:opacity-100"
            style={{ color: fav ? "var(--accent)" : undefined, opacity: fav ? 1 : 0.45 }}
            title={fav ? t("Remove from favorites") : t("Add to favorites")}
          >
            <Heart size={13} className={fav ? "fill-current" : ""} />
          </button>
        )}
      </div>
    </div>
  );
}
