// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tokio::sync::Mutex;
mod common_tools;
mod service;
mod sql_lite;
mod vojo;
use crate::service::cmd::*;
use log::LevelFilter;
#[macro_use]
extern crate anyhow;
#[macro_use]
extern crate log;
use crate::sql_lite::connection::AppState;
use crate::vojo::static_connections::Connections;
use std::any::Any;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::MouseButton;
use tauri::tray::MouseButtonState;
use tauri::tray::TrayIconBuilder;
use tauri::tray::TrayIconEvent;
use tauri::Manager;
#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let sqlite_pool_wrapper = AppState::new().await?;
    let current_map: HashMap<i32, Box<dyn Any + Send>> = HashMap::new();
    let connections = Connections {
        map: Arc::new(Mutex::new(current_map)),
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .manage(sqlite_pool_wrapper)
        .manage(connections)
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit".to_string(), "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show".to_string(), "Show", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show, &quit])?;
            let _ = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        info!("quit menu item was clicked");
                        app.exit(0);
                    }
                    "show" => {
                        let window = app.get_webview_window("main").unwrap();
                        window.show().unwrap();
                    }
                    _ => {
                        info!("menu item {:?} not handled", event);
                    }
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        info!("left click pressed and released");
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {
                        // info!("unhandled event {event:?}");
                    }
                })
                .build(app)?;

            Ok(())
        })
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(LevelFilter::Info)
                .build(),
        )
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.clone() {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_about_version,
            test_url,
            save_base_config,
            get_base_config,
            list_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
