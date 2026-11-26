import { Switch } from "@base-ui/react/switch";
import { cn } from "./cn";

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
