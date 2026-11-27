import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Heart, Loader2, Pause, Play, Plus, Search } from "lucide-react";
import { useApp } from "@/app/manager/store";
import { handleRadio, useRadioLocal } from "@/app/manager/radio/host";
import { configOf } from "@/shared/widgets/config";
import { Segmented } from "@/app/manager/ui";
import { RADIO_PRESETS } from "@/shared/radio/presets";
import { isFavorite, stationMeta, type Station } from "@/shared/radio/protocol";
import { StationIcon } from "@/shared/radio/StationIcon";
import { useStationSearch } from "@/shared/radio/useRadio";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "../Field";

/** What the Music widget follows, and the radio's stations. */
export function MusicPanel({ kind }: { kind: WidgetKind }) {
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("music", stored);

  return (
    <>
      <Field label="Plays" hint="Whatever is playing on this PC, or Widgeto's own radio.">
        <Segmented
          value={c.source}
          onChange={(v) => setConfig(kind, { source: v })}
          layoutId="music-source"
          options={[
            { value: "media", label: "System media" },
            { value: "radio", label: "Radio" },
          ]}
        />
      </Field>
      <div className="my-1 h-px bg-white/6" />
      <NowPlaying />
      <Favorites />
      <AddCustom />
      <Browse />
    </>
  );
}

function PlayButton({ station }: { station: Station }) {
  const r = useRadioLocal();
  const here = r.station?.id === station.id;
  const on = here && (r.playing || r.buffering);
  return (
    <button
      title={on ? "Stop" : "Play"}
      onClick={() => handleRadio(on ? { type: "stop" } : { type: "play", station })}
      className="grid size-6 shrink-0 place-items-center rounded-full transition-colors"
      style={on ? { background: "var(--accent)", color: "#fff" } : { background: "rgba(255,255,255,0.07)" }}
    >
      {here && r.buffering ? (
        <Loader2 size={11} className="animate-spin" />
      ) : on ? (
        <Pause size={10} className="fill-current" />
      ) : (
        <Play size={10} className="ml-px fill-current" />
      )}
    </button>
  );
}

function StationRow({ station, children }: { station: Station; children?: ReactNode }) {
  const r = useRadioLocal();
  const fav = isFavorite(r, station.id);
  const meta = stationMeta(station);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-2 py-1.5">
      <StationIcon station={station} size={24} radius={6} />
      <div className="min-w-0 flex-1">
        <div dir="auto" className="truncate text-start text-[11.5px] font-medium text-ink-100">
          {station.name}
        </div>
        {meta && <div className="truncate text-[10px] text-ink-500">{meta}</div>}
      </div>
      {children}
      <button
        title={fav ? "Remove from favorites" : "Add to favorites"}
        onClick={() => handleRadio({ type: "favorite", station })}
        className="shrink-0 transition-colors"
        style={{ color: fav ? "var(--accent)" : "var(--color-ink-600)" }}
      >
        <Heart size={12} className={fav ? "fill-current" : ""} />
      </button>
      <PlayButton station={station} />
    </div>
  );
}

function NowPlaying() {
  const r = useRadioLocal();
  if (!r.station) return null;
  return (
    <Field label="On air" stack>
      <div className="flex items-center gap-2.5">
        <StationIcon station={r.station} size={34} radius={8} />
        <div className="min-w-0 flex-1">
          <div dir="auto" className="truncate text-start text-[12px] font-semibold text-ink-100">
            {r.station.name}
          </div>
          <div dir="auto" className="truncate text-start text-[10.5px] text-ink-500">
            {r.error ?? (r.buffering ? "Connecting…" : r.playing ? (r.nowTitle ?? "Live") : "Stopped")}
          </div>
        </div>
        <PlayButton station={r.station} />
      </div>
    </Field>
  );
}

function Favorites() {
  const r = useRadioLocal();
  return (
    <div className="py-1.5">
      <div className="mb-1.5 text-[12px] font-medium text-ink-100">
        Favorites
        <span className="ml-1.5 text-[10.5px] text-ink-500">next and previous step through these</span>
      </div>
      <div className="space-y-1">
        {r.favorites.map((s, i) => (
          <StationRow key={s.id} station={s}>
            <div className="flex shrink-0 flex-col">
              <button
                title="Move up"
                disabled={i === 0}
                onClick={() => handleRadio({ type: "move", id: s.id, by: -1 })}
                className="text-ink-600 hover:text-ink-200 disabled:opacity-25"
              >
                <ChevronUp size={11} />
              </button>
              <button
                title="Move down"
                disabled={i === r.favorites.length - 1}
                onClick={() => handleRadio({ type: "move", id: s.id, by: 1 })}
                className="text-ink-600 hover:text-ink-200 disabled:opacity-25"
              >
                <ChevronDown size={11} />
              </button>
            </div>
          </StationRow>
        ))}
        {r.favorites.length === 0 && (
          <div className="px-1 py-2 text-[11px] text-ink-500">
            No favorites yet. Find stations below and tap the heart.
          </div>
        )}
      </div>
    </div>
  );
}

function AddCustom() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const ok = /^https?:\/\/\S+$/i.test(url.trim());
  const add = () => {
    if (!ok) return;
    handleRadio({ type: "addCustom", name, url });
    setName("");
    setUrl("");
  };
  return (
    <Field label="Add a stream" hint="Any Icecast or Shoutcast link, or an .mp3 / .aac stream." stack>
      <div className="flex items-center gap-1.5">
        <input
          className="field h-7 w-24 text-[12px]"
          placeholder="Name"
          value={name}
          dir="auto"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          className="field h-7 flex-1 text-[12px]"
          placeholder="https://stream.example.com/live"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn h-7 px-2" onClick={add} disabled={!ok} title="Add to favorites">
          <Plus size={13} />
        </button>
      </div>
    </Field>
  );
}

function Browse() {
  const [text, setText] = useState("");
  const [preset, setPreset] = useState("popular");
  const p = RADIO_PRESETS.find((x) => x.id === preset) ?? RADIO_PRESETS[0];
  const res = useStationSearch({ ...p.query, name: text.trim() || undefined, limit: 40 });

  return (
    <Field label="Find stations" hint="From the free Radio Browser directory." stack>
      <div className="relative mb-2">
        <Search size={12} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-500" />
        <input
          className="field h-7 pl-7 text-[12px]"
          placeholder="Search by name"
          value={text}
          dir="auto"
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {RADIO_PRESETS.map((x) => (
          <button
            key={x.id}
            onClick={() => setPreset(x.id)}
            className="chip transition-colors"
            style={x.id === preset ? { background: "var(--accent)", color: "#fff", borderColor: "transparent" } : undefined}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto pr-0.5">
        {res.loading && res.stations.length === 0 && (
          <div className="flex items-center gap-2 px-1 py-2 text-[11px] text-ink-500">
            <Loader2 size={12} className="animate-spin" /> Looking…
          </div>
        )}
        {res.error && <div className="px-1 py-2 text-[11px] text-red-300/80">{res.error}</div>}
        {!res.loading && !res.error && res.stations.length === 0 && (
          <div className="px-1 py-2 text-[11px] text-ink-500">No stations match.</div>
        )}
        {res.stations.map((s) => (
          <StationRow key={s.id} station={s} />
        ))}
      </div>
    </Field>
  );
}

