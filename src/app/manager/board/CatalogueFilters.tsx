import { memo } from "react";
import { Search } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/app/manager/ui";

export type BoardTab = "active" | "all";

/** Memoised — the layout-animated tab pill has no business re-running on
 *  every store change the board happens to see. */
export const CatalogueFilters = memo(function CatalogueFilters({
  query,
  onQuery,
  tab,
  onTab,
}: {
  query: string;
  onQuery: (v: string) => void;
  tab: BoardTab;
  onTab: (v: BoardTab) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-6 pt-3 pb-3">
      <div className="flex h-8 w-full max-w-70 items-center gap-2 rounded-lg border border-white/6 bg-white/3 px-2.5">
        <Search size={13} className="text-ink-500" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search widgets…"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink-100 outline-none placeholder:text-ink-600"
        />
      </div>
      {!query && (
        <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/3 p-0.5">
          {(["all", "active"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onTab(t)}
              className={cn(
                "relative h-7 rounded-md px-3 text-[11.5px] font-medium capitalize transition-colors",
                tab === t ? "text-white" : "text-ink-500 hover:text-ink-300",
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="mgr-tab"
                  transition={{ type: "spring", stiffness: 520, damping: 38 }}
                  className="absolute inset-0 rounded-md bg-white/9"
                />
              )}
              <span className="relative z-10">{t}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
