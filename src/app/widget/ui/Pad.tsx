import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import type { SizeKey } from "@/shared/types/widget";
import { bySize } from "../lib/scale";

/**
 * Widget padding. There is deliberately no header row — in this design the
 * content is the widget, and hierarchy comes from type size and weight.
 */
export function Pad({
  children,
  className,
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: SizeKey;
}) {
  return (
    <div className={cx("flex h-full flex-col", className)} style={{ padding: bySize(size, 16, 18, 22) }}>
      {children}
    </div>
  );
}
