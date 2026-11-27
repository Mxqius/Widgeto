use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use serde::Serialize;
use sysinfo::{Disks, Networks, System};

/// One long-lived `System` so CPU deltas are measured between polls rather
/// than from a cold start (a fresh `System` always reports 0% CPU).
struct Probe {
    sys: System,
    nets: Networks,
    disks: Disks,
    last_net: Instant,
    last_rx: u64,
    last_tx: u64,
}

fn probe() -> &'static Mutex<Probe> {
    static P: OnceLock<Mutex<Probe>> = OnceLock::new();
    P.get_or_init(|| {
        // `System::new_all()` also snapshots every running process — name, exe
        // path and command line for each — and that table then sits in this
        // `OnceLock` for the life of the app. Nothing here ever reads it:
        // `system_stats` wants CPU, memory and disks only. So build an empty
        // `System` and refresh exactly those.
        let mut sys = System::new();
        sys.refresh_cpu_usage();
        sys.refresh_memory();
        let nets = Networks::new_with_refreshed_list();
        let (rx, tx) = nets
            .iter()
            .fold((0, 0), |(r, t), (_, d)| (r + d.total_received(), t + d.total_transmitted()));
        Mutex::new(Probe {
            sys,
            nets,
            disks: Disks::new_with_refreshed_list(),
            last_net: Instant::now(),
            last_rx: rx,
            last_tx: tx,
        })
    })
}

#[derive(Serialize)]
pub struct SystemStats {
    /// average across all cores, 0-100
    cpu: f32,
    #[serde(rename = "cpuCores")]
    cpu_cores: Vec<f32>,
    #[serde(rename = "memUsed")]
    mem_used: u64,
    #[serde(rename = "memTotal")]
    mem_total: u64,
    #[serde(rename = "memPct")]
    mem_pct: f32,
    #[serde(rename = "diskUsed")]
    disk_used: u64,
    #[serde(rename = "diskTotal")]
    disk_total: u64,
    #[serde(rename = "diskPct")]
    disk_pct: f32,
    #[serde(rename = "uptimeSec")]
    uptime_sec: u64,
    #[serde(rename = "hostName")]
    host_name: Option<String>,
}

#[tauri::command]
pub fn system_stats() -> Result<SystemStats, String> {
    let mut p = probe().lock().map_err(|_| "probe busy".to_string())?;

    p.sys.refresh_cpu_usage();
    p.sys.refresh_memory();
    p.disks.refresh(true);

    let cores: Vec<f32> = p.sys.cpus().iter().map(|c| c.cpu_usage()).collect();
    let cpu = if cores.is_empty() {
        0.0
    } else {
        cores.iter().sum::<f32>() / cores.len() as f32
    };

    let mem_total = p.sys.total_memory();
    let mem_used = p.sys.used_memory();

    // the disk the app is installed on is the one worth showing
    let (disk_total, disk_used) = p
        .disks
        .iter()
        .max_by_key(|d| d.total_space())
        .map(|d| (d.total_space(), d.total_space().saturating_sub(d.available_space())))
        .unwrap_or((0, 0));

    Ok(SystemStats {
        cpu,
        cpu_cores: cores,
        mem_used,
        mem_total,
        mem_pct: if mem_total == 0 { 0.0 } else { mem_used as f32 / mem_total as f32 * 100.0 },
        disk_used,
        disk_total,
        disk_pct: if disk_total == 0 { 0.0 } else { disk_used as f32 / disk_total as f32 * 100.0 },
        uptime_sec: System::uptime(),
        host_name: System::host_name(),
    })
}

#[derive(Serialize)]
pub struct NetStats {
    /// bytes per second since the previous call
    #[serde(rename = "downBps")]
    down_bps: f64,
    #[serde(rename = "upBps")]
    up_bps: f64,
    #[serde(rename = "totalRx")]
    total_rx: u64,
    #[serde(rename = "totalTx")]
    total_tx: u64,
}

#[tauri::command]
pub fn net_stats() -> Result<NetStats, String> {
    let mut p = probe().lock().map_err(|_| "probe busy".to_string())?;
    p.nets.refresh(true);

    let (rx, tx) = p
        .nets
        .iter()
        .fold((0u64, 0u64), |(r, t), (_, d)| {
            (r + d.total_received(), t + d.total_transmitted())
        });

    let secs = p.last_net.elapsed().as_secs_f64().max(0.001);
    let down = rx.saturating_sub(p.last_rx) as f64 / secs;
    let up = tx.saturating_sub(p.last_tx) as f64 / secs;

    p.last_rx = rx;
    p.last_tx = tx;
    p.last_net = Instant::now();

    Ok(NetStats {
        down_bps: down,
        up_bps: up,
        total_rx: rx,
        total_tx: tx,
    })
}

#[derive(Serialize)]
pub struct BatteryStats {
    present: bool,
    percent: f32,
    charging: bool,
    full: bool,
    /// seconds to full or to empty, whichever applies
    #[serde(rename = "secsLeft")]
    secs_left: Option<u64>,
    health: Option<f32>,
    #[serde(rename = "tempC")]
    temp_c: Option<f32>,
}

/// Built once. The widget polls this every twenty seconds and a fresh manager
/// each time is pure churn.
fn battery_manager() -> Result<&'static starship_battery::Manager, String> {
    static M: OnceLock<Result<starship_battery::Manager, String>> = OnceLock::new();
    M.get_or_init(|| starship_battery::Manager::new().map_err(|e| e.to_string()))
        .as_ref()
        .map_err(|e| e.clone())
}

#[tauri::command]
pub fn battery_stats() -> Result<BatteryStats, String> {
    let manager = battery_manager()?;
    let mut batteries = manager.batteries().map_err(|e| e.to_string())?;

    let Some(Ok(b)) = batteries.next() else {
        // desktops have no battery; the widget shows mains power instead
        return Ok(BatteryStats {
            present: false,
            percent: 100.0,
            charging: true,
            full: true,
            secs_left: None,
            health: None,
            temp_c: None,
        });
    };

    use starship_battery::State;
    let charging = matches!(b.state(), State::Charging);
    let full = matches!(b.state(), State::Full);

    let secs_left = if charging {
        b.time_to_full().map(|t| t.value as u64)
    } else {
        b.time_to_empty().map(|t| t.value as u64)
    };

    Ok(BatteryStats {
        present: true,
        percent: b.state_of_charge().value * 100.0,
        charging,
        full,
        secs_left,
        health: Some(b.state_of_health().value * 100.0),
        temp_c: b.temperature().map(|t| t.value - 273.15),
    })
}

/* ------------------------------------------------------------------- media */

/// The session manager is a process-wide handle, but the media commands run
/// every couple of seconds while the Music tile or the island is up —
/// requesting a new one each time is a WinRT round trip for a value that
/// never changes.
#[cfg(windows)]
fn media_manager(
) -> Result<&'static windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager, String>
{
    use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager as Mgr;
    static MGR: OnceLock<Result<Mgr, String>> = OnceLock::new();
    MGR.get_or_init(|| {
        Mgr::RequestAsync()
            .map_err(|e| e.to_string())
            .and_then(|op| pollster::block_on(op).map_err(|e| e.to_string()))
    })
    .as_ref()
    .map_err(|e| e.clone())
}

#[derive(Serialize, Default)]
pub struct MediaNow {
    playing: bool,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    app: Option<String>,
    /// present only when the source reports a timeline
    #[serde(rename = "positionSec")]
    position_sec: Option<u64>,
    #[serde(rename = "durationSec")]
    duration_sec: Option<u64>,
    /// `None` when the player does not report it
    shuffle: Option<bool>,
    /// "none" | "track" | "list"
    repeat: Option<&'static str>,
    /// What the player lets us do. `None` means it did not say, so the button
    /// stays available rather than being greyed out for no reason.
    #[serde(rename = "canSeek")]
    can_seek: Option<bool>,
    #[serde(rename = "canShuffle")]
    can_shuffle: Option<bool>,
    #[serde(rename = "canRepeat")]
    can_repeat: Option<bool>,
    #[serde(rename = "canNext")]
    can_next: Option<bool>,
    #[serde(rename = "canPrev")]
    can_prev: Option<bool>,
}

/// Reads whatever is currently playing from the Windows media session, so the
/// tile follows Spotify, a browser tab, or any other SMTC-aware player.
#[cfg(windows)]
fn media_now_blocking() -> Result<MediaNow, String> {
    use windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status;

    let Some(session) = active_session()? else {
        return Ok(MediaNow::default());
    };

    let mut out = MediaNow::default();

    if let Ok(info) = session.GetPlaybackInfo() {
        use windows::Media::MediaPlaybackAutoRepeatMode as Repeat;
        out.playing = matches!(info.PlaybackStatus(), Ok(Status::Playing));
        out.shuffle = info.IsShuffleActive().and_then(|r| r.Value()).ok();
        out.repeat = info
            .AutoRepeatMode()
            .and_then(|r| r.Value())
            .ok()
            .map(|m| match m {
                Repeat::Track => "track",
                Repeat::List => "list",
                _ => "none",
            });
        if let Ok(c) = info.Controls() {
            out.can_seek = c.IsPlaybackPositionEnabled().ok();
            out.can_shuffle = c.IsShuffleEnabled().ok();
            out.can_repeat = c.IsRepeatEnabled().ok();
            out.can_next = c.IsNextEnabled().ok();
            out.can_prev = c.IsPreviousEnabled().ok();
        }
    }
    let props = session
        .TryGetMediaPropertiesAsync()
        .ok()
        .and_then(|op| pollster::block_on(op).ok());
    if let Some(props) = props {
        out.title = props.Title().ok().map(|s| s.to_string()).filter(|s| !s.is_empty());
        out.artist = props.Artist().ok().map(|s| s.to_string()).filter(|s| !s.is_empty());
        out.album = props.AlbumTitle().ok().map(|s| s.to_string()).filter(|s| !s.is_empty());
    }
    out.app = session
        .SourceAppUserModelId()
        .ok()
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty());

    if let Ok(t) = session.GetTimelineProperties() {
        // TimeSpan ticks are signed 100 ns units; read them as such so a
        // negative value cannot wrap into an enormous one.
        let secs = |d: windows::core::Result<windows::Foundation::TimeSpan>| d.map(|d| d.Duration / 10_000_000).ok();
        let start = secs(t.StartTime()).unwrap_or(0);
        let pos = secs(t.Position()).unwrap_or(0) - start;
        let end = secs(t.EndTime()).unwrap_or(0) - start;
        // Live streams (a YouTube live in a browser, a radio station) report a
        // made-up timeline: an end centuries away, or a playhead far past it.
        // Nothing real lasts more than a day, so anything else is live.
        const LONGEST: i64 = 24 * 60 * 60;
        if end > 0 && end <= LONGEST && (0..=end + 5).contains(&pos) {
            out.position_sec = Some(pos.min(end) as u64);
            out.duration_sec = Some(end as u64);
        }
    }

    Ok(out)
}

#[cfg(not(windows))]
fn media_now_blocking() -> Result<MediaNow, String> {
    Ok(MediaNow::default())
}

/// Transport control for the active session: "play", "pause", "next", "prev".
#[cfg(windows)]
fn media_control_blocking(action: String) -> Result<(), String> {
    let session = active_session()?.ok_or("nothing is playing")?;

    let op = match action.as_str() {
        "shuffle" => {
            let on = session
                .GetPlaybackInfo()
                .and_then(|i| i.IsShuffleActive())
                .and_then(|r| r.Value())
                .unwrap_or(false);
            session.TryChangeShuffleActiveAsync(!on)
        }
        "repeat" => {
            use windows::Media::MediaPlaybackAutoRepeatMode as Repeat;
            let now = session
                .GetPlaybackInfo()
                .and_then(|i| i.AutoRepeatMode())
                .and_then(|r| r.Value())
                .unwrap_or(Repeat::None);
            // off -> whole list -> this track -> off, the order players use
            let next = match now {
                Repeat::List => Repeat::Track,
                Repeat::Track => Repeat::None,
                _ => Repeat::List,
            };
            session.TryChangeAutoRepeatModeAsync(next)
        }
        "play" => session.TryPlayAsync(),
        "pause" => session.TryPauseAsync(),
        "toggle" => session.TryTogglePlayPauseAsync(),
        "next" => session.TrySkipNextAsync(),
        "prev" => session.TrySkipPreviousAsync(),
        _ => return Err(format!("unknown action {action}")),
    }
    .map_err(|e| e.to_string())?;

    pollster::block_on(op).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(windows))]
fn media_control_blocking(_action: String) -> Result<(), String> {
    Err("media control is Windows-only for now".into())
}

/* --------------------------------------------------------------- media art */

/// Cover art of the current track as a `data:` URL, or `None` when the source
/// does not publish one. Keyed on title and artist, so polling it is free
/// until the track actually changes.
#[cfg(windows)]
fn media_art_blocking() -> Result<Option<String>, String> {
    use windows::core::Interface;
    use windows::Storage::Streams::{DataReader, IInputStream, InputStreamOptions};

    // Only a cover that was actually found is remembered. Many players —
    // Telegram among them — publish the title first and the cover a moment
    // later, so "no cover yet" must stay retryable rather than stick for the
    // rest of the track.
    static LAST: OnceLock<Mutex<Option<(String, String)>>> = OnceLock::new();
    let last = LAST.get_or_init(|| Mutex::new(None));

    let Some(session) = active_session()? else {
        return Ok(None);
    };
    let props = session
        .TryGetMediaPropertiesAsync()
        .map_err(|e| e.to_string())
        .and_then(|op| pollster::block_on(op).map_err(|e| e.to_string()))?;

    let key = format!(
        "{}\u{1f}{}\u{1f}{}",
        session.SourceAppUserModelId().map(|s| s.to_string()).unwrap_or_default(),
        props.Title().map(|s| s.to_string()).unwrap_or_default(),
        props.Artist().map(|s| s.to_string()).unwrap_or_default()
    );
    if let Ok(guard) = last.lock() {
        if let Some((k, art)) = guard.as_ref() {
            if *k == key {
                return Ok(Some(art.clone()));
            }
        }
    }

    /// a cover is tens of kilobytes; anything past this is not one
    const MAX: usize = 4 * 1024 * 1024;
    const CHUNK: u32 = 64 * 1024;

    let read = || -> windows::core::Result<Option<String>> {
        let Ok(thumb) = props.Thumbnail() else {
            return Ok(None);
        };
        let stream = pollster::block_on(thumb.OpenReadAsync()?)?;
        let declared = stream.ContentType().map(|s| s.to_string()).unwrap_or_default();

        // Read in chunks until the stream runs dry instead of trusting
        // `Size()`: some apps hand over a stream that reports 0.
        let input: IInputStream = stream.cast()?;
        let reader = DataReader::CreateDataReader(&input)?;
        reader.SetInputStreamOptions(InputStreamOptions::Partial)?;
        let mut buf: Vec<u8> = Vec::new();
        loop {
            let n = pollster::block_on(reader.LoadAsync(CHUNK)?)? as usize;
            if n == 0 {
                break;
            }
            let start = buf.len();
            buf.resize(start + n, 0);
            reader.ReadBytes(&mut buf[start..])?;
            if buf.len() > MAX {
                return Ok(None);
            }
        }

        Ok(image_mime(&buf, &declared).map(|mime| format!("data:{mime};base64,{}", base64(&buf))))
    };
    let art = read().unwrap_or(None);

    if let Some(a) = &art {
        if let Ok(mut guard) = last.lock() {
            *guard = Some((key, a.clone()));
        }
    }
    Ok(art)
}

/// What the bytes actually are, by their magic number; the declared content
/// type is often empty or generic. `None` when it is not an image at all.
pub(crate) fn image_mime(b: &[u8], declared: &str) -> Option<String> {
    let sniffed = if b.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg"
    } else if b.starts_with(b"\x89PNG") {
        "image/png"
    } else if b.starts_with(b"GIF8") {
        "image/gif"
    } else if b.len() > 12 && &b[0..4] == b"RIFF" && &b[8..12] == b"WEBP" {
        "image/webp"
    } else if b.starts_with(b"BM") {
        "image/bmp"
    } else if b.starts_with(&[0, 0, 1, 0]) {
        "image/x-icon"
    } else if declared.starts_with("image/") && !b.is_empty() {
        return Some(declared.to_string());
    } else {
        return None;
    };
    Some(sniffed.to_string())
}

/// The session worth showing. Windows' "current" session is simply the one
/// that last grabbed focus, which is often an idle browser tab while music
/// plays somewhere else — so a session that is actually playing wins, with
/// the current one preferred among those.
#[cfg(windows)]
fn active_session(
) -> Result<Option<windows::Media::Control::GlobalSystemMediaTransportControlsSession>, String> {
    use windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status;

    let mgr = media_manager()?;
    let current = mgr.GetCurrentSession().ok();
    let playing = |s: &windows::Media::Control::GlobalSystemMediaTransportControlsSession| {
        s.GetPlaybackInfo()
            .and_then(|i| i.PlaybackStatus())
            .map(|st| st == Status::Playing)
            .unwrap_or(false)
    };

    if let Some(c) = &current {
        if playing(c) {
            return Ok(current);
        }
    }
    if let Ok(all) = mgr.GetSessions() {
        for s in &all {
            if playing(&s) {
                return Ok(Some(s));
            }
        }
    }
    Ok(current)
}

#[cfg(not(windows))]
fn media_art_blocking() -> Result<Option<String>, String> {
    Ok(None)
}

/// Standard base64 with padding. Two call sites, so not worth a dependency.
pub(crate) fn base64(bytes: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for c in bytes.chunks(3) {
        let b1 = c.get(1).copied().unwrap_or(0) as u32;
        let b2 = c.get(2).copied().unwrap_or(0) as u32;
        let n = (c[0] as u32) << 16 | b1 << 8 | b2;
        out.push(T[(n >> 18) as usize & 63] as char);
        out.push(T[(n >> 12) as usize & 63] as char);
        out.push(if c.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if c.len() > 2 { T[n as usize & 63] as char } else { '=' });
    }
    out
}

/* ------------------------------------------------- media, off the main thread */

// Tauri runs a plain `fn` command on the main thread. The media commands block
// on WinRT async operations, and some of those — reading a cover's stream in
// particular — complete through that same thread's message loop, so blocking
// it there deadlocks the whole app. These run them on the blocking pool.

async fn off_main<T: Send + 'static>(
    f: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn media_now() -> Result<MediaNow, String> {
    off_main(media_now_blocking).await
}

/// Transport control for the active session: "play", "pause", "toggle", "next", "prev".
#[tauri::command]
pub async fn media_control(action: String) -> Result<(), String> {
    off_main(move || media_control_blocking(action)).await
}

#[tauri::command]
pub async fn media_art() -> Result<Option<String>, String> {
    off_main(media_art_blocking).await
}

/// Jump the playhead to `seconds` into the track.
#[tauri::command]
pub async fn media_seek(seconds: f64) -> Result<(), String> {
    off_main(move || media_seek_blocking(seconds)).await
}

#[cfg(windows)]
fn media_seek_blocking(seconds: f64) -> Result<(), String> {
    let session = active_session()?.ok_or("nothing is playing")?;
    let ticks = (seconds.max(0.0) * 10_000_000.0) as i64;
    let op = session
        .TryChangePlaybackPositionAsync(ticks)
        .map_err(|e| e.to_string())?;
    pollster::block_on(op).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(windows))]
fn media_seek_blocking(_seconds: f64) -> Result<(), String> {
    Err("media control is Windows-only for now".into())
}

/* ------------------------------------------------------------------ launch */

/// Open a URL, a file, or an executable. Quick Launch entries can be any of
/// the three, so this hands anything non-http to the OS shell.
#[tauri::command]
pub fn launch(target: String) -> Result<(), String> {
    let t = target.trim();
    if t.is_empty() {
        return Err("nothing to launch".into());
    }

    if t.starts_with("http://") || t.starts_with("https://") {
        return open_with_shell(t);
    }

    let path = std::path::Path::new(t);
    if path.is_file() || path.is_dir() {
        return open_with_shell(t);
    }

    // app:// style protocol handlers and bare commands both go to the shell
    open_with_shell(t)
}

fn open_with_shell(target: &str) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", target])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(not(windows))]
    {
        let opener = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
        std::process::Command::new(opener)
            .arg(target)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn system_stats_are_plausible() {
        // first call primes the CPU delta, the second reports it
        let _ = system_stats().expect("first");
        std::thread::sleep(std::time::Duration::from_millis(400));
        let s = system_stats().expect("second");
        println!(
            "cpu {:.1}% over {} cores | mem {:.1}% ({:.1}/{:.1} GB) | disk {:.1}% | up {}h | host {:?}",
            s.cpu,
            s.cpu_cores.len(),
            s.mem_pct,
            s.mem_used as f64 / 1e9,
            s.mem_total as f64 / 1e9,
            s.disk_pct,
            s.uptime_sec / 3600,
            s.host_name
        );
        assert!(!s.cpu_cores.is_empty(), "should see at least one core");
        assert!(s.mem_total > 0);
        assert!(s.mem_pct > 0.0 && s.mem_pct <= 100.0);
        assert!(s.disk_total > 0);
    }

    #[test]
    fn net_stats_report_a_rate() {
        let _ = net_stats().expect("first");
        std::thread::sleep(std::time::Duration::from_millis(400));
        let n = net_stats().expect("second");
        println!(
            "down {:.1} KB/s | up {:.1} KB/s | total rx {:.2} GB",
            n.down_bps / 1024.0,
            n.up_bps / 1024.0,
            n.total_rx as f64 / 1e9
        );
        assert!(n.down_bps >= 0.0 && n.up_bps >= 0.0);
        assert!(n.total_rx > 0, "the machine has received some bytes");
    }

    #[test]
    fn battery_reports_state() {
        let b = battery_stats().expect("battery");
        println!(
            "present {} | {:.0}% | charging {} | health {:?}",
            b.present, b.percent, b.charging, b.health
        );
        assert!(b.percent >= 0.0 && b.percent <= 100.0);
    }

    #[tokio::test]
    async fn media_session_is_readable() {
        let m = media_now().await.expect("media");
        println!(
            "playing {} | {:?} - {:?} | app {:?}",
            m.playing, m.artist, m.title, m.app
        );
    }
}
