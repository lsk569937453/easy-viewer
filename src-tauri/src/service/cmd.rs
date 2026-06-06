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
use tauri::Emitter;
use crate::service::cmd_service::create_collection_with_error;
use crate::service::cmd_service::get_server_version_with_error;
use crate::service::cmd_service::delete_bucket_with_error;
use crate::service::cmd_service::create_bucket_with_error;
use crate::service::cmd_service::delete_table_row_with_error;
use crate::service::cmd_service::download_bucket_with_error;
use crate::service::cmd_service::download_file_with_error;
use crate::service::cmd_service::drop_column_with_error;
use crate::service::cmd_service::drop_index_with_error;
use crate::service::cmd_service::drop_table_with_error;
use crate::service::cmd_service::dump_database_with_error;
use crate::service::cmd_service::generate_database_document_with_error;
use crate::service::cmd_service::get_complete_words_with_error;
use crate::service::cmd_service::get_ddl_with_error;
use crate::service::cmd_service::get_object_info_with_error;
use crate::service::cmd_service::get_procedure_details_with_error;
use crate::service::cmd_service::import_database_with_error;
use crate::service::cmd_service::init_dump_data_with_error;
use crate::service::cmd_service::move_column_with_error;
use crate::service::cmd_service::remove_column_with_error;
use crate::service::cmd_service::show_columns_with_error;
use crate::service::cmd_service::truncate_table_with_error;
use crate::service::cmd_service::update_comment_with_error;
use crate::service::cmd_service::update_record_with_error;
use crate::service::cmd_service::upload_file_with_error;
use crate::service::cmd_service::upload_folder_with_error;
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
use sqlx::Row;
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

pub async fn update_comment(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    new_comment: String,
) -> Result<String, ()> {
    let res =
        handle_response!(update_comment_with_error(state, list_node_info_req, new_comment).await);
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
    is_folder: bool,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        download_file_with_error(state, list_node_info_req, destination, is_folder).await
    );
    info!("download_file: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]
pub async fn download_bucket(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    destination: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res =
        handle_response!(download_bucket_with_error(state, list_node_info_req, destination).await);
    info!("download_bucket: {:?}", time.elapsed());
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
pub async fn upload_file_with_progress(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    list_node_info_req: ListNodeInfoReq,
    local_file_path: String,
) -> Result<String, String> {
    let res = upload_file_with_progress_inner(state, app_handle, list_node_info_req, local_file_path).await;
    match res {
        Ok(_) => Ok("{}".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

async fn upload_file_with_progress_inner(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    list_node_info_req: ListNodeInfoReq,
    local_file_path: String,
) -> Result<(), anyhow::Error> {
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: crate::service::base_config_service::BaseConfig =
        serde_json::from_str(&connection_json_str)?;
    let ah = app_handle.clone();
    base_config
        .base_config_enum
        .upload_file_multipart(list_node_info_req, local_file_path, move |uploaded, total| {
            let _ = ah.emit(
                "s3-upload-progress",
                serde_json::json!({ "uploaded": uploaded, "total": total }),
            );
        })
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn upload_folder(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    local_file_path: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        upload_folder_with_error(state, list_node_info_req, local_file_path).await
    );
    info!("upload_folder: {:?}", time.elapsed());
    Ok(res)
}

#[tauri::command]
pub async fn list_local_folder_files(
    local_directory: String,
) -> Result<String, ()> {
    let mut files: Vec<String> = Vec::new();
    for entry_res in walkdir::WalkDir::new(&local_directory) {
        let entry = match entry_res {
            Ok(e) => e,
            Err(_) => continue,
        };
        if !entry.file_type().is_dir() {
            if let Some(path_str) = entry.path().to_str() {
                files.push(path_str.to_string());
            }
        }
    }
    let res = serde_json::to_string(&files).unwrap_or_else(|_| "[]".to_string());
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
pub async fn create_collection(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    collection_name: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        create_collection_with_error(state, list_node_info_req, collection_name).await
    );
    info!("create_collection: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]
pub async fn get_server_version(
    state: State<'_, AppState>,
    base_config_id: i32,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(get_server_version_with_error(state, base_config_id).await);
    info!("get_server_version: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]
pub async fn delete_table_row(
    state: State<'_, AppState>,
    base_config_id: i32,
    table_name: String,
    row_id: String,
    id_column: String,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        delete_table_row_with_error(state, base_config_id, table_name, row_id, id_column, list_node_info_req).await
    );
    info!("delete_table_row: {:?}", time.elapsed());
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
    database_name: Option<String>,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(save_query_with_error(state, connection_id, query_name, sql, database_name).await);
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

pub async fn get_object_info(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    is_folder: bool,
) -> Result<String, ()> {
    let time = Instant::now();
    let res =
        handle_response!(get_object_info_with_error(state, list_node_info_req, is_folder).await);
    info!("get_object_info: {:?}", time.elapsed());
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
pub async fn create_bucket(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    bucket_name: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        create_bucket_with_error(state, list_node_info_req, bucket_name).await
    );
    info!("create_bucket:  {:?}", time.elapsed());
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
    database_name: Option<String>,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        rename_query_with_error(state, connection_id, old_query_name, new_query_name, database_name).await
    );
    info!("rename_query: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn remove_query(
    state: State<'_, AppState>,
    base_config_id: i32,
    query_name: String,
    database_name: Option<String>,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(remove_query_with_error(state, base_config_id, query_name, database_name).await);
    info!("remove_query: {:?}", time.elapsed());
    Ok(res)
}
#[tauri::command]

pub async fn get_query(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
    database_name: Option<String>,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(get_query_with_error(state, connection_id, query_name, database_name).await);
    info!("get_query: {:?}", time.elapsed());
    Ok(res)
}

// Kafka commands
#[tauri::command]
pub async fn kafka_create_topic(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
    num_partitions: i32,
    replication_factor: i32,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(kafka_create_topic_with_error(state, connection_id, topic, num_partitions, replication_factor).await);
    info!("kafka_create_topic: {:?}", time.elapsed());
    Ok(res)
}

#[tauri::command]
pub async fn kafka_delete_topic(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(kafka_delete_topic_with_error(state, connection_id, topic).await);
    info!("kafka_delete_topic: {:?}", time.elapsed());
    Ok(res)
}

#[tauri::command]
pub async fn kafka_produce_message(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
    key: Option<String>,
    value: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(kafka_produce_message_with_error(state, connection_id, topic, key, value).await);
    info!("kafka_produce_message: {:?}", time.elapsed());
    Ok(res)
}

// RocketMQ commands
#[tauri::command]
pub async fn rocketmq_send_message(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
    tag: Option<String>,
    value: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(
        rocketmq_send_message_with_error(state, connection_id, topic, tag, value).await
    );
    info!("rocketmq_send_message: {:?}", time.elapsed());
    Ok(res)
}

async fn kafka_create_topic_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
    num_partitions: i32,
    replication_factor: i32,
) -> Result<String, anyhow::Error> {
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(connection_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("Connection not found"))?;

    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config = crate::service::base_config_service::BaseConfig::deserialize(connection_json_str)?;

    if let crate::service::base_config_service::BaseConfigEnum::Kafka(kafka_config) = base_config.base_config_enum {
        let service = crate::service::kafka_service::KafkaService::new(kafka_config);
        service.create_topic(&topic, num_partitions, replication_factor).await?;
        Ok("Topic created successfully".to_string())
    } else {
        Err(anyhow::anyhow!("Connection is not a Kafka connection"))
    }
}

async fn kafka_delete_topic_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
) -> Result<String, anyhow::Error> {
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(connection_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("Connection not found"))?;

    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config = crate::service::base_config_service::BaseConfig::deserialize(connection_json_str)?;

    if let crate::service::base_config_service::BaseConfigEnum::Kafka(kafka_config) = base_config.base_config_enum {
        let service = crate::service::kafka_service::KafkaService::new(kafka_config);
        service.delete_topic(&topic).await?;
        Ok("Topic deleted successfully".to_string())
    } else {
        Err(anyhow::anyhow!("Connection is not a Kafka connection"))
    }
}

async fn kafka_produce_message_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
    key: Option<String>,
    value: String,
) -> Result<String, anyhow::Error> {
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(connection_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("Connection not found"))?;

    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config = crate::service::base_config_service::BaseConfig::deserialize(connection_json_str)?;

    if let crate::service::base_config_service::BaseConfigEnum::Kafka(kafka_config) = base_config.base_config_enum {
        let service = crate::service::kafka_service::KafkaService::new(kafka_config);
        service.produce_message(&topic, key, value).await?;
        Ok("Message sent successfully".to_string())
    } else {
        Err(anyhow::anyhow!("Connection is not a Kafka connection"))
    }
}

async fn rocketmq_send_message_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
    tag: Option<String>,
    value: String,
) -> Result<String, anyhow::Error> {
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(connection_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("Connection not found"))?;

    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config = crate::service::base_config_service::BaseConfig::deserialize(connection_json_str)?;

    if let crate::service::base_config_service::BaseConfigEnum::Rocketmq(rmq_config) = base_config.base_config_enum {
        let service = crate::service::rocketmq_service::RocketmqService::new(rmq_config);
        service.send_message(&topic, tag, value).await?;
        Ok("Message sent successfully".to_string())
    } else {
        Err(anyhow::anyhow!("Connection is not a RocketMQ connection"))
    }
}

// Redis commands
#[tauri::command]
pub async fn redis_execute_command(
    state: State<'_, AppState>,
    connection_id: i32,
    command: String,
) -> Result<String, ()> {
    let time = Instant::now();
    let res = handle_response!(redis_execute_command_with_error(state, connection_id, command).await);
    info!("redis_execute_command: {:?}", time.elapsed());
    Ok(res)
}

async fn redis_execute_command_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    command: String,
) -> Result<String, anyhow::Error> {
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(connection_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("Connection not found"))?;

    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config = crate::service::base_config_service::BaseConfig::deserialize(connection_json_str)?;

    if let crate::service::base_config_service::BaseConfigEnum::Redis(redis_config) = base_config.base_config_enum {
        // 解析命令：按空格分割，支持引号内的空格
        let parsed = parse_redis_command(&command);
        if parsed.is_empty() {
            return Err(anyhow::anyhow!("Empty command"));
        }

        let cmd = &parsed[0];
        let args = &parsed[1..];

        let response = redis_config.execute_raw_command(cmd, args)?;
        serde_json::to_string(&response).map_err(|e| anyhow::anyhow!("Failed to serialize response: {}", e))
    } else {
        Err(anyhow::anyhow!("Connection is not a Redis connection"))
    }
}

/// 解析 Redis 命令，支持引号内的空格
/// 例如：SET key "hello world" -> ["SET", "key", "hello world"]
fn parse_redis_command(command: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut escape_next = false;

    for ch in command.chars() {
        if escape_next {
            current.push(ch);
            escape_next = false;
            continue;
        }

        match ch {
            '\\' => {
                escape_next = true;
            }
            '"' => {
                in_quotes = !in_quotes;
            }
            ' ' | '\t' => {
                if in_quotes {
                    current.push(ch);
                } else if !current.is_empty() {
                    result.push(current.trim().to_string());
                    current = String::new();
                }
            }
            _ => {
                current.push(ch);
            }
        }
    }

    if !current.is_empty() {
        result.push(current.trim().to_string());
    }

    result
}
