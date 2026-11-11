use crate::util::sql_utils::postgres_row_to_json;
use sqlx::postgres::PgRow;
use sqlx::Column;
use sqlx::Row;
use sqlx::TypeInfo;

/// 把一行 Postgres 查询结果映射为 `Vec<Option<String>>`：
/// 字符串原样取出、NULL 记 `None`、其余类型 `to_string()`。
///
/// 该映射原在 `table_ops.rs`（show_columns）、`exe_sql.rs`（exe_sql）、
/// `dump.rs`（dump_database）各写了一遍，此处收敛为唯一实现。
pub(super) fn postgres_row_to_strings(item: &PgRow) -> Result<Vec<Option<String>>, anyhow::Error> {
    let columns = item.columns();
    let mut row = Vec::with_capacity(columns.len());
    for (i, column) in columns.iter().enumerate() {
        let type_name = column.type_info().name();
        let val = postgres_row_to_json(item, type_name, i)?;
        if val.is_string() {
            row.push(Some(val.as_str().unwrap_or_default().to_string()));
        } else if val.is_null() {
            row.push(None);
        } else {
            row.push(Some(val.to_string()));
        }
    }
    Ok(row)
}
