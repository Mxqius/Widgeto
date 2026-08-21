mod cache;
mod data;

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

/// Bring the manager back from the tray.
fn show_manager(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            host_info,
            data::weather,
            data::markets,
            data::quote,
            data::whereami,
            data::data_health
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
