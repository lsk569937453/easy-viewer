use crate::service::base_config_service::DatabaseHostStruct;
use crate::util::sql_utils::mssql_row_to_json;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::vojo::sql_parse_result::SqlParseResult;
use crate::AppState;
use futures_util::TryStreamExt;
use human_bytes::human_bytes;
use linked_hash_map::LinkedHashMap;
use serde::Deserialize;
use serde::Serialize;
use std::sync::OnceLock;
use std::time::Duration;
use tiberius::numeric::Numeric;
use tiberius::AuthMethod;
use tiberius::Client;
use tiberius::Config;
use tiberius::QueryItem;
use tokio::net::TcpStream;
use tokio::time::timeout;
use tokio_util::compat::Compat;
use tokio_util::compat::TokioAsyncWriteCompatExt;

static MSSQL_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();
static MSSQL_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();

fn get_mssql_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MSSQL_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}
fn get_mssql_table_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MSSQL_TABLE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Columns", "columns");
        map.insert("Index", "index");
        map.insert("Partitions", "partitions");
        map
    })
}
#[derive(Deserialize, Serialize, Clone)]
pub struct MssqlConfig {
    pub config: DatabaseHostStruct,
}
impl MssqlConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        info!("test_connection{:?}", self.config);
        self.get_connection().await?;
        Ok(())
    }
    async fn get_connection(&self) -> Result<Client<Compat<TcpStream>>, anyhow::Error> {
        let mut config = Config::new();

        config.host(&self.config.host);
        config.port(self.config.port as u16);
        config.authentication(AuthMethod::sql_server(
            &self.config.user_name,
            &self.config.password,
        ));
        config.trust_cert();

        let tcp = timeout(
            Duration::from_millis(500),
            TcpStream::connect(config.get_addr()),
        )
        .await??;
        tcp.set_nodelay(true)?;

        let client = timeout(
            Duration::from_millis(500),
            Client::connect(config, tcp.compat_write()),
        )
        .await??;
        Ok(client)
    }
    async fn get_connection_with_database(
        &self,
        db_name: String,
    ) -> Result<Client<Compat<TcpStream>>, anyhow::Error> {
        let mut config = Config::new();

        config.host(&self.config.host);
        config.port(self.config.port as u16);
        config.database(db_name);
        config.authentication(AuthMethod::sql_server(
            &self.config.user_name,
            &self.config.password,
        ));
        config.trust_cert();

        let tcp = timeout(
            Duration::from_millis(500),
            TcpStream::connect(config.get_addr()),
        )
        .await??;
        tcp.set_nodelay(true)?;

        let client = timeout(
            Duration::from_millis(500),
            Client::connect(config, tcp.compat_write()),
        )
        .await??;
        Ok(client)
    }
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let mut vec = vec![];
        let level_infos = list_node_info_req.level_infos;
        match level_infos.len() {
            1 => {
                let mut conn = self.get_connection().await?;

                let stream = conn
                    .query(
                        "  SELECT 
            DB_NAME(mf.database_id) AS database_name,
            CAST(SUM(mf.size * 8.0 / 1024.0) AS DECIMAL(10, 2)) AS database_size_mb
        FROM 
            sys.master_files mf
        GROUP BY 
            mf.database_id",
                        &[],
                    )
                    .await?;
                let mut row_stream = stream.into_row_stream();

                while let Some(row) = row_stream.try_next().await? {
                    let db_name: Option<&str> = row.try_get(0).map_err(|e| anyhow!(e))?;
                    let db_size_mb: Option<String> = row
                        .try_get(1)
                        .map_err(|e| anyhow!(e))?
                        .map(|item: Numeric| human_bytes(f64::from(item)));

                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "database".to_string(),
                        db_name.ok_or(anyhow!(""))?.to_string(),
                        db_size_mb,
                    );
                    vec.push(list_node_info_response_item);
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            2 => {
                let mut conn = self.get_connection().await?;
                let db_name = level_infos[1].config_value.clone();
                let sql = format!(
                    "SELECT schema_name
    FROM {}.information_schema.schemata WHERE schema_name NOT IN ('INFORMATION_SCHEMA', 'guest', 'db_accessadmin', 'db_owner', 'sys',   'db_denydatareader', 
    'db_denydatawriter', 'db_datareader', 'db_datawriter', 'db_ddladmin', 'db_securityadmin', 'db_backupoperator');",
                    db_name
                );
                let stream = conn.query(&sql, &[]).await?;
                let mut row_stream = stream.into_row_stream();

                while let Some(row) = row_stream.try_next().await? {
                    let schema_name = row
                        .try_get(0)
                        .map_err(|e| anyhow!(e))?
                        .map(|schema: &str| schema.to_string())
                        .ok_or(anyhow!(""))?;

                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        "schema".to_string(),
                        schema_name.clone(),
                        None,
                    );
                    // info!("schema name is:{}", schema_name);
                    vec.push(list_node_info_response_item);
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            3 => {
                let db_name = level_infos[1].config_value.clone();
                let schema_name = level_infos[2].config_value.clone();

                let mut conn = self.get_connection_with_database(db_name).await?;
                let sql = format!(
                    "SELECT count(*)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '{}'
      AND TABLE_TYPE = 'BASE TABLE';",
                    schema_name
                );
                let tables_count: i32 = conn
                    .query(&sql, &[])
                    .await?
                    .into_row()
                    .await?
                    .ok_or(anyhow!(""))?
                    .try_get(0)?
                    .ok_or(anyhow!(""))?;
                for (name, icon_name) in get_mssql_database_data().iter() {
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
                return Ok(ListNodeInfoResponse::new(vec));
            }
            4 => {
                let mut conn = self.get_connection().await?;
                let db_name = level_infos[1].config_value.clone();
                let schema_name = level_infos[2].config_value.clone();
                let node_name = level_infos[3].config_value.clone();
                if node_name == "Tables" {
                    let use_database_sql = format!("use {};", db_name);
                    conn.execute(&use_database_sql, &[]).await?;
                    let sql = format!(
                        "SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '{}'
      AND TABLE_TYPE = 'BASE TABLE';",
                        schema_name
                    );
                    let stream = conn.query(&sql, &[]).await?;
                    let mut row_stream = stream.into_row_stream();

                    while let Some(row) = row_stream.try_next().await? {
                        let schema_name = row
                            .try_get(0)
                            .map_err(|e| anyhow!(e))?
                            .map(|schema: &str| schema.to_string())
                            .ok_or(anyhow!(""))?;

                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            true,
                            true,
                            "singleTable".to_string(),
                            schema_name.clone(),
                            None,
                        );
                        // info!("schema name is:{}", schema_name);
                        vec.push(list_node_info_response_item);
                    }
                    return Ok(ListNodeInfoResponse::new(vec));
                }
            }
            _ => {
                info!("list_node_info_req: {:?}", level_infos);
            }
        }
        Ok(ListNodeInfoResponse::new_with_empty())
    }
    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let mut conn = if level_infos.len() >= 2 {
            let database_name = level_infos[1].config_value.clone();
            self.get_connection_with_database(database_name).await?
        } else {
            self.get_connection().await?
        };

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
            let stream = conn.query(&sql, &[]).await?;
            let row_option = stream.into_row().await?;

            if let Some(row) = row_option {
                let primary_column = row.try_get::<&str, _>(0)?.ok_or(anyhow!(""))?;
                Some(primary_column.to_string())
            } else {
                None
            }
        } else {
            None
        };

        info!("has_multi_rows: {}", has_multi_rows);
        if !has_multi_rows {
            let mssql_query_result =
                if sql.contains("CREATE PROCEDURE") || sql.contains("CREATE FUNCTION") {
                    conn.execute(&sql, &[]).await?
                } else {
                    conn.execute(&sql, &[]).await?
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
            let row_affected = mssql_query_result
                .rows_affected()
                .iter()
                .map(|num| num.to_string())
                .collect::<Vec<String>>()
                .join(", ");
            let rows = vec![vec![Some(row_affected)]];
            return Ok(ExeSqlResponse {
                header: headers,
                rows,
                table_name: is_simple_select_option,
            });
        }
        let mut rows = conn.query(&sql, &[]).await?;
        let mut headers = vec![];
        let mut response_rows = vec![];

        while let Some(query_item) = rows.try_next().await? {
            match query_item {
                QueryItem::Row(row_data) => {
                    let mut row = vec![];
                    for (_, column_data) in row_data.cells() {
                        let val = mssql_row_to_json(column_data)?;
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
                QueryItem::Metadata(metadata) => {
                    for item in metadata.columns().iter() {
                        let type_name = item.column_type();
                        let type_name_str = format!("{:?}", type_name);
                        let column_name = item.name();
                        let is_primary = if let Some(primary_column) = primary_column_option.clone()
                        {
                            column_name == primary_column.as_str()
                        } else {
                            false
                        };
                        headers.push(Header {
                            name: column_name.to_string(),
                            type_name: type_name_str.to_uppercase(),
                            is_primary_key: is_primary,
                        });
                    }
                }
            }
        }

        let exe_sql_response =
            ExeSqlResponse::from(headers, response_rows, is_simple_select_option);

        Ok(exe_sql_response)
    }
}
