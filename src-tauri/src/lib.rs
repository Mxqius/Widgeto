mod cache;
mod data;
mod system;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

/// Very small system snapshot so widgets can show something real later on.
#[derive(serde::Serialize)]
struct HostInfo {
    platform: String,
    arch: String,
}

#[tauri::command]
fn host_info() -> HostInfo {
    HostInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    }
}

/// Reads the one preference the Rust side needs before the UI boots.
/// The frontend owns settings, so it mirrors this flag into a tiny file
/// rather than the Rust side reaching into localStorage.
fn start_hidden(app: &tauri::AppHandle) -> bool {
    prefs_path(app)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .map(|s| s.contains("\"startInTray\":true"))
        .unwrap_or(false)
}

fn prefs_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join("startup.json"))
}

/// Mirror of the startup preferences, written by the settings screen.
#[tauri::command]
fn set_startup_prefs(app: tauri::AppHandle, start_in_tray: bool) -> Result<(), String> {
    let path = prefs_path(&app).ok_or("no config dir")?;
    std::fs::write(path, format!("{{\"startInTray\":{start_in_tray}}}"))
        .map_err(|e| e.to_string())
}

/// Bring the manager back from the tray.
fn show_manager(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// WebView2 tuning, applied before the environment is created.
///
/// Every window here is the same origin, so `--process-per-site` lets Chromium
/// host all of them in a single renderer instead of one per window. With a
/// dozen always-on widgets that is by far the biggest memory lever available
/// without changing the architecture — it takes the app from roughly 1.5 GB to
/// under 600 MB.
///
/// The trade is isolation: one renderer means a crash takes every widget with
/// it rather than one tile. For a read-mostly widget board that is worth it.
///
/// Deliberately no `--js-flags=--max-old-space-size`: capping the heap made
/// sense per-window, but that one renderer now hosts every widget, and a cap
/// sized for one tile would be an out-of-memory crash for thirteen.
fn tune_webview() {
    const ARGS: &str = concat!(
        "--process-per-site",
        " --disable-features=Translate,BackForwardCache,AcceptCHFrame,",
        "MediaRouter,OptimizationHints,InterestFeedContentSuggestions",
        " --disable-background-networking",
        " --disable-sync",
        " --disable-breakpad",
        " --no-pings",
    );
    // SAFETY: called once at start-up, before any other thread exists to read
    // the environment.
    unsafe {
        std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", ARGS);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tune_webview();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            // tells a login-launched instance to stay in the tray
            Some(vec!["--startup"]),
        ))
        .invoke_handler(tauri::generate_handler![
            host_info,
            set_startup_prefs,
            data::weather,
            data::markets,
            data::quote,
            data::whereami,
            data::data_health,
            system::system_stats,
            system::net_stats,
            system::battery_stats,
            system::media_now,
            system::media_control,
            system::launch
        ])
        .setup(|app| {
            let handle = app.handle();

            let open = MenuItem::with_id(handle, "open", "Open Widgeto", true, None::<&str>)?;
            let show_all =
                MenuItem::with_id(handle, "show_all", "Show all widgets", true, None::<&str>)?;
            let hide_all =
                MenuItem::with_id(handle, "hide_all", "Hide all widgets", true, None::<&str>)?;
            let quit = MenuItem::with_id(handle, "quit", "Quit", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(handle)?;

            let menu = Menu::with_items(handle, &[&open, &sep, &show_all, &hide_all, &sep, &quit])?;

            TrayIconBuilder::with_id("widgeto-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Widgeto")
                .menu(&menu)
                // the menu belongs to right-click; a left click just opens the manager
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_manager(app),
                    "show_all" => {
                        let _ = app.emit("tray:widgets", "show_all");
                    }
                    "hide_all" => {
                        let _ = app.emit("tray:widgets", "hide_all");
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_manager(tray.app_handle());
                    }
                })
                .build(app)?;

            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_shadow(true);

                // launched by the OS at login, or the user chose to start in
                // the tray: come up as a tray icon only
                let from_login = std::env::args().any(|a| a == "--startup");
                if from_login || start_hidden(app.handle()) {
                    let _ = w.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the manager parks the app in the tray; the widgets stay on
            // the desktop and the app only really exits from the tray menu.
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Widgeto")
        .run(|_app, event| {
            // widget windows closing must not take the app down with them
            if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
