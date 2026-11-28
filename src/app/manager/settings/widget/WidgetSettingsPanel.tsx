import type { WidgetKind } from "@/shared/types/widget";
import { AppearanceSection } from "./AppearanceSection";
import { RefreshRateSection } from "./RefreshRateSection";
import { KIND_PANELS } from "./panels";
import { useT } from "@/app/manager/i18n";

/** Everything one widget exposes: shared appearance, then its own options. */
export default function WidgetSettingsPanel({ kind }: { kind: WidgetKind }) {
  const t = useT();
  const Panel = KIND_PANELS[kind];
  return (
    <>
      <AppearanceSection kind={kind} />
      <div className="my-1 h-px bg-white/6" />
      <RefreshRateSection kind={kind} />
      {Panel ? <Panel kind={kind} /> : (
        <div className="pb-1 text-[11px] text-ink-600">{t("No other options.")}</div>
      )}
    </>
  );
}
