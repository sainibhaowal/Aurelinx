// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
async fn authenticate_user() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let status = std::process::Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-Command",
                "$credential = $Host.UI.PromptForCredential('Aurelinx Security', 'Verify your identity to autofill your password', $env:USERNAME, ''); if ($credential) { exit 0 } else { exit 1 }"
            ])
            .status();
        Ok(status.map(|s| s.success()).unwrap_or(false))
    }

    #[cfg(target_os = "linux")]
    {
        let status = std::process::Command::new("pkexec")
            .arg("true")
            .status();
        Ok(status.map(|s| s.success()).unwrap_or(false))
    }

    #[cfg(target_os = "macos")]
    {
        let status = std::process::Command::new("osascript")
            .args(&["-e", "do shell script \"true\" with administrator privileges"])
            .status();
        Ok(status.map(|s| s.success()).unwrap_or(false))
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        Ok(true)
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Force X11 backend on Linux to ensure borderless window decorations (decorations: false) work correctly under Wayland
        std::env::set_var("GDK_BACKEND", "x11");
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![authenticate_user])
        .run(tauri::generate_context!())
        .expect("error while running Aurelinx desktop shell");
}