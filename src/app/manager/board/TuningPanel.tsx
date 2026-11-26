import { memo } from "react";
import { X } from "lucide-react";
import WidgetSettingsPanel from "@/app/manager/settings/widget/WidgetSettingsPanel";
import type { WidgetDef } from "@/app/manager/widgets/catalogue";

/**
 * Always mounted, collapsed to zero width when closed. Deliberately not
 * animated: AnimatePresence would not reliably fire the enter animation here,
 * and transitioning `width` both stalled and forced a layout pass every frame.
 * The panel simply appears.
 *
 * Memoised so that the settings inside it — each of which subscribes to the
 * exact field it edits — are the only things that re-render while one is being
 * dragged.
 */
export const TuningPanel = memo(function TuningPanel({
  tuned,
  onClose,
}: {
  tuned: WidgetDef | null;
  onClose: () => void;
}) {
  return (
    <aside
      className="shrink-0 overflow-hidden border-l border-white/6 bg-white/1.5"
      style={{ width: tuned ? 320 : 0, borderLeftWidth: tuned ? 1 : 0 }}
      aria-hidden={!tuned}
    >
      {tuned && (
        <div className="flex h-full w-[320px] flex-col">
          <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
            <div
              className="grid size-7 shrink-0 place-items-center rounded-lg"
              style={{
                background: `color-mix(in srgb, ${tuned.accent} 18%, transparent)`,
                color: tuned.accent,
              }}
            >
              <tuned.icon size={14} />
            </div>
            <span className="flex-1 truncate text-[13px] font-semibold text-ink-100">
              {tuned.name}
            </span>
            <button className="btn size-7 px-0" onClick={onClose} title="Close">
              <X size={13} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
            <WidgetSettingsPanel kind={tuned.kind} />
          </div>
        </div>
      )}
    </aside>
  );
});
