use anyhow::Ok;
use chrono::{DateTime, Local, NaiveDateTime};
use chrono::{NaiveDate, NaiveTime};
use serde_json::{json, Value};
use sqlparser::ast::{Expr, SelectItem, SetExpr, Statement, TableWithJoins};
use sqlparser::ast::{GroupByExpr, TableFactor};
use sqlparser::dialect::GenericDialect;
use sqlparser::parser::Parser;
use sqlx::mysql::MySqlRow;
use sqlx::sqlite::SqliteRow;
use sqlx::types::BigDecimal;
use sqlx::Row;
pub fn mysql_row_to_json(
    row: &MySqlRow,
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
pub fn is_simple_select(sql: &str) -> Result<Option<String>, anyhow::Error> {
    let dialect = GenericDialect {};
    let ast = Parser::parse_sql(&dialect, sql)?;

    // Ensure there's only one statement and it's a SELECT statement
    if ast.len() != 1 {
        return Ok(None);
    }

    if let Statement::Query(query) = &ast[0] {
        if let SetExpr::Select(select) = &*query.body {
            // Check that there is only one table in the FROM clause without joins
            if select.from.len() != 1 {
                return Ok(None);
            }
            if let Some(TableWithJoins { joins, .. }) = select.from.first() {
                if !joins.is_empty() {
                    return Ok(None); // There's a JOIN in the query
                }
            }

            // Check for GROUP BY clause
            match &select.group_by {
                GroupByExpr::All(_) => return Ok(None), // GROUP BY clause found
                GroupByExpr::Expressions(first, second) => {
                    if !first.is_empty() || !second.is_empty() {
                        return Ok(None);
                    }
                }
            };

            // Check for aggregate functions in the SELECT clause
            for item in &select.projection {
                if let SelectItem::UnnamedExpr(expr) = item {
                    if contains_aggregate(expr) {
                        return Ok(None); // Aggregation function found
                    }
                }
            }
            let table = match &select.from[0].relation {
                TableFactor::Table { name, .. } => name,
                _ => return Ok(None),
            };
            return Ok(Some(format!("{}", table)));
        }
    }

    Ok(None)
}

// Helper function to detect aggregate functions in expressions
fn contains_aggregate(expr: &Expr) -> bool {
    match expr {
        Expr::Function(func) => {
            // Check if the function is an aggregate by name
            matches!(
                func.name.to_string().to_uppercase().as_str(),
                "SUM" | "COUNT" | "AVG" | "MIN" | "MAX"
            )
        }
        Expr::BinaryOp { left, right, .. } => contains_aggregate(left) || contains_aggregate(right),
        Expr::UnaryOp { expr, .. } => contains_aggregate(expr),
        Expr::Nested(expr) => contains_aggregate(expr),
        _ => false,
    }
}
