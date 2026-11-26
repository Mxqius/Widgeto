import { useId, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";

export type Theme = "dark" | "light";

/** Tiles are drawn at the app's medium size, 216 px, and scaled from there. */
export const TILE = 216;

/**
 * One widget tile, drawn the way the app draws it: a flat black or flat white
 * squircle (or a true circle for the clock), at 216 px, scaled to `size`.
 */
export function Tile({
  theme = "dark",
  circle,
  accent = "#ff4dd8",
  size = TILE,
  className,
  style,
  children,
}: {
  theme?: Theme;
  circle?: boolean;
  accent?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const k = size / TILE;
  return (
    <div className={clsx("relative shrink-0", className)} style={{ width: size, height: size, ...style }}>
      <div
        className={clsx("tile", theme === "dark" ? "tile-dark" : "tile-light")}
        style={
          {
            width: TILE,
            height: TILE,
            borderRadius: circle ? "50%" : 30,
            transform: k === 1 ? undefined : `scale(${k})`,
            transformOrigin: "0 0",
            "--accent": accent,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}

/** The standard tile padding and column. */
export function Pad({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("flex h-full flex-col p-[18px]", className)}>{children}</div>;
}

/** The signature display line: tight, large, mixed weight. */
export function Say({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={clsx("say", className)} style={style}>
      {children}
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="dim font-medium">{children}</span>;
}

/** Big numeral with a small trailing unit. */
export function Stat({ value, unit, size = 40 }: { value: ReactNode; unit?: ReactNode; size?: number }) {
  return (
    <div className="flex items-baseline">
      <span className="numeral" style={{ fontSize: size, lineHeight: 1 }}>
        {value}
      </span>
      {unit && <span className="dim ml-1 text-[13px] font-semibold">{unit}</span>}
    </div>
  );
}

/** The vertical tick-mark meter from the battery and system cards. */
export function TickMeter({
  value,
  height = 34,
  ticks = 24,
  labels,
}: {
  value: number;
  height?: number;
  ticks?: number;
  labels?: [string, string, string];
}) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * ticks);
  return (
    <div className="w-full">
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {Array.from({ length: ticks }).map((_, i) => {
          const on = i < filled;
          const edge = i === filled - 1;
          return (
            <div
              key={i}
              className="flex-1 rounded-[1px] transition-[height,background,opacity] duration-500"
              style={{
                height: edge ? "100%" : on ? "58%" : "34%",
                background: edge ? "var(--accent)" : "currentColor",
                opacity: on ? (edge ? 1 : 0.55) : 0.14,
              }}
            />
          );
        })}
      </div>
      {labels && (
        <div className="dimmer mt-2 flex justify-between text-[10px] font-medium tabular-nums">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
          <span>{labels[2]}</span>
        </div>
      )}
    </div>
  );
}

/** A tiny square album cover: a purple dusk over hills. */
export function Cover({ size = 48, radius = 12, className }: { size?: number; radius?: number; className?: string }) {
  const id = `cv${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={clsx("shrink-0", className)}
      style={{ borderRadius: radius }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1a63" />
          <stop offset="0.6" stopColor="#7b4dff" />
          <stop offset="1" stopColor="#ff7ad9" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" fill={`url(#${id})`} />
      <circle cx="31" cy="17" r="5.5" fill="#fff" opacity="0.92" />
      <path d="M0 36 L12 26 L21 32 L32 22 L48 34 L48 48 L0 48 Z" fill="#170d38" />
      <path d="M0 42 L15 35 L28 40 L40 33 L48 38 L48 48 L0 48 Z" fill="#0b0620" />
    </svg>
  );
}

/** The live equaliser bars. */
export function Equalizer({ playing = true, bars = 4, height = 14, color = "currentColor" }: {
  playing?: boolean;
  bars?: number;
  height?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-[2px]" style={{ height }} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full"
          style={{
            height: "100%",
            background: color,
            transformOrigin: "50% 50%",
            animation: playing ? `eq ${0.7 + (i % 3) * 0.18}s ease-in-out ${i * 0.12}s infinite` : "none",
            transform: playing ? undefined : "scaleY(0.3)",
          }}
        />
      ))}
    </div>
  );
}
