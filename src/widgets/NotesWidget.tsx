import { StickyNote } from "lucide-react";
import { Shell } from "./parts";
import { useLocal } from "@/lib/hooks";
import type { WidgetBodyProps } from "./loader";

export default function NotesWidget({ kind }: WidgetBodyProps) {
  const [text, setText] = useLocal(
    `widgeto.notes.${kind}`,
    "Drag a widget near any corner — it docks itself.\n\nDouble-click to cycle size.",
  );

  return (
    <Shell
      title="Notes"
      icon={<StickyNote size={12} />}
      right={<span className="tabular-nums">{text.trim().split(/\s+/).filter(Boolean).length}w</span>}
    >
      <textarea
        data-nodrag
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        placeholder="Start typing…"
        className="h-full w-full resize-none bg-transparent text-[12px] leading-relaxed
                   text-ink-200 outline-none placeholder:text-ink-600"
      />
    </Shell>
  );
}
