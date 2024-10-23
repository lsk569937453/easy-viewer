use crate::sql_lite::connection::AppState;
use crate::vojo::base_config::BaseConfig;
use crate::vojo::get_base_config_response::GetBaseConnectionResponse;
use crate::vojo::get_base_config_response::GetBaseConnectionResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::save_connection_req::SaveConnectionRequest;
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
pub async fn get_base_config_with_error(
    state: State<'_, AppState>,
) -> Result<GetBaseConnectionResponse, anyhow::Error> {
    let row_list = sqlx::query("select connection_name,id from base_config")
        .fetch_all(&state.pool)
        .await?;

    let mut base_configs = vec![];
    if !row_list.is_empty() {
        base_configs = row_list
            .into_iter()
            .map(
                |item| -> Result<GetBaseConnectionResponseItem, anyhow::Error> {
                    let id: i32 = item.try_get("id")?;
                    Ok(GetBaseConnectionResponseItem {
                        base_config_id: id,
                        connection_name: item.try_get("connection_name")?,
                    })
                },
            )
            .collect::<Result<Vec<GetBaseConnectionResponseItem>, anyhow::Error>>()?;
    }
    Ok(GetBaseConnectionResponse {
        base_config_list: base_configs,
    })
}
pub async fn list_node_info_with_error(
    state: State<'_, AppState>,
    list_node_info_req: ListNodeInfoReq,
) -> Result<Vec<String>, anyhow::Error> {
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
        .list_node_info(list_node_info_req, state.inner())
        .await?;

    Ok(list)
}
