import { useState } from "react";
import { Check } from "lucide-react";
import { Pad, Stat } from "../ui";
import { useLocal } from "../lib/hooks";
import { bySize, isSm } from "../lib/scale";
import { cx } from "@/shared/lib/cx";
import { uid } from "@/shared/lib/math";
import type { WidgetBodyProps } from "./props";
import { digits, t as tr, useT } from "../i18n";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

/** Example tasks for a first run, in whichever language the app speaks then. */
const seed = (): Task[] => [
  { id: "a", text: tr("Reply to emails"), done: true },
  { id: "b", text: tr("Plan the week ahead"), done: false },
  { id: "c", text: tr("Book the dentist appointment"), done: false },
  { id: "d", text: tr("Buy groceries"), done: false },
];

/** Headed by a big done/total fraction, as on the watched-movies card. */
export default function TasksWidget({ kind, size }: WidgetBodyProps) {
  const t = useT();
  const [tasks, setTasks] = useLocal<Task[]>(`widgeto.tasks.${kind}`, seed());
  const [draft, setDraft] = useState("");

  const done = tasks.filter((x) => x.done).length;
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;
  const limit = bySize(size, 2, 3, 5);

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTasks((prev) => [...prev, { id: uid(), text, done: false }]);
    setDraft("");
  };

  return (
    <Pad size={size} className="gap-2">
      <div>
        <div className="flex items-baseline">
          <Stat value={digits(done)} size={isSm(size) ? 24 : 30} />
          <span className="dim text-[15px] font-semibold">/{digits(tasks.length)}</span>
        </div>
        <div className="dim text-[10.5px] font-semibold">{t("TASKS DONE")}</div>
      </div>

      <div className="relative h-0.75 w-full overflow-hidden rounded-full">
        <span className="absolute inset-0 opacity-15" style={{ background: "currentColor" }} />
        <span
          className="absolute inset-y-0 start-0 rounded-full transition-[width] duration-400"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
      </div>

      <div className="-me-1 min-h-0 flex-1 overflow-y-auto pe-1">
        {tasks.slice(0, limit).map((task) => (
          <button
            key={task.id}
            data-nodrag
            onClick={() => toggle(task.id)}
            className="flex w-full items-center gap-2 py-0.75 text-start"
          >
            <span
              className={cx(
                "grid size-3.5 shrink-0 place-items-center rounded-sm border transition-colors",
                task.done ? "border-transparent" : "border-current opacity-30",
              )}
              style={task.done ? { background: "var(--accent)" } : undefined}
            >
              {task.done && <Check size={9} strokeWidth={3.5} className="text-white" />}
            </span>
            <span
              dir="auto"
              className={cx("truncate text-[11.5px] font-medium", task.done && "dimmer line-through")}
            >
              {task.text}
            </span>
          </button>
        ))}
      </div>

      {!isSm(size) && (
        <input
          data-nodrag
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          dir="auto"
          placeholder={t("Add a task…")}
          className="w-full bg-transparent text-[11.5px] font-medium outline-none placeholder:opacity-30"
        />
      )}
    </Pad>
  );
}
