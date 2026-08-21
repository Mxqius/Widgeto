import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ListTodo, Plus } from "lucide-react";
import { Shell } from "./parts";
import { useLocal } from "@/lib/hooks";
import { cn, uid } from "@/lib/utils";
import type { SizeKey } from "@/lib/types";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const SEED: Task[] = [
  { id: "a", text: "Ship the widget prototype", done: true },
  { id: "b", text: "Wire up auto-docking", done: true },
  { id: "c", text: "Polish the settings screen", done: false },
  { id: "d", text: "Package the Tauri build", done: false },
  { id: "e", text: "Write the README", done: false },
];

export default function TasksWidget({ id, size }: { id: string; size: SizeKey }) {
  const [tasks, setTasks] = useLocal<Task[]>(`widgeto.tasks.${id}`, SEED);
  const [draft, setDraft] = useState("");

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;
  const limit = size === "sm" ? 3 : size === "md" ? 5 : 8;

  const toggle = (tid: string) =>
    setTasks(tasks.map((t) => (t.id === tid ? { ...t, done: !t.done } : t)));

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    setTasks([{ id: uid(), text, done: false }, ...tasks]);
    setDraft("");
  };

  return (
    <Shell
      title="Tasks"
      icon={<ListTodo size={12} />}
      right={
        <span className="tabular-nums">
          {done}/{tasks.length}
        </span>
      }
    >
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--accent)" }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 24 }}
        />
      </div>

      <div className="-mr-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {tasks.slice(0, limit).map((t) => (
            <motion.button
              key={t.id}
              data-nodrag
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 36 }}
              onClick={() => toggle(t.id)}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-white/4"
            >
              <span
                className={cn(
                  "grid size-[15px] shrink-0 place-items-center rounded-[5px] border transition-colors",
                  t.done ? "border-transparent" : "border-white/20",
                )}
                style={t.done ? { background: "var(--accent)" } : undefined}
              >
                {t.done && <Check size={10} strokeWidth={3} className="text-white" />}
              </span>
              <span
                className={cn(
                  "truncate text-[12px] transition-colors",
                  t.done ? "text-ink-600 line-through" : "text-ink-200",
                )}
              >
                {t.text}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <div data-nodrag className="mt-2 flex items-center gap-1.5 border-t border-white/6 pt-2">
        <Plus size={12} className="shrink-0 text-ink-600" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task…"
          className="w-full bg-transparent text-[12px] text-ink-100 outline-none placeholder:text-ink-600"
        />
      </div>
    </Shell>
  );
}
