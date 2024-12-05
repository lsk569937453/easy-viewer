use crate::service::base_config_service::DatabaseHostStruct;
use crate::sql_lite::connection::AppState;
use crate::util::sql_utils::postgres_row_to_json;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use crate::vojo::import_database_req::ImportDatabaseReq;
use crate::vojo::init_dump_data_response::InitDumpDataColumnItem;
use crate::vojo::init_dump_data_response::InitDumpDataResponse;
use crate::vojo::init_dump_data_response::InitDumpSchemaResponseItem;
use crate::vojo::init_dump_data_response::InitDumpTableResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::vojo::show_column_response::ShowColumnHeader;
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
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let description = format!("{}:{}", self.config.host, self.config.port);
        Ok(description)
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
    pub async fn init_dump_data(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<InitDumpDataResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let connection_url = self.connection_url_with_database(database_name);

        let mut conn = PgConnection::connect(&connection_url).await?;
        let sql = "SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  AND schema_name NOT LIKE 'pg_%';";
        let rows = sqlx::query(sql).fetch_all(&mut conn).await?;
        let schema_names: Vec<String> = rows.iter().map(|row| row.get("schema_name")).collect();
        let mut init_dump_data_response = vec![];
        for schema_name in schema_names {
            let mut sql = format!(
                "SELECT table_name
FROM information_schema.tables
WHERE table_schema = '{}'  
  AND table_type = 'BASE TABLE';",
                schema_name
            );
            let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
            let table_names: Vec<String> = rows.iter().map(|row| row.get("table_name")).collect();
            let mut init_dump_tables_responses = vec![];

            for table_name in table_names {
                sql = format!(
                    "SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = '{}'  
  AND table_name = '{}';",
                    schema_name, table_name
                );
                let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
                let mut vec = vec![];
                for item in rows.iter() {
                    let column_name: String = item.try_get(0)?;
                    let column_type: String = item.try_get(1)?;
                    let init_column_item = InitDumpDataColumnItem::from(column_name, column_type);
                    vec.push(init_column_item);
                }
                let init_dump_tables = InitDumpTableResponseItem::from(table_name, vec);
                init_dump_tables_responses.push(init_dump_tables);
            }
            let init_dump_schema =
                InitDumpSchemaResponseItem::from(schema_name, init_dump_tables_responses);
            init_dump_data_response.push(init_dump_schema);
        }
        Ok(InitDumpDataResponse::from_schema_list(
            init_dump_data_response,
        ))
    }
    pub async fn import_database(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        import_database_req: ImportDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        info!("import_database_req: {:?}", import_database_req);
        Ok(())
    }
    pub async fn dump_database(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        dump_database_req: DumpDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        Ok(())
    }
    pub async fn generate_database_document(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        file_dir: String,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        Ok(())
    }
    pub async fn drop_index(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        Ok(())
    }
    pub async fn drop_table(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        Ok(())
    }
    pub async fn truncate_table(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        Ok(())
    }

    pub async fn get_column_info_for_is(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<GetColumnInfoForInsertSqlResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        Ok(GetColumnInfoForInsertSqlResponse::new())
    }
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
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
                let sql = format!(
                    "SELECT pg_size_pretty(pg_database_size('{}')) AS database_size;",
                    database_name
                );
                let db_size_row = sqlx::query(&sql)
                    .fetch_optional(&mut connection)
                    .await?
                    .ok_or(anyhow!("Not found"))?;
                let description: String = db_size_row.try_get(0)?;
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "database".to_string(),
                    database_name.to_string(),
                    Some(description),
                );
                vec.push(list_node_info_response_item);
            }
            vec.sort_by(|a, b| a.name.cmp(&b.name));

            return Ok(ListNodeInfoResponse::new(vec));
        } else if list_node_info_req.level_infos.len() == 2 {
            let database_name = list_node_info_req.level_infos[1].config_value.clone();
            let test_url = self.connection_url_with_database(database_name);
            info!("test_url: {}", test_url);
            let mut connection = PgConnection::connect(&test_url).await?;
            let sql = "SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  AND schema_name NOT LIKE 'pg_%';";
            let rows = sqlx::query(sql).fetch_all(&mut connection).await?;
            if rows.is_empty() {
                return Ok(ListNodeInfoResponse::new_with_empty());
            }
            for item in rows.iter() {
                let schema_name: String = item.try_get(0)?;
                let list_node_info_response_item = ListNodeInfoResponseItem::new(
                    true,
                    true,
                    "public".to_string(),
                    schema_name,
                    None,
                );
                vec.push(list_node_info_response_item);
            }

            return Ok(ListNodeInfoResponse::new(vec));
        } else if list_node_info_req.level_infos.len() == 3 {
            let level_infos = list_node_info_req.level_infos;

            let base_config_id = level_infos[0].config_value.parse::<i32>()?;
            let database_name = level_infos[1].config_value.clone();
            let schema_name = level_infos[2].config_value.clone();
            let connection_url = self.connection_url_with_database(database_name);

            let mut conn = PgConnection::connect(&connection_url).await?;
            let sql = format!(
                "SELECT COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = '{}';",
                schema_name
            );
            let result_row = sqlx::query(&sql)
                .fetch_optional(&mut conn)
                .await?
                .ok_or(anyhow!(""))?;
            let tables_count: i64 = result_row.try_get(0)?;
            for (name, icon_name) in get_postgresql_database_data().iter() {
                let description = if *name == "Tables" && tables_count > 0 {
                    Some(format!("({})", tables_count))
                } else {
                    None
                };
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
        } else if list_node_info_req.level_infos.len() == 4 {
            let node_name = list_node_info_req.level_infos[3].config_value.clone();
            let schema_name = list_node_info_req.level_infos[2].config_value.clone();

            let base_config_id = list_node_info_req.level_infos[0]
                .config_value
                .parse::<i32>()?;

            if node_name == "Tables" {
                let database_name = list_node_info_req.level_infos[1].config_value.clone();
                let test_url = self.connection_url_with_database(database_name);
                info!("test_url: {}", test_url);
                let mut connection = PgConnection::connect(&test_url).await?;
                let sql = format!(
                    "SELECT tablename
FROM pg_catalog.pg_tables
WHERE schemaname = '{}';",
                    schema_name
                );
                let rows = sqlx::query(&sql).fetch_all(&mut connection).await?;
                info!("rows: {}", rows.len());
                if rows.is_empty() {
                    return Ok(ListNodeInfoResponse::new_with_empty());
                }
                for item in rows.iter() {
                    let table_name: String = item.try_get(0)?;
                    let sql = format!("select count(*) from {}", table_name.clone());
                    info!("sql: {}", sql);
                    let record_count: i64 = sqlx::query(&sql)
                        .fetch_one(&mut connection)
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
                return Ok(ListNodeInfoResponse::new(vec));
            } else if node_name == "Query" {
                let rows = sqlx::query("select query_name from sql_query where connection_id=?1")
                    .bind(base_config_id)
                    .fetch_all(&appstate.pool)
                    .await?;
                let mut vec = vec![];
                for row in rows {
                    let row_str: String = row.try_get(0)?;

                    let list_node_info_response_item = ListNodeInfoResponseItem::new(
                        false,
                        true,
                        "singleQuery".to_string(),
                        row_str,
                        None,
                    );
                    vec.push(list_node_info_response_item);
                }

                info!("list_node_info: {:?}", vec);
                return Ok(ListNodeInfoResponse::new(vec));
            }
        } else if list_node_info_req.level_infos.len() == 5 {
            for (name, icon_name) in get_postgresql_table_data().iter() {
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
        } else if list_node_info_req.level_infos.len() == 6 {
            let level_infos = list_node_info_req.level_infos;

            let base_config_id = level_infos[0].config_value.parse::<i32>()?;
            let database_name = level_infos[1].config_value.clone();
            let schema_name = level_infos[2].config_value.clone();
            let table_name = level_infos[4].config_value.clone();
            let node_name = level_infos[5].config_value.clone();

            if node_name == "Columns" {
                let connection_url = self.connection_url_with_database(database_name);

                let mut conn = PgConnection::connect(&connection_url).await?;

                let sql = format!("select c.column_name, c.data_type,  t.constraint_type
                from   information_schema.columns c
                left join information_schema.key_column_usage s on s.table_name = c.table_name and s.column_name = c.column_name
                left join information_schema.table_constraints t on t.table_name = c.table_name and t.constraint_name = s.constraint_name
                where  c.table_name ='{}' ", table_name);
                info!("sql: {}", sql);
                let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
                for item in rows {
                    let column_name: String = item.try_get(0)?;
                    let column_type: String = item.try_get(1)?;

                    let key_name: Option<String> = item.try_get(2)?;
                    if let Some(s) = key_name {
                        if s == "PRIMARY KEY" {
                            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                                false,
                                true,
                                "primary".to_string(),
                                column_name,
                                Some(column_type),
                            );
                            vec.push(list_node_info_response_item);
                        }
                    } else {
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "column".to_string(),
                            column_name,
                            Some(column_type),
                        );
                        vec.push(list_node_info_response_item);
                    }
                }
                return Ok(ListNodeInfoResponse::new(vec));
            } else if node_name == "Index" {
                let connection_url = self.connection_url_with_database(database_name);

                let mut conn = PgConnection::connect(&connection_url).await?;

                let sql = format!(
                    "SELECT 
    indexname AS index_name,
    indexdef AS index_definition
FROM 
    pg_indexes
WHERE 
    schemaname = '{}'  
    AND tablename = '{}'; ",
                    schema_name.clone(),
                    table_name
                );
                info!("sql: {}", sql);
                let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
                for item in rows {
                    let index_name: String = item.try_get(0)?;

                    let key_name: String = item.try_get(1)?;
                    if key_name == "PRIMARY KEY" {
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "singlePrimaryIndex".to_string(),
                            index_name,
                            None,
                        );
                        vec.push(list_node_info_response_item);
                    } else {
                        // vec.push((index_name, "singleCommonIndex".to_string(), None));
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "singleCommonIndex".to_string(),
                            index_name,
                            None,
                        );
                        vec.push(list_node_info_response_item);
                    }
                }
            }
            return Ok(ListNodeInfoResponse::new(vec));
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
    pub async fn get_ddl(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let connection_url = self.connection_url_with_database(database_name);

        let mut conn = PgConnection::connect(&connection_url).await?;
        let sql = format!(
            "SELECT                                          
  'CREATE TABLE ' || relname || E'\n(\n' ||
  array_to_string(
    array_agg(
      '    ' || column_name || ' ' ||  type || ' '|| not_null
    )
    , E',\n'
  ) || E'\n);\n'
from
(
  SELECT 
    c.relname, a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as type,
    case 
      when a.attnotnull
    then 'NOT NULL' 
    else 'NULL' 
    END as not_null 
  FROM pg_class c,
   pg_attribute a,
   pg_type t
   WHERE c.relname = '{}'
   AND a.attnum > 0
   AND a.attrelid = c.oid
   AND a.atttypid = t.oid
 ORDER BY a.attnum
) as tabledefinition
group by relname;",
            table_name
        );
        let row = sqlx::query(&sql)
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!("Not found table"))?;
        let ddl: String = row.try_get(0)?;
        Ok(ddl)
    }
    pub async fn update_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());

        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let node_name = level_infos[2].config_value.clone();
        Ok(())
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let connection_url = self.connection_url_with_database(database_name);

        let mut conn = PgConnection::connect(&connection_url).await?;
        let show_column_sql = format!(
            "SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '{}' AND table_schema = '{}';",
            table_name, schema_name
        );
        let rows = sqlx::query(&show_column_sql).fetch_all(&mut conn).await?;
        if rows.is_empty() {
            return Ok(ShowColumnsResponse::new());
        }
        let first_row = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];

        for (index, item) in first_row.columns().iter().enumerate() {
            let type_name = item.type_info().name();
            let column_name = item.name();
            headers.push(ShowColumnHeader {
                name: column_name.to_string(),
                type_name: type_name.to_string().to_uppercase(),
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
        let exe_sql_response = ShowColumnsResponse::from(headers, response_rows);

        Ok(exe_sql_response)
    }
    pub async fn get_complete_words(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        Ok(vec![])
    }
    pub async fn remove_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        column_name: String,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        // let column_name = level_infos[6].config_value.clone();

        let connection_url = self.connection_url_with_database(database_name);

        let mut conn = PgConnection::connect(&connection_url).await?;

        let sql = format!("ALTER TABLE {} DROP COLUMN {};", table_name, column_name);
        info!("remove_column sql: {}", sql);
        let _ = sqlx::query(&sql).execute(&mut conn).await?;

        Ok(())
    }
    pub async fn drop_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let column_name = level_infos[6].config_value.clone();

        let connection_url = self.connection_url_with_database(database_name);

        let mut conn = PgConnection::connect(&connection_url).await?;

        let sql = format!("ALTER TABLE {} DROP COLUMN {};", table_name, column_name);
        info!("remove_column sql: {}", sql);
        let _ = sqlx::query(&sql).execute(&mut conn).await?;

        Ok(())
    }
}
