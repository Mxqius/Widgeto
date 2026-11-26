import { Music } from "lucide-react";
import type { CSSProperties } from "react";

/** Album cover, or a tinted note when the player publishes none. */
export function Art({ src, size, radius, className = "" }: { src: string | null; size: number; radius: number; className?: string }) {
  const style: CSSProperties = { width: size, height: size, borderRadius: radius };
  return src ? (
    <img src={src} alt="" draggable={false} className={`island-art shrink-0 object-cover ${className}`} style={style} />
  ) : (
    <div className={`island-art grid shrink-0 place-items-center ${className}`} style={{ ...style, background: "linear-gradient(135deg, var(--accent), #1a1a1f)" }}>
      <Music size={Math.round(size * 0.42)} className="text-white/85" />
    </div>
  );
}

/** Four bouncing bars. Paused, they flatten and dim. */
export function Equalizer({ playing, colour, height = 14, bars = 4 }: { playing: boolean; colour?: string; height?: number; bars?: number }) {
  return (
    <div className={`island-eq ${playing ? "" : "is-paused"}`} style={{ height, color: colour ?? "var(--accent)" }} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}

/** Circular progress. */
export function Ring({ value, size, stroke, colour = "var(--accent)", track = "rgba(255,255,255,0.12)", children }: {
  value: number;
  size: number;
  stroke: number;
  colour?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
          className="island-ring"
        />
      </svg>
      {children}
    </div>
  );
}

/** Thin bar with a rounded fill. */
export function Bar({ value, colour = "var(--accent)", height = 4 }: { value: number; colour?: string; height?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-white/12" style={{ height }}>
      <div
        className="island-bar h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: colour }}
      />
    </div>
  );
}
