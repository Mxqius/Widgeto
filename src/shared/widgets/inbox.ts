import { uid } from "@/shared/lib/math";

/**
 * Where quick capture drops things: the Notes text and the Tasks list, kept in
 * the localStorage every window shares.
 *
 * Capture writes here itself rather than asking the widget to, so a line is
 * kept even when that widget is not on the desktop. When it is, the event
 * tells it to read the new value back (and the island to say so).
 */
export const NOTES_KEY = "widgeto.notes.notes";
export const TASKS_KEY = "widgeto.tasks.tasks";

export const INBOX_EVT = { note: "notes:append", task: "tasks:append" } as const;

export interface Task {
  id: string;
  text: string;
  done: boolean;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private storage: nothing more to do */
  }
}

export function appendNote(line: string) {
  const prev = read<string>(NOTES_KEY);
  write(NOTES_KEY, prev ? `${prev}\n${line}` : line);
}

export function appendTask(text: string) {
  const prev = read<Task[]>(TASKS_KEY);
  write(TASKS_KEY, [...(Array.isArray(prev) ? prev : []), { id: uid(), text, done: false }]);
}

/**
 * The Focus Timer widget finished a session (payload: "focus" | "short" |
 * "long"), so the island can chime and say so as it does for its own timer.
 */
export const FOCUS_DONE_EVT = "focus:done";
