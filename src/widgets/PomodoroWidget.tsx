import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Ring, Shell } from "./parts";
import { pad } from "@/lib/utils";
import { Segmented } from "@/components/ui";
import type { SizeKey } from "@/lib/types";

const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
type Mode = keyof typeof MODES;

export default function PomodoroWidget({ id, size }: { id: string; size: SizeKey }) {
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
          <Segmented<Mode>
            layoutId={`pomo-${id}`}
            value={mode}
            onChange={setMode}
            options={[
              { value: "focus", label: "Focus" },
              { value: "short", label: "Short" },
              { value: "long", label: "Long" },
            ]}
          />
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
