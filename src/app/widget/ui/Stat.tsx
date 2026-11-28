import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import { getLang } from "@/shared/i18n/locale";

/** Big numeral with a small trailing unit. */
export function Stat({
  value,
  unit,
  size = 44,
  className,
}: {
  value: ReactNode;
  unit?: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cx("flex items-baseline", className)}>
      <span className="numeral" style={{ fontSize: size, lineHeight: 1 }}>
        {value}
      </span>
      {unit && (
        <span className="dim ms-1 text-[13px] font-semibold">
          {unit === "%" && getLang() === "fa" ? "٪" : unit}
        </span>
      )}
    </div>
  );
}
