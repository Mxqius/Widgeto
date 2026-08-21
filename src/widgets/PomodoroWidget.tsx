import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Pad, Stat, TickMeter } from "./parts";
import { pad } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
type Mode = keyof typeof MODES;

export default function PomodoroWidget({ size }: WidgetBodyProps) {
  const [mode, setMode] = useState<Mode>("focus");
  const [left, setLeft] = useState(MODES.focus);
  const [running, setRunning] = useState(false);

  useEffect(() => setLeft(MODES[mode]), [mode]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          setRunning(false);
          return MODES[mode];
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode]);

  const total = MODES[mode];
  const pct = ((total - left) / total) * 100;

  return (
    <Pad size={size} className="justify-between">
      <div>
        <Stat
          value={`${pad(Math.floor(left / 60))}:${pad(left % 60)}`}
          size={size === "sm" ? 32 : size === "md" ? 40 : 48}
        />
        <div className="dim mt-1 text-[11px] font-semibold uppercase">{mode} session</div>
      </div>

      <TickMeter
        value={pct}
        accent="var(--accent)"
        height={size === "sm" ? 26 : 38}
        ticks={size === "sm" ? 16 : 24}
      />

      <div className="flex items-center justify-between" data-nodrag>
        <div className="flex gap-1">
          {(["focus", "short", "long"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded-full px-2 py-1 text-[10.5px] font-semibold capitalize transition-colors"
              style={
                m === mode
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
              }
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRunning((r) => !r)}
            className="grid size-7 place-items-center rounded-full bg-white text-black"
            title={running ? "Pause" : "Start"}
          >
            {running ? (
              <Pause size={12} className="fill-current" />
            ) : (
              <Play size={12} className="ml-0.5 fill-current" />
            )}
          </button>
          <button
            onClick={() => {
              setRunning(false);
              setLeft(MODES[mode]);
            }}
            className="dim grid size-7 place-items-center rounded-full transition-colors hover:text-white"
            title="Reset"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </Pad>
  );
}
