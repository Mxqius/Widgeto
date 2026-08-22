import { Switch } from "@base-ui/react/switch";
import { Slider } from "@base-ui/react/slider";
import { Select } from "@base-ui/react/select";
import { Tooltip } from "@base-ui/react/tooltip";
import { Check, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Toggle */

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      className={cn(
        "relative h-5.5 w-9.5 shrink-0 rounded-full flex items-center outline-none transition-colors duration-200",
        "border border-white/10 bg-white/6",
        "data-checked:border-transparent",
      )}
      style={checked ? { background: "var(--accent)" } : undefined}
    >
      <Switch.Thumb
        className={cn(
          "block size-4 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5)]",
          "translate-x-0.75 transition-transform duration-200 ease-out-expo",
          "data-checked:translate-x-4.75",
        )}
      />
    </Switch.Root>
  );
}

/* ------------------------------------------------------------------ Slider */

export function Range({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Slider.Root
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="w-full"
      >
        <Slider.Control className="flex h-5 w-full items-center">
          <Slider.Track className="h-1.25 w-full rounded-full bg-white/8">
            <Slider.Indicator
              className="h-full rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <Slider.Thumb
              className="size-3.25 rounded-full bg-white outline-none
                         shadow-[0_1px_4px_rgba(0,0,0,0.6)] transition-transform
                         hover:scale-110 active:scale-95 data-dragging:scale-110"
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <span className="w-11 shrink-0 text-right font-mono text-[11px] text-ink-400 tabular-nums">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ Select */

export function Picker<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <Select.Trigger
        className="flex h-8 min-w-32.5 items-center justify-between gap-2 rounded-lg
                   border border-white/[0.07] bg-white/[0.035] px-2.5 text-[12.5px]
                   text-ink-100 outline-none transition-colors hover:bg-white/6"
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown size={13} className="text-ink-500" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} className="z-900 outline-none">
          <Select.Popup
            className="popup min-w-(--anchor-width) overflow-hidden rounded-xl border
                       border-white/8 bg-ink-850/95 p-1 backdrop-blur-xl
                       shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9)]"
          >
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="flex cursor-default items-center justify-between gap-4 rounded-lg px-2.5 py-1.5
                           text-[12.5px] text-ink-200 outline-none select-none
                           data-highlighted:bg-white/[0.07] data-highlighted:text-white"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={13} style={{ color: "var(--accent)" }} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

/* -------------------------------------------------------------- Segmented */

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

/* ----------------------------------------------------------------- Tooltip */

export function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<span className="inline-flex" />}>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} className="z-950">
          <Tooltip.Popup
            className="popup rounded-lg border border-white/8 bg-ink-800/95 px-2 py-1
                       text-[11.5px] font-medium text-ink-200 backdrop-blur-md
                       shadow-[0_10px_30px_-8px_rgba(0,0,0,0.9)]"
          >
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/* ---------------------------------------------------------- Settings rows */

export function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink-100">{title}</div>
        {hint && <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="label-xs mb-2 px-1">{title}</h3>
      <div className="surface-flat divide-y divide-white/5 overflow-hidden rounded-2xl">
        {children}
      </div>
    </section>
  );
}
