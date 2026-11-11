use super::config::MysqlConfig;
use super::queries::get_mysql_database_data;
use super::queries::get_mysql_table_data;
use crate::sql_lite::connection::AppState;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_req::ListNodeInfoReqItem;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use anyhow::Ok;
use bigdecimal::BigDecimal;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::MySqlConnection;
use sqlx::Row;
use std::time::Duration;
use tokio::time::timeout;

const BASE_TABLE_LIST_SQL: &str = "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';";
const VIEW_LIST_SQL: &str = "SHOW FULL TABLES WHERE Table_type = 'VIEW';";

impl MysqlConfig {
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;

        let vec = match level_infos.len() {
            1 => list_databases(&connection_url).await?,
            2 => list_database_categories(&connection_url, &level_infos).await?,
            3 => list_database_children(&connection_url, &level_infos, appstate).await?,
            4 => list_table_categories(),
            5 => list_table_children(&connection_url, &level_infos).await?,
            _ => vec![],
        };

        Ok(ListNodeInfoResponse::new(vec))
    }
}

async fn list_databases(
    connection_url: &str,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let mut vec = vec![];
    let mut conn = timeout(
        Duration::from_millis(500),
        MySqlConnection::connect(connection_url),
    )
    .await
    .map_err(|_| anyhow!("Connect time out!"))??;

    let rows = sqlx::query(
        "SELECT `schema_name`
from INFORMATION_SCHEMA.SCHEMATA
WHERE
    `schema_name` NOT IN(
        'information_schema',
        'mysql',
        'performance_schema'
    );",
    )
    .fetch_all(&mut conn)
    .await?;

    for item in rows {
        let buf: &[u8] = item.try_get(0)?;
        let database_name = String::from_utf8_lossy(buf);
        let query_db_size_sql = format!(
            r#"SELECT table_schema AS "Database",
       ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS "Size (MB)"
FROM information_schema.tables
WHERE table_schema = "{}";"#,
            database_name
        );
        let query_size_result = sqlx::query(sqlx::AssertSqlSafe(query_db_size_sql))
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!(""))?;
        let db_size_option: Option<BigDecimal> = query_size_result.try_get(1)?;

        let db_size_str = if let Some(db_size) = db_size_option {
            format!("{}M", db_size)
        } else {
            "".to_string()
        };

        let list_node_info_response_item = ListNodeInfoResponseItem::new(
            true,
            true,
            "database".to_string(),
            database_name.to_string(),
            Some(db_size_str),
        );
        vec.push(list_node_info_response_item);
    }
    info!("list_node_info: {:?}", vec);
    Ok(vec)
}

async fn list_database_categories(
    connection_url: &str,
    level_infos: &[ListNodeInfoReqItem],
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let mut vec = vec![];
    let mut conn = MySqlConnection::connect(connection_url).await?;
    let database_name = level_infos[1].config_value.clone();
    let sql = format!("use {}", database_name);
    info!("sql: {}", sql);
    conn.execute(sqlx::AssertSqlSafe(sql)).await?;
    let tables_count: i32 = sqlx::query(
        "SELECT COUNT(*) 
FROM information_schema.tables
WHERE table_schema = DATABASE()",
    )
    .fetch_optional(&mut conn)
    .await?
    .ok_or(anyhow!(""))?
    .try_get(0)?;
    for (name, icon_name) in get_mysql_database_data().iter() {
        let description = if *name == "Tables" && tables_count > 0 {
            Some(format!("({})", tables_count))
        } else {
            None
        };
        info!("description: {}", tables_count);
        let list_node_info_response_item = ListNodeInfoResponseItem::new(
            true,
            true,
            icon_name.to_string(),
            name.to_string(),
            description,
        );
        vec.push(list_node_info_response_item);
    }
    Ok(vec)
}

async fn list_database_children(
    connection_url: &str,
    level_infos: &[ListNodeInfoReqItem],
    appstate: &AppState,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let base_config_id = level_infos[0].config_value.parse::<i32>()?;
    let database_name = level_infos[1].config_value.clone();
    let node_name = level_infos[2].config_value.clone();
    if node_name == "Tables" {
        return list_tables(connection_url, &database_name, BASE_TABLE_LIST_SQL).await;
    } else if node_name == "Query" {
        return list_queries(base_config_id, appstate).await;
    } else if node_name == "Procedures" {
        return list_procedures(connection_url, &database_name).await;
    } else if node_name == "Views" {
        return list_tables(connection_url, &database_name, VIEW_LIST_SQL).await;
    } else if node_name == "Functions" {
        return list_functions(connection_url, &database_name).await;
    }
    Ok(vec![])
}

async fn list_tables(
    connection_url: &str,
    database_name: &str,
    table_type_sql: &'static str,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let mut vec = vec![];
    let mut conn = MySqlConnection::connect(connection_url).await?;

    let sql = format!("use {}", database_name);
    info!("sql: {}", sql);
    conn.execute(sqlx::AssertSqlSafe(sql)).await?;

    let rows = sqlx::query(table_type_sql).fetch_all(&mut conn).await?;

    for item in rows {
        let buf: &[u8] = item.try_get(0)?;
        let table_name = String::from_utf8_lossy(buf).to_string();
        let sql = format!("select count(*) from {}.{}", database_name, table_name);
        info!("sql: {}", sql);
        let record_count: i32 = sqlx::query(sqlx::AssertSqlSafe(sql))
            .fetch_one(&mut conn)
            .await?
            .try_get(0)?;
        let description = if record_count > 0 {
            Some(format!("{}", record_count))
        } else {
            None
        };
        let list_node_info_response_item = ListNodeInfoResponseItem::new(
            true,
            true,
            "singleTable".to_string(),
            table_name,
            description,
        );
        vec.push(list_node_info_response_item);
    }
    info!("list_node_info: {:?}", vec);
    Ok(vec)
}

async fn list_queries(
    base_config_id: i32,
    appstate: &AppState,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let rows = sqlx::query("select query_name from sql_query where connection_id=?1")
        .bind(base_config_id)
        .fetch_all(&appstate.pool)
        .await?;
    let mut vec = vec![];
    for row in rows {
        let row_str: String = row.try_get(0)?;

        let list_node_info_response_item =
            ListNodeInfoResponseItem::new(false, true, "singleQuery".to_string(), row_str, None);
        vec.push(list_node_info_response_item);
    }

    info!("list_node_info: {:?}", vec);
    Ok(vec)
}

async fn list_procedures(
    connection_url: &str,
    database_name: &str,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let mut conn = MySqlConnection::connect(connection_url).await?;

    let sql = format!("use {}", database_name);
    info!("sql: {}", sql);
    conn.execute(sqlx::AssertSqlSafe(sql)).await?;
    let rows = sqlx::query("SHOW PROCEDURE STATUS")
        .fetch_all(&mut conn)
        .await?;

    let mut vec = vec![];
    for row in rows {
        let db_str_bytes: Vec<u8> = row.try_get(0)?;
        let row_str: String = row.try_get(1)?;
        let db_str = String::from_utf8_lossy(&db_str_bytes);
        if db_str.as_ref() != database_name {
            continue;
        }
        let list_node_info_response_item = ListNodeInfoResponseItem::new(
            false,
            true,
            "singleProcedure".to_string(),
            row_str,
            None,
        );
        vec.push(list_node_info_response_item);
    }

    info!("list_node_info: {:?}", vec);
    Ok(vec)
}

async fn list_functions(
    connection_url: &str,
    database_name: &str,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let mut conn = MySqlConnection::connect(connection_url).await?;

    let sql = format!("use {}", database_name);
    info!("sql: {}", sql);
    conn.execute(sqlx::AssertSqlSafe(sql)).await?;
    let list_functions_sql = format!(
        "SELECT ROUTINE_NAME, ROUTINE_TYPE, DATA_TYPE, CREATED, LAST_ALTERED
FROM information_schema.ROUTINES
WHERE ROUTINE_TYPE = 'FUNCTION'
  AND ROUTINE_SCHEMA = '{}';",
        database_name
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(list_functions_sql))
        .fetch_all(&mut conn)
        .await?;

    let mut vec = vec![];
    for item in rows {
        let buf: &[u8] = item.try_get(0)?;
        let function_name = String::from_utf8_lossy(buf).to_string();

        let list_node_info_response_item = ListNodeInfoResponseItem::new(
            false,
            true,
            "singleFunction".to_string(),
            function_name,
            None,
        );
        vec.push(list_node_info_response_item);
    }
    info!("list_node_info: {:?}", vec);
    Ok(vec)
}

fn list_table_categories() -> Vec<ListNodeInfoResponseItem> {
    let mut vec = vec![];
    for (name, icon_name) in get_mysql_table_data().iter() {
        let list_node_info_response_item = ListNodeInfoResponseItem::new(
            true,
            true,
            icon_name.to_string(),
            name.to_string(),
            None,
        );
        vec.push(list_node_info_response_item);
    }
    vec
}

async fn list_table_children(
    connection_url: &str,
    level_infos: &[ListNodeInfoReqItem],
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let database_name = level_infos[1].config_value.clone();
    let table_name = level_infos[3].config_value.clone();
    let node_name = level_infos[4].config_value.clone();

    if node_name == "Columns" {
        return list_columns(connection_url, &database_name, &table_name).await;
    } else if node_name == "Index" {
        return list_indexes(connection_url, &database_name, &table_name).await;
    }
    Ok(vec![])
}

async fn list_columns(
    connection_url: &str,
    database_name: &str,
    table_name: &str,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let mut vec = vec![];
    let mut conn = MySqlConnection::connect(connection_url).await?;
    let mut sql = format!("use {}", database_name);
    info!("sql: {}", sql);
    conn.execute(sqlx::AssertSqlSafe(sql)).await?;
    sql = format!("describe {};", table_name);
    info!("sql: {}", sql);
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .fetch_all(&mut conn)
        .await?;
    for item in rows {
        let buf: &[u8] = item.try_get(0)?;
        let type_bytes: &[u8] = item.try_get(1)?;
        let type_name = String::from_utf8_lossy(type_bytes).to_string();
        let key: &[u8] = item.try_get(3)?;
        info!("key: {}", String::from_utf8_lossy(key));
        if key == b"PRI" {
            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                false,
                true,
                "primary".to_string(),
                String::from_utf8_lossy(buf).to_string(),
                Some(type_name),
            );
            vec.push(list_node_info_response_item);
        } else {
            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                false,
                true,
                "column".to_string(),
                String::from_utf8_lossy(buf).to_string(),
                Some(type_name),
            );
            vec.push(list_node_info_response_item);
        }
    }
    Ok(vec)
}

async fn list_indexes(
    connection_url: &str,
    database_name: &str,
    table_name: &str,
) -> Result<Vec<ListNodeInfoResponseItem>, anyhow::Error> {
    let mut vec = vec![];
    let mut conn = MySqlConnection::connect(connection_url).await?;
    let mut sql = format!("use {}", database_name);
    info!("sql: {}", sql);
    conn.execute(sqlx::AssertSqlSafe(sql)).await?;
    sql = format!("SHOW INDEX FROM {};", table_name);
    info!("sql: {}", sql);
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .fetch_all(&mut conn)
        .await?;
    for item in rows {
        let key_name: String = item.try_get(2)?;
        if key_name == "PRIMARY" {
            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                false,
                true,
                "singlePrimaryIndex".to_string(),
                key_name,
                None,
            );
            vec.push(list_node_info_response_item);
        } else {
            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                false,
                true,
                "singleCommonIndex".to_string(),
                key_name,
                None,
            );
            vec.push(list_node_info_response_item);
        }
    }
    Ok(vec)
}
