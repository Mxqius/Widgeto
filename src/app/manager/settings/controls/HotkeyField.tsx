import { useState } from "react";
import { useApp } from "@/app/manager/store";
import { bindCaptureHotkey } from "@/app/manager/desktop/captureWindow";

/**
 * The combination is only committed once it actually binds — another app may
 * already own it, and silently keeping a dead shortcut in settings would be
 * worse than saying so.
 */
export function HotkeyField() {
  const saved = useApp((st) => st.settings.captureHotkey);
  const update = useApp((st) => st.update);
  const [draft, setDraft] = useState(saved);
  const [state, setState] = useState<"idle" | "ok" | "taken">("idle");

  const apply = async (value: string) => {
    const ok = await bindCaptureHotkey(value);
    setState(value.trim() === "" ? "idle" : ok ? "ok" : "taken");
    if (ok || value.trim() === "") update({ captureHotkey: value });
  };

  return (
    <div className="flex items-center gap-2">
      {state === "taken" && <span className="text-[11px] font-semibold text-red-300">in use</span>}
      {state === "ok" && (
        <span className="text-[11px] font-semibold" style={{ color: "#3ddc84" }}>
          bound
        </span>
      )}
      <input
        className="field h-8 w-47.5 font-mono text-[12px]"
        value={draft}
        placeholder="CommandOrControl+Shift+N"
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
