import { forwardRef, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/app/manager/ui";
import type { WidgetDef } from "@/app/manager/widgets/catalogue";

/** The title block every step opens with. The heading takes focus on arrival. */
export const StepHeader = forwardRef<
  HTMLHeadingElement,
  { eyebrow?: string; title: string; children?: ReactNode }
>(function StepHeader({ eyebrow, title, children }, ref) {
  return (
    <div className="mb-6">
      {eyebrow && <div className="label-xs mb-2">{eyebrow}</div>}
      <h2 ref={ref} tabIndex={-1} className="display text-[26px] text-white outline-none">
        {title}
      </h2>
      {children && (
        <p className="mt-2 max-w-115 text-[13px] leading-relaxed text-ink-400">{children}</p>
      )}
    </div>
  );
});

/**
 * A widget's icon on a small copy of its tile: flat black or flat white, a
 * circle for the round ones. The icon picks up the live accent on dark tiles.
 */
export function MiniTile({ def, size = 36 }: { def: WidgetDef; size?: number }) {
  const Icon = def.icon;
  const light = def.theme === "light";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        def.shape === "circle" ? "rounded-full" : "rounded-[30%]",
        light ? "bg-(--tile-light)" : "border border-white/8 bg-(--tile-dark)",
      )}
      style={{ width: size, height: size }}
    >
      <Icon
        size={Math.round(size * 0.46)}
        strokeWidth={2}
        style={{ color: light ? "#0a0a0b" : "var(--accent)" }}
      />
    </span>
  );
}

/** A selectable card with an accent ring and a check badge when chosen. */
export function OptionCard({
  selected,
  onClick,
  disabled,
  className,
  children,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl border text-start outline-none transition-[background,border-color,box-shadow,transform] duration-200",
        "focus-visible:ring-2 focus-visible:ring-(--accent)/60 active:scale-[0.985]",
        selected
          ? "border-(--accent)/55 bg-(--accent-soft)"
          : "border-white/6 bg-white/2.5 hover:border-white/12 hover:bg-white/4.5",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-2.5 end-2.5 grid size-4.5 place-items-center rounded-full transition-all duration-200",
          selected ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}
        style={{ background: "var(--accent)" }}
      >
        <Check size={11} strokeWidth={3} className="text-white" />
      </span>
      {children}
    </button>
  );
}
