use std::time::Instant;

use crate::common_tools::about::get_about_version_with_error;
use crate::vojo::update_connection_req::UpdateConnectionRequest;

use super::base_config_service::delete_base_config_with_error;
use super::base_config_service::exe_sql_with_error;
use super::base_config_service::get_base_config_by_id_with_error;
use super::base_config_service::get_base_config_with_error;
use super::base_config_service::get_column_info_for_insert_sql_with_error;
use super::base_config_service::list_node_info_with_error;
use super::base_config_service::save_base_config_with_error;
use super::base_config_service::update_base_config_with_error;
use crate::common_tools::base_response::BaseResponse;
use crate::common_tools::database::test_url_with_error;
use crate::service::base_config_service::get_complete_words_with_error;
use crate::service::base_config_service::get_ddl_with_error;
use crate::service::base_config_service::move_column_with_error;
use crate::service::base_config_service::show_columns_with_error;
use crate::service::base_config_service::update_sql_with_error;
use crate::service::query_service::get_query_with_error;
use crate::service::query_service::remove_query_with_error;
use crate::service::query_service::rename_query_with_error;
use crate::service::query_service::save_query_with_error;
use crate::sql_lite::connection::AppState;
use crate::vojo::base_config::BaseConfig;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::save_connection_req::SaveConnectionRequest;
use tauri::State;
macro_rules! handle_response {
    ($result:expr) => {
        match $result {
            Ok(item) => {
                let res = BaseResponse {
                    response_code: 0,
                    response_msg: item,
                };
                serde_json::to_string(&res).unwrap()
            }
            Err(e) => {
                error!("{}", e);
                let res = BaseResponse {
                    response_code: 1,
                    response_msg: e.to_string(),
                };
                serde_json::to_string(&res).unwrap()
            }
        }
    };
}
#[tauri::command]
pub async fn test_url(test_database_request: BaseConfig) -> String {
    handle_response!(test_url_with_error(test_database_request).await)
}

#[tauri::command]
pub fn get_about_version() -> String {
    handle_response!(get_about_version_with_error())
}

#[tauri::command]
pub async fn save_base_config(
    state: State<'_, AppState>,
    save_connection_request: SaveConnectionRequest,
) -> Result<String, ()> {
    let res = handle_response!(save_base_config_with_error(state, save_connection_request).await);
    Ok(res)
}
#[tauri::command]
pub async fn update_base_config(
    state: State<'_, AppState>,
    save_connection_request: UpdateConnectionRequest,
) -> Result<String, ()> {
    let res = handle_response!(update_base_config_with_error(state, save_connection_request).await);
    Ok(res)
}
#[tauri::command]
pub async fn delete_base_config(
    state: State<'_, AppState>,
    base_config_id: i32,
) -> Result<String, ()> {
    let res = handle_response!(delete_base_config_with_error(state, base_config_id).await);
    Ok(res)
}
#[tauri::command]
pub async fn get_base_config(state: State<'_, AppState>) -> Result<String, ()> {
    let res = handle_response!(get_base_config_with_error(state).await);

    Ok(res)
}
#[tauri::command]
pub async fn get_base_config_by_id(
    state: State<'_, AppState>,
    base_config_id: i32,
) -> Result<String, ()> {
    let res = handle_response!(get_base_config_by_id_with_error(state, base_config_id).await);

    Ok(res)
}
#[tauri::command]

pub async fn list_node_info(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let res = handle_response!(list_node_info_with_error(state, list_node_info_req).await);
    Ok(res)
}
#[tauri::command]

pub async fn get_column_info_for_insert_sql(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let res = handle_response!(
        get_column_info_for_insert_sql_with_error(state, list_node_info_req).await
    );
    Ok(res)
}
#[tauri::command]

pub async fn exe_sql(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    sql: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(exe_sql_with_error(state, list_node_info_req, sql).await);
    info!("exe_sql: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn get_complete_words(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(get_complete_words_with_error(state, list_node_info_req).await);
    info!("get_complete_words: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn update_sql(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    sqls: Vec<String>,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(update_sql_with_error(state, list_node_info_req, sqls).await);
    info!("update_sql: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn show_columns(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(show_columns_with_error(state, list_node_info_req).await);
    info!("show_columns: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn get_ddl(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(get_ddl_with_error(state, list_node_info_req).await);
    info!("get_ddl: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn save_query(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
    sql: Option<String>,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(save_query_with_error(state, connection_id, query_name, sql).await);
    info!("save_query: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn move_column(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    move_direction: i32,
) -> Result<String, ()> {
    let time = Instant::now();
    let res =
        handle_response!(move_column_with_error(state, list_node_info_req, move_direction).await);
    info!("save_query: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn rename_query(
    state: State<'_, AppState>,
    connection_id: i32,
    old_query_name: String,
    new_query_name: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        rename_query_with_error(state, connection_id, old_query_name, new_query_name).await
    );
    info!("rename_query: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn remove_query(
    state: State<'_, AppState>,
    base_config_id: i32,
    query_name: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(remove_query_with_error(state, base_config_id, query_name).await);
    info!("remove_query: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn get_query(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(get_query_with_error(state, connection_id, query_name).await);
    info!("get_query: {:?}", time.elapsed());
    Ok(res)
}
