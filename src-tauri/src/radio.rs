//! Online radio: finding stations in the Radio Browser directory, their
//! icons, and what a stream is playing right now. Playback itself happens in
//! the manager's webview; nothing here touches audio.

use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::cache::{through, Fetched};
use crate::data::{client, get_json, urlencoding};
use crate::system::{base64, image_mime};

/* ---------------------------------------------------------------- directory */

/// The directory runs a handful of identical servers. Whichever answered last
/// is asked first next time.
const MIRRORS: [&str; 4] = [
    "https://de1.api.radio-browser.info",
    "https://nl1.api.radio-browser.info",
    "https://at1.api.radio-browser.info",
    "https://de2.api.radio-browser.info",
];
static PREFERRED: AtomicUsize = AtomicUsize::new(0);

async fn directory<T: serde::de::DeserializeOwned>(path: &str) -> Result<T, String> {
    let first = PREFERRED.load(Ordering::Relaxed) % MIRRORS.len();
    let mut last_err = String::from("no directory server answered");
    for i in 0..MIRRORS.len() {
        let at = (first + i) % MIRRORS.len();
        match get_json::<T>(&format!("{}{path}", MIRRORS[at])).await {
            Ok(v) => {
                PREFERRED.store(at, Ordering::Relaxed);
                return Ok(v);
            }
            Err(e) => last_err = e,
        }
    }
    Err(last_err)
}

/// A station as the directory describes it — only the fields worth keeping.
#[derive(Deserialize)]
struct RawStation {
    stationuuid: String,
    name: String,
    #[serde(default)]
    url: String,
    #[serde(default)]
    url_resolved: String,
    #[serde(default)]
    favicon: String,
    #[serde(default)]
    country: String,
    #[serde(default)]
    countrycode: String,
    #[serde(default)]
    language: String,
    #[serde(default)]
    tags: String,
    #[serde(default)]
    codec: String,
    #[serde(default)]
    bitrate: i64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Station {
    id: String,
    name: String,
    url: String,
    favicon: Option<String>,
    country: Option<String>,
    country_code: Option<String>,
    language: Option<String>,
    tags: Vec<String>,
    codec: Option<String>,
    bitrate: Option<i64>,
}

fn some(s: String) -> Option<String> {
    let t = s.trim();
    (!t.is_empty()).then(|| t.to_string())
}

impl From<RawStation> for Station {
    fn from(r: RawStation) -> Self {
        let url = if r.url_resolved.trim().is_empty() { r.url } else { r.url_resolved };
        Station {
            id: r.stationuuid,
            name: r.name.trim().to_string(),
            url: url.trim().to_string(),
            favicon: some(r.favicon),
            country: some(r.country),
            country_code: some(r.countrycode).map(|c| c.to_uppercase()),
            language: some(r.language),
            tags: r
                .tags
                .split(',')
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .take(6)
                .collect(),
            codec: some(r.codec),
            bitrate: (r.bitrate > 0).then_some(r.bitrate),
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Stations {
    stations: Vec<Station>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RadioQuery {
    name: Option<String>,
    country_code: Option<String>,
    language: Option<String>,
    tag: Option<String>,
    limit: Option<u32>,
}

fn search_path(q: &RadioQuery) -> String {
    let limit = q.limit.unwrap_or(40).clamp(1, 100);
    let mut path = format!(
        "/json/stations/search?hidebroken=true&order=clickcount&reverse=true&limit={limit}"
    );
    let mut add = |key: &str, v: &Option<String>| {
        if let Some(v) = v.as_deref().map(str::trim).filter(|v| !v.is_empty()) {
            path.push_str(&format!("&{key}={}", urlencoding(v)));
        }
    };
    add("name", &q.name);
    add("countrycode", &q.country_code);
    add("language", &q.language);
    add("tag", &q.tag);
    path
}

/// Stations matching a name, country, language or tag — the most listened
/// to first. With nothing to match, simply the most listened to.
#[tauri::command]
pub async fn radio_search(query: Option<RadioQuery>) -> Result<Fetched<Stations>, String> {
    let q = query.unwrap_or_default();
    let path = search_path(&q);
    let key = format!("radio:{}", path.to_lowercase());
    through(&key, Duration::from_secs(10 * 60), || async move {
        let raw: Vec<RawStation> = directory(&path).await?;
        Ok(Stations {
            stations: raw
                .into_iter()
                .map(Station::from)
                .filter(|s| s.url.starts_with("http://") || s.url.starts_with("https://"))
                .collect(),
        })
    })
    .await
}

/// Tells the directory a station was played — how it ranks what is popular.
#[tauri::command]
pub async fn radio_click(id: String) -> Result<(), String> {
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_hexdigit() || c == '-') {
        return Ok(());
    }
    let _: serde_json::Value = directory(&format!("/json/url/{id}")).await?;
    Ok(())
}

/* ------------------------------------------------------------------ favicon */

/// Icons kept for the session, misses included so a dead link is asked once.
fn icons() -> &'static Mutex<HashMap<String, Option<String>>> {
    static ICONS: OnceLock<Mutex<HashMap<String, Option<String>>>> = OnceLock::new();
    ICONS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// A station's icon as a data URL, so the webviews never load remote images.
#[tauri::command]
pub async fn radio_favicon(url: String) -> Result<Option<String>, String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Ok(None);
    }
    if let Some(hit) = icons().lock().ok().and_then(|m| m.get(&url).cloned()) {
        return Ok(hit);
    }

    /// an icon is a few kilobytes; anything past this is not one
    const MAX: usize = 512 * 1024;
    let fetched = async {
        let res = client()
            .get(&url)
            .timeout(Duration::from_secs(6))
            .send()
            .await
            .ok()?;
        if !res.status().is_success() {
            return None;
        }
        if res.content_length().is_some_and(|n| n as usize > MAX) {
            return None;
        }
        let declared = res
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_ascii_lowercase();
        let bytes = res.bytes().await.ok()?;
        if bytes.len() > MAX {
            return None;
        }
        let mime = image_mime(&bytes, &declared)?;
        Some(format!("data:{mime};base64,{}", base64(&bytes)))
    }
    .await;

    if let Ok(mut m) = icons().lock() {
        if m.len() >= 300 {
            m.clear();
        }
        m.insert(url, fetched.clone());
    }
    Ok(fetched)
}

/* --------------------------------------------------------------- now playing */

/// Pulls the song out of a Shoutcast/Icecast metadata block:
/// `StreamTitle='Artist - Song';StreamUrl='…';`. Titles may hold apostrophes,
/// so the value runs to the `';` that ends it, not to the first quote.
fn parse_icy(block: &[u8]) -> Option<String> {
    let end = block.iter().rposition(|&b| b != 0).map_or(0, |i| i + 1);
    let block = &block[..end];
    let text = match std::str::from_utf8(block) {
        Ok(s) => s.to_string(),
        // old servers send Latin-1
        Err(_) => block.iter().map(|&b| b as char).collect(),
    };
    let start = text.find("StreamTitle='")? + "StreamTitle='".len();
    let rest = &text[start..];
    let stop = rest.find("';").unwrap_or_else(|| rest.trim_end_matches(';').trim_end_matches('\'').len());
    let title = rest[..stop].trim();
    let title = title.trim_matches(|c: char| c == '-' || c.is_whitespace());
    (!title.is_empty()).then(|| title.to_string())
}

/// What the stream says it is playing now, read from its in-band metadata.
/// `None` when the stream does not carry any or does not answer in time.
#[tauri::command]
pub async fn radio_now_title(url: String) -> Result<Option<String>, String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Ok(None);
    }
    let read = async {
        let mut res = client()
            .get(&url)
            .header("Icy-MetaData", "1")
            .timeout(Duration::from_secs(8))
            .send()
            .await
            .ok()?;
        let every: usize = res
            .headers()
            .get("icy-metaint")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.trim().parse().ok())?;
        // a sane interval is 8–64 KB; refuse to read megabytes for a title
        if every == 0 || every > 256 * 1024 {
            return None;
        }

        let mut buf: Vec<u8> = Vec::with_capacity(every + 4096);
        let mut need = every + 1;
        while buf.len() < need {
            let chunk = res.chunk().await.ok()??;
            buf.extend_from_slice(&chunk);
            if buf.len() > every && need == every + 1 {
                need = every + 1 + buf[every] as usize * 16;
            }
        }
        let len = buf[every] as usize * 16;
        parse_icy(&buf[every + 1..every + 1 + len])
    };
    Ok(read.await)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn icy_title_is_parsed() {
        let b = b"StreamTitle='Daft Punk - One More Time';StreamUrl='';\0\0\0";
        assert_eq!(parse_icy(b).as_deref(), Some("Daft Punk - One More Time"));
    }

    #[test]
    fn icy_title_keeps_apostrophes() {
        let b = b"StreamTitle='Guns N' Roses - Don't Cry';";
        assert_eq!(parse_icy(b).as_deref(), Some("Guns N' Roses - Don't Cry"));
    }

    #[test]
    fn icy_title_reads_persian() {
        let b = "StreamTitle='محسن چاوشی - امیر بی گزند';".as_bytes();
        assert_eq!(parse_icy(b).as_deref(), Some("محسن چاوشی - امیر بی گزند"));
    }

    #[test]
    fn icy_empty_title_is_none() {
        assert_eq!(parse_icy(b"StreamTitle='';\0"), None);
        assert_eq!(parse_icy(b"StreamTitle=' - ';"), None);
        assert_eq!(parse_icy(b"\0\0\0"), None);
    }

    #[test]
    fn search_path_encodes_filters() {
        let q = RadioQuery {
            name: Some("radio javan".into()),
            country_code: Some("IR".into()),
            language: Some(" ".into()),
            ..Default::default()
        };
        let p = search_path(&q);
        assert!(p.contains("&name=radio%20javan"));
        assert!(p.contains("&countrycode=IR"));
        assert!(!p.contains("language"));
    }

    #[tokio::test]
    #[ignore = "needs network"]
    async fn search_finds_iranian_stations() {
        let r = radio_search(Some(RadioQuery {
            country_code: Some("IR".into()),
            limit: Some(10),
            ..Default::default()
        }))
        .await
        .expect("search");
        for s in &r.data.stations {
            println!("{} — {}", s.name, s.url);
        }
        assert!(!r.data.stations.is_empty());
    }

    #[tokio::test]
    #[ignore = "needs network"]
    async fn top_stations_have_titles() {
        let r = radio_search(None).await.expect("search");
        let mut found = 0;
        for s in r.data.stations.iter().take(8) {
            if let Ok(Some(t)) = radio_now_title(s.url.clone()).await {
                println!("{}: {t}", s.name);
                found += 1;
            }
        }
        assert!(found > 0, "no top station carried a title");
    }
}
