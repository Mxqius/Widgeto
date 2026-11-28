import { Pad } from "../ui";
import { useLocal } from "../lib/hooks";
import { useWidgetConfig } from "../prefs";
import { useTauriEvent } from "../lib/useTauriEvent";
import { INBOX_EVT } from "@/shared/widgets/inbox";
import type { WidgetBodyProps } from "./props";
import { t as tr, useT } from "../i18n";

const hint = () => tr("Drag a widget near a corner and it docks itself.\n\nDouble-click to resize.");

export default function NotesWidget({ kind, size }: WidgetBodyProps) {
  const t = useT();
  const cfg = useWidgetConfig("notes");
  const [text, setText, reload] = useLocal(`widgeto.notes.${kind}`, hint());

  // quick capture has already stored the line; this only shows it straight away
  useTauriEvent(INBOX_EVT.note, reload);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <Pad size={size} className="gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-bold tracking-tight">{t("Notes")}</span>
        <span className="dimmer text-[10.5px] font-semibold tabular-nums">{t("{n}w", { n: words })}</span>
      </div>
      <textarea
        data-nodrag
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        dir="auto"
        placeholder={t("Start typing…")}
        style={{ fontSize: cfg.fontSize }}
        className="h-full w-full resize-none bg-transparent leading-relaxed
                   font-medium outline-none placeholder:opacity-30"
      />
    </Pad>
  );
}
