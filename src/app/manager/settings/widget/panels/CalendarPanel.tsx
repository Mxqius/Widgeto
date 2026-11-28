import { useApp } from "@/app/manager/store";
import { configOf } from "@/shared/widgets/config";
import { Range } from "@/app/manager/ui";
import { Plus, X } from "lucide-react";
import type { WidgetKind } from "@/shared/types/widget";
import { Field } from "../Field";
import { useT } from "@/app/manager/i18n";

/** Local .ics files feeding the calendar. No account, no sync, no auth. */
export function CalendarPanel({ kind }: { kind: WidgetKind }) {
  const t = useT();
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("calendar", stored);

  const pick = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({
        multiple: true,
        filters: [{ name: t("Calendar"), extensions: ["ics"] }],
      });
      if (!picked) return;
      const list = Array.isArray(picked) ? picked : [picked];
      const next = [...new Set([...c.sources, ...list])];
      setConfig(kind, { sources: next });
    } catch {
      /* the picker is only available in the desktop app */
    }
  };

  return (
    <>
      <div className="py-1.5">
        <div className="mb-1.5 text-[12px] font-medium text-ink-100">
          {t("Calendar files")}
          <span className="ms-1.5 text-[10.5px] text-ink-500">
            {t(".ics exported from any calendar app")}
          </span>
        </div>

        <div className="mb-2 space-y-1">
          {c.sources.map((path) => (
            <div
              key={path}
              className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-2 py-1.5"
            >
              <span dir="auto" className="min-w-0 flex-1 truncate text-start text-[11px] text-ink-300" title={path}>
                {path.split(/[\/]/).pop()}
              </span>
              <button
                title={t("Remove")}
                onClick={() =>
                  setConfig(kind, { sources: c.sources.filter((p) => p !== path) })
                }
                className="shrink-0 text-ink-600 transition-colors hover:text-red-300"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {c.sources.length === 0 && (
            <div className="px-1 py-2 text-[11px] text-ink-500">
              {t("No calendars yet — the tile shows date facts instead.")}
            </div>
          )}
        </div>

        <button className="btn h-7 px-2 text-[12px]" onClick={pick}>
          <Plus size={12} /> {t("Add .ics file")}
        </button>
      </div>

      <Field label={t("Look ahead")} hint={t("How far forward events are collected.")}>
        <div className="w-40">
          <Range
            min={1}
            max={60}
            value={c.days}
            onChange={(v) => setConfig(kind, { days: v })}
            format={(v) => t("{n}d", { n: v })}
          />
        </div>
      </Field>
    </>
  );
}
