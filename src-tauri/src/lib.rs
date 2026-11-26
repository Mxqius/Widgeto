mod cache;
mod data;
mod ical;
mod ai;
mod audio;
mod island;
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

/// The preferences the Rust side needs before the UI boots.
///
/// The frontend owns settings, so it mirrors these into a tiny file rather
/// than the Rust side reaching into localStorage. Both are needed earlier than
/// any window exists — `startInTray` before the first window is shown, and
/// `lowMemory` before the webview environment is even created.
fn read_startup_prefs() -> String {
    early_prefs_path()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .unwrap_or_default()
}

/// Resolved without an `AppHandle`, because `tune_webview` runs before there
/// is one. Same location Tauri would give us: `%APPDATA%\<identifier>`.
fn early_prefs_path() -> Option<std::path::PathBuf> {
    #[cfg(windows)]
    let base = std::path::PathBuf::from(std::env::var_os("APPDATA")?);
    #[cfg(not(windows))]
    let base = dirs_config()?;
    Some(base.join("com.widgeto.app").join("startup.json"))
}

#[cfg(not(windows))]
fn dirs_config() -> Option<std::path::PathBuf> {
    if let Some(x) = std::env::var_os("XDG_CONFIG_HOME") {
        return Some(std::path::PathBuf::from(x));
    }
    std::env::var_os("HOME").map(|h| std::path::PathBuf::from(h).join(".config"))
}

fn prefs_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join("startup.json"))
}

/// Mirror of the startup preferences, written by the settings screen.
#[tauri::command]
fn set_startup_prefs(
    app: tauri::AppHandle,
    start_in_tray: bool,
    low_memory: bool,
) -> Result<(), String> {
    let path = prefs_path(&app).ok_or("no config dir")?;
    std::fs::write(
        path,
        format!("{{\"startInTray\":{start_in_tray},\"lowMemory\":{low_memory}}}"),
    )
    .map_err(|e| e.to_string())
}

/// Bring the manager back from the tray.
///
/// The visibility event is what lets the manager unmount its UI while parked:
/// a top-level window hidden with `ShowWindow(SW_HIDE)` does not reliably tell
/// the page it is gone, but we know exactly when we do it.
fn show_manager(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
        let _ = w.emit_to("main", "manager:visible", true);
    }
}

/// Bring the manager forward on a settings tab — the island's "Open settings".
#[tauri::command]
fn manager_open_settings(app: tauri::AppHandle, tab: String) {
    show_manager(&app);
    let _ = app.emit_to("main", "manager:open-settings", tab);
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
///
/// Low-memory mode adds `--enable-low-end-device-mode`, which shrinks
/// Chromium's caches, tile sizes and V8 heap limits. Browser arguments are
/// read once when the webview environment is created, before any window
/// exists — which is why the flag comes from the startup file rather than the
/// store, and why toggling it needs a restart.
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

    let mut args = String::from(ARGS);
    if read_startup_prefs().contains("\"lowMemory\":true") {
        // Measured on this board with all thirteen widgets up: turning off GPU
        // compositing takes the GPU process from ~106 MB of private bytes to
        // ~21 MB, about a quarter off the whole app. Tiles are flat colour and
        // text, so the software compositor keeps up; the cost is that blur and
        // the pet's animation get more expensive, which is why this is opt-in
        // and why Low-memory mode drops the blur at the same time.
        args.push_str(" --enable-low-end-device-mode --disable-gpu --disable-gpu-compositing");
    }
    // Anything already in the environment wins by being appended last, so a
    // packaged build can still be handed --remote-debugging-port or similar
    // without editing this list.
    if let Some(extra) = std::env::var_os("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS") {
        if let Some(extra) = extra.to_str() {
            args.push(' ');
            args.push_str(extra);
        }
    }

    // SAFETY: called once at start-up, before any other thread exists to read
    // the environment.
    unsafe {
        std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", args);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tune_webview();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            // tells a login-launched instance to stay in the tray
            Some(vec!["--startup"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
            system::media_art,
            ai::ai_ask,
            ai::ai_cancel,
            ai::ai_models,
            ai::ai_key_set,
            ai::ai_key_clear,
            ai::ai_key_status,
            ai::ai_next_id,
            ai::clipboard_text,
            manager_open_settings,
            audio::volume_get,
            audio::volume_set,
            audio::volume_mute,
            system::media_seek,
            island::island_ready,
            island::island_hit,
            system::launch,
            ical::calendar_events
        ])
        .setup(|app| {
            let handle = app.handle();

            let open = MenuItem::with_id(handle, "open", "Open Widgeto", true, None::<&str>)?;
            let show_all =
                MenuItem::with_id(handle, "show_all", "Show all widgets", true, None::<&str>)?;
            let hide_all =
                MenuItem::with_id(handle, "hide_all", "Hide all widgets", true, None::<&str>)?;
            let tuck_island = MenuItem::with_id(
                handle,
                "tuck_island",
                "Tuck or show the island",
                true,
                None::<&str>,
            )?;
            let quit = MenuItem::with_id(handle, "quit", "Quit", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(handle)?;

            let menu = Menu::with_items(handle, &[&open, &sep, &show_all, &hide_all, &tuck_island, &sep, &quit])?;

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
                    // null toggles: the island knows whether it is tucked
                    "tuck_island" => {
                        let _ = app.emit_to("island", "island:tuck", ());
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
                if from_login || read_startup_prefs().contains("\"startInTray\":true") {
                    let _ = w.hide();
                    let _ = w.emit_to("main", "manager:visible", false);
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
                    let _ = window.emit_to("main", "manager:visible", false);
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
