use sqlx::MySqlConnection;

use crate::util::sql_utils::mysql_row_to_json;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use sqlx::Column;
use sqlx::Row;
use sqlx::TypeInfo;
pub async fn show_column_info(
    conn: &mut MySqlConnection,
    table_name: String,
) -> Result<ShowColumnsResponse, anyhow::Error> {
    let sql = format!("show columns from {}", table_name);
    info!("sql: {}", sql);
    let rows = sqlx::query(&sql).fetch_all(conn).await?;
    if rows.is_empty() {
        return Ok(ShowColumnsResponse::new());
    }
    let first_item = rows.first().ok_or(anyhow!(""))?;
    let mut headers = vec![];
    for (index, item) in first_item.columns().iter().enumerate() {
        let type_name = item.type_info().name();
        let column_name = item.name();
        if index == 2 {
            headers.push(ShowColumnHeader {
                name: "Comment".to_string(),
                type_name: "VARCHAR".to_string().to_uppercase(),
            });
        } else {
            headers.push(ShowColumnHeader {
                name: column_name.to_string(),
                type_name: type_name.to_string().to_uppercase(),
            });
        }
    }
    let mut response_rows = vec![];
    for item in rows.iter() {
        let columns = item.columns();
        let len = columns.len();
        let mut row = vec![];
        for i in 0..len {
            let type_name = columns[i].type_info().name();
            let val = mysql_row_to_json(item, type_name, i)?;
            if val.is_string() {
                row.push(Some(val.as_str().unwrap_or_default().to_string()));
            } else if val.is_null() {
                row.push(None);
            } else {
                row.push(Some(val.to_string()));
            }
        }
        response_rows.push(row);
    }
    let exe_sql_response = ShowColumnsResponse::from(headers, response_rows);
    Ok(exe_sql_response)
}
