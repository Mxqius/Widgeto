import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "./cn";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  layoutId?: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-[10px] border border-white/6 bg-white/3 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative h-7 rounded-lg px-2.5 text-[12px] font-medium transition-colors duration-150",
              active ? "text-white" : "text-ink-400 hover:text-ink-200",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId ?? "seg"}
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className="absolute inset-0 rounded-lg bg-white/9 shadow-[0_1px_0_rgba(255,255,255,0.07)_inset]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
