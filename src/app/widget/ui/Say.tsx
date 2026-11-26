import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/shared/lib/cx";

/**
 * The signature typographic block: one flowing line where the values are
 * heavy and white and the connective words fall back to muted.
 */
export function Say({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cx("display", className)} style={style}>
      {children}
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="dim font-medium">{children}</span>;
}
