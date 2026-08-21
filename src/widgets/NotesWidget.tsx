import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Pad } from "./parts";
import { useWidgetConfig } from "./prefs";
import { cn, isTauri } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

/** `- [ ] thing` / `- [x] thing`, the checkbox syntax people already type. */
const TASK = /^(\s*)([-*])\s+\[([ xX])\]\s?(.*)$/;

interface Line {
  raw: string;
  done: boolean | null;
  text: string;
}

function parse(body: string): Line[] {
  return body.split("\n").map((raw) => {
    const m = raw.match(TASK);
    if (!m) return { raw, done: null, text: raw };
    return { raw, done: m[3].toLowerCase() === "x", text: m[4] };
  });
}

/** Flip one checkbox, leaving the rest of the line exactly as written. */
function toggleLine(body: string, index: number): string {
  const lines = body.split("\n");
  const m = lines[index]?.match(TASK);
  if (!m) return body;
  const next = m[3].toLowerCase() === "x" ? " " : "x";
  lines[index] = `${m[1]}${m[2]} [${next}] ${m[4]}`;
  return lines.join("\n");
}

/**
 * A small stack of notes. Markdown checkboxes are clickable in place, and the
 * capture hotkey appends straight into whichever note is showing.
 */
export default function NotesWidget({ kind, size }: WidgetBodyProps) {
  const cfg = useWidgetConfig("notes");
  const [editing, setEditing] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const notes = cfg.notes.length ? cfg.notes : [{ title: "Notes", body: "" }];
  const index = Math.min(cfg.active, notes.length - 1);
  const note = notes[index];

  const save = async (patch: Record<string, unknown>) => {
    if (!isTauri()) return;
    const { emit } = await import("@tauri-apps/api/event");
    await emit("widget:config", { kind, patch });
  };

  const setBody = (body: string) => {
    const next = notes.map((n, i) => (i === index ? { ...n, body } : n));
    void save({ notes: next });
  };

  // quick capture appends to whichever note is on screen
  useEffect(() => {
    if (!isTauri()) return;
    let un: (() => void) | undefined;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      un = await listen<string>("notes:append", (e) => {
        const line = (e.payload || "").trim();
        if (!line) return;
        const body = note.body ? `${note.body}\n${line}` : line;
        setBody(body);
      });
    })();
    return () => un?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.body, index, notes.length]);

  const lines = useMemo(() => parse(note.body), [note.body]);
  const hasTasks = lines.some((l) => l.done !== null);
  const small = size === "sm";
  const done = lines.filter((l) => l.done === true).length;
  const total = lines.filter((l) => l.done !== null).length;

  return (
    <Pad size={size} className="gap-1.5">
      <div className="flex items-center gap-1">
        {notes.length > 1 && !small ? (
          <div className="-mx-0.5 flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
            {notes.map((n, i) => (
              <button
                key={i}
                data-nodrag
                onClick={() => void save({ active: i })}
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                  i === index ? "bg-black/10 text-current" : "dim hover:opacity-80",
                )}
              >
                {n.title || `Note ${i + 1}`}
              </button>
            ))}
          </div>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold tracking-tight">
            {note.title || "Notes"}
          </span>
        )}

        <span className="dimmer shrink-0 text-[10px] font-semibold tabular-nums">
          {total > 0 ? `${done}/${total}` : `${note.body.trim().split(/\s+/).filter(Boolean).length}w`}
        </span>
      </div>

      {editing || !hasTasks ? (
        <textarea
          ref={areaRef}
          data-nodrag
          value={note.body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => setEditing(false)}
          spellCheck={false}
          placeholder="Type, or use - [ ] for a checkbox"
          style={{ fontSize: cfg.fontSize }}
          className="min-h-0 w-full flex-1 resize-none bg-transparent leading-relaxed
                     font-medium outline-none placeholder:opacity-30"
        />
      ) : (
        <div
          data-nodrag
          onDoubleClick={() => {
            setEditing(true);
            setTimeout(() => areaRef.current?.focus(), 0);
          }}
          title="Double-click to edit the text"
          className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1"
          style={{ fontSize: cfg.fontSize }}
        >
          {lines.map((l, i) =>
            l.done === null ? (
              l.text.trim() ? (
                <div key={i} className="py-[1px] leading-relaxed font-medium">
                  {l.text}
                </div>
              ) : (
                <div key={i} className="h-2" />
              )
            ) : (
              <button
                key={i}
                onClick={() => setBody(toggleLine(note.body, i))}
                className="flex w-full items-start gap-1.5 py-[2px] text-left"
              >
                <span
                  className={cn(
                    "mt-[2px] grid size-[13px] shrink-0 place-items-center rounded-[4px] border transition-colors",
                    l.done ? "border-transparent" : "border-current opacity-30",
                  )}
                  style={l.done ? { background: "var(--accent)" } : undefined}
                >
                  {l.done && <Check size={8} strokeWidth={4} className="text-white" />}
                </span>
                <span className={cn("font-medium", l.done && "dimmer line-through")}>
                  {l.text}
                </span>
              </button>
            ),
          )}
        </div>
      )}

      {!small && (
        <button
          data-nodrag
          onClick={() =>
            void save({
              notes: [...notes, { title: `Note ${notes.length + 1}`, body: "" }],
              active: notes.length,
            })
          }
          className="dimmer flex items-center gap-1 text-[10px] font-semibold hover:opacity-80"
        >
          <Plus size={10} /> New note
        </button>
      )}
    </Pad>
  );
}
