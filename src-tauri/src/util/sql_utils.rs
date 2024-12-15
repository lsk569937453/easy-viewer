use anyhow::Ok;
use chrono::{DateTime, Local, NaiveDateTime};
use chrono::{NaiveDate, NaiveTime};
use sqlx::types::ipnetwork::IpNetwork;
use sqlx::types::mac_address::MacAddress;

use serde_json::{json, Value};
use sqlx::mysql::MySqlRow;
use sqlx::postgres::types::{PgInterval, PgMoney, PgRange};
use sqlx::postgres::PgRow;
use sqlx::sqlite::SqliteRow;
use sqlx::types::BigDecimal;
use sqlx::types::BitVec;
use sqlx::Row;
use uuid::Uuid;
pub fn mysql_row_to_json(
    row: &MySqlRow,
    type_name: &str,
    key: usize,
) -> Result<Value, anyhow::Error> {
    let data = match type_name {
        "FLOAT" => row
            .try_get::<Option<f32>, usize>(key)
            .map(|item| json!(item))?,
        "BIT" | "BOOLEAN" => row
            .try_get::<Option<bool>, usize>(key)
            .map(|item| json!(item))?,

        "DOUBLE" => row
            .try_get::<Option<f64>, usize>(key)
            .map(|item| json!(item))?,
        "DECIMAL" => row
            .try_get::<Option<BigDecimal>, usize>(key)
            .map(|item| json!(item))?,
        "INT" | "TINYINT" | "SMALLINT" | "MEDIUMINT" => row
            .try_get::<Option<i32>, usize>(key)
            .map(|item| json!(item))?,
        "INT UNSIGNED" | "TINYINT UNSIGNED" | "SMALLINT UNSIGNED" | "MEDIUMINT UNSIGNED" => row
            .try_get::<Option<u32>, usize>(key)
            .map(|item| json!(item))?,
        "BIGINT" => row
            .try_get::<Option<i64>, usize>(key)
            .map(|item| json!(item))?,
        "BIGINT UNSIGNED" => row
            .try_get::<Option<u64>, usize>(key)
            .map(|item| json!(item))?,
        "YEAR" => row
            .try_get::<Option<u16>, usize>(key)
            .map(|item| json!(item))?,
        "LONGBLOB" | "BINARY" | "VARBINARY" | "BLOB" => {
            row.try_get::<Option<Vec<u8>>, usize>(key).map(|item| {
                let hex_value = hex::encode(item.unwrap_or_default());
                json!(format!("0x{}", hex_value))
            })?
        }
        "JSON" => row
            .try_get::<Option<Value>, usize>(key)
            .map(|item| json!(item))?,
        "DATE" => row
            .try_get::<Option<NaiveDate>, usize>(key)
            .map(|item| json!(item.unwrap_or_default().format("%Y-%m-%d").to_string()))?,
        "TIMESTAMP" => row
            .try_get::<Option<DateTime<Local>>, usize>(key)
            .map(|item| {
                json!(item
                    .unwrap_or_default()
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string()
                    .trim())
            })?,
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
pub fn sqlite_row_to_json(
    row: &SqliteRow,
    type_name: &str,
    key: usize,
) -> Result<Value, anyhow::Error> {
    let data =
        match type_name {
            "FLOAT" => row
                .try_get::<Option<f32>, usize>(key)
                .map(|item| json!(item))?,
            "BIT" | "BOOLEAN" => row
                .try_get::<Option<bool>, usize>(key)
                .map(|item| json!(item))?,

            "DOUBLE" => row
                .try_get::<Option<f64>, usize>(key)
                .map(|item| json!(item))?,

            "INTEGER" | "TINYINT" | "SMALLINT" | "MEDIUMINT" => row
                .try_get::<Option<u64>, usize>(key)
                .map(|item| json!(item))?,
            "INT UNSIGNED" | "TINYINT UNSIGNED" | "SMALLINT UNSIGNED" | "MEDIUMINT UNSIGNED" => row
                .try_get::<Option<u32>, usize>(key)
                .map(|item| json!(item))?,
            "BIGINT" => row
                .try_get::<Option<i64>, usize>(key)
                .map(|item| json!(item))?,
            "BIGINT UNSIGNED" => row
                .try_get::<Option<u64>, usize>(key)
                .map(|item| json!(item))?,
            "YEAR" => row
                .try_get::<Option<u16>, usize>(key)
                .map(|item| json!(item))?,
            "BINARY" | "VARBINARY" | "BLOB" => {
                row.try_get::<Option<Vec<u8>>, usize>(key).map(|item| {
                    json!(String::from_utf8_lossy(&item.unwrap_or_default())
                        .trim_matches(char::from(0)))
                })?
            }
            "JSON" => row
                .try_get::<Option<Value>, usize>(key)
                .map(|item| json!(item))?,
            "DATE" => row
                .try_get::<Option<NaiveDate>, usize>(key)
                .map(|item| json!(item.unwrap_or_default().format("%Y-%m-%d").to_string()))?,
            "TIMESTAMP" => row
                .try_get::<Option<DateTime<Local>>, usize>(key)
                .map(|item| {
                    json!(item
                        .unwrap_or_default()
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string()
                        .trim())
                })?,
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
pub fn postgres_row_to_json(
    row: &PgRow,
    type_name: &str,
    key: usize,
) -> Result<Value, anyhow::Error> {
    let type_name_clone = type_name;
    let data =
        match type_name {
            "FLOAT4" | "REAL" => row.try_get::<Option<f32>, _>(key).map(|item| json!(item))?,
            "UUID" => row
                .try_get::<Option<Uuid>, _>(key)
                .map(|item| json!(item))?,

            "BOOL" => row
                .try_get::<Option<bool>, usize>(key)
                .map(|item| json!(item))?,

            "FLOAT8" | "DOUBLE PRECISION" => row
                .try_get::<Option<f64>, usize>(key)
                .map(|item| json!(item))?,
            "NUMERIC" | "DECIMAL" => row
                .try_get::<Option<BigDecimal>, usize>(key)
                .map(|item| json!(item))?,
            "INT4" | "INT" | "TINYINT" | "SMALLINT" | "MEDIUMINT" => row
                .try_get::<Option<i32>, usize>(key)
                .map(|item| json!(item))?,
            "INT2" => row
                .try_get::<Option<i16>, usize>(key)
                .map(|item| json!(item))?,
            "INT8" | "BIGINT" | "BIGSERIAL" => row
                .try_get::<Option<i64>, usize>(key)
                .map(|item| json!(item))?,
            "INT8RANGE" => row
                .try_get::<Option<PgRange<i64>>, usize>(key)
                .map(|item| {
                    json!(item
                        .map(|range| format!("{}", range))
                        .unwrap_or_else(|| "Null".to_string()))
                })?,
            "NUMRANGE" => row
                .try_get::<Option<PgRange<BigDecimal>>, usize>(key)
                .map(|item| {
                    json!(item
                        .map(|range| format!("{}", range))
                        .unwrap_or_else(|| "Null".to_string()))
                })?,
            "TSRANGE" => row
                .try_get::<Option<PgRange<NaiveDateTime>>, usize>(key)
                .map(|item| {
                    json!(item
                        .map(|range| format!("{}", range))
                        .unwrap_or_else(|| "Null".to_string()))
                })?,
            "TSTZRANGE" => row
                .try_get::<Option<PgRange<DateTime<Local>>>, usize>(key)
                .map(|item| {
                    json!(item
                        .map(|range| format!("{}", range))
                        .unwrap_or_else(|| "Null".to_string()))
                })?,
            "DATERANGE" => row
                .try_get::<Option<PgRange<NaiveDate>>, usize>(key)
                .map(|item| {
                    json!(item
                        .map(|range| format!("{}", range))
                        .unwrap_or_else(|| "Null".to_string()))
                })?,
            "INT4[]" => row
                .try_get::<Option<Vec<i32>>, usize>(key)
                .map(|item| json!(item))?,
            "TEXT[]" => row
                .try_get::<Option<Vec<String>>, usize>(key)
                .map(|item| json!(item))?,
            "INT4RANGE" => row
                .try_get::<Option<PgRange<i32>>, usize>(key)
                .map(|item| {
                    json!(item
                        .map(|range| format!("{}", range))
                        .unwrap_or_else(|| "Null".to_string()))
                })?,

            "LONGBLOB" | "BINARY" | "VARBINARY" | "BLOB" => {
                row.try_get::<Option<Vec<u8>>, usize>(key).map(|item| {
                    json!(String::from_utf8_lossy(&item.unwrap_or_default())
                        .trim_matches(char::from(0)))
                })?
            }
            "JSONB" | "JSON" => row
                .try_get::<Option<Value>, usize>(key)
                .map(|item| json!(item))?,
            "BIT" | "VARBIT" => row.try_get::<Option<BitVec>, usize>(key).map(|item| {
                json!(item
                    .map(|bits| format!("{:?}", bits))
                    .unwrap_or_else(|| "Null".to_string()))
            })?,
            "xml" => row
                .try_get::<Option<Vec<u8>>, usize>(key)
                .map(|item| json!(item))
                .unwrap_or(json!("Xml Not Supported.")),
            "POINT" => row
                .try_get::<Option<Vec<u8>>, usize>(key)
                .map(|item| json!(item))
                .unwrap_or(json!("POINT Not Supported.")),
            "LSEG" => row
                .try_get::<Option<Vec<u8>>, usize>(key)
                .map(|item| json!(item))
                .unwrap_or(json!("LSEG Not Supported.")),
            "BOX" => row
                .try_get::<Option<Vec<u8>>, usize>(key)
                .map(|item| json!(item))
                .unwrap_or(json!("BOX Not Supported.")),
            "PATH" => row
                .try_get::<Option<Vec<u8>>, usize>(key)
                .map(|item| json!(item))
                .unwrap_or(json!("PATH Not Supported.")),
            "INET" | "CIDR" => row
                .try_get::<Option<IpNetwork>, usize>(key)
                .map(|item| json!(item))?,
            "MACADDR" => row.try_get::<Option<MacAddress>, usize>(key).map(|item| {
                json!(item
                    .map(|mac| format!("{}", mac))
                    .unwrap_or_else(|| "Null".to_string()))
            })?,
            "INTERVAL" => row.try_get::<Option<PgInterval>, usize>(key).map(|item| {
                json!(item
                    .map(|interval| format!("{:?}", interval))
                    .unwrap_or_else(|| "Null".to_string()))
            })?,

            "MONEY" => row
                .try_get::<Option<PgMoney>, usize>(key)
                .map(|item| json!(item.map(|m| m.to_bigdecimal(2))))?,
            "DATE" => row
                .try_get::<Option<NaiveDate>, usize>(key)
                .map(|item| json!(item.unwrap_or_default().format("%Y-%m-%d").to_string()))?,
            "TIMESTAMP" => row
                .try_get::<Option<NaiveDateTime>, usize>(key)
                .map(|item| {
                    json!(item
                        .unwrap_or_default()
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string()
                        .trim())
                })?,
            "TIMESTAMPTZ" => row
                .try_get::<Option<DateTime<Local>>, usize>(key)
                .map(|item| {
                    json!(item
                        .unwrap_or_default()
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string()
                        .trim())
                })?,
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
                .map(|item| json!(item))
                .unwrap_or(json!(format!("{} Not Supported.", type_name_clone))),
        };
    Ok(data)
}
pub fn mssql_row_to_json(
    row: &SqliteRow,
    type_name: &str,
    key: usize,
) -> Result<Value, anyhow::Error> {
    let data =
        match type_name {
            "FLOAT" => row
                .try_get::<Option<f32>, usize>(key)
                .map(|item| json!(item))?,
            "BIT" | "BOOLEAN" => row
                .try_get::<Option<bool>, usize>(key)
                .map(|item| json!(item))?,

            "DOUBLE" => row
                .try_get::<Option<f64>, usize>(key)
                .map(|item| json!(item))?,

            "INTEGER" | "TINYINT" | "SMALLINT" | "MEDIUMINT" => row
                .try_get::<Option<u64>, usize>(key)
                .map(|item| json!(item))?,
            "INT UNSIGNED" | "TINYINT UNSIGNED" | "SMALLINT UNSIGNED" | "MEDIUMINT UNSIGNED" => row
                .try_get::<Option<u32>, usize>(key)
                .map(|item| json!(item))?,
            "BIGINT" => row
                .try_get::<Option<i64>, usize>(key)
                .map(|item| json!(item))?,
            "BIGINT UNSIGNED" => row
                .try_get::<Option<u64>, usize>(key)
                .map(|item| json!(item))?,
            "YEAR" => row
                .try_get::<Option<u16>, usize>(key)
                .map(|item| json!(item))?,
            "BINARY" | "VARBINARY" | "BLOB" => {
                row.try_get::<Option<Vec<u8>>, usize>(key).map(|item| {
                    json!(String::from_utf8_lossy(&item.unwrap_or_default())
                        .trim_matches(char::from(0)))
                })?
            }
            "JSON" => row
                .try_get::<Option<Value>, usize>(key)
                .map(|item| json!(item))?,
            "DATE" => row
                .try_get::<Option<NaiveDate>, usize>(key)
                .map(|item| json!(item.unwrap_or_default().format("%Y-%m-%d").to_string()))?,
            "TIMESTAMP" => row
                .try_get::<Option<DateTime<Local>>, usize>(key)
                .map(|item| {
                    json!(item
                        .unwrap_or_default()
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string()
                        .trim())
                })?,
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
