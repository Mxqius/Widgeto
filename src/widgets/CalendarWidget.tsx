import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Pad, Row, Swatch } from "./parts";
import { cn } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const EVENTS = [
  { title: "Dune: Part Two", meta: "12:00 · 15:00 · 18:00", from: "#c2703a", to: "#6b2f14" },
  { title: "Moonlight", meta: "12:00 · 15:00 · 21:00", from: "#7c4dff", to: "#2a1b6b" },
];

/** A single scrolling week strip with the selected day as a filled pill. */
export default function CalendarWidget({ size }: WidgetBodyProps) {
  const [offset, setOffset] = useState(0);
  const today = new Date();

  const week = useMemo(() => {
    const base = new Date(today);
    base.setDate(base.getDate() - base.getDay() + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const [picked, setPicked] = useState(today.getDate());
  const label = week[3].toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const rows = size === "sm" ? 0 : size === "md" ? 1 : 2;

  return (
    <Pad size={size} className="gap-2">
      <div className="flex items-center justify-between" data-nodrag>
        <button onClick={() => setOffset((o) => o - 1)} className="dim hover:opacity-100">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[12px] font-bold tracking-tight">{label}</span>
        <button onClick={() => setOffset((o) => o + 1)} className="dim hover:opacity-100">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1" data-nodrag>
        {DOW.map((d, i) => (
          <div key={i} className="dimmer text-center text-[9.5px] font-semibold">
            {d}
          </div>
        ))}
        {week.map((d) => {
          const on = d.getDate() === picked;
          return (
            <button
              key={d.toISOString()}
              onClick={() => setPicked(d.getDate())}
              className="flex justify-center"
            >
              <span
                className={cn(
                  "grid size-[22px] place-items-center rounded-full text-[11px] font-semibold tabular-nums transition-colors",
                  on ? "text-white" : "hover:bg-black/6",
                )}
                style={on ? { background: "var(--accent)" } : undefined}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {rows > 0 && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="rule mb-1 h-px w-full" />
          {EVENTS.slice(0, rows).map((e) => (
            <Row
              key={e.title}
              swatch={<Swatch from={e.from} to={e.to} />}
              title={e.title}
              meta={e.meta}
            />
          ))}
        </div>
      )}
    </Pad>
  );
}
