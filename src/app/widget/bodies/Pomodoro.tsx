import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Pad, Stat, TickMeter } from "../ui";
import { pad } from "../lib/format";
import { bySize, isSm } from "../lib/scale";
import { useWidgetConfig } from "../prefs";
import type { WidgetBodyProps } from "./props";
import { digits, useT } from "../i18n";

type Mode = "focus" | "short" | "long";

const ORDER: Mode[] = ["focus", "short", "long"];

const LABEL = { focus: "focus", short: "short", long: "long" } as const;
const SESSION = { focus: "focus session", short: "short session", long: "long session" } as const;

export default function PomodoroWidget({ size }: WidgetBodyProps) {
  const t = useT();
  const cfg = useWidgetConfig("pomodoro");
  const modes = useMemo<Record<Mode, number>>(
    () => ({ focus: cfg.focusMin * 60, short: cfg.shortMin * 60, long: cfg.longMin * 60 }),
    [cfg.focusMin, cfg.shortMin, cfg.longMin],
  );

  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(modes.focus);

  const total = modes[mode];

  // Switching mode, or editing the configured minutes, restarts the session.
  // Done during render rather than in an effect so the tile never paints the
  // old duration for a frame first.
  const [syncedTotal, setSyncedTotal] = useState(total);
  if (syncedTotal !== total) {
    setSyncedTotal(total);
    setLeft(total);
    setRunning(false);
  }

  /**
   * Counts against a wall-clock deadline rather than decrementing once per
   * tick. A covered widget gets its timers throttled by Chromium, and a focus
   * timer that quietly loses minutes while you work is worse than useless.
   */
  const leftRef = useRef(left);
  leftRef.current = left;
  const totalRef = useRef(total);
  totalRef.current = total;

  useEffect(() => {
    if (!running) return;
    const endAt = Date.now() + leftRef.current * 1000;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      if (rem === 0) {
        setRunning(false);
        setLeft(totalRef.current);
      } else {
        setLeft(rem);
      }
    };
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [running]);

  const pct = ((total - left) / total) * 100;

  const reset = () => {
    setRunning(false);
    setLeft(total);
  };

  return (
    <Pad size={size} className="justify-between">
      <div>
        <Stat
          value={digits(`${pad(Math.floor(left / 60))}:${pad(left % 60)}`)}
          size={bySize(size, 32, 40, 48)}
        />
        <div className="dim mt-1 text-[11px] font-semibold uppercase">{t(SESSION[mode])}</div>
      </div>

      <TickMeter
        value={pct}
        accent="var(--accent)"
        height={isSm(size) ? 26 : 38}
        ticks={isSm(size) ? 16 : 24}
      />

      <div className="flex items-center justify-between gap-2" data-nodrag>
        {/* at the smallest tile the labels do not fit, so the mode becomes a
            single tap-through chip instead of three buttons */}
        {isSm(size) ? (
          <button
            onClick={() => setMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length])}
            className="rounded-full px-2 py-1 text-[10px] font-semibold capitalize"
            style={{ background: "var(--accent)", color: "#fff" }}
            title={t("Tap to change mode")}
          >
            {t(LABEL[mode])}
          </button>
        ) : (
          <div className="flex min-w-0 gap-1">
            {ORDER.map((m) => (
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
                {t(LABEL[m])}
              </button>
            ))}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setRunning((r) => !r)}
            className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-black"
            title={running ? t("Pause") : t("Start")}
          >
            {running ? (
              <Pause size={12} className="fill-current" />
            ) : (
              <Play size={12} className="ml-0.5 fill-current" />
            )}
          </button>
          <button
            onClick={reset}
            className="dim grid size-7 shrink-0 place-items-center rounded-full transition-colors hover:text-white"
            title={t("Reset")}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </Pad>
  );
}
