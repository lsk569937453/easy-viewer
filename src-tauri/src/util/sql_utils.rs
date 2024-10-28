use serde_json::{json, Value};
use sqlx::mysql::MySqlRow;
use sqlx::Row;

pub fn mysql_row_to_json(
    row: &MySqlRow,
    type_name: &str,
    key: usize,
) -> Result<Value, anyhow::Error> {
    let data = match type_name {
        "FLOAT" => row
            .try_get::<Option<f32>, usize>(key)
            .map(|item| json!(item))?,
        "DOUBLE" => row
            .try_get::<Option<f64>, usize>(key)
            .map(|item| json!(item))?,
        "INT" | "TINYINT" | "SMALLINT" | "MEDIUMINT" => row
            .try_get::<Option<i32>, usize>(key)
            .map(|item| json!(item))?,
        "DATE" | "DATETIME | TIMESTAMP" => row
            .try_get::<Option<f64>, usize>(key)
            .map(|item| json!(item))?,
        _ => row
            .try_get::<Option<String>, usize>(key)
            .map(|item| json!(item))?,
    };
    Ok(data)
}
