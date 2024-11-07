use tauri::State;

use crate::sql_lite::connection::AppState;

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
