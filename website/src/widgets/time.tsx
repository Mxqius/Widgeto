import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { pad, useNow } from "../lib/hooks";
import { Pad, TickMeter } from "./ui";

/* ------------------------------------------------------------------ clock -- */

const NUMERALS = [12, 3, 6, 9].map((n, i) => {
  const a = (i * 90 * Math.PI) / 180;
  return (
    <text
      key={n}
      x={50 + Math.sin(a) * 36}
      y={50 - Math.cos(a) * 36 + 3.4}
      textAnchor="middle"
      fontSize="7.5"
      fontWeight="600"
      fill="#0a0a0b"
    >
      {n}
    </text>
  );
});

const TICKS = Array.from({ length: 60 }, (_, i) => {
  if (i % 15 === 0) return null;
  const a = (i * 6 * Math.PI) / 180;
  const major = i % 5 === 0;
  return (
    <line
      key={i}
      x1={50 + Math.sin(a) * (major ? 41 : 43)}
      y1={50 - Math.cos(a) * (major ? 41 : 43)}
      x2={50 + Math.sin(a) * 44.5}
      y2={50 - Math.cos(a) * 44.5}
      stroke="#0a0a0b"
      strokeOpacity={major ? 0.38 : 0.14}
      strokeWidth={major ? 1 : 0.6}
      strokeLinecap="round"
    />
  );
});

export function ClockWidget({ label = "AMS" }: { label?: string }) {
  const now = useNow(1000);
  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours();
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {NUMERALS}
        {TICKS}
        <g style={{ transform: `rotate(${(h % 12) * 30 + m * 0.5}deg)`, transformOrigin: "50px 50px" }}>
          <rect x="48.9" y="27" width="2.2" height="25" rx="1.1" fill="#0a0a0b" />
        </g>
        <g style={{ transform: `rotate(${m * 6 + s * 0.1}deg)`, transformOrigin: "50px 50px" }}>
          <rect x="49.3" y="16" width="1.5" height="36" rx="0.75" fill="#0a0a0b" />
        </g>
        <g style={{ transform: `rotate(${s * 6}deg)`, transformOrigin: "50px 50px" }}>
          <rect x="49.7" y="14" width="0.7" height="40" rx="0.35" fill="var(--accent)" />
        </g>
        <circle cx="50" cy="50" r="2" fill="var(--accent)" />
        <circle cx="50" cy="50" r="0.9" fill="#fbfbfa" />
      </svg>
      <div
        className="absolute inset-x-0 flex items-center justify-center gap-1 text-[11px] font-semibold tabular-nums"
        style={{ top: "63%" }}
      >
        <span style={{ color: "var(--accent)" }}>{label}</span>
        <span>
          {pad(h)}:{pad(m)}
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- calendar -- */

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

export function CalendarWidget() {
  const today = useNow(60_000);
  const [offset, setOffset] = useState(0);
  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = view.getFullYear();
  const mo = view.getMonth();
  const daysIn = new Date(y, mo + 1, 0).getDate();
  const isThisMonth = offset === 0;

  // the week containing today, or the first week of another month
  const anchor = isThisMonth ? today.getDate() : 1;
  const start = anchor - new Date(y, mo, anchor).getDay();
  const week = Array.from({ length: 7 }, (_, i) => new Date(y, mo, start + i));
  const left = daysIn - today.getDate();

  return (
    <Pad className="gap-2.5">
      <div className="flex items-center justify-between">
        <button
          className="dimmer grid size-5 place-items-center rounded-full hover:bg-black/5"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Previous month"
        >
          <ChevronLeft size={12} />
        </button>
        <span className="text-[12px] font-semibold">
          {view.toLocaleDateString("en", { month: "long", year: "numeric" })}
        </span>
        <button
          className="dimmer grid size-5 place-items-center rounded-full hover:bg-black/5"
          onClick={() => setOffset((o) => o + 1)}
          aria-label="Next month"
        >
          <ChevronRight size={12} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {DOW.map((d) => (
          <span key={d} className="dimmer text-[9px] font-semibold">
            {d}
          </span>
        ))}
        {week.map((d) => {
          const on = d.toDateString() === today.toDateString();
          return (
            <span
              key={d.toISOString()}
              className={clsx(
                "mx-auto grid size-[22px] place-items-center rounded-full text-[11px] font-semibold tabular-nums",
                d.getMonth() !== mo && "opacity-30",
              )}
              style={on ? { background: "var(--accent)", color: "#fff" } : undefined}
            >
              {d.getDate()}
            </span>
          );
        })}
      </div>
      <div className="mt-auto space-y-1.5 border-t border-black/10 pt-2.5">
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10px] font-semibold uppercase">
            {today.toLocaleDateString("en", { weekday: "long" })}
          </span>
          <span className="numeral text-[13px]">W{isoWeek(today)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10px] font-semibold uppercase">Left in month</span>
          <span className="numeral text-[13px]">{left}d</span>
        </div>
      </div>
    </Pad>
  );
}

/* --------------------------------------------------------------- pomodoro -- */

const MODES = { Focus: 25 * 60, Short: 5 * 60, Long: 15 * 60 } as const;
type Mode = keyof typeof MODES;

export function PomodoroWidget({ autostart = false }: { autostart?: boolean }) {
  const [mode, setMode] = useState<Mode>("Focus");
  const [left, setLeft] = useState<number>(MODES.Focus);
  const [running, setRunning] = useState(autostart);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (left === 0) setRunning(false);
  }, [left]);

  const pick = (m: Mode) => {
    setMode(m);
    setLeft(MODES[m]);
    setRunning(false);
  };
  const done = 100 - (left / MODES[mode]) * 100;

  return (
    <Pad className="justify-between">
      <div>
        <div className="numeral text-[40px] leading-none">
          {pad(Math.floor(left / 60))}:{pad(left % 60)}
        </div>
        <div className="dim mt-1 text-[10.5px] font-semibold uppercase">
          {mode === "Focus" ? "Focus session" : mode === "Short" ? "Short break" : "Long break"}
        </div>
      </div>
      <TickMeter value={Math.max(done, 2)} height={30} ticks={24} />
      <div className="flex items-center gap-1">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => pick(m)}
            className="h-6 rounded-full px-2 text-[10px] font-semibold transition-colors"
            style={m === mode ? { background: "var(--accent)", color: "#fff" } : { background: "rgba(255,255,255,0.08)" }}
          >
            {m}
          </button>
        ))}
        <button
          onClick={() => setRunning((r) => !r)}
          className="ml-auto grid size-7 place-items-center rounded-full bg-white text-black transition-transform active:scale-90"
          aria-label={running ? "Pause" : "Start"}
        >
          {running ? <Pause size={12} className="fill-current" /> : <Play size={12} className="ml-0.5 fill-current" />}
        </button>
        <button onClick={() => pick(mode)} className="dim grid size-6 place-items-center" aria-label="Reset">
          <RotateCcw size={12} />
        </button>
      </div>
    </Pad>
  );
}
