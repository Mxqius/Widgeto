import { isTauri } from "@/shared/lib/env";

/**
 * Ask AI, shared by the manager (settings) and the island (asking).
 *
 * Every request goes through Rust: the page names a provider and the native
 * side looks the API key up in Windows Credential Manager, so a key never
 * enters a webview after it is saved.
 */
export type AiProvider = "claude" | "openai" | "local";

export interface ProviderInfo {
  id: AiProvider;
  label: string;
  /** what goes in the model field when nothing has been picked */
  defaultModel: string;
  /** OpenAI-compatible endpoint; Claude has a fixed one */
  defaultBase?: string;
  key: "required" | "optional" | "none";
  hint: string;
}

export const AI_PROVIDERS: Record<AiProvider, ProviderInfo> = {
  claude: {
    id: "claude",
    label: "Claude",
    defaultModel: "claude-opus-5-5",
    key: "required",
    hint: "Anthropic's API, with your key from console.anthropic.com.",
  },
  openai: {
    id: "openai",
    label: "OpenAI-compatible",
    defaultModel: "",
    defaultBase: "https://api.openai.com/v1",
    key: "optional",
    hint: "OpenAI, OpenRouter, Groq, Gemini — anything that speaks /chat/completions.",
  },
  local: {
    id: "local",
    label: "Local",
    defaultModel: "",
    defaultBase: "http://localhost:11434/v1",
    key: "none",
    hint: "Ollama (port 11434) or LM Studio (port 1234), running on this PC. Nothing leaves it.",
  },
};

export interface AiTurn {
  role: "user" | "assistant";
  text: string;
}

export type AiEvent =
  | { kind: "started"; model: string }
  | { kind: "delta"; text: string }
  | { kind: "done"; stop: string | null }
  | { kind: "error"; message: string; setup: boolean };

/** What the island needs to ask; the manager sends it as part of the island config. */
export interface AiTarget {
  provider: AiProvider;
  model: string;
  baseUrl: string | null;
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new Error("Ask AI needs the desktop app.");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/**
 * Stream an answer. Resolves when the stream ends; every piece of it, the
 * end included, arrives through `onEvent`. Returns a cancel function at once.
 */
export async function askAi(
  target: AiTarget,
  turns: AiTurn[],
  onEvent: (e: AiEvent) => void,
): Promise<() => void> {
  const { Channel } = await import("@tauri-apps/api/core");
  const id = await call<number>("ai_next_id");
  const channel = new Channel<AiEvent>();
  channel.onmessage = onEvent;
  void call("ai_ask", {
    req: { id, provider: target.provider, model: target.model, baseUrl: target.baseUrl, turns },
    onEvent: channel,
  }).catch((e) => onEvent({ kind: "error", message: String(e), setup: false }));
  return () => void call("ai_cancel", { id }).catch(() => {});
}

export const listModels = (provider: AiProvider, baseUrl: string | null) =>
  call<string[]>("ai_models", { provider, baseUrl });

export const saveKey = (provider: AiProvider, key: string) => call<void>("ai_key_set", { provider, key });
export const clearKey = (provider: AiProvider) => call<void>("ai_key_clear", { provider });
export const hasKey = (provider: AiProvider) => call<boolean>("ai_key_status", { provider });
export const readClipboard = () => call<string | null>("clipboard_text");

/** Bring the manager forward on a settings tab. */
export const openManagerSettings = (tab: string) => call<void>("manager_open_settings", { tab });
