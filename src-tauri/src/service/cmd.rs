use super::cmd_service::delete_base_config_with_error;
use super::cmd_service::exe_sql_with_error;
use super::cmd_service::get_base_config_by_id_with_error;
use super::cmd_service::get_base_config_with_error;
use super::cmd_service::get_column_info_for_insert_sql_with_error;
use super::cmd_service::list_node_info_with_error;
use super::cmd_service::save_base_config_with_error;
use super::cmd_service::update_base_config_with_error;
use crate::common_tools::about::get_about_version_with_error;
use crate::common_tools::base_response::BaseResponse;
use crate::common_tools::database::test_url_with_error;
use crate::service::base_config_service::BaseConfig;
use crate::service::cmd_service::create_folder_with_error;
use crate::service::cmd_service::delete_bucket_with_error;
use crate::service::cmd_service::download_file_with_error;
use crate::service::cmd_service::drop_column_with_error;
use crate::service::cmd_service::drop_index_with_error;
use crate::service::cmd_service::drop_table_with_error;
use crate::service::cmd_service::dump_database_with_error;
use crate::service::cmd_service::generate_database_document_with_error;
use crate::service::cmd_service::get_complete_words_with_error;
use crate::service::cmd_service::get_ddl_with_error;
use crate::service::cmd_service::get_procedure_details_with_error;
use crate::service::cmd_service::import_database_with_error;
use crate::service::cmd_service::init_dump_data_with_error;
use crate::service::cmd_service::move_column_with_error;
use crate::service::cmd_service::remove_column_with_error;
use crate::service::cmd_service::show_columns_with_error;
use crate::service::cmd_service::truncate_table_with_error;
use crate::service::cmd_service::update_record_with_error;
use crate::service::cmd_service::upload_file_with_error;
use crate::service::query_service::get_query_with_error;
use crate::service::query_service::remove_query_with_error;
use crate::service::query_service::rename_query_with_error;
use crate::service::query_service::save_query_with_error;
use crate::sql_lite::connection::AppState;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::save_connection_req::SaveConnectionRequest;
use crate::vojo::update_connection_req::UpdateConnectionRequest;
use std::time::Instant;
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

pub async fn remove_column(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    column_name: String,
) -> Result<String, ()> {
    let res =
        handle_response!(remove_column_with_error(state, list_node_info_req, column_name).await);
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
pub async fn download_file(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    destination: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res =
        handle_response!(download_file_with_error(state, list_node_info_req, destination).await);
    info!("download_file: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]
pub async fn upload_file(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    local_file_path: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res =
        handle_response!(upload_file_with_error(state, list_node_info_req, local_file_path).await);
    info!("upload_file: {:?}", time.elapsed());
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

pub async fn get_procedure_details(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(get_procedure_details_with_error(state, list_node_info_req).await);
    info!("get_procedure_details: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn update_record(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    sqls: Vec<String>,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(update_record_with_error(state, list_node_info_req, sqls).await);
    info!("update_record: {:?}", time.elapsed());
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

pub async fn create_folder(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    folder_name: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res =
        handle_response!(create_folder_with_error(state, list_node_info_req, folder_name).await);
    info!("save_query: {:?}", time.elapsed());
    Ok(res)
}

#[tauri::command]

pub async fn delete_bucket(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(delete_bucket_with_error(state, list_node_info_req).await);
    info!("save_query:  {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn dump_database(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    dump_database_req: DumpDatabaseReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        dump_database_with_error(state, list_node_info_req, dump_database_req).await
    );
    info!("dump_database: {:?}", time.elapsed());
    Ok(res)
}

#[tauri::command]

pub async fn import_database(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    import_database_req: ImportDatabaseReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        import_database_with_error(state, list_node_info_req, import_database_req).await
    );
    info!("import_database: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn generate_database_document(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    file_dir: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        generate_database_document_with_error(state, list_node_info_req, file_dir).await
    );
    info!("save_query: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn drop_table(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(drop_table_with_error(state, list_node_info_req).await);
    info!("drop_table: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn drop_column(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(drop_column_with_error(state, list_node_info_req).await);
    info!("drop_column: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn drop_index(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(drop_index_with_error(state, list_node_info_req).await);
    info!("drop_index: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn truncate_table(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(truncate_table_with_error(state, list_node_info_req).await);
    info!("truncate_table: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn init_dump_data(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(init_dump_data_with_error(state, list_node_info_req).await);
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
