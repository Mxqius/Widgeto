import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, ListChecks, StickyNote } from "lucide-react";
import { isTauri } from "@/shared/lib/env";
import { setLang, storedLang } from "@/shared/i18n/locale";
import { useT } from "./i18n";

/**
 * Quick capture. A single line, opened by the global hotkey from wherever you
 * were, appended to the Notes widget, and gone again — the point is to write
 * the thought down without changing what you were doing.
 */
export default function CaptureWindow() {
  const [text, setText] = useState("");
  const [asTask, setAsTask] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const t = useT();

  useEffect(() => {
    ref.current?.focus();
  }, []);

  // this window is hidden and shown rather than reopened, and has no config
  // channel: pick up a language change from the manager each time it comes back
  useEffect(() => {
    const sync = () => void setLang(storedLang());
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  const close = async () => {
    setText("");
    setSaved(false);
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().hide();
  };

  const commit = async () => {
    const line = text.trim();
    if (!line) return void close();
    if (isTauri()) {
      const { emit } = await import("@tauri-apps/api/event");
      await emit("notes:append", asTask ? `- [ ] ${line}` : line);
    }
    setSaved(true);
    setTimeout(close, 420);
  };

  return (
    <div
      className="tile tile-dark flex h-full w-full flex-col justify-center gap-2 px-4"
      style={{ borderRadius: 18 }}
    >
      <div className="flex items-center gap-2">
        <StickyNote size={14} style={{ color: "var(--accent)" }} className="shrink-0" />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
            if (e.key === "Escape") void close();
            // Ctrl+Enter files it as a checkbox instead
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) setAsTask(true);
          }}
          placeholder={t("Jot something down…")}
          dir="auto"
          className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-white outline-none placeholder:text-white/30"
        />
        <button
          onClick={() => setAsTask((v) => !v)}
          title={t("Save as a checkbox")}
          className="shrink-0 rounded-md p-1 transition-colors"
          style={{
            background: asTask ? "var(--accent)" : "rgba(255,255,255,0.08)",
            color: asTask ? "#fff" : "rgba(255,255,255,0.55)",
          }}
        >
          <ListChecks size={13} />
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] font-semibold text-white/35">
        <span>{saved ? t("Saved to Notes") : asTask ? t("Saves as a task") : t("Saves as a line")}</span>
        <span className="flex items-center gap-1">
          <CornerDownLeft size={10} className="rtl:-scale-x-100" /> {t("enter · esc to dismiss")}
        </span>
      </div>
    </div>
  );
}
