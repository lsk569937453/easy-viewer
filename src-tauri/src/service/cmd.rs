//! Tauri 命令层（两层结构的**上层**）。
//!
//! 职责边界：
//! - 只做 IPC 适配：反序列化入参 → 调驱动 → 把结果/错误编码成前端约定的 JSON 字符串；
//! - **不写业务逻辑**。重构前这里往下还有一层 `cmd_service.rs`（1004 行纯转发）
//!   和一层 `BaseConfigEnum` 的 161 个 `match` 臂，现在两者都已删除，
//!   命令直接调用 `Driver` trait。
//!
//! 错误约定：成功 `{"response_code":0,"response_msg":T}`；失败
//! `{"response_code":1,"response_msg":"<中文提示>","error":{code,message,detail,retryable}}`。
//! `response_code` 语义保持不变（前端已按 0/1 判定），`error` 为**新增**字段。

use std::sync::Arc;
use std::time::Instant;

use tauri::Emitter;
use tauri::State;

use crate::common_tools::base_response::BaseResponse;
use crate::error::{AppError, AppResult};
use crate::service::base_config_service::BaseConfig;
use crate::service::query_service;
use crate::sql_lite::connection::AppState;
use crate::store;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::save_connection_req::SaveConnectionRequest;
use crate::vojo::update_connection_req::UpdateConnectionRequest;

/// 成功信封。
fn encode_success<T: serde::Serialize>(payload: T) -> String {
    match serde_json::to_string(&BaseResponse {
        response_code: 0,
        response_msg: payload,
    }) {
        Ok(text) => text,
        Err(err) => {
            error!("serialize response failed: {err}");
            r#"{"response_code":1,"response_msg":"响应序列化失败"}"#.to_string()
        }
    }
}

/// 失败信封：保留旧的 `response_code/response_msg`，追加结构化 `error`。
fn encode_failure(err: &AppError) -> String {
    let payload = serde_json::json!({
        "response_code": 1,
        "response_msg": err.message(),
        "error": err,
    });
    match serde_json::to_string(&payload) {
        Ok(text) => text,
        Err(serialize_err) => {
            error!("serialize error response failed: {serialize_err}");
            r#"{"response_code":1,"response_msg":"内部错误"}"#.to_string()
        }
    }
}

/// 命令层统一的「结果 → JSON 字符串」出口。
///
/// 返回 `Result<String, ()>` 而不是裸 `String`：带引用的入参（`State`）在 Tauri
/// 里要求异步命令返回 `Result`。业务失败已经编码进 `response_code`，
/// 因此 `Err` 分支实际不会被用到，保留它是为了满足 IPC 约束。
macro_rules! reply {
    ($result:expr) => {
        match $result {
            Ok(value) => Ok(encode_success(value)),
            Err(err) => {
                // 驱动层统一返回 `AppError`，但查询管理等老模块仍返回 `anyhow::Error`，
                // 这里就地收敛，避免每个调用点各写一次 `map_err`。
                let err: AppError = err.into();
                warn!("[{}] {}", err.code(), err);
                Ok(encode_failure(&err))
            }
        }
    };
}

/// 计时日志：只在命令层记一次，驱动内部的 `info!` 不再逐个打点。
macro_rules! timed {
    ($name:literal, $body:expr) => {{
        let started = Instant::now();
        let result = $body;
        info!("{}: {:?}", $name, started.elapsed());
        result
    }};
}

/// 无返回值的操作统一回 `"ok"`，兼容前端既有的字符串载荷约定。
const OK_PAYLOAD: &str = "ok";

// ---------------------------------------------------------------- 连接管理

#[tauri::command]
pub async fn test_url(test_database_request: BaseConfig) -> Result<String, ()> {
    reply!(timed!(
        "test_url",
        crate::common_tools::database::test_connection(&test_database_request).await
    ))
}

#[tauri::command]
pub fn get_about_version() -> Result<String, ()> {
    reply!(crate::common_tools::about::get_about_version_with_error().map_err(AppError::from))
}

#[tauri::command]
pub async fn save_base_config(
    state: State<'_, AppState>,
    save_connection_request: SaveConnectionRequest,
) -> Result<String, ()> {
    reply!(store::save(state.inner(), save_connection_request).await)
}

#[tauri::command]
pub async fn update_base_config(
    state: State<'_, AppState>,
    save_connection_request: UpdateConnectionRequest,
) -> Result<String, ()> {
    reply!(store::update(state.inner(), save_connection_request).await)
}

#[tauri::command]
pub async fn delete_base_config(
    state: State<'_, AppState>,
    base_config_id: i32,
) -> Result<String, ()> {
    reply!(store::delete(state.inner(), base_config_id).await)
}

#[tauri::command]
pub async fn get_base_config(state: State<'_, AppState>) -> Result<String, ()> {
    reply!(store::list(state.inner()).await)
}

#[tauri::command]
pub async fn get_base_config_by_id(
    state: State<'_, AppState>,
    base_config_id: i32,
) -> Result<String, ()> {
    reply!(store::get_by_id(state.inner(), base_config_id).await)
}

// ---------------------------------------------------------------- 左侧树

#[tauri::command]
pub async fn list_node_info(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.list_node_info(list_node_info_req, app).await
        }
        .await
    )
}

#[tauri::command]
pub async fn get_server_version(
    state: State<'_, AppState>,
    base_config_id: i32,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_by_id(app, i64::from(base_config_id)).await?;
            // 版本探测只用于连接节点上的角标，超过 1s 视为不可用。
            tokio::time::timeout(std::time::Duration::from_secs(1), driver.server_version())
                .await
                .map_err(|_| {
                    AppError::new(crate::error::ErrorCode::ConnectionTimeout, "连接超时（1s）")
                })?
        }
        .await
    )
}

#[tauri::command]
pub async fn create_collection(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    collection_name: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .create_collection(list_node_info_req, app, collection_name)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn create_folder(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    folder_name: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .create_folder(list_node_info_req, app, folder_name)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn create_bucket(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    bucket_name: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.create_bucket(bucket_name).await.map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn delete_bucket(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .delete_bucket(list_node_info_req, app)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn rename_object(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    new_name: String,
    is_folder: bool,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .rename_object(list_node_info_req, app, new_name, is_folder)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn copy_object(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    target_dir: String,
    is_folder: bool,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .copy_object(list_node_info_req, app, target_dir, is_folder)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

// ---------------------------------------------------------------- 对象传输

#[tauri::command]
pub async fn download_file(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    destination: String,
    is_folder: bool,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "download_file",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .download_file(list_node_info_req, app, destination, is_folder)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    ))
}

#[tauri::command]
pub async fn download_bucket(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    destination: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "download_bucket",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .download_bucket(list_node_info_req, app, destination)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    ))
}

#[tauri::command]
pub async fn upload_file(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    local_file_path: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "upload_file",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .upload_file(list_node_info_req, app, local_file_path)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    ))
}

#[tauri::command]
pub async fn upload_folder(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    local_file_path: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "upload_folder",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .upload_folder(list_node_info_req, app, local_file_path)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    ))
}

#[tauri::command]
pub async fn upload_file_with_progress(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    list_node_info_req: ListNodeInfoReq,
    local_file_path: String,
) -> Result<String, String> {
    let app = state.inner();
    let emitter = app_handle.clone();
    let progress: crate::driver::ProgressFn = Arc::new(move |uploaded, total| {
        let _ = emitter.emit(
            "s3-upload-progress",
            serde_json::json!({ "uploaded": uploaded, "total": total }),
        );
    });

    let result = async {
        let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
        driver
            .upload_file_multipart(list_node_info_req, local_file_path, progress)
            .await?;
        Ok::<_, AppError>(encode_success(OK_PAYLOAD))
    }
    .await;

    match result {
        Ok(payload) => Ok(payload),
        Err(err) => {
            // 该命令历史上就靠 Err 让前端感知失败（进度上传不走 parseBaseResponse）。
            warn!("{}", err);
            Err(err.message().to_string())
        }
    }
}

#[tauri::command]
pub async fn list_local_folder_files(local_directory: String) -> String {
    let mut files: Vec<String> = Vec::new();
    for entry in walkdir::WalkDir::new(&local_directory)
        .into_iter()
        .flatten()
    {
        if entry.file_type().is_dir() {
            continue;
        }
        if let Some(path) = entry.path().to_str() {
            files.push(path.to_string());
        }
    }
    serde_json::to_string(&files).unwrap_or_else(|err| {
        error!("serialize local folder files failed: {err}");
        "[]".to_string()
    })
}

#[tauri::command]
pub async fn get_object_info(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    is_folder: bool,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .get_object_info(list_node_info_req, app, is_folder)
                .await
        }
        .await
    )
}

// ---------------------------------------------------------------- SQL 与表操作

#[tauri::command]
pub async fn exe_sql(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    sql: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "exe_sql",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.execute_sql(list_node_info_req, app, sql).await
        }
        .await
    ))
}

#[tauri::command]
pub async fn show_columns(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "show_columns",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.show_columns(list_node_info_req, app).await
        }
        .await
    ))
}

#[tauri::command]
pub async fn get_ddl(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.get_ddl(list_node_info_req, app).await
        }
        .await
    )
}

#[tauri::command]
pub async fn update_record(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    sqls: Vec<String>,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "update_record",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .update_record(list_node_info_req, app, sqls)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    ))
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
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_by_id(app, i64::from(base_config_id)).await?;
            driver
                .delete_table_row(list_node_info_req, app, table_name, row_id, id_column)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn get_column_info_for_insert_sql(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.column_info_for_insert(list_node_info_req, app).await
        }
        .await
    )
}

#[tauri::command]
pub async fn get_complete_words(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.complete_words(list_node_info_req, app).await
        }
        .await
    )
}

#[tauri::command]
pub async fn get_procedure_details(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.procedure_details(list_node_info_req, app).await
        }
        .await
    )
}

#[tauri::command]
pub async fn update_comment(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    new_comment: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .update_comment(list_node_info_req, app, new_comment)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn remove_column(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    column_name: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .remove_column(list_node_info_req, app, column_name)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn move_column(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    move_direction: i32,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .move_column(list_node_info_req, app, move_direction)
                .await
        }
        .await
    )
}

#[tauri::command]
pub async fn drop_table(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    simple_unit_op(state.inner(), list_node_info_req, |driver, req, app| {
        Box::pin(async move { driver.drop_table(req, app).await })
    })
    .await
}

#[tauri::command]
pub async fn drop_column(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    simple_unit_op(state.inner(), list_node_info_req, |driver, req, app| {
        Box::pin(async move { driver.drop_column(req, app).await })
    })
    .await
}

#[tauri::command]
pub async fn drop_index(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    simple_unit_op(state.inner(), list_node_info_req, |driver, req, app| {
        Box::pin(async move { driver.drop_index(req, app).await })
    })
    .await
}

#[tauri::command]
pub async fn truncate_table(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    simple_unit_op(state.inner(), list_node_info_req, |driver, req, app| {
        Box::pin(async move { driver.truncate_table(req, app).await })
    })
    .await
}

/// 「加载驱动 → 调一个无返回值操作 → 回 `ok`」的共用实现。
///
/// 4 个 drop/truncate 命令此前各自复制了 30 行样板，现在共用这一处。
async fn simple_unit_op<'a, F>(
    app: &'a AppState,
    req: ListNodeInfoReq,
    operation: F,
) -> Result<String, ()>
where
    F: FnOnce(
        Box<dyn crate::driver::Driver>,
        ListNodeInfoReq,
        &'a AppState,
    )
        -> std::pin::Pin<Box<dyn std::future::Future<Output = AppResult<()>> + Send + 'a>>,
{
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &req).await?;
            operation(driver, req, app).await?;
            Ok::<_, AppError>(OK_PAYLOAD)
        }
        .await
    )
}

// ---------------------------------------------------------------- 导入导出

#[tauri::command]
pub async fn dump_database(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    dump_database_req: DumpDatabaseReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "dump_database",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .dump_database(list_node_info_req, app, dump_database_req)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    ))
}

#[tauri::command]
pub async fn import_database(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    import_database_req: ImportDatabaseReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "import_database",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .import_database(list_node_info_req, app, import_database_req)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    ))
}

#[tauri::command]
pub async fn init_dump_data(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.init_dump_data(list_node_info_req, app).await
        }
        .await
    )
}

#[tauri::command]
pub async fn generate_database_document(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    file_dir: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "generate_database_document",
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .generate_document(list_node_info_req, app, file_dir)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    ))
}

// ---------------------------------------------------------------- 查询管理

#[tauri::command]
pub async fn save_query(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
    sql: Option<String>,
    database_name: Option<String>,
) -> Result<String, ()> {
    reply!(
        query_service::save_query_with_error(state, connection_id, query_name, sql, database_name)
            .await
    )
}

#[tauri::command]
pub async fn get_query(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
    database_name: Option<String>,
) -> Result<String, ()> {
    reply!(
        query_service::get_query_with_error(state, connection_id, query_name, database_name).await
    )
}

#[tauri::command]
pub async fn rename_query(
    state: State<'_, AppState>,
    connection_id: i32,
    old_query_name: String,
    new_query_name: String,
    database_name: Option<String>,
) -> Result<String, ()> {
    reply!(
        query_service::rename_query_with_error(
            state,
            connection_id,
            old_query_name,
            new_query_name,
            database_name
        )
        .await
    )
}

#[tauri::command]
pub async fn remove_query(
    state: State<'_, AppState>,
    base_config_id: i32,
    query_name: String,
    database_name: Option<String>,
) -> Result<String, ()> {
    reply!(
        query_service::remove_query_with_error(state, base_config_id, query_name, database_name)
            .await
    )
}

// ---------------------------------------------------------------- Redis / 消息 / 搜索

#[tauri::command]
pub async fn redis_execute_command(
    state: State<'_, AppState>,
    connection_id: i32,
    command: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(timed!(
        "redis_execute_command",
        async {
            let driver = store::load_driver_by_id(app, i64::from(connection_id)).await?;
            driver.redis_execute(command).await
        }
        .await
    ))
}

#[tauri::command]
pub async fn kafka_create_topic(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
    num_partitions: i32,
    replication_factor: i32,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_by_id(app, i64::from(connection_id)).await?;
            driver
                .kafka_create_topic(topic, num_partitions, replication_factor)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn kafka_delete_topic(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_by_id(app, i64::from(connection_id)).await?;
            driver.kafka_delete_topic(topic).await.map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn kafka_produce_message(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
    key: Option<String>,
    value: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_by_id(app, i64::from(connection_id)).await?;
            driver
                .kafka_produce_message(topic, key, value)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn rocketmq_send_message(
    state: State<'_, AppState>,
    connection_id: i32,
    topic: String,
    tag: Option<String>,
    value: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_by_id(app, i64::from(connection_id)).await?;
            driver
                .rocketmq_send_message(topic, tag, value)
                .await
                .map(|()| OK_PAYLOAD)
        }
        .await
    )
}

#[tauri::command]
pub async fn elasticsearch_search(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    index_name: String,
    query: Option<String>,
    search_query: Option<String>,
    from: i64,
    size: i64,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver
                .search_documents(index_name, query, search_query, from, size)
                .await
        }
        .await
    )
}

#[tauri::command]
pub async fn elasticsearch_index_detail(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    index_name: String,
) -> Result<String, ()> {
    let app = state.inner();
    reply!(
        async {
            let driver = store::load_driver_for_request(app, &list_node_info_req).await?;
            driver.index_detail(index_name).await
        }
        .await
    )
}

// ---------------------------------------------------------------- 元数据

/// 数据源清单（由 `plugins/connection-types/*.yaml` 生成）。
///
/// 前端据此渲染类型下拉、图标、默认端口与能力位，不再各自维护一份 13 项硬编码列表；
/// 新增数据源只需改 YAML，两端自动同步。
#[tauri::command]
pub fn get_database_types() -> Result<String, ()> {
    let payload: Vec<serde_json::Value> = crate::generated::DatabaseType::ALL
        .iter()
        .map(|db_type| {
            serde_json::json!({
                "dbType": db_type.as_str(),
                "label": db_type.label(),
                "connectionType": db_type.connection_type(),
                "category": db_type.category(),
                "icon": db_type.icon(),
                "defaultPort": db_type.default_port(),
                "capabilities": db_type.capabilities().names(),
            })
        })
        .collect();
    reply!(Ok::<_, AppError>(payload))
}

/// 按方言生成 DDL 预览（建表 / 加列 / 建索引）。
///
/// 这些模板此前在前端 `src/utils/SqlUtils.ts` 里用 `if (connectionType === 0)…`
/// 又写了一遍；现在由后端 SQL 方言表统一提供，前端只负责渲染。
/// 输出与历史 TS 实现逐字一致，非 SQL 数据源保留原来的 warning 兜底文案。
#[tauri::command]
pub fn get_ddl_template(database_type: String, table_name: String) -> Result<String, ()> {
    let payload = match crate::generated::DatabaseType::from_db_type(&database_type) {
        Some(db_type) => {
            let connection_type = db_type.connection_type();
            let template = match crate::sql::dialect::SqlDialect::from_db_type(db_type) {
                Some(dialect) => serde_json::json!({
                    "createTable": dialect.create_table_template(&table_name),
                    "addColumn": dialect.add_column_template(&table_name),
                    "createIndex": dialect.create_index_template(&table_name),
                }),
                None => serde_json::json!({
                    "createTable": crate::sql::dialect::SqlDialect::unknown_create_table_template(
                        connection_type,
                        &table_name,
                    ),
                    "addColumn": crate::sql::dialect::SqlDialect::unknown_add_column_template(
                        connection_type,
                        &table_name,
                    ),
                    "createIndex": crate::sql::dialect::SqlDialect::unknown_create_index_template(
                        connection_type,
                        &table_name,
                    ),
                }),
            };
            Ok(template)
        }
        None => Err(AppError::new(
            crate::error::ErrorCode::InvalidArgument,
            format!("未知数据源类型：{database_type}"),
        )),
    };
    reply!(payload)
}
