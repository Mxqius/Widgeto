import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Heart, Pause, Play, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { pad } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

const TRACKS = [
  { title: "Neon Corridor", artist: "Lumen Kane", len: 214, art: ["#7c6cff", "#3b2fbf"] },
  { title: "Slow Static", artist: "Mira Volt", len: 187, art: ["#e05fd0", "#7c2f8f"] },
  { title: "Northern Drift", artist: "Halden", len: 246, art: ["#31d0aa", "#0f6f66"] },
];

export default function MusicWidget({ size }: WidgetBodyProps) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(46);
  const [liked, setLiked] = useState(false);
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
  const fmt = (s: number) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
  const big = size === "lg";

  return (
    <div className="flex h-full flex-col p-3.5">
      <div className={big ? "flex flex-col gap-3" : "flex items-center gap-3"}>
        <motion.div
          animate={playing ? { rotate: 360 } : {}}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          className="relative shrink-0 overflow-hidden rounded-xl"
          style={{
            width: big ? "100%" : 46,
            height: big ? 118 : 46,
            background: `linear-gradient(135deg, ${track.art[0]}, ${track.art[1]})`,
            borderRadius: big ? 14 : 12,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_60%)]" />
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-white">{track.title}</div>
          <div className="truncate text-[11.5px] text-ink-500">{track.artist}</div>
        </div>

        {!big && (
          <button
            data-nodrag
            onClick={() => setLiked((v) => !v)}
            className="mr-12 shrink-0 rounded-md p-1 transition-colors hover:bg-white/8"
          >
            <Heart
              size={13}
              className={liked ? "fill-current" : "text-ink-500"}
              style={liked ? { color: "var(--accent)" } : undefined}
            />
          </button>
        )}
      </div>

      <div className="mt-auto pt-3">
        <div
          data-nodrag
          className="group h-1 cursor-pointer overflow-hidden rounded-full bg-white/[0.08]"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setT(Math.round(((e.clientX - r.left) / r.width) * track.len));
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--accent)" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[9.5px] text-ink-600 tabular-nums">
          <span>{fmt(t)}</span>
          <span>-{fmt(track.len - t)}</span>
        </div>

        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          {size !== "sm" && (
            <IconBtn onClick={() => {}}>
              <Shuffle size={12} />
            </IconBtn>
          )}
          <IconBtn onClick={() => setI((n) => (n - 1 + TRACKS.length) % TRACKS.length)}>
            <SkipBack size={14} className="fill-current" />
          </IconBtn>
          <motion.button
            data-nodrag
            whileTap={{ scale: 0.9 }}
            onClick={() => setPlaying((p) => !p)}
            className="grid size-8 place-items-center rounded-full text-white"
            style={{ background: "var(--accent)", boxShadow: "0 4px 14px -4px var(--accent)" }}
          >
            {playing ? <Pause size={14} className="fill-current" /> : <Play size={14} className="ml-0.5 fill-current" />}
          </motion.button>
          <IconBtn onClick={() => setI((n) => (n + 1) % TRACKS.length)}>
            <SkipForward size={14} className="fill-current" />
          </IconBtn>
          {size !== "sm" && (
            <IconBtn onClick={() => {}}>
              <Volume2 size={12} />
            </IconBtn>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      data-nodrag
      onClick={onClick}
      className="grid size-7 place-items-center rounded-full text-ink-400 transition-colors hover:bg-white/8 hover:text-white"
    >
      {children}
    </button>
  );
}
