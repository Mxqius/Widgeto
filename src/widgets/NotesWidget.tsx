import { Pad } from "./parts";
import { useLocal } from "@/lib/hooks";
import type { WidgetBodyProps } from "./loader";

export default function NotesWidget({ kind, size }: WidgetBodyProps) {
  const [text, setText] = useLocal(
    `widgeto.notes.${kind}`,
    "Drag a widget near a corner and it docks itself.\n\nDouble-click to resize.",
  );

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
        className="h-full w-full resize-none bg-transparent text-[12px] leading-relaxed
                   font-medium outline-none placeholder:opacity-30"
      />
    </Pad>
  );
}
