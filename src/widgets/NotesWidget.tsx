import { useEffect } from "react";
import { Pad } from "./parts";
import { useLocal } from "@/lib/hooks";
import { useWidgetConfig } from "./prefs";
import { isTauri } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

export default function NotesWidget({ kind, size }: WidgetBodyProps) {
  const cfg = useWidgetConfig("notes");
  const [text, setText] = useLocal(
    `widgeto.notes.${kind}`,
    "Drag a widget near a corner and it docks itself.\n\nDouble-click to resize.",
  );

  // the capture hotkey appends here rather than opening the manager
  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      un = await listen<string>("notes:append", (e) => {
        const line = (e.payload || "").trim();
        if (line) setText((prev) => (prev ? `${prev}\n${line}` : line));
      });
    })();
    return () => un?.();
  }, [setText]);

  return (
    <Pad size={size} className="gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-bold tracking-tight">Notes</span>
        <span className="dimmer text-[10.5px] font-semibold tabular-nums">
          {text.trim().split(/\s+/).filter(Boolean).length}w
        </span>
      </div>
      <textarea
        data-nodrag
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        placeholder="Start typing…"
        style={{ fontSize: cfg.fontSize }}
        className="h-full w-full resize-none bg-transparent leading-relaxed
                   font-medium outline-none placeholder:opacity-30"
      />
    </Pad>
  );
}
