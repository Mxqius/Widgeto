import { useEffect, useRef, useState } from "react";
import { Check, ListX, Pencil, X } from "lucide-react";
import { Pad, Stat } from "../ui";
import { useLocal } from "../lib/hooks";
import { isSm } from "../lib/scale";
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
  const [editing, setEditing] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const added = useRef(false);

  // a new task lands at the bottom: bring it into view
  useEffect(() => {
    if (!added.current) return;
    added.current = false;
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [tasks]);

  const done = tasks.filter((x) => x.done).length;
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;
  const small = isSm(size);

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id: string) => setTasks((prev) => prev.filter((x) => x.id !== id));
  const rename = (id: string, text: string) => {
    const clean = text.trim();
    // emptied out: the same as deleting it
    if (!clean) return remove(id);
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, text: clean } : x)));
  };
  const clearDone = () => setTasks((prev) => prev.filter((x) => !x.done));

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    added.current = true;
    setTasks((prev) => [...prev, { id: uid(), text, done: false }]);
    setDraft("");
  };

  return (
    <Pad size={size} className="gap-2">
      <div>
        <div className="flex items-baseline">
          <Stat value={digits(done)} size={small ? 24 : 30} />
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

      {/* every task, scrolling once they outgrow the card; no-drag so the
          scrollbar can be grabbed without moving the widget */}
      <div
        ref={list}
        data-nodrag
        className="card-scrollbar -me-1.5 min-h-0 flex-1 overflow-y-auto pe-1.5"
      >
        {tasks.length === 0 && (
          <div className="dimmer py-1 text-[11px] font-medium">{t("Nothing to do")}</div>
        )}
        {tasks.map((task) =>
          editing === task.id ? (
            <EditRow
              key={task.id}
              task={task}
              onDone={(text) => {
                if (text !== null) rename(task.id, text);
                setEditing(null);
              }}
            />
          ) : (
            <div key={task.id} className="group/task flex w-full items-center gap-2 py-0.75">
              <button
                onClick={() => toggle(task.id)}
                onDoubleClick={() => setEditing(task.id)}
                title={t("Double-click to edit")}
                className="flex min-w-0 flex-1 items-center gap-2 text-start"
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
              {/* edit and delete appear on hover, or when tabbed to; a named
                  group, since the widget shell is a group of its own */}
              <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/task:opacity-100 group-focus-within/task:opacity-100">
                <button
                  onClick={() => setEditing(task.id)}
                  title={t("Edit task")}
                  className="dim grid size-5 place-items-center rounded hover:opacity-100"
                >
                  <Pencil size={10.5} />
                </button>
                <button
                  onClick={() => remove(task.id)}
                  title={t("Delete task")}
                  className="dim grid size-5 place-items-center rounded hover:text-red-400 hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          ),
        )}
      </div>

      {(!small || done > 0) && (
        <div className="flex items-center gap-2" data-nodrag>
          {!small && (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
                if (e.key === "Escape") setDraft("");
              }}
              dir="auto"
              placeholder={t("Add a task…")}
              className="min-w-0 flex-1 bg-transparent text-[11.5px] font-medium outline-none placeholder:opacity-30"
            />
          )}
          {done > 0 && (
            <button
              onClick={clearDone}
              title={t("Clear completed")}
              className="dimmer ms-auto grid size-5 shrink-0 place-items-center rounded transition-opacity hover:opacity-100"
            >
              <ListX size={13} />
            </button>
          )}
        </div>
      )}
    </Pad>
  );
}

/** A task being renamed: Enter or leaving the field keeps it, Esc puts it back. */
function EditRow({ task, onDone }: { task: Task; onDone: (text: string | null) => void }) {
  const [text, setText] = useState(task.text);
  const ref = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (value: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onDone(value);
  };

  return (
    <div className="flex w-full items-center gap-2 py-0.75">
      <span className="grid size-3.5 shrink-0 place-items-center rounded-sm border border-current opacity-30" />
      <input
        ref={ref}
        value={text}
        dir="auto"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") finish(text);
          if (e.key === "Escape") finish(null);
        }}
        onBlur={() => finish(text)}
        className="min-w-0 flex-1 rounded-sm bg-transparent text-[11.5px] font-medium outline-none
                   ring-1 ring-(--accent)/60 ring-offset-0 px-1 -mx-1"
      />
    </div>
  );
}
