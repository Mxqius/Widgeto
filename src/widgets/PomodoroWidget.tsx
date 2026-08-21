import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Ring, Shell } from "./parts";
import { pad } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
type Mode = keyof typeof MODES;

export default function PomodoroWidget({ size }: WidgetBodyProps) {
  const [mode, setMode] = useState<Mode>("focus");
  const [left, setLeft] = useState(MODES.focus);
  const [running, setRunning] = useState(false);
  const [streak, setStreak] = useState(2);

  useEffect(() => setLeft(MODES[mode]), [mode]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          setRunning(false);
          if (mode === "focus") setStreak((s) => s + 1);
          return MODES[mode];
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode]);

  const total = MODES[mode];
  const pct = ((total - left) / total) * 100;
  const color = mode === "focus" ? "var(--accent)" : "#31d0aa";

  return (
    <Shell
      title="Focus"
      icon={<Timer size={12} />}
      right={<span>{"●".repeat(Math.min(streak, 4))}</span>}
      className="items-center justify-center"
    >
      {size !== "sm" && (
        <div data-nodrag className="mb-2">
          <Modes value={mode} onChange={setMode} />
        </div>
      )}

      <Ring
        value={pct}
        size={size === "lg" ? 120 : size === "md" ? 96 : 84}
        stroke={6}
        color={color}
        label={
          <span className="font-mono text-[17px]">
            {pad(Math.floor(left / 60))}:{pad(left % 60)}
          </span>
        }
        sub={running ? "running" : "paused"}
      />

      <div data-nodrag className="mt-2.5 flex items-center gap-1.5">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setRunning((r) => !r)}
          className="grid size-8 place-items-center rounded-full text-white"
          style={{ background: color, boxShadow: `0 4px 14px -4px ${color}` }}
        >
          {running ? <Pause size={14} className="fill-current" /> : <Play size={14} className="ml-0.5 fill-current" />}
        </motion.button>
        <button
          onClick={() => {
            setRunning(false);
            setLeft(MODES[mode]);
          }}
          className="grid size-7 place-items-center rounded-full text-ink-400 transition-colors hover:bg-white/8 hover:text-white"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </Shell>
  );
}

/**
 * A local three-way switch. Deliberately not the shared Segmented control:
 * that one pulls the whole Base UI bundle into this widget's window.
 */
function Modes({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-[10px] border border-white/6 bg-white/3 p-0.5">
      {(["focus", "short", "long"] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`h-6 rounded-lg px-2 text-[11px] font-medium capitalize transition-colors ${
            m === value ? "bg-white/9 text-white" : "text-ink-400 hover:text-ink-200"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
