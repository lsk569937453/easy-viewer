use tauri::State;

use crate::sql_lite::connection::AppState;
use sqlx::Row;
pub async fn save_query_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
    sql: Option<String>,
    database_name: Option<String>,
) -> Result<String, anyhow::Error> {
    let db_name = database_name.unwrap_or_default();
    info!(
        "save_query_with_error:{},{},{},{}",
        connection_id,
        query_name,
        sql.clone().unwrap_or_default(),
        db_name
    );

    sqlx::query(
        r#"INSERT OR REPLACE INTO sql_query (connection_id,database_name,query_name,query) values (?1,?2,?3,?4)"#,
    )
    .bind(connection_id)
    .bind(&db_name)
    .bind(&query_name)
    .bind(sql)
    .execute(&state.pool)
    .await?;

    // Return the id of the inserted row
    let row = sqlx::query("SELECT id FROM sql_query WHERE connection_id=?1 AND database_name=?2 AND query_name=?3")
        .bind(connection_id)
        .bind(&db_name)
        .bind(&query_name)
        .fetch_one(&state.pool)
        .await?;
    let id: i32 = row.try_get(0)?;
    Ok(id.to_string())
}

pub async fn get_query_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
    database_name: Option<String>,
) -> Result<String, anyhow::Error> {
    let db_name = database_name.unwrap_or_default();
    let row =
        sqlx::query(r#"select query from sql_query where connection_id=?1 and database_name=?2 and query_name=?3"#)
            .bind(connection_id)
            .bind(&db_name)
            .bind(query_name)
            .fetch_optional(&state.pool)
            .await?
            .ok_or(anyhow!("Not found"))?;
    let sql: String = row.try_get(0)?;

    Ok(sql)
}
pub async fn rename_query_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    old_query_name: String,
    new_query_name: String,
    database_name: Option<String>,
) -> Result<(), anyhow::Error> {
    let db_name = database_name.unwrap_or_default();
    info!("{}|{}|{}|{}", connection_id, old_query_name, new_query_name, db_name);
    sqlx::query(
        r#"
            UPDATE sql_query
            SET query_name = ?1
            WHERE connection_id=?2 and database_name=?3 and query_name = ?4     "#,
    )
    .bind(new_query_name)
    .bind(connection_id)
    .bind(&db_name)
    .bind(old_query_name)
    .execute(&state.pool)
    .await?;

    Ok(())
}
pub async fn remove_query_with_error(
    state: State<'_, AppState>,
    connection_id: i32,
    query_name: String,
    database_name: Option<String>,
) -> Result<String, anyhow::Error> {
    let db_name = database_name.unwrap_or_default();
    info!("remove_query_with_error:{},{},{}", connection_id, query_name, db_name);

    sqlx::query(r#"DELETE FROM sql_query WHERE connection_id = ?1 AND database_name = ?2 AND query_name = ?3"#)
        .bind(connection_id)
        .bind(&db_name)
        .bind(query_name)
        .execute(&state.pool)
        .await?;

    Ok("".to_string())
}
