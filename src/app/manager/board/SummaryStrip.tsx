import { memo } from "react";
import { ArrowDownUp, Layers, Lock, LockOpen, Magnet, Settings2 } from "lucide-react";
import { Picker, Tip } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import { WIDGETS } from "@/app/manager/widgets/catalogue";
import { digits, useT } from "@/app/manager/i18n";

/**
 * Memoised: it holds a Base UI select and a tooltip, and nothing here changes
 * when a widget's colour or position does — only the live count and two
 * settings, both of which it reads for itself.
 */
export const SummaryStrip = memo(function SummaryStrip({
  live,
  onOpenSettings,
}: {
  live: number;
  onOpenSettings: () => void;
}) {
  const t = useT();
  const lockAll = useApp((s) => s.settings.lockAll);
  const layer = useApp((s) => s.settings.layer);
  const update = useApp((s) => s.update);
  const autoArrangeNow = useApp((s) => s.autoArrangeNow);
  const redock = useApp((s) => s.redock);
  const openAll = useApp((s) => s.openAll);
  const closeAll = useApp((s) => s.closeAll);

  const all = live === WIDGETS.length;

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-6 pt-5 pb-4">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="numeral text-[40px] leading-none text-white">{digits(live)}</span>
          <span className="text-[13px] font-semibold text-ink-500">
            {t("of {n} on your desktop", { n: WIDGETS.length })}
          </span>
        </div>
        <div className="mt-1.5 text-[12px] text-ink-500">
          {t("Drag a widget on screen to move it — it snaps to corners, edges and its neighbours.")}
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        {/* nothing may move while everything is locked */}
        <button
          className="btn disabled:pointer-events-none disabled:opacity-40"
          disabled={lockAll}
          onClick={() => autoArrangeNow()}
        >
          <ArrowDownUp size={13} /> {t("Arrange")}
        </button>
        <button
          className="btn disabled:pointer-events-none disabled:opacity-40"
          disabled={lockAll}
          onClick={redock}
        >
          <Magnet size={13} /> {t("Dock")}
        </button>
        <button
          className="btn"
          data-selected={lockAll}
          onClick={() => update({ lockAll: !lockAll })}
        >
          {lockAll ? <Lock size={13} /> : <LockOpen size={13} />}
          {lockAll ? t("Locked") : t("Lock")}
        </button>
        <button className="btn" onClick={() => (all ? closeAll() : openAll())}>
          <Layers size={13} /> {all ? t("Hide all") : t("Show all")}
        </button>
        <div className="mx-1 h-5 w-px bg-white/8" />
        <Picker
          value={layer}
          onChange={(v) => update({ layer: v })}
          options={[
            { value: "desktop", label: t("On the desktop") },
            { value: "normal", label: t("Like a window") },
            { value: "top", label: t("Above everything") },
          ]}
        />
        <Tip label={t("App settings")}>
          <button className="btn size-8 px-0" onClick={onOpenSettings}>
            <Settings2 size={15} />
          </button>
        </Tip>
      </div>
    </div>
  );
});
