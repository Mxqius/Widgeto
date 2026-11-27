//! "Ask AI" for the island.
//!
//! Two wire formats cover every provider worth supporting:
//!
//! * **Claude** — Anthropic's Messages API, streamed over server-sent events.
//! * **OpenAI-compatible** `/chat/completions` — OpenAI itself, and anything
//!   that speaks its dialect: Ollama and LM Studio on this machine, Gemini's
//!   OpenAI endpoint, OpenRouter, Groq and so on.
//!
//! API keys live in Windows Credential Manager and never reach the webview:
//! the page names a provider, and the key is looked up here at request time.
//! Text streams back to the page over a Tauri channel as it arrives.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::ipc::Channel;

const CLAUDE_URL: &str = "https://api.anthropic.com/v1";
const CLAUDE_VERSION: &str = "2026-10-21";
/// Server-side refusal fallback: on a policy decline the API re-runs the
/// request on a suitable model inside the same stream.
const CLAUDE_FALLBACK_BETA: &str = "server-side-fallback-2026-07-01";
/// Models that accept `fallbacks: "default"`; anything else is sent without it.
const CLAUDE_FALLBACK_MODELS: &[&str] = &[
    "claude-fable-5-2",
    "claude-fable-5-1",
    "claude-opus-5-5",
    "claude-opus-5",
    "claude-sonnet-5-5",
];

/// The island is a small panel; ask for answers that fit it.
const SYSTEM: &str = "You are the assistant inside Widgeto's Dynamic Island, a small panel at the top \
of the user's Windows desktop. Answer briefly: lead with the answer, then at most a few short \
sentences or a short list. Use plain text with light Markdown only (bold, inline code, - bullets); \
no headings or tables. If the user asks for something long, give the essentials and say what you left out.";

fn http() -> &'static reqwest::Client {
    static C: OnceLock<reqwest::Client> = OnceLock::new();
    C.get_or_init(|| {
        reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(10))
            .user_agent("widgeto/0.1")
            .build()
            .expect("http client")
    })
}

/* ----------------------------------------------------------------- types */

#[derive(Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Claude,
    Openai,
    Local,
}

impl Provider {
    fn key_name(self) -> Option<&'static str> {
        match self {
            Provider::Claude => Some("claude"),
            Provider::Openai => Some("openai"),
            Provider::Local => None,
        }
    }
}

#[derive(Deserialize, Serialize, Clone)]
pub struct Turn {
    /// "user" | "assistant"
    role: String,
    text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AskRequest {
    id: u32,
    provider: Provider,
    model: String,
    base_url: Option<String>,
    turns: Vec<Turn>,
}

/// What streams back to the page.
#[derive(Serialize, Clone)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AiEvent {
    /// the first byte arrived — the model is answering
    Started { model: String },
    Delta { text: String },
    Done { stop: Option<String> },
    Error { message: String, setup: bool },
}

/* ---------------------------------------------------------- cancellation */

fn running() -> &'static Mutex<HashMap<u32, Arc<AtomicBool>>> {
    static R: OnceLock<Mutex<HashMap<u32, Arc<AtomicBool>>>> = OnceLock::new();
    R.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
pub fn ai_cancel(id: u32) {
    if let Some(flag) = running().lock().ok().and_then(|r| r.get(&id).cloned()) {
        flag.store(true, Ordering::SeqCst);
    }
}

/* ------------------------------------------------------------------- ask */

#[tauri::command]
pub async fn ai_ask(req: AskRequest, on_event: Channel<AiEvent>) -> Result<(), String> {
    let cancel = Arc::new(AtomicBool::new(false));
    if let Ok(mut r) = running().lock() {
        r.insert(req.id, cancel.clone());
    }
    let out = ask(&req, &on_event, &cancel).await;
    if let Ok(mut r) = running().lock() {
        r.remove(&req.id);
    }
    match out {
        Ok(stop) => {
            let _ = on_event.send(AiEvent::Done { stop });
        }
        Err(Failure { message, setup }) => {
            let _ = on_event.send(AiEvent::Error { message, setup });
        }
    }
    Ok(())
}

struct Failure {
    message: String,
    /// true when the fix is in Settings (no key, bad key, no model)
    setup: bool,
}

impl Failure {
    fn new(message: impl Into<String>) -> Self {
        Self { message: message.into(), setup: false }
    }
    fn setup(message: impl Into<String>) -> Self {
        Self { message: message.into(), setup: true }
    }
}

async fn ask(req: &AskRequest, ch: &Channel<AiEvent>, cancel: &AtomicBool) -> Result<Option<String>, Failure> {
    let model = req.model.trim();
    if model.is_empty() {
        return Err(Failure::setup("Choose a model in Settings → AI."));
    }
    let key = match req.provider.key_name() {
        Some(name) => {
            let k = keys::load(name);
            if k.is_none() && req.provider == Provider::Claude {
                return Err(Failure::setup("Add your Claude API key in Settings → AI."));
            }
            k
        }
        None => None,
    };

    let request = match req.provider {
        Provider::Claude => {
            let mut body = json!({
                "model": model,
                "max_tokens": 16000,
                "stream": true,
                "system": SYSTEM,
                "messages": req.turns.iter().map(|t| json!({"role": t.role, "content": t.text})).collect::<Vec<_>>(),
            });
            let mut rb = http()
                .post(format!("{CLAUDE_URL}/messages"))
                .header("x-api-key", key.unwrap_or_default())
                .header("anthropic-version", CLAUDE_VERSION)
                .header("content-type", "application/json");
            if CLAUDE_FALLBACK_MODELS.contains(&model) {
                body["fallbacks"] = json!("default");
                rb = rb.header("anthropic-beta", CLAUDE_FALLBACK_BETA);
            }
            rb.json(&body)
        }
        Provider::Openai | Provider::Local => {
            let base = base_url(req.provider, req.base_url.as_deref());
            let mut messages = vec![json!({"role": "system", "content": SYSTEM})];
            messages.extend(req.turns.iter().map(|t| json!({"role": t.role, "content": t.text})));
            let mut rb = http()
                .post(format!("{base}/chat/completions"))
                .json(&json!({ "model": model, "stream": true, "messages": messages }));
            if let Some(k) = key.filter(|k| !k.is_empty()) {
                rb = rb.bearer_auth(k);
            }
            rb
        }
    };

    let mut resp = request.send().await.map_err(|e| {
        if req.provider == Provider::Local {
            Failure::setup(format!(
                "Couldn't reach a local model at {}. Is Ollama or LM Studio running?",
                base_url(req.provider, req.base_url.as_deref())
            ))
        } else {
            Failure::new(format!("Couldn't connect: {}", short(&e.to_string())))
        }
    })?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        let detail = serde_json::from_str::<Value>(&body)
            .ok()
            .and_then(|v| {
                v["error"]["message"]
                    .as_str()
                    .or_else(|| v["error"].as_str())
                    .or_else(|| v["message"].as_str())
                    .map(str::to_string)
            })
            .unwrap_or_else(|| short(&body));
        return Err(match status.as_u16() {
            401 | 403 => Failure::setup("The API key was rejected. Check it in Settings → AI."),
            404 => Failure::setup(format!("Model not found: {detail}")),
            429 => Failure::new("Rate limited — try again in a moment."),
            529 | 503 => Failure::new("The service is busy — try again in a moment."),
            _ => Failure::new(format!("{} — {}", status.as_u16(), detail)),
        });
    }

    let _ = ch.send(AiEvent::Started { model: model.to_string() });

    // Server-sent events: accumulate bytes, handle each complete line.
    let mut buf: Vec<u8> = Vec::new();
    let mut stop: Option<String> = None;
    loop {
        if cancel.load(Ordering::SeqCst) {
            return Ok(Some("cancelled".into()));
        }
        let chunk = match resp.chunk().await {
            Ok(Some(c)) => c,
            Ok(None) => break,
            Err(e) => return Err(Failure::new(format!("The connection dropped: {}", short(&e.to_string())))),
        };
        buf.extend_from_slice(&chunk);
        while let Some(nl) = buf.iter().position(|&b| b == b'\n') {
            let line: Vec<u8> = buf.drain(..=nl).collect();
            let line = String::from_utf8_lossy(&line);
            let line = line.trim_end_matches(['\r', '\n']);
            let Some(data) = line.strip_prefix("data:") else { continue };
            let data = data.trim();
            if data == "[DONE]" {
                return Ok(stop);
            }
            let Ok(v) = serde_json::from_str::<Value>(data) else { continue };
            match req.provider {
                Provider::Claude => match v["type"].as_str() {
                    Some("content_block_delta") => {
                        if v["delta"]["type"] == "text_delta" {
                            if let Some(t) = v["delta"]["text"].as_str() {
                                let _ = ch.send(AiEvent::Delta { text: t.to_string() });
                            }
                        }
                    }
                    Some("message_delta") => {
                        if let Some(s) = v["delta"]["stop_reason"].as_str() {
                            stop = Some(s.to_string());
                        }
                    }
                    Some("error") => {
                        let m = v["error"]["message"].as_str().unwrap_or("The service returned an error");
                        return Err(Failure::new(m.to_string()));
                    }
                    Some("message_stop") => return Ok(stop),
                    _ => {}
                },
                Provider::Openai | Provider::Local => {
                    if let Some(m) = v["error"]["message"].as_str() {
                        return Err(Failure::new(m.to_string()));
                    }
                    let choice = &v["choices"][0];
                    if let Some(t) = choice["delta"]["content"].as_str() {
                        if !t.is_empty() {
                            let _ = ch.send(AiEvent::Delta { text: t.to_string() });
                        }
                    }
                    if let Some(s) = choice["finish_reason"].as_str() {
                        stop = Some(s.to_string());
                    }
                }
            }
        }
    }
    Ok(stop)
}

fn base_url(p: Provider, custom: Option<&str>) -> String {
    let fallback = match p {
        Provider::Claude => CLAUDE_URL,
        Provider::Openai => "https://api.openai.com/v1",
        Provider::Local => "http://localhost:11434/v1",
    };
    custom
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(fallback)
        .trim_end_matches('/')
        .to_string()
}

fn short(s: &str) -> String {
    let s = s.trim();
    if s.chars().count() > 160 {
        format!("{}…", s.chars().take(160).collect::<String>())
    } else {
        s.to_string()
    }
}

/* ---------------------------------------------------------------- models */

/// The models a provider offers, for the settings picker.
#[tauri::command]
pub async fn ai_models(provider: Provider, base_url: Option<String>) -> Result<Vec<String>, String> {
    let rb = match provider {
        Provider::Claude => {
            let key = keys::load("claude").ok_or("Add your Claude API key first.")?;
            http()
                .get(format!("{CLAUDE_URL}/models?limit=100"))
                .header("x-api-key", key)
                .header("anthropic-version", CLAUDE_VERSION)
        }
        Provider::Openai | Provider::Local => {
            let mut rb = http().get(format!("{}/models", self::base_url(provider, base_url.as_deref())));
            if let Some(k) = provider.key_name().and_then(keys::load) {
                rb = rb.bearer_auth(k);
            }
            rb
        }
    };
    let resp = rb
        .timeout(Duration::from_secs(8))
        .send()
        .await
        .map_err(|_| "Couldn't reach the service.".to_string())?;
    if !resp.status().is_success() {
        return Err(format!("The service answered {}.", resp.status().as_u16()));
    }
    let v: Value = resp.json().await.map_err(|e| e.to_string())?;
    let mut ids: Vec<String> = v["data"]
        .as_array()
        .or_else(|| v["models"].as_array())
        .map(|a| {
            a.iter()
                .filter_map(|m| m["id"].as_str().or_else(|| m["name"].as_str()).map(str::to_string))
                .collect()
        })
        .unwrap_or_default();
    ids.dedup();
    Ok(ids)
}

/* ------------------------------------------------------------------ keys */

#[tauri::command]
pub fn ai_key_set(provider: Provider, key: String) -> Result<(), String> {
    let name = provider.key_name().ok_or("This provider needs no key.")?;
    let key = key.trim();
    if key.is_empty() {
        return Err("The key is empty.".into());
    }
    keys::save(name, key)
}

#[tauri::command]
pub fn ai_key_clear(provider: Provider) -> Result<(), String> {
    match provider.key_name() {
        Some(name) => keys::delete(name),
        None => Ok(()),
    }
}

/// Whether a key is stored — never the key itself.
#[tauri::command]
pub fn ai_key_status(provider: Provider) -> bool {
    provider.key_name().and_then(keys::load).is_some()
}

#[cfg(windows)]
mod keys {
    use windows::core::{HSTRING, PWSTR};
    use windows::Win32::Security::Credentials::{
        CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE,
        CRED_TYPE_GENERIC,
    };

    fn target(name: &str) -> HSTRING {
        HSTRING::from(format!("Widgeto/ai/{name}"))
    }

    pub fn save(name: &str, key: &str) -> Result<(), String> {
        let target = target(name);
        let user = HSTRING::from("widgeto");
        let blob = key.as_bytes();
        let cred = CREDENTIALW {
            Type: CRED_TYPE_GENERIC,
            TargetName: PWSTR(target.as_ptr() as *mut u16),
            CredentialBlobSize: blob.len() as u32,
            CredentialBlob: blob.as_ptr() as *mut u8,
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            UserName: PWSTR(user.as_ptr() as *mut u16),
            ..Default::default()
        };
        unsafe { CredWriteW(&cred, 0) }.map_err(|e| e.message().to_string())
    }

    pub fn load(name: &str) -> Option<String> {
        let mut out: *mut CREDENTIALW = std::ptr::null_mut();
        unsafe {
            CredReadW(&target(name), CRED_TYPE_GENERIC, None, &mut out).ok()?;
            let c = &*out;
            let bytes = std::slice::from_raw_parts(c.CredentialBlob, c.CredentialBlobSize as usize).to_vec();
            CredFree(out as *const core::ffi::c_void);
            String::from_utf8(bytes).ok().filter(|s| !s.is_empty())
        }
    }

    pub fn delete(name: &str) -> Result<(), String> {
        match unsafe { CredDeleteW(&target(name), CRED_TYPE_GENERIC, None) } {
            Ok(()) => Ok(()),
            // nothing stored is fine
            Err(_) => Ok(()),
        }
    }
}

#[cfg(not(windows))]
mod keys {
    pub fn save(_name: &str, _key: &str) -> Result<(), String> {
        Err("Storing API keys is Windows-only for now.".into())
    }
    pub fn load(_name: &str) -> Option<String> {
        None
    }
    pub fn delete(_name: &str) -> Result<(), String> {
        Ok(())
    }
}

/* ------------------------------------------------------------- clipboard */

/// The clipboard's text, for "summarize what I copied". Capped, because a
/// copied log file is not a question.
#[tauri::command]
pub fn clipboard_text() -> Option<String> {
    clip::read().map(|s| {
        const MAX: usize = 24_000;
        if s.chars().count() > MAX {
            s.chars().take(MAX).collect()
        } else {
            s
        }
    })
}

#[cfg(windows)]
pub(crate) mod clip {
    use windows::Win32::Foundation::{HANDLE, HGLOBAL};
    use windows::Win32::System::DataExchange::{CloseClipboard, GetClipboardData, OpenClipboard};
    use windows::Win32::System::Memory::{GlobalLock, GlobalUnlock};

    const CF_UNICODETEXT: u32 = 13;

    pub fn read() -> Option<String> {
        unsafe {
            OpenClipboard(None).ok()?;
            let text = (|| {
                let h: HANDLE = GetClipboardData(CF_UNICODETEXT).ok()?;
                let g = HGLOBAL(h.0);
                let p = GlobalLock(g) as *const u16;
                if p.is_null() {
                    return None;
                }
                let mut len = 0usize;
                while *p.add(len) != 0 {
                    len += 1;
                }
                let s = String::from_utf16_lossy(std::slice::from_raw_parts(p, len));
                let _ = GlobalUnlock(g);
                Some(s)
            })();
            let _ = CloseClipboard();
            text.filter(|s| !s.trim().is_empty())
        }
    }
}

#[cfg(not(windows))]
pub(crate) mod clip {
    pub fn read() -> Option<String> {
        None
    }
}

/// A fresh request id from the native side, so ids never collide across
/// island reloads.
#[tauri::command]
pub fn ai_next_id() -> u32 {
    static N: AtomicU32 = AtomicU32::new(1);
    N.fetch_add(1, Ordering::SeqCst)
}
