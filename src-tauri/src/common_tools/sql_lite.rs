use crate::sql_lite::connection::AppState;
use crate::vojo::base_config::BaseConfig;
use sqlx::Row;
use tauri::State;

pub async fn save_base_config_with_error(
    state: State<'_, AppState>,
    base_config: BaseConfig,
) -> Result<(), anyhow::Error> {
    info!("save base config: {}", base_config.is_database());
    let database_type = base_config.base_config_kind.to_i32();
    let json_str = serde_json::to_string(&base_config)?;
    sqlx::query("insert into base_config (config_type,connection_json) values (?,?)")
        .bind(database_type)
        .bind(json_str)
        .execute(&state.pool)
        .await?;
    Ok(())
}
pub async fn get_base_config_with_error(
    state: State<'_, AppState>,
) -> Result<Vec<BaseConfig>, anyhow::Error> {
    let row_list = sqlx::query("select config_type,connection_json from base_config")
        .fetch_all(&state.pool)
        .await?;

    let mut base_configs = vec![];
    if !row_list.is_empty() {
        let json_strs = row_list
            .into_iter()
            .map(|item| item.try_get("connection_json"))
            .collect::<Result<Vec<String>, sqlx::Error>>()?;

        json_strs.into_iter().for_each(|item| {
            let base_config: BaseConfig = serde_json::from_str(&item).unwrap();
            base_configs.push(base_config);
        });
    }
    Ok(base_configs)
}
