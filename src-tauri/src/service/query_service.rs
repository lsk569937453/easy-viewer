use tauri::State;

use crate::sql_lite::connection::AppState;

pub async fn save_query_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
    sql: Option<String>,
) -> Result<String, anyhow::Error> {
    info!(
        "{},{},{}",
        connection_id,
        query_name,
        sql.clone().unwrap_or_default()
    );
    // let new_sql = if sql.trim().is_empty() {
    //     format!(
    //         "INSERT OR REPLACE sql_query (connection_id,query_name) values ({},{})",
    //         connection_id, query_name
    //     )
    // } else {
    //     format!(
    //         "INSERT OR REPLACE sql_query (connection_id,query_name,sql) values ({},{},{})",
    //         connection_id, query_name, sql
    //     )
    // };
    // info!("sql: {}", new_sql);
    // sqlx::query(&new_sql).execute(&state.pool).await?;
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
