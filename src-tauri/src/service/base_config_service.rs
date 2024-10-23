use crate::sql_lite::connection::AppState;
use crate::vojo::get_base_config_response::GetBaseConnectionResponse;
use crate::vojo::get_base_config_response::GetBaseConnectionResponseItem;
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
