//! Native half of the Dynamic Island.
//!
//! The island window is fixed at the size of its largest shape and is
//! transparent everywhere else, but a transparent webview still swallows
//! clicks. So the window ignores the cursor by default, and a small watcher
//! thread polls the pointer against the shape the page reports, turning
//! cursor events back on only while the pointer is actually over the island.
//! The same thread tells the page when a full-screen app takes over.

use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex, OnceLock,
};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

const LABEL: &str = "island";
/// ~25 Hz: quick enough that hovering feels immediate, cheap enough to forget.
const TICK: Duration = Duration::from_millis(40);
/// Full-screen state changes rarely; checking it once a second is plenty.
const FULLSCREEN_EVERY: u32 = 25;
/// Volume: ~6 Hz, quick enough for the pop-out to follow the keys.
const VOLUME_EVERY: u32 = 4;
/// Re-resolve the default audio device about every two seconds.
const DEVICE_EVERY: u32 = 50;
/// Mic and camera use: every two seconds.
const PRIVACY_EVERY: u32 = 50;
/// Caps Lock: every 120 ms.
const CAPS_EVERY: u32 = 3;

/// The island's shape in logical pixels, relative to its window.
#[derive(Clone, Copy, serde::Deserialize)]
pub struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

fn shape() -> &'static Mutex<Option<Rect>> {
    static S: OnceLock<Mutex<Option<Rect>>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(None))
}

static WATCHING: AtomicBool = AtomicBool::new(false);
/// Set when a (new) island page comes up, so the watcher re-sends its state.
static RESYNC: AtomicBool = AtomicBool::new(false);

fn ensure_watcher(app: AppHandle) {
    if !WATCHING.swap(true, Ordering::SeqCst) {
        std::thread::spawn(move || watch(app));
    }
}

/// The page is up: start watching and re-send hover and full-screen state.
#[tauri::command]
pub fn island_ready(app: AppHandle) {
    RESYNC.store(true, Ordering::SeqCst);
    ensure_watcher(app);
}

/// The page reports where the island is; `None` while it is hidden.
#[tauri::command]
pub fn island_hit(app: AppHandle, rect: Option<Rect>) {
    if let Ok(mut s) = shape().lock() {
        *s = rect;
    }
    ensure_watcher(app);
}

fn watch(app: AppHandle) {
    let mut ignoring: Option<bool> = None;
    let mut inside = false;
    let mut fullscreen: Option<bool> = None;
    let mut volume: Option<crate::audio::Volume> = None;
    let mut probe = VolumeProbe::default();
    let mut privacy: Option<Privacy> = None;
    let mut caps: Option<bool> = None;
    let mut tick: u32 = 0;

    loop {
        std::thread::sleep(TICK);

        let Some(win) = app.get_webview_window(LABEL) else {
            // closed from settings; start from scratch if it comes back
            ignoring = None;
            inside = false;
            fullscreen = None;
            volume = None;
            privacy = None;
            caps = None;
            continue;
        };

        if RESYNC.swap(false, Ordering::SeqCst) {
            ignoring = None;
            fullscreen = None;
            volume = None;
            privacy = None;
            caps = None;
            let _ = win.emit_to(LABEL, "island:hover", inside);
        }

        let rect = shape().lock().ok().and_then(|s| *s);
        let now_inside = match (rect, win.outer_position(), win.scale_factor(), app.cursor_position()) {
            (Some(r), Ok(origin), Ok(scale), Ok(cursor)) => {
                let x = (cursor.x - origin.x as f64) / scale;
                let y = (cursor.y - origin.y as f64) / scale;
                x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
            }
            _ => false,
        };

        if ignoring != Some(!now_inside) {
            let _ = win.set_ignore_cursor_events(!now_inside);
            ignoring = Some(!now_inside);
        }
        if now_inside != inside {
            inside = now_inside;
            let _ = win.emit_to(LABEL, "island:hover", inside);
        }

        tick = tick.wrapping_add(1);
        if fullscreen.is_none() || tick % FULLSCREEN_EVERY == 0 {
            let now = fullscreen_app_in_front();
            if fullscreen != Some(now) {
                fullscreen = Some(now);
                let _ = win.emit_to(LABEL, "island:fullscreen", now);
            }
        }

        // The page decides what is news: it treats the first value it hears
        // as the baseline, so re-sending on resync never pops anything out.
        if volume.is_none() || tick % VOLUME_EVERY == 0 {
            if let Some(v) = probe.read(tick % DEVICE_EVERY == 0) {
                let changed = match volume {
                    None => true,
                    Some(old) => old.muted != v.muted || (old.level - v.level).abs() > 0.004,
                };
                if changed {
                    volume = Some(v);
                    let _ = win.emit_to(LABEL, "island:volume", v);
                }
            }
        }

        if privacy.is_none() || tick % PRIVACY_EVERY == 0 {
            let now = privacy_now();
            if privacy.as_ref() != Some(&now) {
                let _ = win.emit_to(LABEL, "island:privacy", now.clone());
                privacy = Some(now);
            }
        }

        if caps.is_none() || tick % CAPS_EVERY == 0 {
            let now = caps_lock_on();
            if caps != Some(now) {
                caps = Some(now);
                let _ = win.emit_to(LABEL, "island:caps", now);
            }
        }
    }
}

/// Windows' own "do not disturb" signal: a full-screen app, a Direct3D game or
/// presentation mode. The same check the shell uses before showing a toast.
#[cfg(windows)]
fn fullscreen_app_in_front() -> bool {
    use windows::Win32::UI::Shell::{
        SHQueryUserNotificationState, QUNS_BUSY, QUNS_PRESENTATION_MODE,
        QUNS_RUNNING_D3D_FULL_SCREEN,
    };
    #[allow(unused_unsafe)]
    let state = unsafe { SHQueryUserNotificationState() };
    matches!(state, Ok(s) if s == QUNS_BUSY || s == QUNS_RUNNING_D3D_FULL_SCREEN || s == QUNS_PRESENTATION_MODE)
}

#[cfg(not(windows))]
fn fullscreen_app_in_front() -> bool {
    false
}

/* ------------------------------------------------- what is using the mic */

/// Which apps are using the microphone and the camera right now, by name.
#[derive(serde::Serialize, Clone, PartialEq, Default)]
struct Privacy {
    mic: Vec<String>,
    camera: Vec<String>,
}

/// Windows records every app's use of the mic and camera under
/// CapabilityAccessManager: an app whose last use has a start time but no
/// stop time is using it now. Same source as the taskbar's privacy icon.
#[cfg(windows)]
fn privacy_now() -> Privacy {
    Privacy {
        mic: in_use("microphone"),
        camera: in_use("webcam"),
    }
}

#[cfg(not(windows))]
fn privacy_now() -> Privacy {
    Privacy::default()
}

#[cfg(windows)]
fn in_use(capability: &str) -> Vec<String> {
    use windows::Win32::System::Registry::HKEY_CURRENT_USER;
    let base = format!(
        r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\{capability}"
    );
    let mut out = Vec::new();
    scan(HKEY_CURRENT_USER, &base, &mut out);
    out.sort();
    out.dedup();
    out
}

#[cfg(windows)]
fn scan(root: windows::Win32::System::Registry::HKEY, path: &str, out: &mut Vec<String>) {
    use windows::core::{HSTRING, PWSTR};
    use windows::Win32::System::Registry::{RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, HKEY, KEY_READ};

    let mut key = HKEY::default();
    unsafe {
        if RegOpenKeyExW(root, &HSTRING::from(path), Some(0), KEY_READ, &mut key).is_err() {
            return;
        }
        let mut i = 0u32;
        loop {
            let mut name = [0u16; 512];
            let mut len = name.len() as u32;
            let r = RegEnumKeyExW(key, i, Some(PWSTR(name.as_mut_ptr())), &mut len, None, None, None, None);
            if r.is_err() {
                break;
            }
            i += 1;
            let sub = String::from_utf16_lossy(&name[..len as usize]);
            let full = format!(r"{path}\{sub}");
            if sub == "NonPackaged" {
                scan(root, &full, out);
                continue;
            }
            let start = qword(root, &full, "LastUsedTimeStart").unwrap_or(0);
            let stop = qword(root, &full, "LastUsedTimeStop").unwrap_or(1);
            if start > 0 && stop == 0 {
                out.push(app_name(&sub));
            }
        }
        let _ = RegCloseKey(key);
    }
}

#[cfg(windows)]
fn qword(root: windows::Win32::System::Registry::HKEY, path: &str, value: &str) -> Option<u64> {
    use windows::core::HSTRING;
    use windows::Win32::System::Registry::{RegGetValueW, RRF_RT_REG_QWORD};
    let mut data: u64 = 0;
    let mut size = std::mem::size_of::<u64>() as u32;
    let r = unsafe {
        RegGetValueW(
            root,
            &HSTRING::from(path),
            &HSTRING::from(value),
            RRF_RT_REG_QWORD,
            None,
            Some(&mut data as *mut u64 as *mut core::ffi::c_void),
            Some(&mut size),
        )
    };
    if r.is_err() {
        return None;
    }
    Some(data)
}

/// "C:#Program Files#Zoom#bin#Zoom.exe" -> "Zoom";
/// "Microsoft.WindowsCamera_8wekyb3d8bbwe" -> "WindowsCamera".
#[cfg(windows)]
fn app_name(key: &str) -> String {
    let last = key.rsplit('#').next().unwrap_or(key);
    let last = last
        .strip_suffix(".exe")
        .or_else(|| last.strip_suffix(".EXE"))
        .unwrap_or(last);
    let last = last.split('_').next().unwrap_or(last);
    last.rsplit('.').next().unwrap_or(last).to_string()
}

/* ------------------------------------------------------------- caps lock */

#[cfg(windows)]
fn caps_lock_on() -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetKeyState, VK_CAPITAL};
    unsafe { GetKeyState(VK_CAPITAL.0 as i32) & 1 != 0 }
}

#[cfg(not(windows))]
fn caps_lock_on() -> bool {
    false
}

/* ---------------------------------------------------------------- volume */

/// Keeps one volume handle on the watcher thread, re-resolved now and then so
/// a change of default device (headphones plugged in) is picked up.
#[derive(Default)]
struct VolumeProbe {
    #[cfg(windows)]
    ep: Option<windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume>,
}

impl VolumeProbe {
    fn read(&mut self, refresh: bool) -> Option<crate::audio::Volume> {
        #[cfg(windows)]
        {
            if refresh || self.ep.is_none() {
                self.ep = crate::audio::native::endpoint().ok();
            }
            let v = crate::audio::native::read(self.ep.as_ref()?);
            if v.is_err() {
                self.ep = None;
            }
            v.ok()
        }
        #[cfg(not(windows))]
        {
            let _ = refresh;
            None
        }
    }
}
