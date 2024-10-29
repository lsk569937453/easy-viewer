use chrono::{DateTime, Local, NaiveDateTime};
use chrono::{NaiveDate, NaiveTime};
use serde_json::{json, Value};
use sqlx::mysql::MySqlRow;
use sqlx::types::BigDecimal;
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
        "BIT" => row
            .try_get::<Option<bool>, usize>(key)
            .map(|item| json!(item))?,

        "DOUBLE" => row
            .try_get::<Option<f64>, usize>(key)
            .map(|item| json!(item))?,
        "DECIMAL" => row
            .try_get::<Option<BigDecimal>, usize>(key)
            .map(|item| json!(item))?,
        "YEAR" | "INT" | "TINYINT" | "SMALLINT" | "MEDIUMINT" => row
            .try_get::<Option<i32>, usize>(key)
            .map(|item| json!(item))?,
        "BIGINT" => row
            .try_get::<Option<i64>, usize>(key)
            .map(|item| json!(item))?,

        "DATE" => row
            .try_get::<Option<NaiveDate>, usize>(key)
            .map(|item| json!(item.unwrap_or_default().format("%Y-%m-%d").to_string()))?,
        "TIMESTAMP" => row
            .try_get::<Option<DateTime<Local>>, usize>(key)
            .map(|item| json!(item.unwrap_or_default().format("%Y-%m-%d").to_string()))?,
        "TIME" => row
            .try_get::<Option<NaiveTime>, usize>(key)
            .map(|item| json!(format!("{:?}", item.unwrap_or_default())))?,
        "DATETIME" => row
            .try_get::<Option<NaiveDateTime>, usize>(key)
            .map(|item| {
                json!(item
                    .unwrap_or_default()
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string())
            })?,
        _ => row
            .try_get::<Option<String>, usize>(key)
            .map(|item| json!(item))?,
    };
    Ok(data)
}
