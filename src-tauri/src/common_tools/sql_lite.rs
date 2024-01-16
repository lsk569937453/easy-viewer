use crate::sql_lite::connection::SqlitePoolWrapper;
use crate::vojo::base_config::BaseConfig;
use crate::vojo::menu_config::MenuConfig;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Row;
use tauri::State;

pub async fn reset_menu_index_with_error(
    state: State<'_, SqlitePoolWrapper>,
) -> Result<(), anyhow::Error> {
    let mut statement = sqlx::query("update menu_config set menu_index=source_index")
        .execute(&state.pool)
        .await?;
    Ok(())
}
pub async fn save_base_config_with_error(
    state: State<'_, SqlitePoolWrapper>,
    base_config: BaseConfig,
) -> Result<(), anyhow::Error> {
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
    state: State<'_, SqlitePoolWrapper>,
) -> Result<BaseConfig, anyhow::Error> {
    let statement = sqlx::query("select config_type,connection_json from base_config")
        .fetch_all(&state.pool)
        .await?;

    let mut base_config = BaseConfig::default();
    if !statement.is_empty() {
        let json_str: String = statement
            .first()
            .ok_or(anyhow!("get base config error"))?
            .try_get("connection_json")?;
        base_config = serde_json::from_str(&json_str)?;
    }
    Ok(base_config)
}
