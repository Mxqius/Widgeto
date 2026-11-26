import type { ReactNode } from "react";

/** Row scaffolding shared by every panel. */
export function Field({
  label,
  hint,
  children,
  stack,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  stack?: boolean;
}) {
  return (
    <div
      className={
        stack
          ? "flex flex-col gap-1.5 py-2"
          : "flex items-center justify-between gap-4 py-2"
      }
    >
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-ink-100">{label}</div>
        {hint && <div className="text-[10.5px] text-ink-500">{hint}</div>}
      </div>
      <div className={stack ? "" : "shrink-0"}>{children}</div>
    </div>
  );
}
