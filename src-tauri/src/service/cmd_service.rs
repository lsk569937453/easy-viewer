use crate::service::base_config_service::BaseConfig;
use crate::sql_lite::connection::AppState;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::get_base_config_response::GetBaseConnectionByIdResponse;
use crate::vojo::get_base_config_response::GetBaseConnectionResponse;
use crate::vojo::get_base_config_response::GetBaseConnectionResponseItem;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use crate::vojo::get_object_info_res::GetObjectInfoRes;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::init_dump_data_response::InitDumpDataResponse;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::save_connection_req::SaveConnectionRequest;
use crate::vojo::show_column_response::ShowColumnsResponse;
use crate::vojo::update_connection_req::UpdateConnectionRequest;
use sqlx::Row;
use tauri::State;
pub async fn save_base_config_with_error(
    state: State<'_, AppState>,
    save_connection_request: SaveConnectionRequest,
) -> Result<(), anyhow::Error> {
    let json_str = serde_json::to_string(&save_connection_request.base_config)?;
    info!("save base config: {}", json_str);

    sqlx::query("insert into base_config (connection_name,connection_json) values (?,?)")
        .bind(save_connection_request.connection_name)
        .bind(json_str)
        .execute(&state.pool)
        .await?;
    Ok(())
}

pub async fn update_base_config_with_error(
    state: State<'_, AppState>,
    update_connection_request: UpdateConnectionRequest,
) -> Result<(), anyhow::Error> {
    let json_str = serde_json::to_string(&update_connection_request.base_config)?;
    info!(
        "name:{},id:{},update base config: {}",
        update_connection_request.connection_name,
        update_connection_request.connection_id,
        json_str,
    );

    sqlx::query(
        "UPDATE base_config 
SET connection_name = ?, connection_json = ? 
WHERE id = ?",
    )
    .bind(update_connection_request.connection_name)
    .bind(json_str)
    .bind(update_connection_request.connection_id)
    .execute(&state.pool)
    .await?;
    Ok(())
}
pub async fn delete_base_config_with_error(
    state: State<'_, AppState>,
    base_config_id: i32,
) -> Result<(), anyhow::Error> {
    sqlx::query("DELETE FROM base_config WHERE id = ?")
        .bind(base_config_id)
        .execute(&state.pool)
        .await?;
    Ok(())
}

pub async fn download_file_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    destination: String,
    is_folder: bool,
) -> Result<(), anyhow::Error> {
    info!(" download_file_with_error: {:?}", list_node_info_req);
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .download_file(list_node_info_req, state.inner(), destination, is_folder)
        .await?;

    Ok(())
}
pub async fn download_bucket_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    destination: String,
) -> Result<(), anyhow::Error> {
    info!(" download_file_with_error: {:?}", list_node_info_req);
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .download_bucket(list_node_info_req, state.inner(), destination)
        .await?;

    Ok(())
}
pub async fn upload_file_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    destination: String,
) -> Result<(), anyhow::Error> {
    info!("Upload_file_with_error: {:?}", list_node_info_req);
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .upload_file(list_node_info_req, state.inner(), destination)
        .await?;

    Ok(())
}
pub async fn upload_folder_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    destination: String,
) -> Result<(), anyhow::Error> {
    info!("upload_folder_with_error: {:?}", list_node_info_req);
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .upload_folder(list_node_info_req, state.inner(), destination)
        .await?;

    Ok(())
}
pub async fn get_base_config_with_error(
    state: State<'_, AppState>,
) -> Result<GetBaseConnectionResponse, anyhow::Error> {
    let row_list = sqlx::query("select connection_name,id,connection_json from base_config")
        .fetch_all(&state.pool)
        .await?;

    let mut base_configs = vec![];
    if !row_list.is_empty() {
        for item in row_list.iter() {
            let id: u64 = match item.try_get("id") {
                Ok(val) => val,
                Err(_) => continue,
            };

            let connection_json_str: String = match item.try_get("connection_json") {
                Ok(val) => val,
                Err(_) => continue,
            };

            let base_config: BaseConfig = match serde_json::from_str(&connection_json_str) {
                Ok(val) => val,
                Err(_) => continue,
            };

            let description = match base_config.base_config_enum.get_description() {
                Ok(val) => val,
                Err(_) => continue,
            };

            let connection_type = base_config.base_config_enum.get_connection_type();

            let connection_name: String = match item.try_get("connection_name") {
                Ok(val) => val,
                Err(_) => continue,
            };

            base_configs.push(GetBaseConnectionResponseItem {
                base_config_id: id,
                connection_name,
                connection_type,
                description,
            });
        }
        // base_configs = row_list
        //     .into_iter()
        //     .map(
        //         |item| -> Result<GetBaseConnectionResponseItem, anyhow::Error> {
        //             let id: i32 = item.try_get("id")?;
        //             let connection_json_str: String = item.try_get("connection_json")?;
        //             let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
        //             let connection_type = base_config.base_config_enum.get_connection_type();
        //             let description = base_config.base_config_enum.get_description()?;
        //             Ok(GetBaseConnectionResponseItem {
        //                 base_config_id: id,
        //                 connection_name: item.try_get("connection_name")?,
        //                 connection_type,
        //                 description,
        //             })
        //         },
        //     )
        //     .collect::<Result<Vec<GetBaseConnectionResponseItem>, anyhow::Error>>()?;
    }
    Ok(GetBaseConnectionResponse {
        base_config_list: base_configs,
    })
}
pub async fn get_base_config_by_id_with_error(
    state: State<'_, AppState>,
    base_config_id: i32,
) -> Result<GetBaseConnectionByIdResponse, anyhow::Error> {
    let row =
        sqlx::query("select connection_name,id,connection_json from base_config where id = ?")
            .bind(base_config_id)
            .fetch_optional(&state.pool)
            .await?
            .ok_or(anyhow!("not found"))?;

    let id: u64 = row.try_get("id")?;
    let connection_json_str: String = row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let connection_type = base_config.base_config_enum.get_connection_type();
    let description = base_config.base_config_enum.get_description()?;
    Ok(GetBaseConnectionByIdResponse {
        base_config_id: id,
        connection_name: row.try_get("connection_name")?,
        connection_json: connection_json_str,
        connection_type,
        description,
    })
}
pub async fn list_node_info_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<ListNodeInfoResponse, anyhow::Error> {
    info!(
        "list_node_info list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i64>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let list = base_config
        .base_config_enum
        .list_node_info(list_node_info_req, state.inner())
        .await?;

    Ok(list)
}
pub async fn get_column_info_for_insert_sql_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<GetColumnInfoForInsertSqlResponse, anyhow::Error> {
    info!(
        " get_column_info_for_insert_sql list_node_info_req: {:?}",
        list_node_info_req
    );

    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let list = base_config
        .base_config_enum
        .get_column_info_for_is(list_node_info_req, state.inner())
        .await?;

    Ok(list)
}
pub async fn remove_column_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    column_name: String,
) -> Result<(), anyhow::Error> {
    info!("remove_column list_node_info_req: {:?}", list_node_info_req);

    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .remove_column(list_node_info_req, state.inner(), column_name)
        .await?;

    Ok(())
}
pub async fn update_comment_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    new_comment: String,
) -> Result<(), anyhow::Error> {
    info!("remove_column list_node_info_req: {:?}", list_node_info_req);

    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .update_comment(list_node_info_req, state.inner(), new_comment)
        .await?;

    Ok(())
}
pub async fn exe_sql_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    sql: String,
) -> Result<ExeSqlResponse, anyhow::Error> {
    info!("exe_sql list_node_info_req: {:?}", list_node_info_req);
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let list = base_config
        .base_config_enum
        .exe_sql(list_node_info_req, state.inner(), sql)
        .await?;

    Ok(list)
}
pub async fn dump_database_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    dump_database_req: DumpDatabaseReq,
) -> Result<String, anyhow::Error> {
    info!(
        " dump_database_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .dump_database(list_node_info_req, state.inner(), dump_database_req)
        .await?;
    Ok("list".to_string())
}
pub async fn import_database_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    import_database_req: ImportDatabaseReq,
) -> Result<String, anyhow::Error> {
    info!(
        " dump_database_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .import_database(list_node_info_req, state.inner(), import_database_req)
        .await?;
    Ok("list".to_string())
}
pub async fn generate_database_document_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    file_dir: String,
) -> Result<String, anyhow::Error> {
    info!(
        " generate_database_document_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .generate_database_document(list_node_info_req, state.inner(), file_dir)
        .await?;
    Ok("list".to_string())
}
pub async fn drop_table_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, anyhow::Error> {
    info!(
        " drop_table_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .drop_table(list_node_info_req, state.inner())
        .await?;
    Ok("list".to_string())
}
pub async fn drop_column_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, anyhow::Error> {
    info!(
        " drop_column_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .drop_column(list_node_info_req, state.inner())
        .await?;
    Ok("list".to_string())
}
pub async fn drop_index_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, anyhow::Error> {
    info!(
        " drop_index_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .drop_index(list_node_info_req, state.inner())
        .await?;
    Ok("list".to_string())
}
pub async fn truncate_table_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, anyhow::Error> {
    info!(
        " truncate_table_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .truncate_table(list_node_info_req, state.inner())
        .await?;
    Ok("list".to_string())
}
pub async fn init_dump_data_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<InitDumpDataResponse, anyhow::Error> {
    info!(
        " init_dump_data_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let res = base_config
        .base_config_enum
        .init_dump_data(list_node_info_req, state.inner())
        .await?;
    Ok(res)
}
pub async fn move_column_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    move_direction: i32,
) -> Result<String, anyhow::Error> {
    info!(
        " move_column_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let list = base_config
        .base_config_enum
        .move_column(state.inner(), list_node_info_req, move_direction)
        .await?;
    Ok(list)
}
pub async fn create_folder_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    folder_name: String,
) -> Result<(), anyhow::Error> {
    info!(
        " create_folder list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .create_folder(state.inner(), list_node_info_req, folder_name)
        .await?;
    Ok(())
}
pub async fn get_object_info_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    is_folder: bool,
) -> Result<GetObjectInfoRes, anyhow::Error> {
    info!(
        " create_folder list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let res = base_config
        .base_config_enum
        .get_object_info(state.inner(), list_node_info_req, is_folder)
        .await?;
    Ok(res)
}
pub async fn delete_bucket_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<(), anyhow::Error> {
    info!(
        " delete_bucket_with_error list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .delete_bucket(state.inner(), list_node_info_req)
        .await?;
    Ok(())
}

pub async fn get_complete_words_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<Vec<String>, anyhow::Error> {
    info!(
        "get_complete_words list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let list = base_config
        .base_config_enum
        .get_complete_words(list_node_info_req, state.inner())
        .await?;

    Ok(list)
}
pub async fn get_procedure_details_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, anyhow::Error> {
    info!(
        "get_complete_words list_node_info_req: {:?}",
        list_node_info_req
    );
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let list = base_config
        .base_config_enum
        .get_procedure_details(list_node_info_req, state.inner())
        .await?;

    Ok(list)
}
pub async fn update_record_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
    sql: Vec<String>,
) -> Result<(), anyhow::Error> {
    info!("update_record list_node_info_req: {:?}", list_node_info_req);
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    base_config
        .base_config_enum
        .update_record(list_node_info_req, state.inner(), sql)
        .await?;

    Ok(())
}
pub async fn show_columns_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<ShowColumnsResponse, anyhow::Error> {
    info!("show_columns list_node_info_req: {:?}", list_node_info_req);
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let list = base_config
        .base_config_enum
        .show_columns(list_node_info_req, state.inner())
        .await?;

    Ok(list)
}
pub async fn get_ddl_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<String, anyhow::Error> {
    info!("get_ddl list_node_info_req: {:?}", list_node_info_req);
    let value = list_node_info_req.level_infos[0]
        .config_value
        .parse::<i32>()?;
    let sqlite_row = sqlx::query("select connection_json from base_config where id = ?")
        .bind(value)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(anyhow!("not found"))?;
    let connection_json_str: String = sqlite_row.try_get("connection_json")?;
    let base_config: BaseConfig = serde_json::from_str(&connection_json_str)?;
    let list = base_config
        .base_config_enum
        .get_ddl(list_node_info_req, state.inner())
        .await?;

    Ok(list)
}
