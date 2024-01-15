// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::sync::Mutex;
use std::time::Duration;
mod common_tools;
mod sql_lite;
mod vojo;
use crate::common_tools::cmd::*;
use log::LevelFilter;
#[macro_use]
extern crate anyhow;
#[macro_use]
extern crate log;
use crate::sql_lite::connection::SqlitePoolWrapper;
use std::sync::RwLock;
use tauri::Manager;
use tauri::SystemTray;
use tauri::{CustomMenuItem, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use tokio::time::sleep;
#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let quit = CustomMenuItem::new("quit".to_string(), "退出");
    let show = CustomMenuItem::new("show".to_string(), "显示");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    let system_tray = SystemTray::new().with_menu(tray_menu);
    let sqlite_pool_wrapper = SqlitePoolWrapper::new().await?;
    tauri::Builder::default()
        .manage(sqlite_pool_wrapper)
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(LevelFilter::Info)
                .build(),
        )
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                event.window().hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .setup(|app| {
            let main_window = app.get_window("main").unwrap();
            // we perform the initialization code on a new task so the app doesn't freeze
            tauri::async_runtime::spawn(async move {
                // adapt sleeping time to be long enough
                sleep(Duration::from_millis(500)).await;
                main_window.show().unwrap();
            });

            Ok(())
        })
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                info!("system tray received a left click");
            }

            SystemTrayEvent::DoubleClick {
                position: _,
                size: _,
                ..
            } => {
                // let window = app.create_tao_window();
                info!("system tray received a double click");
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            base64_encode,
            base64_decode,
            base64_encode_of_image,
            base64_save_image,
            get_about_version,
            test_url,
            save_base_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
