import { useCallback, useEffect, useRef, useState } from "react";
import { t as tr } from "../i18n";
import { askAi, type AiTarget, type AiTurn } from "@/shared/ai/client";
import { isTauri } from "@/shared/lib/env";

export interface AskTurn extends AiTurn {
  /** shown instead of the full prompt, e.g. "Summarize · copied text" */
  label?: string;
}

export interface AskState {
  turns: AskTurn[];
  /** the answer arriving right now */
  draft: string;
  streaming: boolean;
  /** why the last answer stopped early, in words */
  note: string | null;
  error: { message: string; setup: boolean } | null;
  ask: (text: string, label?: string) => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Keep the conversation small: the island is for quick questions. Odd, so the
 * history sent always starts on a question.
 */
const MAX_TURNS = 11;

const STOP_NOTES = {
  refusal: "The model declined to answer this.",
  max_tokens: "The answer was cut short.",
  length: "The answer was cut short.",
} as const;

const stopNote = (stop: string | undefined) => {
  const n = STOP_NOTES[(stop ?? "") as keyof typeof STOP_NOTES];
  return n ? tr(n) : null;
};

/**
 * One running conversation with the configured model. Lives in the island
 * root, so closing the island does not lose it; "New chat" does.
 */
export function useAsk(target: AiTarget | null): AskState {
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<AskState["error"]>(null);
  const cancel = useRef<(() => void) | null>(null);
  const run = useRef(0);

  const stop = useCallback(() => {
    cancel.current?.();
    cancel.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const ask = useCallback(
    (text: string, label?: string) => {
      const q = text.trim();
      if (!q || !target || streaming) return;
      const mine = ++run.current;
      // a question left unanswered (an error) is replaced, so turns keep alternating
      const before = turns.at(-1)?.role === "user" ? turns.slice(0, -1) : turns;
      const history: AskTurn[] = [...before, { role: "user" as const, text: q, label }].slice(-MAX_TURNS);
      setTurns(history);
      setDraft("");
      setNote(null);
      setError(null);
      setStreaming(true);

      let out = "";
      const finish = (extra?: Partial<{ note: string | null; error: AskState["error"] }>) => {
        if (run.current !== mine) return;
        setStreaming(false);
        cancel.current = null;
        if (out) setTurns((t) => [...t, { role: "assistant", text: out }]);
        // stopped before a word arrived: forget the question too
        else if (!extra?.error) setTurns((t) => t.slice(0, -1));
        setDraft("");
        if (extra?.note !== undefined) setNote(extra.note);
        if (extra?.error) setError(extra.error);
      };

      if (!isTauri()) {
        cancel.current = simulate(q, (piece, done) => {
          if (run.current !== mine) return;
          if (piece) {
            out += piece;
            setDraft(out);
          }
          if (done) finish({ note: null });
        });
        return;
      }

      void askAi(
        target,
        history.map(({ role, text }) => ({ role, text })),
        (e) => {
          if (run.current !== mine) return;
          if (e.kind === "delta") {
            out += e.text;
            setDraft(out);
          } else if (e.kind === "done") {
            finish({ note: e.stop === "cancelled" ? null : stopNote(e.stop ?? undefined) });
          } else if (e.kind === "error") {
            finish({ error: { message: e.message, setup: e.setup } });
          }
        },
      ).then((c) => {
        if (run.current === mine) cancel.current = c;
        else c();
      });
    },
    [target, streaming, turns],
  );

  const reset = useCallback(() => {
    stop();
    run.current++;
    setTurns([]);
    setDraft("");
    setStreaming(false);
    setNote(null);
    setError(null);
  }, [stop]);

  return { turns, draft, streaming, note, error, ask, stop, reset };
}

/* ------------------------------------------------------------------------ */

const SAMPLE_ANSWER =
  "**Short answer:** yes — a pomodoro is 25 minutes of focus, then a 5-minute break.\n\n" +
  "- After four rounds, take a longer 15–30 minute break\n" +
  "- Keep a note of what pulled you away, and deal with it on the break\n" +
  "- Start the timer from the island's `Focus` tab\n\n" +
  "```ts\n" +
  "// four rounds, then a long break\n" +
  "const plan = (rounds: number) =>\n" +
  "  Array.from({ length: rounds }, (_, i) => ({ focus: 25, rest: i === 3 ? 15 : 5 }));\n" +
  "console.log(plan(4), \"done\", true);\n" +
  "```";

/** Browser preview: stream a canned answer so the panel can be looked at. */
function simulate(_q: string, emit: (piece: string, done: boolean) => void) {
  const words = SAMPLE_ANSWER.split(/(?<= )/);
  let i = 0;
  let t: ReturnType<typeof setTimeout>;
  const tick = () => {
    if (i >= words.length) return emit("", true);
    emit(words[i++], false);
    t = setTimeout(tick, 35);
  };
  t = setTimeout(tick, 700);
  return () => {
    clearTimeout(t);
    emit("", true);
  };
}
