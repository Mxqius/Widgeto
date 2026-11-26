import { SettingGroup } from "@/app/manager/ui";
import { SHORTCUTS } from "../tabs";

export function ShortcutsTab() {
  return (
    <SettingGroup title="Keyboard">
      {SHORTCUTS.map((k) => (
        <div key={k.combo} className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[13px] text-ink-200">{k.what}</span>
          <div className="flex gap-1">
            {k.combo.split("+").map((part) => (
              <kbd key={part} className="chip font-mono">
                {part}
              </kbd>
            ))}
          </div>
        </div>
      ))}
    </SettingGroup>
  );
}
