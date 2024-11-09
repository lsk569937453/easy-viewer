use tauri::State;

use crate::sql_lite::connection::AppState;
use sqlx::Row;
pub async fn save_query_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
    sql: Option<String>,
) -> Result<String, anyhow::Error> {
    info!(
        "save_query_with_error:{},{},{}",
        connection_id,
        query_name,
        sql.clone().unwrap_or_default()
    );

    sqlx::query(
        r#"INSERT OR REPLACE INTO sql_query (connection_id,query_name,query) values (?1,?2,?3)"#,
    )
    .bind(connection_id)
    .bind(query_name)
    .bind(sql)
    .execute(&state.pool)
    .await?;

    Ok("".to_string())
}

pub async fn get_query_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
) -> Result<String, anyhow::Error> {
    let row =
        sqlx::query(r#"select query from sql_query where connection_id=?1 and query_name=?2"#)
            .bind(connection_id)
            .bind(query_name)
            .fetch_optional(&state.pool)
            .await?
            .ok_or(anyhow!("Not found"))?;
    let sql: String = row.try_get(0)?;

    Ok(sql)
}
