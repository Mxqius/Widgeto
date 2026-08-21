import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Standard widget padding + optional header row. */
export function Shell({
  title,
  icon,
  right,
  children,
  className,
  dense,
}: {
  title?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <div className={cn("flex h-full flex-col", dense ? "p-3" : "p-3.5")}>
      {title && (
        <div className="mb-2.5 flex items-center gap-1.5">
          <span style={{ color: "var(--accent)" }} className="flex shrink-0 items-center">
            {icon}
          </span>
          <span className="label-xs truncate">{title}</span>
          <div className="flex-1" />
          <div className="flex shrink-0 items-center gap-1 pr-14 text-[10.5px] text-ink-500">
            {right}
          </div>
        </div>
      )}
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>{children}</div>
    </div>
  );
}

/** Progress ring used by system / battery / pomodoro widgets. */
export function Ring({
  value,
  size = 56,
  stroke = 5,
  color,
  label,
  sub,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: ReactNode;
  sub?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c - (c * Math.min(100, Math.max(0, value))) / 100 }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        {label && <span className="text-[13px] font-semibold text-ink-100 tabular-nums">{label}</span>}
        {sub && <span className="mt-0.5 text-[9px] text-ink-500">{sub}</span>}
      </div>
    </div>
  );
}

/** Tiny smoothed area chart. */
export function Spark({
  data,
  color,
  height = 34,
  fill = true,
}: {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
}) {
  if (data.length < 2) return <div style={{ height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    height - ((v - min) / span) * (height - 4) - 2,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const stroke = color ?? "var(--accent)";
  const gid = `sg-${Math.abs(data[0] * 1000).toFixed(0)}-${data.length}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.34} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L${w},${height} L0,${height} Z`} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Thin labelled bar. */
export function Bar({
  label,
  value,
  color,
  suffix = "%",
}: {
  label: string;
  value: number;
  color?: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-ink-400">{label}</span>
        <span className="font-mono text-[11px] text-ink-200 tabular-nums">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color ?? "var(--accent)" }}
          animate={{ width: `${Math.min(100, value)}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 24 }}
        />
      </div>
    </div>
  );
}
