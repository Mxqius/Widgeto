import type { ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";

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
