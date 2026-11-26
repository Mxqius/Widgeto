import type { ReactNode } from "react";

/**
 * One labelled control inside a settings group. Named `SettingRow` rather
 * than `Row` because the widget layer exports a `ListRow` of its own and the
 * two are nothing alike — the old shared name made a wrong import invisible.
 */
export function SettingRow({
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

export function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="label-xs mb-2 px-1">{title}</h3>
      <div className="surface-flat divide-y divide-white/5 overflow-hidden rounded-2xl">
        {children}
      </div>
    </section>
  );
}
