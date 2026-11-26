import { useEffect, useState } from "react";
import { Check, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { Segmented, SettingGroup, SettingRow, Toggle } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import {
  AI_PROVIDERS,
  askAi,
  clearKey,
  hasKey,
  listModels,
  saveKey,
  type AiProvider,
} from "@/shared/ai/client";
import { isTauri } from "@/shared/lib/env";
import { HotkeyField } from "../controls/HotkeyField";

const LOCAL_PRESETS = [
  { label: "Ollama", url: "http://localhost:11434/v1" },
  { label: "LM Studio", url: "http://localhost:1234/v1" },
];

const CLAUDE_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-2"];

export function AiTab() {
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const provider = s.aiProvider;
  const info = AI_PROVIDERS[provider];

  return (
    <>
      <SettingGroup title="Ask AI">
        <SettingRow
          title="Ask from the island"
          hint="Adds an Ask tab to the Dynamic Island: questions, and quick actions on what you copied."
        >
          <Toggle checked={s.aiEnabled} onChange={(v) => update({ aiEnabled: v })} />
        </SettingRow>
        <SettingRow title="Ask hotkey" hint="Opens the island on its Ask tab, ready to type.">
          <HotkeyField field="aiHotkey" />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Model">
        <SettingRow title="Provider" hint={info.hint}>
          <Segmented<AiProvider>
            layoutId="ai-provider"
            value={provider}
            onChange={(v) => update({ aiProvider: v })}
            options={[
              { value: "claude", label: "Claude" },
              { value: "openai", label: "OpenAI-compatible" },
              { value: "local", label: "Local" },
            ]}
          />
        </SettingRow>

        {provider !== "claude" && <BaseUrlRow provider={provider} />}
        {info.key !== "none" && <KeyRow key={provider} provider={provider} />}
        <ModelRow key={`m-${provider}`} provider={provider} />
        <TestRow />
      </SettingGroup>
    </>
  );
}

/* ---------------------------------------------------------------- base url */

function BaseUrlRow({ provider }: { provider: "openai" | "local" }) {
  const urls = useApp((st) => st.settings.aiBaseUrls);
  const update = useApp((st) => st.update);
  const saved = urls[provider];
  const [draft, setDraft] = useState(saved);
  useEffect(() => setDraft(saved), [saved]);

  const commit = (v: string) => {
    const url = v.trim().replace(/\/+$/, "") || AI_PROVIDERS[provider].defaultBase!;
    setDraft(url);
    if (url !== saved) update({ aiBaseUrls: { ...urls, [provider]: url } });
  };

  return (
    <SettingRow
      title="Endpoint"
      hint={provider === "local" ? "Where your local server listens." : "The base URL, ending in /v1."}
    >
      <div className="flex items-center gap-1.5">
        {provider === "local" &&
          LOCAL_PRESETS.map((p) => (
            <button
              key={p.label}
              className="chip transition-colors hover:text-white"
              style={saved === p.url ? { color: "var(--accent)" } : undefined}
              onClick={() => commit(p.url)}
            >
              {p.label}
            </button>
          ))}
        <input
          className="field h-8 w-55 font-mono text-[11.5px]"
          value={draft}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => e.key === "Enter" && commit(draft)}
        />
      </div>
    </SettingRow>
  );
}

/* --------------------------------------------------------------------- key */

function KeyRow({ provider }: { provider: AiProvider }) {
  const [stored, setStored] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optional = AI_PROVIDERS[provider].key === "optional";

  useEffect(() => {
    if (!isTauri()) return setStored(false);
    void hasKey(provider).then(setStored, () => setStored(false));
  }, [provider]);

  const save = async () => {
    if (!draft.trim()) return;
    try {
      await saveKey(provider, draft);
      setStored(true);
      setEditing(false);
      setDraft("");
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const remove = async () => {
    await clearKey(provider).catch(() => {});
    setStored(false);
  };

  return (
    <SettingRow
      title="API key"
      hint={
        error ??
        (optional
          ? "Leave empty for servers that need none. Stored in Windows Credential Manager."
          : "Stored in Windows Credential Manager, never in Widgeto's settings file.")
      }
    >
      {stored && !editing ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: "#3ddc84" }}>
            <Check size={12} /> saved
          </span>
          <button className="btn" onClick={() => setEditing(true)}>
            Replace
          </button>
          <button className="btn" onClick={() => void remove()}>
            Remove
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <KeyRound size={12} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-500" />
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              className="field h-8 w-52.5 pl-7 font-mono text-[12px]"
              placeholder={provider === "claude" ? "sk-ant-…" : "sk-…"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void save()}
            />
          </div>
          <button className="btn" disabled={!draft.trim()} onClick={() => void save()}>
            Save
          </button>
          {editing && (
            <button className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          )}
        </div>
      )}
    </SettingRow>
  );
}

/* ------------------------------------------------------------------- model */

function ModelRow({ provider }: { provider: AiProvider }) {
  const models = useApp((st) => st.settings.aiModels);
  const base = useApp((st) => st.settings.aiBaseUrls);
  const update = useApp((st) => st.update);
  const saved = models[provider] ?? "";
  const [draft, setDraft] = useState(saved);
  const [found, setFound] = useState<string[]>(provider === "claude" ? CLAUDE_MODELS : []);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => setDraft(saved), [saved]);

  const commit = (v: string) => {
    const m = v.trim();
    if (m !== saved) update({ aiModels: { ...models, [provider]: m } });
  };

  const detect = async () => {
    setState("loading");
    setNote(null);
    try {
      const ids = await listModels(provider, provider === "claude" ? null : base[provider]);
      setFound(ids.length ? ids : found);
      setState("idle");
      setNote(ids.length ? `${ids.length} found` : "none found");
      if (!saved && ids[0]) {
        setDraft(ids[0]);
        commit(ids[0]);
      }
    } catch (e) {
      setState("error");
      setNote(String(e));
    }
  };

  const hint =
    note ??
    (provider === "claude"
      ? "If a request is declined, supported Claude models retry it on a fallback model automatically."
      : provider === "local"
        ? "Detect lists the models your server has pulled."
        : "The model id, e.g. gpt-5 or an OpenRouter id.");

  return (
    <SettingRow title="Model" hint={hint}>
      <div className="flex items-center gap-1.5">
        <input
          className="field h-8 w-52.5 font-mono text-[12px]"
          list={`ai-models-${provider}`}
          value={draft}
          spellCheck={false}
          placeholder={provider === "claude" ? "claude-opus-5-5" : "model id"}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => e.key === "Enter" && commit(draft)}
        />
        <datalist id={`ai-models-${provider}`}>
          {found.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <button className="btn gap-1.5" onClick={() => void detect()} disabled={state === "loading"}>
          {state === "loading" ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Detect
        </button>
      </div>
    </SettingRow>
  );
}

/* -------------------------------------------------------------------- test */

function TestRow() {
  const s = useApp((st) => st.settings);
  const [state, setState] = useState<"idle" | "running" | "ok" | "error">("idle");
  const [text, setText] = useState("");

  const run = async () => {
    setState("running");
    setText("");
    let out = "";
    try {
      await askAi(
        {
          provider: s.aiProvider,
          model: s.aiModels[s.aiProvider],
          baseUrl: s.aiProvider === "claude" ? null : s.aiBaseUrls[s.aiProvider],
        },
        [{ role: "user", text: "Reply with one short, friendly sentence confirming you're connected." }],
        (e) => {
          if (e.kind === "delta") {
            out += e.text;
            setText(out);
          } else if (e.kind === "done") setState("ok");
          else if (e.kind === "error") {
            setState("error");
            setText(e.message);
          }
        },
      );
    } catch (e) {
      setState("error");
      setText(String(e));
    }
  };

  return (
    <SettingRow
      title="Test the connection"
      hint={
        text ||
        (state === "running" ? "Waiting for the first words…" : "Sends one tiny message with these settings.")
      }
    >
      <div className="flex items-center gap-2">
        {state === "ok" && (
          <span className="text-[11.5px] font-semibold" style={{ color: "#3ddc84" }}>
            connected
          </span>
        )}
        {state === "error" && <span className="text-[11.5px] font-semibold text-red-300">failed</span>}
        <button className="btn gap-1.5" onClick={() => void run()} disabled={state === "running"}>
          {state === "running" && <LoaderCircle size={13} className="animate-spin" />}
          Send test
        </button>
      </div>
    </SettingRow>
  );
}
