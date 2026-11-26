import { ArrowUp, Check, ClipboardList, Copy, Languages, Lightbulb, Plus, Settings2, Sparkles, Square, Wand2 } from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AI_PROVIDERS, hasKey, openManagerSettings, readClipboard, type AiTarget } from "@/shared/ai/client";
import { isTauri } from "@/shared/lib/env";
import type { AskState } from "../data/useAsk";

const SAMPLE_CLIP = "The quarterly report shows revenue up 12% while costs held flat, mostly thanks to the new pricing.";

/** Quick actions on whatever is on the clipboard. */
const CLIP_ACTIONS = [
  { id: "summarize", label: "Summarize", icon: ClipboardList, prompt: "Summarize this in a few bullet points:" },
  { id: "explain", label: "Explain", icon: Lightbulb, prompt: "Explain this simply:" },
  { id: "fix", label: "Fix writing", icon: Wand2, prompt: "Fix the grammar, spelling and flow. Reply with only the corrected text:" },
  { id: "translate", label: "Translate", icon: Languages, prompt: "Translate this into English; if it is already English, into Spanish. Reply with only the translation:" },
] as const;

export function AskPanel({ ask, ai, focusSignal, onFocusChange, onClose }: {
  ask: AskState;
  ai: AiTarget;
  /** bumps when the hotkey asks for the input to take focus */
  focusSignal: number;
  onFocusChange: (focused: boolean) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const clip = useClipboard(focusSignal);
  const needsKey = useNeedsKey(ai);
  const talking = ask.turns.length > 0 || ask.streaming;

  // the hotkey, or opening on this tab, puts the cursor in the field
  useEffect(() => {
    if (focusSignal > 0) input.current?.focus({ preventScroll: true });
  }, [focusSignal]);

  // leaving the panel must release the island's pin
  useEffect(() => () => onFocusChange(false), [onFocusChange]);

  const send = (q: string, label?: string) => {
    if (!q.trim() || ask.streaming) return;
    ask.ask(q, label);
    setText("");
  };

  const name = ai.provider === "claude" ? "Claude" : ai.model || AI_PROVIDERS[ai.provider].label;

  return (
    <div className="flex h-full flex-col gap-2.5">
      {talking ? (
        <Conversation ask={ask} />
      ) : needsKey ? (
        <SetupCard message="Add your Claude API key to start asking." />
      ) : (
        <Starters clip={clip} onPick={send} />
      )}

      {ask.error && (
        <div className="flex items-center gap-2 text-[11.5px] font-medium text-red-300/90">
          <span className="min-w-0 flex-1 truncate" title={ask.error.message}>
            {ask.error.message}
          </span>
          {ask.error.setup && <SettingsButton />}
        </div>
      )}

      {/* the field */}
      <form
        className="island-ask-field"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <Sparkles size={13} className="shrink-0 text-(--accent)" />
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              if (ask.streaming) ask.stop();
              else onClose();
            }
          }}
          placeholder={talking ? "Ask a follow-up…" : `Ask ${name}…`}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] font-medium text-white outline-none placeholder:text-white/35"
        />
        {talking && !ask.streaming && (
          <button type="button" className="island-icon-btn island-icon-xs" title="New chat" onClick={ask.reset}>
            <Plus size={13} />
          </button>
        )}
        {ask.streaming ? (
          <button type="button" className="island-ask-send" title="Stop" onClick={ask.stop}>
            <Square size={9} className="fill-current" />
          </button>
        ) : (
          <button type="submit" className="island-ask-send" title="Ask" disabled={!text.trim() || needsKey}>
            <ArrowUp size={13} strokeWidth={2.6} />
          </button>
        )}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------ empty state */

function Starters({ clip, onPick }: { clip: string | null; onPick: (q: string, label: string) => void }) {
  if (!clip) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 px-1">
        <div className="text-[13.5px] font-bold text-white/90">Ask anything</div>
        <div className="text-[11.5px] font-medium text-white/45">
          Copy some text first to summarize, explain, fix or translate it in one click.
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
      <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-white/40">
        <span className="shrink-0 font-semibold text-white/55">Copied</span>
        <span className="truncate">“{clip.replace(/\s+/g, " ").slice(0, 120)}”</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CLIP_ACTIONS.map(({ id, label, icon: I, prompt }) => (
          <button
            key={id}
            className="island-ask-chip"
            onClick={() => onPick(`${prompt}\n\n${clip}`, `${label} · copied text`)}
          >
            <I size={12} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SetupCard({ message }: { message: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center gap-3 px-1">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-white/90">Set up Ask AI</div>
        <div className="text-[11.5px] font-medium text-white/45">{message}</div>
      </div>
      <SettingsButton />
    </div>
  );
}

function SettingsButton() {
  return (
    <button
      className="island-ask-chip shrink-0"
      onClick={() => {
        if (isTauri()) void openManagerSettings("ai").catch(() => {});
      }}
    >
      <Settings2 size={12} />
      Open settings
    </button>
  );
}

/* ----------------------------------------------------------- conversation */

function Conversation({ ask }: { ask: AskState }) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // follow the answer as it streams, unless the reader scrolled up
  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [ask.draft, ask.turns.length]);

  const last = ask.turns.length - 1;
  return (
    <div
      ref={box}
      className="island-ask-scroll min-h-0 flex-1 overflow-y-auto pr-1"
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      }}
    >
      {ask.turns.map((t, i) =>
        t.role === "user" ? (
          <div key={i} className={`island-ask-q ${i > 0 ? "mt-3" : ""}`}>
            {t.label ?? t.text}
          </div>
        ) : (
          <Answer key={i} text={t.text} copyable={i === last && !ask.streaming} />
        ),
      )}
      {ask.streaming &&
        (ask.draft ? (
          <div className="island-ask-a is-live">
            <Markdown text={ask.draft} />
          </div>
        ) : (
          <div className="island-ask-thinking" aria-label="Thinking">
            <i />
            <i />
            <i />
          </div>
        ))}
      {ask.note && <div className="mt-1.5 text-[11px] font-medium text-white/40 italic">{ask.note}</div>}
    </div>
  );
}

function Answer({ text, copyable }: { text: string; copyable: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="island-ask-a group">
      <Markdown text={text} />
      {copyable && (
        <button
          className="island-ask-copy"
          title="Copy answer"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- markdown */

/**
 * Just enough Markdown for short answers: paragraphs, bullet and numbered
 * lists, fenced code, **bold**, *italic* and `code`. Built as elements, never
 * as HTML, so nothing in an answer can inject markup.
 */
function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={blocks.length}>{code.join("\n")}</pre>);
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/;
    const numbered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].match(re)![1]);
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={blocks.length}>
          {items.map((it, k) => (
            <li key={k}>{inline(it)}</li>
          ))}
        </List>,
      );
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !bullet.test(lines[i]) &&
      !numbered.test(lines[i]) &&
      !lines[i].trimStart().startsWith("```")
    ) {
      para.push(lines[i++].replace(/^#{1,6}\s+/, ""));
    }
    blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
  }
  return <>{blocks}</>;
}

function inline(s: string): ReactNode {
  const parts = s.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`") && p.length > 1) return <code key={i}>{p.slice(1, -1)}</code>;
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

/* ------------------------------------------------------------------ hooks */

/** The clipboard's text, read when the panel opens and on every hotkey press. */
function useClipboard(signal: number) {
  const [clip, setClip] = useState<string | null>(null);
  useEffect(() => {
    if (!isTauri()) return setClip(SAMPLE_CLIP);
    let alive = true;
    void readClipboard().then(
      (t) => alive && setClip(t?.trim() ? t.trim() : null),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [signal]);
  return clip;
}

/** Claude cannot be asked without a key; the others may not need one. */
function useNeedsKey(ai: AiTarget) {
  const [needs, setNeeds] = useState(false);
  useEffect(() => {
    if (!isTauri() || AI_PROVIDERS[ai.provider].key !== "required") return setNeeds(false);
    let alive = true;
    void hasKey(ai.provider).then(
      (ok) => alive && setNeeds(!ok),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [ai.provider]);
  return needs;
}
