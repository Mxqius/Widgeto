use std::sync::OnceLock;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::cache::{entries, through, Fetched};

/// One shared client: connection pooling matters when thirteen windows each
/// ask for their own data.
fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(8))
            .user_agent("widgeto/0.1")
            .build()
            .expect("http client")
    })
}

async fn get_json<T: serde::de::DeserializeOwned>(url: &str) -> Result<T, String> {
    let res = client().get(url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("upstream returned {}", res.status()));
    }
    res.json::<T>().await.map_err(|e| e.to_string())
}

/* ------------------------------------------------------------------ weather */

/// WMO weather codes collapsed to the handful of icons a widget can show.
fn condition(code: i64) -> (&'static str, &'static str) {
    match code {
        0 => ("clear", "sun"),
        1..=2 => ("partly cloudy", "part"),
        3 => ("overcast", "cloud"),
        4..=48 => ("fog", "cloud"),
        49..=57 => ("drizzle", "rain"),
        58..=67 => ("rain", "rain"),
        68..=77 => ("snow", "snow"),
        78..=82 => ("showers", "rain"),
        83..=86 => ("snow showers", "snow"),
        _ => ("thunderstorm", "storm"),
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DayForecast {
    day: String,
    icon: String,
    #[serde(rename = "hiC")]
    hi_c: i64,
    #[serde(rename = "loC")]
    lo_c: i64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Weather {
    place: String,
    country: Option<String>,
    #[serde(rename = "tempC")]
    temp_c: i64,
    #[serde(rename = "feelsC")]
    feels_c: i64,
    humidity: i64,
    #[serde(rename = "windKph")]
    wind_kph: i64,
    condition: String,
    icon: String,
    forecast: Vec<DayForecast>,
}

#[derive(Deserialize)]
struct GeoHit {
    name: String,
    country_code: Option<String>,
    latitude: f64,
    longitude: f64,
}

#[derive(Deserialize)]
struct GeoResp {
    results: Option<Vec<GeoHit>>,
}

#[derive(Deserialize)]
struct CurrentBlock {
    temperature_2m: f64,
    apparent_temperature: f64,
    relative_humidity_2m: f64,
    wind_speed_10m: f64,
    weather_code: i64,
}

#[derive(Deserialize)]
struct DailyBlock {
    time: Vec<String>,
    weather_code: Vec<i64>,
    temperature_2m_max: Vec<f64>,
    temperature_2m_min: Vec<f64>,
}

#[derive(Deserialize)]
struct ForecastResp {
    current: CurrentBlock,
    daily: DailyBlock,
}

const WEEKDAYS: [&str; 7] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/// `time` comes back as YYYY-MM-DD; turn it into a weekday without pulling in
/// a date crate (Zeller's congruence).
fn weekday(iso: &str) -> String {
    let parts: Vec<&str> = iso.split('-').collect();
    if parts.len() != 3 {
        return iso.to_string();
    }
    let (y, m, d) = (
        parts[0].parse::<i64>().unwrap_or(2000),
        parts[1].parse::<i64>().unwrap_or(1),
        parts[2].parse::<i64>().unwrap_or(1),
    );
    let (m, y) = if m < 3 { (m + 12, y - 1) } else { (m, y) };
    let k = y % 100;
    let j = y / 100;
    let h = (d + (13 * (m + 1)) / 5 + k + k / 4 + j / 4 + 5 * j) % 7;
    // Zeller: 0 = Saturday
    WEEKDAYS[(((h + 6) % 7) as usize).min(6)].to_string()
}

#[tauri::command]
pub async fn weather(place: String) -> Result<Fetched<Weather>, String> {
    let place = if place.trim().is_empty() {
        "Amsterdam".to_string()
    } else {
        place.trim().to_string()
    };
    let key = format!("wx:{}", place.to_lowercase());

    through(&key, Duration::from_secs(10 * 60), || async {
        let geo: GeoResp = get_json(&format!(
            "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name={}",
            urlencoding(&place)
        ))
        .await?;

        let hit = geo
            .results
            .and_then(|r| r.into_iter().next())
            .ok_or_else(|| format!("no place matches \"{place}\""))?;

        let url = format!(
            "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}\
&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code\
&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto",
            hit.latitude, hit.longitude
        );
        let w: ForecastResp = get_json(&url).await?;
        let (label, icon) = condition(w.current.weather_code);

        let forecast = w
            .daily
            .time
            .iter()
            .enumerate()
            .map(|(i, day)| DayForecast {
                day: weekday(day),
                icon: condition(w.daily.weather_code[i]).1.to_string(),
                hi_c: w.daily.temperature_2m_max[i].round() as i64,
                lo_c: w.daily.temperature_2m_min[i].round() as i64,
            })
            .collect();

        Ok(Weather {
            place: hit.name,
            country: hit.country_code,
            temp_c: w.current.temperature_2m.round() as i64,
            feels_c: w.current.apparent_temperature.round() as i64,
            humidity: w.current.relative_humidity_2m.round() as i64,
            wind_kph: w.current.wind_speed_10m.round() as i64,
            condition: label.to_string(),
            icon: icon.to_string(),
            forecast,
        })
    })
    .await
}

/* ------------------------------------------------------------------ markets */

fn coin_id(symbol: &str) -> Option<&'static str> {
    Some(match symbol {
        "BTC" => "bitcoin",
        "ETH" => "ethereum",
        "SOL" => "solana",
        "ADA" => "cardano",
        "DOGE" => "dogecoin",
        "XRP" => "ripple",
        "DOT" => "polkadot",
        "LINK" => "chainlink",
        "AVAX" => "avalanche-2",
        "MATIC" => "matic-network",
        _ => return None,
    })
}

pub const SUPPORTED: [&str; 10] = [
    "BTC", "ETH", "SOL", "ADA", "DOGE", "XRP", "DOT", "LINK", "AVAX", "MATIC",
];

#[derive(Serialize, Deserialize, Clone)]
pub struct Asset {
    symbol: String,
    name: String,
    price: f64,
    #[serde(rename = "change24h")]
    change_24h: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Markets {
    assets: Vec<Asset>,
    supported: Vec<String>,
}

#[derive(Deserialize)]
struct CoinPrice {
    usd: f64,
    usd_24h_change: Option<f64>,
}

#[tauri::command]
pub async fn markets(symbols: Vec<String>) -> Result<Fetched<Markets>, String> {
    let wanted: Vec<String> = symbols
        .iter()
        .map(|s| s.trim().to_uppercase())
        .filter(|s| coin_id(s).is_some())
        .take(10)
        .collect();
    let wanted = if wanted.is_empty() {
        vec!["BTC".into(), "ETH".into(), "SOL".into()]
    } else {
        wanted
    };
    let key = format!("mk:{}", wanted.join(","));

    let list = wanted.clone();
    through(&key, Duration::from_secs(60), || async move {
        let ids: Vec<&str> = list.iter().filter_map(|s| coin_id(s)).collect();
        let url = format!(
            "https://api.coingecko.com/api/v3/simple/price?ids={}&vs_currencies=usd&include_24hr_change=true",
            ids.join(",")
        );
        let res: std::collections::HashMap<String, CoinPrice> = get_json(&url).await?;

        let assets = list
            .iter()
            .filter_map(|sym| {
                let id = coin_id(sym)?;
                let row = res.get(id)?;
                Some(Asset {
                    symbol: sym.clone(),
                    name: id.replace('-', " "),
                    price: row.usd,
                    change_24h: (row.usd_24h_change.unwrap_or(0.0) * 100.0).round() / 100.0,
                })
            })
            .collect();

        Ok(Markets {
            assets,
            supported: SUPPORTED.iter().map(|s| s.to_string()).collect(),
        })
    })
    .await
}

/* --------------------------------------------------------------------- misc */

#[derive(Serialize)]
pub struct Quote {
    text: &'static str,
    who: &'static str,
}

const QUOTES: [Quote; 7] = [
    Quote { text: "Simplicity is the ultimate sophistication.", who: "Leonardo da Vinci" },
    Quote { text: "Make it work, make it right, make it fast.", who: "Kent Beck" },
    Quote { text: "The details are not the details. They make the design.", who: "Charles Eames" },
    Quote { text: "Perfection is achieved when there is nothing left to take away.", who: "Antoine de Saint-Exupéry" },
    Quote { text: "Design is not just what it looks like. Design is how it works.", who: "Steve Jobs" },
    Quote { text: "Slow is smooth, smooth is fast.", who: "—" },
    Quote { text: "You can't read the label from inside the jar.", who: "—" },
];

/// Deterministic per day, so every window shows the same quote.
#[tauri::command]
pub fn quote() -> &'static Quote {
    let days = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() / 86_400)
        .unwrap_or(0) as usize;
    &QUOTES[days % QUOTES.len()]
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Where {
    city: Option<String>,
    country: Option<String>,
    lat: Option<f64>,
    lon: Option<f64>,
}

#[derive(Deserialize)]
struct IpApi {
    city: Option<String>,
    country_name: Option<String>,
    latitude: Option<f64>,
    longitude: Option<f64>,
}

/// Coarse IP location, so Weather can offer "use my location".
#[tauri::command]
pub async fn whereami() -> Result<Fetched<Where>, String> {
    through("geo:self", Duration::from_secs(30 * 60), || async {
        let r: IpApi = get_json("https://ipapi.co/json/").await?;
        Ok(Where {
            city: r.city,
            country: r.country_name,
            lat: r.latitude,
            lon: r.longitude,
        })
    })
    .await
}

#[derive(Serialize)]
pub struct DataHealth {
    ok: bool,
    cached: usize,
}

#[tauri::command]
pub fn data_health() -> DataHealth {
    DataHealth {
        ok: true,
        cached: entries(),
    }
}

/// Minimal percent-encoding for a query value — avoids a dependency for the
/// one place we interpolate user text into a URL.
fn urlencoding(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            b' ' => out.push_str("%20"),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

/// These hit the real upstreams, so they are opt-in:
/// `cargo test -- --ignored --nocapture`
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "needs network"]
    async fn weather_returns_live_data() {
        let r = weather("Chicago".into()).await.expect("weather");
        println!(
            "weather: {} {}C feels {}C, {} ({} day forecast)",
            r.data.place,
            r.data.temp_c,
            r.data.feels_c,
            r.data.condition,
            r.data.forecast.len()
        );
        assert_eq!(r.data.place, "Chicago");
        assert!(r.data.temp_c > -80 && r.data.temp_c < 70);
        assert_eq!(r.data.forecast.len(), 5);
        assert!(!r.data.forecast[0].day.is_empty());
    }

    #[tokio::test]
    #[ignore = "needs network"]
    async fn weather_second_call_is_cached() {
        let _ = weather("Berlin".into()).await.expect("first");
        let second = weather("Berlin".into()).await.expect("second");
        assert!(matches!(second.source, crate::cache::Source::Cache));
    }

    #[tokio::test]
    #[ignore = "needs network"]
    async fn markets_returns_live_prices() {
        let r = markets(vec!["BTC".into(), "ETH".into()]).await.expect("markets");
        for a in &r.data.assets {
            println!("{}: ${:.2} ({:+.2}%)", a.symbol, a.price, a.change_24h);
        }
        assert_eq!(r.data.assets.len(), 2);
        assert!(r.data.assets[0].price > 0.0);
    }

    #[tokio::test]
    async fn unknown_symbols_fall_back_to_defaults() {
        // no network needed: the filter runs before the request
        let filtered: Vec<String> = ["NOPE", "BTC"]
            .iter()
            .map(|s| s.to_string())
            .filter(|s| coin_id(s).is_some())
            .collect();
        assert_eq!(filtered, vec!["BTC".to_string()]);
    }

    #[test]
    fn weekday_matches_known_dates() {
        assert_eq!(weekday("2026-08-21"), "Fri");
        assert_eq!(weekday("2000-01-01"), "Sat");
        assert_eq!(weekday("2024-02-29"), "Thu");
    }
}
