import { useCallback, useMemo, useState } from "react";
import ProfileBar from "@/app/manager/profiles/ProfileBar";
import { useApp } from "@/app/manager/store";
import { WIDGETS } from "@/app/manager/widgets/catalogue";
import type { WidgetKind } from "@/shared/types/widget";
import { SummaryStrip } from "./SummaryStrip";
import { CatalogueFilters, type BoardTab } from "./CatalogueFilters";
import { WidgetCard } from "./WidgetCard";
import { TuningPanel } from "./TuningPanel";
import { useT } from "@/app/manager/i18n";

/**
 * The first screen. A summary strip across the top, then the catalogue as a
 * responsive grid of cards — one column in a narrow window, up to four in a
 * wide one. Placement happens by dragging the widget itself, so there is no
 * layout canvas; this screen is about what exists and how it is configured.
 */
export default function ManagerBoard({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useT();
  const widgets = useApp((s) => s.widgets);

  const [query, setQuery] = useState("");
  const [tuning, setTuning] = useState<WidgetKind | null>(null);
  const [tab, setTab] = useState<BoardTab>("all");

  const state = useMemo(() => new Map(widgets.map((w) => [w.kind, w])), [widgets]);
  const live = widgets.filter((w) => w.open).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      // names are matched in English and in the UI language, whichever was typed
      return WIDGETS.filter((d) =>
        [d.name, d.description, d.nameEn, d.descriptionEn].some((s) => s.toLowerCase().includes(q)),
      );
    }
    if (tab === "active") return WIDGETS.filter((d) => state.get(d.kind)?.open);
    return WIDGETS;
  }, [query, tab, state, t]);

  const tuned = tuning ? (WIDGETS.find((d) => d.kind === tuning) ?? null) : null;

  // stable identities: the strip, the filters, the cards and the tuning panel
  // are all memoised, and a fresh closure here would defeat every one of them
  const closeTuning = useCallback(() => setTuning(null), []);

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <SummaryStrip live={live} onOpenSettings={onOpenSettings} />

        <div className="border-y border-white/6 bg-white/1.5 px-6 py-2.5">
          <ProfileBar />
        </div>

        <CatalogueFilters query={query} onQuery={setQuery} tab={tab} onTab={setTab} />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))" }}
          >
            {rows.map((def) => {
              const w = state.get(def.kind);
              if (!w) return null;
              return (
                <WidgetCard
                  key={def.kind}
                  def={def}
                  widget={w}
                  tuning={tuning === def.kind}
                  onTune={setTuning}
                />
              );
            })}
          </div>

          {rows.length === 0 && (
            <div className="px-4 py-16 text-center">
              <div className="text-[13px] font-medium text-ink-300">
                {query ? t("No widget matches “{q}”", { q: query }) : t("Nothing on the desktop yet")}
              </div>
              {!query && (
                <button className="btn btn-primary mx-auto mt-3 px-3" onClick={() => setTab("all")}>
                  {t("Browse all widgets")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <TuningPanel tuned={tuned} onClose={closeTuning} />
    </div>
  );
}
