// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Force X11 backend on Linux to ensure borderless window decorations (decorations: false) work correctly under Wayland
        std::env::set_var("GDK_BACKEND", "x11");
    }

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Aurelius desktop shell");
}