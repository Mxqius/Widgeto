import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Shell } from "./parts";
import { cn } from "@/lib/utils";
import type { SizeKey } from "@/lib/types";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const EVENT_DAYS = [4, 9, 12, 18, 23, 27];

export default function CalendarWidget({ size }: { size: SizeKey }) {
  const [offset, setOffset] = useState(0);
  const today = new Date();

  const view = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const first = (d.getDay() + 6) % 7; // monday-first
    const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return { d, first, days };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const isThisMonth = offset === 0;

  return (
    <Shell
      title={view.d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      icon={<CalendarDays size={12} />}
      right={
        <span className="flex items-center gap-0.5" data-nodrag>
          <button className="rounded p-0.5 hover:bg-white/10" onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeft size={12} />
          </button>
          <button className="rounded p-0.5 hover:bg-white/10" onClick={() => setOffset((o) => o + 1)}>
            <ChevronRight size={12} />
          </button>
        </span>
      }
    >
      <div className="grid grid-cols-7 gap-y-0.5">
        {DOW.map((d, i) => (
          <div key={i} className="pb-1 text-center text-[9px] font-semibold text-ink-600">
            {d}
          </div>
        ))}
        {Array.from({ length: view.first }).map((_, i) => (
          <div key={`p${i}`} />
        ))}
        {Array.from({ length: view.days }).map((_, i) => {
          const day = i + 1;
          const isToday = isThisMonth && day === today.getDate();
          const hasEvent = EVENT_DAYS.includes(day);
          return (
            <div key={day} className="relative flex justify-center">
              <button
                data-nodrag
                className={cn(
                  "relative grid size-[22px] place-items-center rounded-[7px] text-[10.5px] tabular-nums transition-colors",
                  isToday ? "font-semibold text-white" : "text-ink-300 hover:bg-white/7",
                )}
              >
                {isToday && (
                  <motion.span
                    layoutId="cal-today"
                    className="absolute inset-0 rounded-[7px]"
                    style={{ background: "var(--accent)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{day}</span>
                {hasEvent && !isToday && (
                  <span
                    className="absolute bottom-[1px] size-[3px] rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {size !== "sm" && (
        <div className="mt-auto space-y-1 border-t border-white/6 pt-2.5">
          {[
            { t: "09:30", n: "Design review", c: "var(--accent)" },
            { t: "14:00", n: "1:1 with Ada", c: "#4aa8ff" },
          ]
            .slice(0, size === "lg" ? 2 : 1)
            .map((e) => (
              <div key={e.n} className="flex items-center gap-2">
                <span className="h-6 w-[2px] rounded-full" style={{ background: e.c }} />
                <span className="font-mono text-[10px] text-ink-500 tabular-nums">{e.t}</span>
                <span className="truncate text-[11.5px] text-ink-200">{e.n}</span>
              </div>
            ))}
        </div>
      )}
    </Shell>
  );
}
