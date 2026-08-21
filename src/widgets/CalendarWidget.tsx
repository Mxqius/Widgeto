import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Pad } from "./parts";
import { useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** ISO-8601 week number. */
function isoWeek(d: Date) {
  const t = startOfDay(d);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const first = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t.getTime() - first.getTime()) / 86_400_000 - 3 + ((first.getDay() + 6) % 7)) / 7);
}

/**
 * A real week strip around today, with the live date facts underneath. It
 * tracks midnight rollover rather than freezing on the date it mounted.
 */
export default function CalendarWidget({ size }: WidgetBodyProps) {
  const now = useNow(60_000);
  const [offset, setOffset] = useState(0);

  const today = startOfDay(now);
  const week = useMemo(() => {
    const base = new Date(today);
    base.setDate(base.getDate() - base.getDay() + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [today.getTime(), offset]);

  const label = week[3].toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const left = daysInMonth - now.getDate();
  const small = size === "sm";

  return (
    <Pad size={size} className="justify-between gap-2">
      <div className="flex items-center justify-between" data-nodrag>
        <button onClick={() => setOffset((o) => o - 1)} className="dim hover:opacity-100">
          <ChevronLeft size={13} />
        </button>
        <span className="text-[11.5px] font-bold tracking-tight">
          {small ? label.split(" ")[0] : label}
        </span>
        <button onClick={() => setOffset((o) => o + 1)} className="dim hover:opacity-100">
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1" data-nodrag>
        {DOW.map((d, i) => (
          <div key={i} className="dimmer text-center text-[9px] font-semibold">
            {small ? d[0] : d}
          </div>
        ))}
        {week.map((d) => {
          const isToday = d.getTime() === today.getTime();
          const otherMonth = d.getMonth() !== week[3].getMonth();
          return (
            <div key={d.toISOString()} className="flex justify-center">
              <span
                className={cn(
                  "grid place-items-center rounded-full font-semibold tabular-nums",
                  isToday ? "text-white" : otherMonth ? "dimmer" : "",
                )}
                style={{
                  width: small ? 18 : 22,
                  height: small ? 18 : 22,
                  fontSize: small ? 9.5 : 11,
                  background: isToday ? "var(--accent)" : undefined,
                }}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-0.5">
        <div className="rule h-px w-full" />
        <div className="flex items-baseline justify-between pt-1">
          <span className="dim text-[10px] font-semibold">
            {now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase()}
          </span>
          <span className="numeral text-[12px]">W{isoWeek(now)}</span>
        </div>
        {!small && (
          <div className="flex items-baseline justify-between">
            <span className="dim text-[10px] font-semibold">LEFT IN MONTH</span>
            <span className="numeral text-[12px]">{left}d</span>
          </div>
        )}
      </div>
    </Pad>
  );
}
