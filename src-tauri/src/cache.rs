use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

/// Where a value came from, mirrored to the UI so a tile can say it is stale.
#[derive(Clone, Copy, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Source {
    Live,
    Cache,
    Stale,
}

#[derive(Clone)]
struct Entry {
    json: String,
    fetched: Instant,
    ttl: Duration,
}

fn store() -> &'static Mutex<HashMap<String, Entry>> {
    static STORE: OnceLock<Mutex<HashMap<String, Entry>>> = OnceLock::new();
    STORE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn read(key: &str) -> Option<Entry> {
    store().lock().ok()?.get(key).cloned()
}

fn write(key: &str, json: String, ttl: Duration) {
    if let Ok(mut map) = store().lock() {
        map.insert(
            key.to_string(),
            Entry {
                json,
                fetched: Instant::now(),
                ttl,
            },
        );
    }
}

pub fn entries() -> usize {
    store().lock().map(|m| m.len()).unwrap_or(0)
}

/// A payload plus where it came from.
#[derive(serde::Serialize)]
pub struct Fetched<T> {
    #[serde(flatten)]
    pub data: T,
    pub source: Source,
    /// seconds since the value was actually fetched from upstream
    pub age: u64,
}

/// Fetch through the cache: a fresh entry wins, then the upstream, then a
/// stale entry if the upstream is unreachable. Only a cold cache can fail.
///
/// The lock is never held across the await — it is taken, cloned out, and
/// dropped before any network work starts.
pub async fn through<T, F, Fut>(key: &str, ttl: Duration, load: F) -> Result<Fetched<T>, String>
where
    T: serde::Serialize + serde::de::DeserializeOwned,
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<T, String>>,
{
    let existing = read(key);

    if let Some(e) = &existing {
        if e.fetched.elapsed() < e.ttl {
            if let Ok(data) = serde_json::from_str::<T>(&e.json) {
                return Ok(Fetched {
                    data,
                    source: Source::Cache,
                    age: e.fetched.elapsed().as_secs(),
                });
            }
        }
    }

    match load().await {
        Ok(data) => {
            if let Ok(json) = serde_json::to_string(&data) {
                write(key, json, ttl);
            }
            Ok(Fetched {
                data,
                source: Source::Live,
                age: 0,
            })
        }
        Err(err) => match existing {
            Some(e) => match serde_json::from_str::<T>(&e.json) {
                Ok(data) => Ok(Fetched {
                    data,
                    source: Source::Stale,
                    age: e.fetched.elapsed().as_secs(),
                }),
                Err(_) => Err(err),
            },
            None => Err(err),
        },
    }
}
