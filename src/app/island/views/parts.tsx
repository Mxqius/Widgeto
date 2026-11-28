import { Music } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";

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

/**
 * A pointer-driven slider: click anywhere to jump, drag to scrub. The track
 * thickens under the pointer the way a touch slider does. `onChange` fires
 * while dragging, `onCommit` once on release.
 */
export function Slider({ value, onChange, onCommit, colour = "#fff", disabled, label, glide = "180ms ease-out" }: {
  value: number;
  onChange?: (v: number) => void;
  onCommit?: (v: number) => void;
  colour?: string;
  disabled?: boolean;
  label: string;
  /** transition for the fill when it moves on its own */
  glide?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const at = (x: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return Math.min(1, Math.max(0, (x - r.left) / r.width));
  };
  const shown = Math.min(1, Math.max(0, drag ?? value));

  return (
    <div
      ref={ref}
      role="slider"
      // seek and volume read left to right in every language
      dir="ltr"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={`island-slider ${drag !== null ? "is-drag" : ""} ${disabled ? "is-off" : ""}`}
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const v = at(e.clientX);
        setDrag(v);
        onChange?.(v);
      }}
      onPointerMove={(e) => {
        if (drag === null) return;
        const v = at(e.clientX);
        setDrag(v);
        onChange?.(v);
      }}
      onPointerUp={(e) => {
        if (drag === null) return;
        const v = at(e.clientX);
        setDrag(null);
        onCommit?.(v);
      }}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(e) => {
        if (disabled) return;
        const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.05 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.05 : 0;
        if (!step) return;
        e.preventDefault();
        const v = Math.min(1, Math.max(0, value + step));
        onChange?.(v);
        onCommit?.(v);
      }}
    >
      <div className="island-slider-track">
        <div
          className="island-slider-fill"
          style={{ width: `${shown * 100}%`, background: colour, transition: drag !== null ? "none" : `width ${glide}` }}
        />
      </div>
    </div>
  );
}
