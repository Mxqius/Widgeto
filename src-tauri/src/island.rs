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
    let mut tick: u32 = 0;

    loop {
        std::thread::sleep(TICK);

        let Some(win) = app.get_webview_window(LABEL) else {
            // closed from settings; start from scratch if it comes back
            ignoring = None;
            inside = false;
            fullscreen = None;
            continue;
        };

        if RESYNC.swap(false, Ordering::SeqCst) {
            ignoring = None;
            fullscreen = None;
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
