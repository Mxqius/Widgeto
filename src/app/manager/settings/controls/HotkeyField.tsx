import { useState } from "react";
import { useApp } from "@/app/manager/store";
import { bindCaptureHotkey } from "@/app/manager/desktop/captureWindow";
import { bindHotkey } from "@/app/manager/desktop/hotkeys";
import { askIsland, bindTuckHotkey } from "@/app/manager/desktop/island";
import { useT } from "@/app/manager/i18n";

type Field = "captureHotkey" | "aiHotkey" | "islandTuckHotkey";

const BIND: Record<Field, (accel: string) => Promise<boolean>> = {
  captureHotkey: bindCaptureHotkey,
  aiHotkey: (accel) => bindHotkey("ask", accel, () => void askIsland()),
  islandTuckHotkey: bindTuckHotkey,
};

const PLACEHOLDER: Record<Field, string> = {
  captureHotkey: "CommandOrControl+Shift+N",
  aiHotkey: "CommandOrControl+Shift+Space",
  islandTuckHotkey: "CommandOrControl+Alt+H",
};

/**
 * The combination is only committed once it actually binds — another app may
 * already own it, and silently keeping a dead shortcut in settings would be
 * worse than saying so.
 */
export function HotkeyField({ field = "captureHotkey" }: { field?: Field }) {
  const t = useT();
  const saved = useApp((st) => st.settings[field]);
  const update = useApp((st) => st.update);
  const [draft, setDraft] = useState(saved);
  const [state, setState] = useState<"idle" | "ok" | "taken">("idle");

  const apply = async (value: string) => {
    if (value === saved && state !== "taken") return;
    const ok = await BIND[field](value);
    setState(value.trim() === "" ? "idle" : ok ? "ok" : "taken");
    if (ok || value.trim() === "") update({ [field]: value });
    // a failed rebind leaves the slot empty; put the old one back
    else if (saved.trim()) void BIND[field](saved);
  };

  return (
    <div className="flex items-center gap-2">
      {state === "taken" && <span className="text-[11px] font-semibold text-red-300">{t("in use")}</span>}
      {state === "ok" && (
        <span className="text-[11px] font-semibold" style={{ color: "#3ddc84" }}>
          {t("bound")}
        </span>
      )}
      <input
        dir="ltr"
        className="field h-8 w-47.5 font-mono text-[12px]"
        value={draft}
        placeholder={PLACEHOLDER[field]}
        onChange={(e) => {
          setDraft(e.target.value);
          setState("idle");
        }}
        onBlur={() => void apply(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void apply(draft);
        }}
      />
    </div>
  );
}
