//! The system's master volume, for the island's volume slider, scroll-to-
//! adjust and the volume pop-out. Windows Core Audio, on the default output.

use serde::Serialize;

#[derive(Serialize, Clone, Copy, PartialEq, Default, Debug)]
pub struct Volume {
    /// 0.0 – 1.0
    pub level: f32,
    pub muted: bool,
}

#[cfg(windows)]
pub mod native {
    use super::Volume;
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::Media::Audio::{eConsole, eRender, IMMDeviceEnumerator, MMDeviceEnumerator};
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};

    /// The default output's volume control. Looked up fresh, because the
    /// default device changes when headphones are plugged in.
    pub fn endpoint() -> windows::core::Result<IAudioEndpointVolume> {
        unsafe {
            // harmless if this thread is already in the MTA
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let devices: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
            let device = devices.GetDefaultAudioEndpoint(eRender, eConsole)?;
            device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
        }
    }

    pub fn read(ep: &IAudioEndpointVolume) -> windows::core::Result<Volume> {
        unsafe {
            Ok(Volume {
                level: ep.GetMasterVolumeLevelScalar()?,
                muted: ep.GetMute()?.as_bool(),
            })
        }
    }

    pub fn set_level(level: f32) -> windows::core::Result<Volume> {
        let ep = endpoint()?;
        unsafe {
            // turning it up from silence should be audible
            if level > 0.0 {
                ep.SetMute(false, std::ptr::null())?;
            }
            ep.SetMasterVolumeLevelScalar(level.clamp(0.0, 1.0), std::ptr::null())?;
        }
        read(&ep)
    }

    pub fn set_muted(muted: bool) -> windows::core::Result<Volume> {
        let ep = endpoint()?;
        unsafe { ep.SetMute(muted, std::ptr::null())? };
        read(&ep)
    }
}

async fn off_main<T: Send + 'static>(
    f: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn volume_get() -> Result<Volume, String> {
    #[cfg(windows)]
    return off_main(|| native::endpoint().and_then(|ep| native::read(&ep)).map_err(|e| e.to_string())).await;
    #[cfg(not(windows))]
    return Err("volume control is Windows-only for now".into());
}

#[tauri::command]
pub async fn volume_set(level: f32) -> Result<Volume, String> {
    #[cfg(windows)]
    return off_main(move || native::set_level(level).map_err(|e| e.to_string())).await;
    #[cfg(not(windows))]
    return Err(format!("volume control is Windows-only for now ({level})"));
}

#[tauri::command]
pub async fn volume_mute(muted: bool) -> Result<Volume, String> {
    #[cfg(windows)]
    return off_main(move || native::set_muted(muted).map_err(|e| e.to_string())).await;
    #[cfg(not(windows))]
    return Err(format!("volume control is Windows-only for now ({muted})"));
}
