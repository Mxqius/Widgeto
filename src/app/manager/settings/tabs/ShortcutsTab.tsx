import { SettingGroup } from "@/app/manager/ui";
import { SHORTCUTS } from "../tabs";
import { useT } from "@/app/manager/i18n";

export function ShortcutsTab() {
  const t = useT();
  return (
    <SettingGroup title={t("Keyboard")}>
      {SHORTCUTS.map((k) => (
        <div key={k.combo} className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[13px] text-ink-200">{t(k.what)}</span>
          <div dir="ltr" className="flex gap-1">
            {k.combo.split("+").map((part) => (
              <kbd key={part} className="chip font-mono">
                {part === "Close window" ? t("Close window") : part}
              </kbd>
            ))}
          </div>
        </div>
      ))}
    </SettingGroup>
  );
}
