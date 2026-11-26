import type { ReactNode } from "react";

/**
 * Compact list row with a square thumbnail, as on the market/calendar cards.
 * Named `ListRow` rather than `Row` so it cannot be confused with the
 * manager's settings row, which is a completely different component.
 */
export function ListRow({
  swatch,
  title,
  meta,
  right,
}: {
  swatch?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      {swatch}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold">{title}</div>
        {meta && <div className="dim truncate text-[10.5px] font-medium">{meta}</div>}
      </div>
      {right}
    </div>
  );
}

export function Swatch({ from, to }: { from: string; to: string }) {
  return (
    <span
      className="size-7 shrink-0 rounded-[7px]"
      style={{ background: `linear-gradient(140deg, ${from}, ${to})` }}
    />
  );
}
