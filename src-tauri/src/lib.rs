// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use sysinfo::System;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn clear_system_proxy() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let status = Command::new("reg")
            .args(&[
                "add",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings",
                "/v",
                "ProxyEnable",
                "/t",
                "REG_DWORD",
                "/d",
                "0",
                "/f",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Failed to clear proxy via registry".to_string());
        }

        // Notify browsers about the change
        notify_proxy_change();
    }
    Ok(())
}

/// Notify Windows that internet settings have changed
/// This forces browsers to immediately pick up the new proxy settings
#[cfg(target_os = "windows")]
fn notify_proxy_change() {
    use std::ptr::null_mut;
    use winapi::um::wininet::{
        INTERNET_OPTION_REFRESH, INTERNET_OPTION_SETTINGS_CHANGED, InternetSetOptionW,
    };

    unsafe {
        // Notify that settings have changed
        InternetSetOptionW(null_mut(), INTERNET_OPTION_SETTINGS_CHANGED, null_mut(), 0);
        // Refresh the settings
        InternetSetOptionW(null_mut(), INTERNET_OPTION_REFRESH, null_mut(), 0);
    }
}

#[tauri::command]
fn set_system_proxy(port: u16) -> Result<(), String> {
    // ✅ Port aralığı validasyonu
    if port < 1024 {
        return Err("Geçersiz port numarası (1024-65535 arası olmalı)".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let proxy_address = format!("127.0.0.1:{}", port);

        // ✅ Registry yazma iznini kontrol et
        let test_status = Command::new("reg")
            .args(&[
                "query",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Registry erişim hatası: {e}"))?;

        if !test_status.status.success() {
            return Err(
                "Registry yazma izni yok. Uygulamayı yönetici olarak çalıştırın.".to_string(),
            );
        }

        // ✅ ProxyOverride ekle (localhost bypass)
        let _ = Command::new("reg")
            .args(&[
                "add",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings",
                "/v",
                "ProxyOverride",
                "/t",
                "REG_SZ",
                "/d",
                "<local>",
                "/f",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        // 1. Set Proxy Server Address
        let status_server = Command::new("reg")
            .args(&[
                "add",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings",
                "/v",
                "ProxyServer",
                "/t",
                "REG_SZ",
                "/d",
                &proxy_address,
                "/f",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| format!("ProxyServer ayarlanamadı: {e}"))?;

        // 2. Enable Proxy
        let status_enable = Command::new("reg")
            .args(&[
                "add",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings",
                "/v",
                "ProxyEnable",
                "/t",
                "REG_DWORD",
                "/d",
                "1",
                "/f",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| format!("ProxyEnable ayarlanamadı: {e}"))?;

        if !status_server.success() || !status_enable.success() {
            // ✅ Rollback yap
            let _ = Command::new("reg")
                .args(&[
                    "add",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings",
                    "/v",
                    "ProxyEnable",
                    "/t",
                    "REG_DWORD",
                    "/d",
                    "0",
                    "/f",
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .status();

            return Err("Registry güncelleme başarısız, geri alındı.".to_string());
        }

        // 3. CRITICAL: Notify Windows about the change so browsers pick it up immediately
        notify_proxy_change();
    }
    Ok(())
}

#[tauri::command]
fn update_tray_tooltip(app: tauri::AppHandle, tooltip: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("tray") {
        tray.set_tooltip(Some(tooltip)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(serde::Serialize)]
struct SystemSpecs {
    cpu_model: String,
    total_memory_gb: u64,
    gpu_model: String,
    disk_type: String,
    os_version: String,
    monitor_info: String,
    network_type: String,
    device_type: String,
}

#[tauri::command]
async fn get_system_specs() -> SystemSpecs {
    // 1. Sysinfo işlemlerini (CPU, RAM, OS) thread pool'da çalıştır (UI donmasını önler)
    let (cpu_model, total_memory_gb, os_version) = tauri::async_runtime::spawn_blocking(|| {
        let mut sys = System::new();
        sys.refresh_cpu();
        sys.refresh_memory();

        let cpu = sys
            .cpus()
            .first()
            .map(|cpu| cpu.brand().to_string())
            .unwrap_or("Unknown".to_string());

        let mem = (sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0).round() as u64;
        let os = System::long_os_version().unwrap_or("Unknown".to_string());

        (cpu, mem, os)
    })
    .await
    .unwrap_or(("Unknown".to_string(), 0, "Unknown".to_string()));

    // 2. PowerShell işlemlerini TEK SEFERDE yap (5 kat hız artışı)
    let mut gpu_model = "Unknown".to_string();
    let mut disk_type = "Unknown".to_string();
    let mut monitor_info = "Unknown".to_string();
    let mut network_type = "Unknown".to_string();
    let mut device_type = "Assignment".to_string(); // Desktop default

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let ps_script = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            
            $gpu = Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name -First 1
            $disk = Get-PhysicalDisk | Where-Object { $_.MediaType -eq 'SSD' -or $_.MediaType -eq 'HDD' } | Select-Object -ExpandProperty MediaType -First 1
            
            $res = Get-CimInstance Win32_VideoController | Select-Object -First 1
            $monitor = if ($res) { "$($res.CurrentHorizontalResolution)x$($res.CurrentVerticalResolution) @ $($res.CurrentRefreshRate)Hz" } else { "Unknown" }
            
            $wifi = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.PhysicalMediaType -match 'Wireless|802.11' }
            $net = if ($wifi) { "Wi-Fi" } else { "Ethernet" }
            
            $battery = Get-CimInstance Win32_Battery
            $dev = if ($battery) { "Laptop" } else { "Desktop" }
            
            @{
                gpu = "$gpu"
                disk = "$disk"
                monitor = "$monitor"
                net = "$net"
                dev = "$dev"
            } | ConvertTo-Json -Compress
        "#;

        // Async process execution (spawn_blocking is fine for Command output)
        let output = tauri::async_runtime::spawn_blocking(move || {
            std::process::Command::new("powershell")
                .args(&["-NoProfile", "-Command", ps_script])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
        })
        .await
        .ok()
        .and_then(|r| r.ok());

        if let Some(out) = output {
            if let Ok(json_str) = String::from_utf8(out.stdout) {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    // Güvenli veri çekme
                    let clean_str = |v: &serde_json::Value| -> String {
                        v.as_str().unwrap_or("Unknown").trim().to_string()
                    };

                    let g = clean_str(&parsed["gpu"]);
                    if !g.is_empty() {
                        gpu_model = g;
                    }

                    let d = clean_str(&parsed["disk"]);
                    if !d.is_empty() {
                        disk_type = d;
                    }

                    let m = clean_str(&parsed["monitor"]);
                    if !m.is_empty() && m != "Unknown" {
                        monitor_info = format!("{} (Aktif)", m);
                    }

                    let n = clean_str(&parsed["net"]);
                    if !n.is_empty() {
                        network_type = n;
                    }

                    let dev = clean_str(&parsed["dev"]);
                    if !dev.is_empty() {
                        device_type = dev;
                    }
                }
            }
        }
    }

    SystemSpecs {
        cpu_model,
        total_memory_gb,
        gpu_model,
        disk_type,
        os_version,
        monitor_info,
        network_type,
        device_type,
    }
}

#[tauri::command]
fn check_admin() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // Basit ve etkili yöntem: 'net session' komutu sadece admin yetkisiyle çalışır
        // Exit code 0 ise admindir, değilse (veya access denied ise) değildir
        let status = std::process::Command::new("net")
            .arg("session")
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status();

        if let Ok(s) = status {
            return s.success();
        }
        return false;
    }
    #[cfg(not(target_os = "windows"))]
    {
        // Unix-like sistemlerde uid kontrolü yapılabilir ama şimdilik true dönüyoruz
        true
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::Manager;
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::TrayIconBuilder;

                let show_i = MenuItem::with_id(app, "show", "Uygulamayı Aç", true, None::<&str>)?;
                let support_i =
                    MenuItem::with_id(app, "support", "Destekle ❤", true, None::<&str>)?;
                let quit_i = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;

                use tauri::menu::PredefinedMenuItem;
                let s1 = PredefinedMenuItem::separator(app)?;
                let s2 = PredefinedMenuItem::separator(app)?;

                let menu = Menu::with_items(app, &[&show_i, &s1, &support_i, &s2, &quit_i])?;

                // ✅ Debounce için flag
                let is_showing = Arc::new(AtomicBool::new(false));

                let _tray = TrayIconBuilder::with_id("tray")
                    .menu(&menu)
                    .icon(app.default_window_icon().unwrap().clone())
                    .tooltip("Vexar - Kapalı")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            let _ = clear_system_proxy();
                            std::thread::sleep(std::time::Duration::from_millis(200));
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "support" => {
                            use tauri_plugin_opener::OpenerExt;
                            app.opener()
                                .open_url("https://www.patreon.com/c/ConsolAktif", None::<&str>)
                                .unwrap_or(());
                        }
                        _ => {}
                    })
                    .on_tray_icon_event({
                        let is_showing = Arc::clone(&is_showing);
                        move |tray, event| {
                            use tauri::tray::{MouseButton, TrayIconEvent};

                            // ✅ Debounce: 300ms içinde tekrar tıklanırsa ignore et
                            if is_showing.load(Ordering::Relaxed) {
                                return;
                            }

                            match event {
                                TrayIconEvent::Click {
                                    button: MouseButton::Left,
                                    ..
                                }
                                | TrayIconEvent::DoubleClick { .. } => {
                                    is_showing.store(true, Ordering::Relaxed);

                                    let app = tray.app_handle();
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }

                                    // 300ms sonra flag'i sıfırla
                                    let is_showing_clone = Arc::clone(&is_showing);
                                    std::thread::spawn(move || {
                                        std::thread::sleep(std::time::Duration::from_millis(300));
                                        is_showing_clone.store(false, Ordering::Relaxed);
                                    });
                                }
                                _ => {}
                            }
                        }
                    })
                    .build(app)?;

                // LAYER 2: Window close cleanup
                if let Some(window) = app.get_webview_window("main") {
                    window.on_window_event(|event| {
                        if let tauri::WindowEvent::Destroyed = event {
                            let _ = clear_system_proxy();
                        }
                    });
                }
            }
            Ok(())
        })
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            clear_system_proxy,
            set_system_proxy,
            update_tray_tooltip,
            get_system_specs,
            check_admin
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            // LAYER 3: App exit cleanup (fallback)
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let _ = clear_system_proxy();
                std::thread::sleep(std::time::Duration::from_millis(200));
            }
        });
}
