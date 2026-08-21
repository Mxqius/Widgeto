import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Widget padding. There is deliberately no header row — in this design the
 * content is the widget, and hierarchy comes from type size and weight.
 */
export function Pad({
  children,
  className,
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn("flex h-full flex-col", className)}
      style={{ padding: size === "sm" ? 16 : size === "md" ? 18 : 22 }}
    >
      {children}
    </div>
  );
}

/**
 * The signature typographic block: one flowing line where the values are
 * heavy and white and the connective words fall back to muted.
 */
export function Say({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("display", className)} style={style}>
      {children}
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="dim font-medium">{children}</span>;
}

/** Vertical tick-mark meter, as on the battery card. */
export function TickMeter({
  value,
  accent,
  height = 56,
  ticks = 26,
  labels,
}: {
  value: number;
  accent: string;
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
          const isEdge = i === filled - 1;
          return (
            <div
              key={i}
              className="flex-1 rounded-[1px] transition-[height,background] duration-300"
              style={{
                height: isEdge ? "100%" : on ? "58%" : "34%",
                background: on
                  ? isEdge
                    ? accent
                    : "currentColor"
                  : "currentColor",
                opacity: on ? (isEdge ? 1 : 0.55) : 0.14,
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

/** Hairline progress line, as under the album art. */
export function Line({ value, accent }: { value: number; accent?: string }) {
  return (
    <div className="relative h-[2px] w-full rounded-full">
      <div className="absolute inset-0 rounded-full opacity-25" style={{ background: "currentColor" }} />
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, value)}%`, background: accent ?? "currentColor" }}
      />
      <span
        className="absolute top-1/2 size-[7px] -translate-y-1/2 rounded-full transition-[left] duration-500"
        style={{ left: `calc(${Math.min(100, value)}% - 3.5px)`, background: accent ?? "currentColor" }}
      />
    </div>
  );
}

/** Big numeral with a small trailing unit. */
export function Stat({
  value,
  unit,
  size = 44,
  className,
}: {
  value: ReactNode;
  unit?: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline", className)}>
      <span className="numeral" style={{ fontSize: size, lineHeight: 1 }}>
        {value}
      </span>
      {unit && (
        <span className="dim ml-1 text-[13px] font-semibold">{unit}</span>
      )}
    </div>
  );
}

/** Compact list row with a square thumbnail, as on the movie/calendar cards. */
export function Row({
  swatch,
  title,
  meta,
  right,
}: {
  swatch?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      {swatch}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold">{title}</div>
        {meta && <div className="dim truncate text-[10.5px] font-medium">{meta}</div>}
      </div>
      {right}
    </div>
  );
}

export function Swatch({ from, to }: { from: string; to: string }) {
  return (
    <span
      className="size-7 shrink-0 rounded-[7px]"
      style={{ background: `linear-gradient(140deg, ${from}, ${to})` }}
    />
  );
}
