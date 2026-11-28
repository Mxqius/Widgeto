import { Heart, Loader2, Play, Radio, Search, SkipBack, SkipForward, Square, Volume1, Volume2, VolumeX } from "lucide-react";
import { useState, type ReactNode } from "react";
import { RADIO_PRESETS } from "@/shared/radio/presets";
import { isFavorite, stationMeta, type Station } from "@/shared/radio/protocol";
import { StationIcon } from "@/shared/radio/StationIcon";
import { useStationSearch } from "@/shared/radio/useRadio";
import type { RadioRemote } from "../data/useIslandRadio";
import { Equalizer, Slider } from "./parts";
import { useT } from "../i18n";

/** The quick ways in: what you saved, then a few directory shortcuts. */
const SOURCES = [{ id: "fav", label: "Favorites" } as const, ...RADIO_PRESETS.slice(0, 3)];

/**
 * Online radio. The player itself is in the manager window, so it carries on
 * when the island closes; this is a remote with a station picker.
 */
export function RadioPanel({ radio, onFocusChange }: {
  radio: RadioRemote;
  /** typing in the search holds the island open, as it does for Ask */
  onFocusChange: (focused: boolean) => void;
}) {
  const t = useT();
  const { state: r, send } = radio;
  const st = r.station;
  const fav = isFavorite(r, st?.id);
  const [source, setSource] = useState(() => (r.favorites.length ? "fav" : "popular"));
  const [text, setText] = useState("");

  const searching = source !== "fav" || text.trim() !== "";
  const preset = RADIO_PRESETS.find((p) => p.id === source);
  const res = useStationSearch(
    searching ? { ...(preset?.query ?? {}), name: text.trim() || undefined, limit: 30 } : null,
  );
  const list: Station[] = searching ? res.stations : r.favorites;

  const line =
    r.error ??
    (r.buffering ? t("Connecting…") : r.playing ? (r.nowTitle ?? t("Live")) : st ? stationMeta(st) || t("Stopped") : null);
  const VolIcon = r.volume === 0 ? VolumeX : r.volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex h-full flex-col gap-2.5">
      {/* what is on, transport and the stream's own volume */}
      <div className="flex items-center gap-3">
        {st ? (
          <StationIcon station={st} size={44} radius={12} className="island-art" />
        ) : (
          <div className="island-art grid size-11 shrink-0 place-items-center rounded-xl bg-white/8">
            <Radio size={18} className="text-white/50" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div dir="auto" className="truncate text-start text-[14px] font-bold tracking-tight text-white">
              {st?.name ?? t("Radio")}
            </div>
            {st && (
              <button
                className="shrink-0 transition-colors"
                style={{ color: fav ? "var(--accent)" : "rgba(255,255,255,0.35)" }}
                title={fav ? t("Remove from favorites") : t("Add to favorites")}
                onClick={() => send({ type: "favorite", station: st })}
              >
                <Heart size={12} className={fav ? "fill-current" : ""} />
              </button>
            )}
          </div>
          <div
            dir="auto"
            className="truncate text-start text-[11.5px] font-medium"
            style={{ color: r.error ? "#fca5a5" : "rgba(255,255,255,0.5)" }}
          >
            {line ?? t("Pick a station below")}
          </div>
        </div>
        {r.playing && <Equalizer playing height={14} />}
        <div dir="ltr" className="flex shrink-0 items-center gap-1">
          <button
            className="island-icon-btn island-icon-sm"
            title={t("Previous favorite")}
            disabled={r.favorites.length < 2}
            onClick={() => send({ type: "prev" })}
          >
            <SkipBack size={15} className="fill-current" />
          </button>
          <button
            className="island-play island-play-sm"
            title={r.playing || r.buffering ? t("Stop") : t("Play")}
            disabled={!st && !r.favorites.length}
            onClick={() => send({ type: "toggle" })}
          >
            {r.buffering ? (
              <Loader2 size={14} className="animate-spin" />
            ) : r.playing ? (
              <Square size={12} className="fill-current" />
            ) : (
              <Play size={15} className="ml-0.5 fill-current" />
            )}
          </button>
          <button
            className="island-icon-btn island-icon-sm"
            title={t("Next favorite")}
            disabled={r.favorites.length < 2}
            onClick={() => send({ type: "next" })}
          >
            <SkipForward size={15} className="fill-current" />
          </button>
        </div>
        <div
          className="flex w-[84px] shrink-0 items-center gap-1.5"
          title={t("Radio volume {n}%", { n: Math.round(r.volume * 100) })}
        >
          <VolIcon size={13} className="shrink-0 text-white/60" />
          <div className="flex-1">
            <Slider label={t("Radio volume")} value={r.volume} onChange={(v) => send({ type: "volume", volume: v })} />
          </div>
        </div>
      </div>

      {/* where to look */}
      <div className="flex items-center gap-1.5">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSource(s.id)}
            className={`island-chip ${source === s.id ? "is-on" : ""}`}
            style={{ padding: "4px 10px" }}
          >
            {t(s.label)}
          </button>
        ))}
        <label className="island-ask-field ms-auto min-w-0 flex-1" style={{ height: 26, paddingInlineStart: 9 }}>
          <Search size={11} className="shrink-0 text-white/45" />
          <input
            value={text}
            dir="auto"
            placeholder={t("Search stations")}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => onFocusChange(true)}
            onBlur={() => onFocusChange(false)}
            onKeyDown={(e) => e.key === "Escape" && setText("")}
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-white outline-none placeholder:text-white/35"
          />
        </label>
      </div>

      {/* the stations */}
      <div className="island-ask-scroll min-h-0 flex-1 overflow-y-auto">
        {searching && res.loading && list.length === 0 ? (
          <Note>
            <Loader2 size={12} className="animate-spin" /> {t("Looking…")}
          </Note>
        ) : searching && res.error ? (
          <Note>{t("Couldn’t reach the station directory")}</Note>
        ) : list.length === 0 ? (
          <Note>{searching ? t("No stations match") : t("No favorites yet. Tap the heart on a station")}</Note>
        ) : (
          <div className="grid grid-cols-6 gap-x-2 gap-y-2.5 pt-0.5 pb-1">
            {list.map((s) => {
              const here = s.id === st?.id;
              return (
                <button
                  key={s.id}
                  title={[s.name, stationMeta(s)].filter(Boolean).join(" · ")}
                  onClick={() =>
                    send(here && (r.playing || r.buffering) ? { type: "stop" } : { type: "play", station: s })
                  }
                  className="group flex min-w-0 flex-col items-center gap-1"
                >
                  <span
                    className="rounded-[10px] transition-transform group-active:scale-95"
                    style={{ outline: here ? "2px solid var(--accent)" : undefined, outlineOffset: 1.5 }}
                  >
                    <StationIcon station={s} size={34} radius={10} />
                  </span>
                  <span
                    dir="auto"
                    className="w-full truncate text-center text-[9.5px] font-semibold"
                    style={{ color: here ? "#fff" : "rgba(255,255,255,0.55)" }}
                  >
                    {s.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-[11px] font-semibold text-white/40">
      {children}
    </div>
  );
}
