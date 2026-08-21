import { useState } from "react";
import { Check } from "lucide-react";
import { Pad, Stat } from "./parts";
import { useLocal } from "@/lib/hooks";
import { cn, uid } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const SEED: Task[] = [
  { id: "a", text: "Reply to emails", done: true },
  { id: "b", text: "Plan the week ahead", done: false },
  { id: "c", text: "Book the dentist appointment", done: false },
  { id: "d", text: "Buy groceries", done: false },
];

/** Headed by a big done/total fraction, as on the watched-movies card. */
export default function TasksWidget({ kind, size }: WidgetBodyProps) {
  const [tasks, setTasks] = useLocal<Task[]>(`widgeto.tasks.${kind}`, SEED);
  const [draft, setDraft] = useState("");

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;
  const limit = size === "sm" ? 2 : size === "md" ? 3 : 5;

  return (
    <Pad size={size} className="gap-2">
      <div>
        <div className="flex items-baseline">
          <Stat value={done} size={size === "sm" ? 24 : 30} />
          <span className="dim text-[15px] font-semibold">/{tasks.length}</span>
        </div>
        <div className="dim text-[10.5px] font-semibold">TASKS DONE</div>
      </div>

      <div className="relative h-0.75 w-full overflow-hidden rounded-full">
        <span className="absolute inset-0 opacity-15" style={{ background: "currentColor" }} />
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-400"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
      </div>

      <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {tasks.slice(0, limit).map((t) => (
          <button
            key={t.id}
            data-nodrag
            onClick={() =>
              setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))
            }
            className="flex w-full items-center gap-2 py-0.75 text-left"
          >
            <span
              className={cn(
                "grid size-3.5 shrink-0 place-items-center rounded-sm border transition-colors",
                t.done ? "border-transparent" : "border-current opacity-30",
              )}
              style={t.done ? { background: "var(--accent)" } : undefined}
            >
              {t.done && <Check size={9} strokeWidth={3.5} className="text-white" />}
            </span>
            <span
              className={cn(
                "truncate text-[11.5px] font-medium",
                t.done && "dimmer line-through",
              )}
            >
              {t.text}
            </span>
          </button>
        ))}
      </div>

      {size !== "sm" && (
        <input
          data-nodrag
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              setTasks([...tasks, { id: uid(), text: draft.trim(), done: false }]);
              setDraft("");
            }
          }}
          placeholder="Add a task…"
          className="w-full bg-transparent text-[11.5px] font-medium outline-none placeholder:opacity-30"
        />
      )}
    </Pad>
  );
}
