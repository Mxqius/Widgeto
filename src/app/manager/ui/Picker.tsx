import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

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
