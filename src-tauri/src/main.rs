// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod common_tools;
mod service;
use chrono::Local;
mod sql_lite;
mod util;
mod vojo;
use crate::service::cmd::*;
use log::LevelFilter;
#[macro_use]
extern crate anyhow;
#[macro_use]
extern crate log;
#[macro_use]
extern crate tiberius;
use crate::sql_lite::connection::AppState;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::MouseButton;
use tauri::tray::MouseButtonState;
use tauri::tray::TrayIconBuilder;
use tauri::tray::TrayIconEvent;
use tauri::Manager;
#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let appstate = AppState::new().await?;

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(appstate)
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit".to_string(), "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show".to_string(), "Show", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show, &quit])?;
            let _ = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
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
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        info!("left click pressed and released");
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .plugin(
            tauri_plugin_log::Builder::default()
                .format(|out, message, record| {
                    out.finish(format_args!(
                        "[{}][{}:{}][{}] {}",
                        Local::now().format("%Y-%m-%d %H:%M:%S.%3f"),
                        record.file().unwrap_or("<unknown>"),
                        record.line().unwrap_or(0),
                        record.level(),
                        message
                    ))
                })
                .level(LevelFilter::Info)
                .level_for(
                    "tao::platform_impl::platform::event_loop::runner",
                    log::LevelFilter::Error,
                )
                .level_for("tiberius", log::LevelFilter::Off)
                .build(),
        )
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.clone() {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            create_folder,
            delete_base_config,
            delete_bucket,
            download_file,
            download_bucket,
            upload_file,
            upload_folder,
            drop_column,
            drop_index,
            drop_table,
            dump_database,
            exe_sql,
            generate_database_document,
            get_object_info,
            get_about_version,
            get_base_config,
            get_base_config_by_id,
            get_column_info_for_insert_sql,
            get_complete_words,
            get_ddl,
            get_procedure_details,
            get_query,
            import_database,
            init_dump_data,
            list_node_info,
            move_column,
            remove_column,
            remove_query,
            rename_query,
            save_base_config,
            save_query,
            show_columns,
            test_url,
            truncate_table,
            update_base_config,
            update_record,
            update_comment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    Ok(())
}
