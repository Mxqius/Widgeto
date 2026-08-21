import { useEffect, useState } from "react";
import { AudioLines, Play } from "lucide-react";
import { Line } from "./parts";
import { pad } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

const TRACKS = [
  { title: "HUMBLE.", artist: "Kendrick Lamar", len: 177, art: ["#e8452c", "#1a1a1a"] },
  { title: "Neon Corridor", artist: "Lumen Kane", len: 214, art: ["#7c6cff", "#12123a"] },
  { title: "Northern Drift", artist: "Halden", len: 246, art: ["#31d0aa", "#07332f"] },
];

/**
 * Album art fills the tile and is cut by a curved divider, with the track
 * details sitting in the black below it.
 */
export default function MusicWidget({ size }: WidgetBodyProps) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(46);
  const track = TRACKS[i];

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((v) => {
        if (v + 1 >= track.len) {
          setI((n) => (n + 1) % TRACKS.length);
          return 0;
        }
        return v + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, track.len]);

  const pct = (t / track.len) * 100;
  const artH = size === "sm" ? "58%" : "62%";

  return (
    <div className="relative h-full w-full">
      {/* art, clipped by the curve */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: artH,
          background: `linear-gradient(150deg, ${track.art[0]}, ${track.art[1]})`,
          clipPath: "ellipse(120% 100% at 50% 0%)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.35),transparent_58%)]" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 pb-4">
        <button
          data-nodrag
          onClick={() => setPlaying((p) => !p)}
          className="mb-0.5 opacity-90 transition-opacity hover:opacity-100"
          title={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <AudioLines size={size === "sm" ? 14 : 16} style={{ color: "var(--accent)" }} />
          ) : (
            <Play size={size === "sm" ? 14 : 16} className="fill-current" />
          )}
        </button>

        <div className="max-w-full truncate text-[13px] font-bold tracking-tight">
          {track.title}
        </div>
        <div className="dim max-w-full truncate text-[10.5px] font-medium">{track.artist}</div>

        <div className="mt-2 w-full" data-nodrag>
          <Line value={pct} accent="#fff" />
        </div>
        {size !== "sm" && (
          <div className="dimmer mt-1 flex w-full justify-between text-[9.5px] font-medium tabular-nums">
            <span>
              {Math.floor(t / 60)}:{pad(t % 60)}
            </span>
            <span>
              {Math.floor(track.len / 60)}:{pad(track.len % 60)}
            </span>
          </div>
        )}
      </div>

      {!playing && (
        <button
          data-nodrag
          onClick={() => setPlaying(true)}
          className="absolute inset-0 z-10"
          title="Play"
        >
          <span className="sr-only">Play</span>
        </button>
      )}
    </div>
  );
}
