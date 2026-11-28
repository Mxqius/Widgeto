import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Pad, Stat, TickMeter } from "../ui";
import { pad } from "../lib/format";
import { bySize, isLg, isSm } from "../lib/scale";
import { cx } from "@/shared/lib/cx";
import { useWidgetConfig } from "../prefs";
import { useLocal } from "../lib/hooks";
import { emitTauri } from "../lib/useTauriEvent";
import { FOCUS_DONE_EVT } from "@/shared/widgets/inbox";
import type { WidgetBodyProps } from "./props";
import { digits, useT } from "../i18n";

type Mode = "focus" | "short" | "long";

const ORDER: Mode[] = ["focus", "short", "long"];

const LABEL = { focus: "focus", short: "short", long: "long" } as const;
const SESSION = { focus: "focus session", short: "short session", long: "long session" } as const;

interface Saved {
  mode: Mode;
  /** wall-clock end while running; null while paused or idle */
  endAt: number | null;
  /** seconds left while paused */
  left: number;
  /** focus sessions finished today, and which day that was */
  rounds: number;
  day: string;
}

const today = () => new Date().toDateString();

/** After a focus session comes a break (a long one every fourth), after a break more focus. */
const nextMode = (mode: Mode, rounds: number): Mode =>
  mode === "focus" ? (rounds % 4 === 0 ? "long" : "short") : "focus";

export default function PomodoroWidget({ kind, size }: WidgetBodyProps) {
  const t = useT();
  const cfg = useWidgetConfig("pomodoro");
  const modes = useMemo<Record<Mode, number>>(
    () => ({ focus: cfg.focusMin * 60, short: cfg.shortMin * 60, long: cfg.longMin * 60 }),
    [cfg.focusMin, cfg.shortMin, cfg.longMin],
  );

  // kept in storage so reopening the widget, or the app, keeps the session
  // going and still ends it on time
  const [s, setS] = useLocal<Saved>(`widgeto.pomodoro.${kind}`, {
    mode: "focus",
    endAt: null,
    left: modes.focus,
    rounds: 0,
    day: today(),
  });
  const [now, setNow] = useState(() => Date.now());

  const mode = s.mode;
  const total = modes[mode];
  const running = s.endAt !== null;
  const left = Math.min(total, running ? Math.max(0, Math.ceil((s.endAt! - now) / 1000)) : s.left);
  const rounds = s.day === today() ? s.rounds : 0;

  // Editing the configured minutes restarts the session. Done during render
  // rather than in an effect so the tile never paints the old duration first.
  const [syncedTotal, setSyncedTotal] = useState(total);
  if (syncedTotal !== total) {
    setSyncedTotal(total);
    setS((p) => ({ ...p, endAt: null, left: total }));
  }

  // counts against the deadline rather than once per tick: a covered widget
  // has its timers throttled, and a focus timer must not lose minutes
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const modesRef = useRef(modes);
  modesRef.current = modes;
  const announced = useRef<number | null>(null);
  useEffect(() => {
    if (!running || left > 0 || announced.current === s.endAt) return;
    announced.current = s.endAt;
    // the session is over: tell the island, count it, and line up what is next
    void emitTauri(FOCUS_DONE_EVT, mode);
    setS((p) => {
      if (p.endAt === null) return p; // already wrapped up
      const n = (p.day === today() ? p.rounds : 0) + (p.mode === "focus" ? 1 : 0);
      const next = nextMode(p.mode, n);
      return { mode: next, endAt: null, left: modesRef.current[next], rounds: n, day: today() };
    });
  }, [running, left, mode, s.endAt, setS]);

  const pct = ((total - left) / total) * 100;

  const setMode = (m: Mode) => setS((p) => ({ ...p, mode: m, endAt: null, left: modes[m] }));
  const toggle = () =>
    setS((p) =>
      p.endAt !== null
        ? { ...p, endAt: null, left: Math.max(1, Math.ceil((p.endAt - Date.now()) / 1000)) }
        : { ...p, endAt: Date.now() + Math.min(p.left, modes[p.mode]) * 1000 },
    );
  const reset = () => setS((p) => ({ ...p, endAt: null, left: total }));

  return (
    <Pad size={size} className="justify-between">
      <div>
        <Stat
          value={digits(`${pad(Math.floor(left / 60))}:${pad(left % 60)}`)}
          size={bySize(size, 32, 40, 48)}
        />
        <div className="dim mt-1 text-[11px] font-semibold uppercase">
          {t(SESSION[mode])}
          {rounds > 0 && !isSm(size) && <span className="dimmer"> · {t("today: {n}", { n: rounds })}</span>}
        </div>
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
          // tight on the medium tile: compact pills, and the row may clip but
          // never run under the play button
          <div className={cx("flex min-w-0 overflow-hidden", isLg(size) ? "gap-1" : "gap-0.5")}>
            {ORDER.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cx(
                  "shrink-0 rounded-full py-1 font-semibold capitalize transition-colors",
                  isLg(size) ? "px-2 text-[10.5px]" : "px-1.5 text-[10px]",
                )}
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
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={toggle}
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
            className="dim grid size-6 shrink-0 place-items-center rounded-full transition-colors hover:text-white"
            title={t("Reset")}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </Pad>
  );
}
