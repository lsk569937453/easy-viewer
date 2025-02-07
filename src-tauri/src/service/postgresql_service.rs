use crate::service::base_config_service::DatabaseHostStruct;
use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnStructItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResItem;
use crate::service::dump_data::postgresql_dump_data_service::PostgresqlDumpData;
use crate::service::dump_data::postgresql_dump_data_service::PostgresqlDumpDataItem;
use crate::sql_lite::connection::AppState;
use crate::util::common_utils::serde_value_to_string;
use crate::util::sql_utils::postgres_row_to_json;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use chrono::Local;
use docx_rs::*;
use itertools::Itertools;
use std::collections::HashSet;
use tokio::io::BufReader;

use std::path::Path;
use tokio::fs::File;

use crate::service::dump_data::dump_database_service::DumpTableList;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::get_column_info_for_is_response::ColumnTypeFlag;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponseItem;
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
use tokio::io::AsyncBufReadExt;
use tokio::time::timeout;
static POSTGRESQL_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> =
    OnceLock::new();
static POSTGRESQL_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();
const GET_SCHEMA_SQL: &str = "SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  AND schema_name NOT LIKE 'pg_%';";
fn generate_ddl(schema_name: String, table_name: String) -> String {
    format!(
        "SELECT 'CREATE TABLE ' || table_schema || '.' || table_name || ' (' || E'\n' ||
       array_to_string(
           array_agg(
               '    ' || column_name || ' ' || 
               data_type || 
               CASE 
                   WHEN character_maximum_length IS NOT NULL 
                   THEN '(' || character_maximum_length || ')'
                   ELSE ''
               END ||
               CASE 
                   WHEN numeric_precision IS NOT NULL 
                   THEN '(' || numeric_precision || ',' || numeric_scale || ')'
                   ELSE ''
               END ||
               CASE 
                   WHEN is_nullable = 'NO' THEN ' NOT NULL'
                   ELSE ''
               END
           ), E',\n'
       ) || E'\n);'
FROM information_schema.columns
WHERE table_name = '{}' 
  AND table_schema = '{}'
GROUP BY table_schema, table_name;
",
        table_name, schema_name
    )
}
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
    async fn get_connection(&self) -> Result<PgConnection, anyhow::Error> {
        let connection_url = self.connection_url();
        let conn = timeout(
            Duration::from_millis(500),
            PgConnection::connect(&connection_url),
        )
        .await
        .map_err(|_| anyhow!("Connect timeout"))??;

        Ok(conn)
    }
    async fn get_connection_with_database(
        &self,
        database_name: String,
    ) -> Result<PgConnection, anyhow::Error> {
        let connection_url = self.connection_url_with_database(database_name);

        let conn = timeout(
            Duration::from_millis(500),
            PgConnection::connect(&connection_url),
        )
        .await??;
        Ok(conn)
    }
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("postgres".to_string());
        PgConnection::connect(&test_url).await.map(|_| ())?;
        Ok(())
    }
    pub async fn init_dump_data(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<InitDumpDataResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

        let rows = sqlx::query(GET_SCHEMA_SQL).fetch_all(&mut conn).await?;
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
        _appstate: &AppState,
        import_database_req: ImportDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        info!("import_database_req: {:?}", import_database_req);
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

        let file = File::open(&import_database_req.file_path).await?;

        let reader = BufReader::new(file);

        let mut lines = reader.lines();

        let mut sql_buffer = String::new();

        while let Some(line) = lines.next_line().await? {
            if line.trim().is_empty() {
                if !sql_buffer.trim().is_empty() {
                    info!("Executing SQL: {}", sql_buffer);
                    conn.execute(&*sql_buffer).await?;
                    sql_buffer.clear();
                }
            } else {
                sql_buffer.push_str(&line);
                sql_buffer.push('\n');
            }
        }

        if !sql_buffer.trim().is_empty() {
            info!("Executing final SQL: {}", sql_buffer);
            conn.execute(&*sql_buffer).await?;
        }
        Ok(())
    }
    pub async fn dump_database(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        dump_database_req: DumpDatabaseReq,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let common_data = dump_database_req.source_data.get_postgresql_data()?;
        let mut vecs = vec![];
        for schema in common_data.list {
            let schema_checked = schema.checked;
            if !schema_checked {
                continue;
            }

            let schema_name = schema.schema_name;
            let create_schema_sql = format!(
                "SELECT 'CREATE SCHEMA ' || schema_name || ';'
FROM information_schema.schemata
WHERE schema_name = '{}';",
                schema_name.clone()
            );
            let creat_schema_row: String = sqlx::query(&create_schema_sql)
                .fetch_optional(&mut conn)
                .await?
                .ok_or(anyhow!("Not found schema"))?
                .try_get(0)?;
            let mut dump_data_list = vec![];

            for table in schema.table_list {
                let table_checked = table.checked;
                if !table_checked {
                    continue;
                }
                let table_name = table.table_name;
                let create_table_sql = generate_ddl(schema_name.clone(), table_name.clone());
                info!("create_table_sql: {}", create_table_sql);
                let creat_table_row: String = sqlx::query(&create_table_sql)
                    .fetch_optional(&mut conn)
                    .await?
                    .ok_or(anyhow!("Not found table"))?
                    .try_get(0)?;

                let mut dump_database_res_item = DumpDatabaseResItem::new();
                dump_database_res_item.table_name = table_name.clone();
                dump_database_res_item.table_struct = creat_table_row;
                if dump_database_req.export_option.is_export_data() {
                    let selected_column = table
                        .columns
                        .iter()
                        .filter(|x| x.checked)
                        .map(|x| x.column_name.clone())
                        .join(",");
                    let sql = format!(
                        "select {} from {}.{}",
                        selected_column,
                        schema_name.clone(),
                        table_name.clone()
                    );
                    let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
                    if !rows.is_empty() {
                        let mut vec = vec![];
                        let mut column_structs = vec![];
                        for (row_index, item) in rows.iter().enumerate() {
                            let columns = item.columns();
                            let len = columns.len();
                            let mut database_res_column_list = vec![];
                            for (i, _) in columns.iter().enumerate().take(len) {
                                let column_name = columns[i].name();
                                let column_type = columns[i].type_info().name();
                                let column_value = postgres_row_to_json(item, column_type, i)?;
                                let database_res_column_item =
                                    DumpDatabaseResColumnItem::from(column_value);
                                database_res_column_list.push(database_res_column_item);

                                if row_index == 0 {
                                    let database_res_column_struct_item =
                                        DumpDatabaseResColumnStructItem::from(
                                            column_name.to_string(),
                                            column_type.to_string(),
                                        );
                                    column_structs.push(database_res_column_struct_item);
                                }
                            }
                            vec.push(database_res_column_list);
                        }
                        dump_database_res_item.column_list = vec;
                        dump_database_res_item.column_structs = column_structs;
                        dump_database_res_item.table_name =
                            format!("{}.{}", schema_name, table_name);
                    }
                }
                dump_data_list.push(dump_database_res_item);
            }
            let postgresql_dump_data_item =
                PostgresqlDumpDataItem::from(creat_schema_row, DumpTableList::from(dump_data_list));
            vecs.push(postgresql_dump_data_item);
        }
        info!("dump_data_list: {:#?}", vecs);
        let dump_database_res = PostgresqlDumpData::from(vecs);
        dump_database_res.export_to_file(dump_database_req)?;
        Ok(())
    }
    pub async fn generate_database_document(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        file_dir: String,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self
            .get_connection_with_database(database_name.clone())
            .await?;
        let rows = sqlx::query(GET_SCHEMA_SQL).fetch_all(&mut conn).await?;
        let schema_names: Vec<String> = rows.iter().map(|row| row.get("schema_name")).collect();
        let dir_path = Path::new(&file_dir);
        let now = Local::now();
        let formatted_time = now.format("%Y-%m-%d-%H-%M-%S").to_string();
        let file_name = format!("{}-{}.docx", database_name, formatted_time);
        let full_path = dir_path.join(file_name);
        info!("full_path: {}", full_path.display());
        let file = std::fs::File::create(full_path)?;

        let style3 = Style::new("Table1", StyleType::Table)
            .name("Table test")
            .table_align(TableAlignmentType::Center);
        let mut doc = Docx::new().add_style(style3);
        for schema_name in schema_names {
            let get_table_sql = format!(
                "SELECT table_name
FROM information_schema.tables
WHERE table_schema = '{}';",
                schema_name
            );
            let tables_names = sqlx::query(&get_table_sql)
                .fetch_all(&mut conn)
                .await?
                .iter()
                .map(|row| -> Result<String, anyhow::Error> { Ok(row.try_get(0)?) })
                .collect::<Result<Vec<String>, _>>()?;
            for table_name in tables_names {
                let show_column_sql = format!(
                    "SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '{}' AND table_schema = '{}';",
                    table_name, schema_name
                );
                let rows = sqlx::query(&show_column_sql).fetch_all(&mut conn).await?;
                if rows.is_empty() {
                    return Ok(());
                }
                let first_row = rows.first().ok_or(anyhow!(""))?;
                let mut headers = vec![];

                for item in first_row.columns().iter() {
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
                    for (i, _) in columns.iter().enumerate().take(len) {
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
                let show_column_response = ShowColumnsResponse::from(headers, response_rows);
                doc = doc.add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(format!("{}.{}", schema_name, table_name))),
                );
                let table = show_column_response.into_docx_table()?;
                doc = doc.add_table(table);
                doc = doc.add_paragraph(Paragraph::new().add_run(Run::new().add_text("")));
            }
        }
        doc.build().pack(file)?;

        Ok(())
    }
    pub async fn drop_index(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let index_name = level_infos[6].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let drop_index_sql = format!("DROP INDEX IF EXISTS {}.{};", schema_name, index_name);
        sqlx::query(&drop_index_sql).execute(&mut conn).await?;
        Ok(())
    }
    pub async fn drop_table(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let drop_index_sql = format!("DROP TABLE {}.{};", schema_name, table_name);
        sqlx::query(&drop_index_sql).execute(&mut conn).await?;
        Ok(())
    }
    pub async fn truncate_table(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let drop_index_sql = format!("TRUNCATE  TABLE {}.{};", schema_name, table_name);
        sqlx::query(&drop_index_sql).execute(&mut conn).await?;
        Ok(())
    }

    pub async fn get_column_info_for_is(
        &self,

        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<GetColumnInfoForInsertSqlResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;
        let sql = format!(
            "SELECT c.column_name,
       c.data_type,
       c.is_nullable,
       c.column_default,
       CASE
           WHEN pk.column_name IS NOT NULL THEN 'YES'
           ELSE 'NO'
       END AS is_primary_key
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage pk
    ON c.column_name = pk.column_name
    AND c.table_name = pk.table_name
    AND c.table_schema = pk.table_schema
LEFT JOIN information_schema.table_constraints t
    ON pk.constraint_name = t.constraint_name
    AND t.constraint_type = 'PRIMARY KEY'
WHERE c.table_schema = '{}'  
  AND c.table_name = '{}';",
            schema_name, table_name
        );
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
        let mut response_rows = vec![];
        info!("rows: {:?}", rows);
        for item in rows.iter() {
            let columns = item.columns();
            let type_name = columns[0].type_info().name();
            let column_name = serde_value_to_string(postgres_row_to_json(item, type_name, 0)?)
                .unwrap_or_default();
            let type_name = columns[1].type_info().name();
            let column_type = serde_value_to_string(postgres_row_to_json(item, type_name, 1)?)
                .unwrap_or_default();
            let type_flag = ColumnTypeFlag::from(column_type.clone());

            let key_type: String = item.try_get(4)?;
            let is_primary = key_type == "YES";
            let get_column_info_for_is_response_item = GetColumnInfoForInsertSqlResponseItem::from(
                column_name,
                column_type,
                type_flag,
                is_primary,
            );

            response_rows.push(get_column_info_for_is_response_item);
        }
        Ok(GetColumnInfoForInsertSqlResponse::from(response_rows))
    }

    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let mut vec = vec![];

        if list_node_info_req.level_infos.len() == 1 {
            let mut connection = self.get_connection().await?;

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
            let mut connection = self.get_connection_with_database(database_name).await?;
            let rows = sqlx::query(GET_SCHEMA_SQL)
                .fetch_all(&mut connection)
                .await?;
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
            let database_name = level_infos[1].config_value.clone();
            let schema_name = level_infos[2].config_value.clone();

            let mut conn = self.get_connection_with_database(database_name).await?;
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
                let mut connection = self.get_connection_with_database(database_name).await?;
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
                    let sql = format!(
                        "select count(*) from {}.{}",
                        schema_name.clone(),
                        table_name.clone()
                    );
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
            let database_name = level_infos[1].config_value.clone();
            let schema_name = level_infos[2].config_value.clone();
            let table_name = level_infos[4].config_value.clone();
            let node_name = level_infos[5].config_value.clone();

            if node_name == "Columns" {
                let mut conn = self.get_connection_with_database(database_name).await?;

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
                let mut conn = self.get_connection_with_database(database_name).await?;

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
        _appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

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
            for (i, _) in columns.iter().enumerate().take(len) {
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
        _appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let sql = generate_ddl(schema_name, table_name);
        let row = sqlx::query(&sql)
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!("Not found table"))?;
        let ddl: String = row.try_get(0)?;
        Ok(ddl)
    }
    pub async fn update_record(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
        let mut vec = vec![];
        for sql in sqls {
            info!("sql: {}", sql);
            let result = conn.execute(&*sql).await.map_err(|e| anyhow!(e));
            if let Err(err) = result {
                vec.push(err.to_string())
            }
        }
        if !vec.is_empty() {
            let error_mes = vec.join(";");
            return Err(anyhow!(error_mes));
        }
        Ok(())
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let table_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;
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

        for item in first_row.columns().iter() {
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
            for (i, _) in columns.iter().enumerate().take(len) {
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
        _appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;
        let mut set = HashSet::new();

        let schema_names = sqlx::query(GET_SCHEMA_SQL)
            .fetch_all(&mut conn)
            .await?
            .iter()
            .map(|row| -> Result<String, anyhow::Error> { Ok(row.try_get(0)?) })
            .collect::<Result<Vec<String>, anyhow::Error>>()?;
        for schema_name in schema_names {
            let get_tables_sql = format!(
                "SELECT table_name
FROM information_schema.tables
WHERE table_schema = '{}'
  AND table_type = 'BASE TABLE';",
                schema_name
            );
            set.insert(schema_name.clone());
            let table_names = sqlx::query(&get_tables_sql)
                .fetch_all(&mut conn)
                .await?
                .iter()
                .map(|row| -> Result<String, anyhow::Error> { Ok(row.try_get(0)?) })
                .collect::<Result<Vec<String>, anyhow::Error>>()?;
            for table_name in table_names {
                set.insert(table_name.clone());
                let get_column_sql = format!(
                    "SELECT column_name
FROM information_schema.columns
WHERE table_schema = '{}'
  AND table_name = '{}';",
                    schema_name, table_name
                );
                let column_names = sqlx::query(&get_column_sql)
                    .fetch_all(&mut conn)
                    .await?
                    .iter()
                    .map(|row| -> Result<String, anyhow::Error> { Ok(row.try_get(0)?) })
                    .collect::<Result<Vec<String>, anyhow::Error>>()?;
                for column_name in column_names {
                    set.insert(column_name);
                }
            }
        }
        let vec: Vec<String> = set.into_iter().collect();

        Ok(vec)
    }
    pub async fn remove_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        column_name: String,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!("ALTER TABLE {} DROP COLUMN {};", table_name, column_name);
        info!("remove_column sql: {}", sql);
        sqlx::query(&sql).execute(&mut conn).await?;

        Ok(())
    }
    pub async fn update_comment(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        new_comment: String,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;

        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!("COMMENT ON TABLE {} IS '{}';", table_name, new_comment);
        info!("update comment sql: {}", sql);
        sqlx::query(&sql).execute(&mut conn).await?;

        Ok(())
    }
    pub async fn drop_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[4].config_value.clone();
        let column_name = level_infos[6].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;
        let sql = format!("ALTER TABLE {} DROP COLUMN {};", table_name, column_name);
        info!("remove_column sql: {}", sql);
        let _ = sqlx::query(&sql).execute(&mut conn).await?;
        Ok(())
    }
}
