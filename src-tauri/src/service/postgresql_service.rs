use crate::service::base_config_service::DatabaseHostStruct;
use crate::sql_lite::connection::AppState;
use crate::util::sql_utils::postgres_row_to_json;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::vojo::show_column_response::ShowColumnsResponse;
use crate::vojo::sql_parse_result::SqlParseResult;
use anyhow::Ok;
use linked_hash_map::LinkedHashMap;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Column;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::PgConnection;
use sqlx::Row;
use sqlx::TypeInfo;
use std::sync::OnceLock;
use std::time::Duration;
use tokio::time::timeout;
static POSTGRESQL_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> =
    OnceLock::new();
static POSTGRESQL_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();

fn get_postgresql_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    POSTGRESQL_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}
fn get_postgresql_table_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    POSTGRESQL_TABLE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Columns", "columns");
        map.insert("Index", "index");
        map.insert("Partitions", "partitions");
        map
    })
}
#[derive(Deserialize, Serialize, Clone)]
pub struct PostgresqlConfig {
    pub config: DatabaseHostStruct,
}
impl PostgresqlConfig {
    fn connection_url(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}",
            self.config.user_name, self.config.password, self.config.host, self.config.port,
        )
    }
    fn connection_url_with_database(&self, database: String) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.config.user_name,
            self.config.password,
            self.config.host,
            self.config.port,
            database
        )
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("postgres".to_string());
        PgConnection::connect(&test_url).await.map(|_| ())?;
        Ok(())
    }
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let mut vec = vec![];

        if list_node_info_req.level_infos.len() == 1 {
            let test_url = self.connection_url();
            info!("test_url: {}", test_url);
            let mut connection =
                timeout(Duration::from_millis(500), PgConnection::connect(&test_url)).await??;
            let rows = sqlx::query("SELECT datname FROM pg_database WHERE datistemplate = false;")
                .fetch_all(&mut connection)
                .await?;

            if rows.is_empty() {
                return Ok(ListNodeInfoResponse::new_with_empty());
            }
            for item in rows.iter() {
                let database_name: String = item.try_get(0)?;
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "database".to_string(),
                    database_name.to_string(),
                    None,
                );
                vec.push(list_node_info_response_item);
            }
            vec.sort_by(|a, b| a.name.cmp(&b.name));

            return Ok(ListNodeInfoResponse::new(vec));
        } else if list_node_info_req.level_infos.len() == 2 {
            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                true,
                true,
                "public".to_string(),
                "public".to_string(),
                None,
            );
            vec.push(list_node_info_response_item);
            return Ok(ListNodeInfoResponse::new(vec));
        } else if list_node_info_req.level_infos.len() == 3 {
            for (name, icon_name) in get_postgresql_database_data().iter() {
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    icon_name.to_string(),
                    name.to_string(),
                    None,
                );
                vec.push(list_node_info_response_item);
            }
            return Ok(ListNodeInfoResponse::new(vec));
        } else if list_node_info_req.level_infos.len() == 4 {
            let node_name = list_node_info_req.level_infos[3].config_value.clone();

            if node_name == "Tables" {
                let database_name = list_node_info_req.level_infos[1].config_value.clone();
                let test_url = self.connection_url_with_database(database_name);
                info!("test_url: {}", test_url);
                let mut connection = PgConnection::connect(&test_url).await?;
                let rows = sqlx::query(
                    "SELECT tablename
FROM pg_catalog.pg_tables
WHERE schemaname = 'public';",
                )
                .fetch_all(&mut connection)
                .await?;
                info!("rows: {}", rows.len());
                if rows.is_empty() {
                    return Ok(ListNodeInfoResponse::new_with_empty());
                }
                for item in rows.iter() {
                    let table_name: String = item.try_get(0)?;
                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "singleTable".to_string(),
                        table_name,
                        None,
                    );
                    vec.push(list_node_info_response_item);
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
        }
        Ok(ListNodeInfoResponse::new_with_empty())
    }
    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;

        let connect_url = if level_infos.len() >= 2 {
            let database_name = level_infos[1].config_value.clone();
            self.connection_url_with_database(database_name)
        } else {
            self.config.to_url("postgres".to_string())
        };
        info!("connect_url: {}", connect_url);
        let mut conn = PgConnection::connect(&connect_url).await?;

        info!("sql: {}", sql);
        let should_parse_sql = !(sql.contains("CREATE DATABASE")
            || (sql.contains("CREATE PROCEDURE") && !sql.contains("SHOW CREATE PROCEDURE"))
            || sql.contains("CREATE FUNCTION") && !sql.contains("SHOW CREATE FUNCTION"));
        info!(
            "should_parse_sql: {},{}",
            should_parse_sql,
            !sql.contains("CREATE PROCEDURE")
        );
        let (is_simple_select_option, has_multi_rows) = if should_parse_sql {
            let sql_parse_result = SqlParseResult::new(sql.clone())?;
            (
                sql_parse_result.is_simple_select()?,
                sql_parse_result.has_multiple_rows()?,
            )
        } else {
            (None, false)
        };
        let primary_column_option = if let Some(table_name) = &is_simple_select_option {
            let sql = format!(
                r#"SELECT column_name
FROM information_schema.key_column_usage
WHERE table_name = '{}'
  AND constraint_name = (
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = '{}'
        AND constraint_type = 'PRIMARY KEY'
  );"#,
                table_name, table_name
            );
            let option_row = sqlx::query(&sql).fetch_optional(&mut conn).await?;
            if let Some(row) = option_row {
                let primary_column: String = row.try_get(0)?;
                Some(primary_column)
            } else {
                None
            }
        } else {
            None
        };

        info!("has_multi_rows: {}", has_multi_rows);
        if !has_multi_rows {
            let pg_query_result =
                if sql.contains("CREATE PROCEDURE") || sql.contains("CREATE FUNCTION") {
                    conn.execute(sql.as_str()).await?
                } else {
                    sqlx::query(&sql).execute(&mut conn).await?
                };
            let headers = vec![
                Header {
                    name: "affected_rows".to_string(),
                    type_name: "u64".to_string().to_uppercase(),
                    is_primary_key: false,
                },
                Header {
                    name: "last_insert_id".to_string(),
                    type_name: "u64".to_string().to_uppercase(),
                    is_primary_key: false,
                },
            ];
            let rows = vec![vec![Some(pg_query_result.rows_affected().to_string())]];
            return Ok(ExeSqlResponse {
                header: headers,
                rows,
                table_name: is_simple_select_option,
            });
        }
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
        if rows.is_empty() {
            return Ok(ExeSqlResponse::new());
        }
        let first_item = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];
        for item in first_item.columns() {
            let type_name = item.type_info().name();
            let column_name = item.name();
            let is_primary = if let Some(primary_column) = &primary_column_option {
                column_name == primary_column
            } else {
                false
            };
            headers.push(Header {
                name: column_name.to_string(),
                type_name: type_name.to_string().to_uppercase(),
                is_primary_key: is_primary,
            });
        }
        let mut response_rows = vec![];
        for item in rows.iter() {
            let columns = item.columns();
            let len = columns.len();
            let mut row = vec![];
            for i in 0..len {
                let type_name = columns[i].type_info().name();
                let val = postgres_row_to_json(item, type_name, i)?;
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
        let exe_sql_response =
            ExeSqlResponse::from(headers, response_rows, is_simple_select_option);

        Ok(exe_sql_response)
    }
    pub async fn update_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sql: Vec<String>,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());

        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let node_name = level_infos[2].config_value.clone();
        Ok(ExeSqlResponse::new())
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        Ok(ShowColumnsResponse::new())
    }
    pub async fn get_complete_words(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        Ok(vec![])
    }
}
