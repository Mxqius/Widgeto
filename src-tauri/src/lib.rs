use tauri::Manager;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![host_info])
        .setup(|app| {
            // The manager keeps its rounded shadow; widget windows are created
            // from the frontend as transparent, shadowless desktop windows.
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_shadow(true);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Widgeto");
}
