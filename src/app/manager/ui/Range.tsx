import { Slider } from "@base-ui/react/slider";
import { digits } from "@/shared/i18n/format";

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
        // sliders keep low-to-high left to right in every language
        dir="ltr"
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
      <span className="min-w-11 shrink-0 text-end font-mono text-[11px] whitespace-nowrap text-ink-400 tabular-nums">
        {digits(format ? format(value) : value)}
      </span>
    </div>
  );
}
