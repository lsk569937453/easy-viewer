use crate::service::base_config_service::DatabaseHostStruct;
use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResItem;
use crate::service::dump_data::dump_database_service::DumpTableList;
use crate::service::dump_data::mssql_dump_data_service::MssqlDumpData;
use crate::service::dump_data::mssql_dump_data_service::MssqlDumpDataItem;
use crate::util::sql_utils::mssql_row_to_json;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::get_column_info_for_is_response::ColumnTypeFlag;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponse;
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
use crate::AppState;
use futures_util::TryStreamExt;
use human_bytes::human_bytes;

use crate::service::dump_data::dump_database_service::DumpDatabaseResColumnStructItem;
use crate::vojo::get_column_info_for_is_response::GetColumnInfoForInsertSqlResponseItem;
use crate::vojo::import_database_req::ImportDatabaseReq;
use chrono::Local;
use docx_rs::*;
use itertools::Itertools;
use linked_hash_map::LinkedHashMap;
use serde::Deserialize;
use serde::Serialize;
use std::collections::HashSet;
use std::path::Path;
use std::sync::OnceLock;
use std::time::Duration;
use std::vec;
use tiberius::numeric::Numeric;
use tiberius::AuthMethod;
use tiberius::Client;
use tiberius::Config;
use tiberius::QueryItem;
use tokio::fs::File;
use tokio::io::AsyncBufReadExt;
use tokio::io::BufReader;
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
fn get_schema_sql(database: String) -> String {
    format!("SELECT schema_name
    FROM {}.information_schema.schemata WHERE schema_name NOT IN ('INFORMATION_SCHEMA', 'guest', 'db_accessadmin', 'db_owner', 'sys',   'db_denydatareader', 
    'db_denydatawriter', 'db_datareader', 'db_datawriter', 'db_ddladmin', 'db_securityadmin', 'db_backupoperator');",database)
}
fn get_table_sql(schema_name: String) -> String {
    format!(
        "SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '{}'
      AND TABLE_TYPE = 'BASE TABLE';",
        schema_name
    )
}
fn get_ddl_sql(schema_name: String, table_name: String) -> String {
    format!("SELECT  
    'CREATE TABLE [' + s.name + '].[' + so.name + '] (' + 
    REPLACE(o.list, ', ', ',' + CHAR(13) + CHAR(10) + '    ') + ')' + CHAR(13) + CHAR(10) + 
    CASE 
        WHEN tc.Constraint_Name IS NULL THEN '' 
        ELSE 
            'ALTER TABLE [' + s.name + '].[' + so.Name + '] ADD CONSTRAINT ' + tc.Constraint_Name + CHAR(13) + CHAR(10) +
            '    PRIMARY KEY (' + LEFT(j.List, LEN(j.List) - 1) + ')' 
    END AS CreateTableScript
FROM sysobjects so
JOIN sys.schemas s ON so.uid = s.schema_id  -- Join with schemas to get schema name
CROSS APPLY (
    SELECT 
        '  [' + column_name + '] ' + 
        data_type + 
        CASE data_type
            WHEN 'sql_variant' THEN ''
            WHEN 'text' THEN ''
            WHEN 'ntext' THEN ''
            WHEN 'xml' THEN ''
            WHEN 'decimal' THEN '(' + CAST(numeric_precision AS VARCHAR) + ', ' + CAST(numeric_scale AS VARCHAR) + ')'
            ELSE COALESCE(
                '(' + CASE 
                          WHEN character_maximum_length = -1 THEN 'MAX' 
                          ELSE CAST(character_maximum_length AS VARCHAR) 
                      END + ')', 
                ''
            ) 
        END + ' ' +
        CASE 
            WHEN EXISTS ( 
                SELECT id 
                FROM syscolumns
                WHERE object_name(id) = so.name
                AND name = column_name
                AND columnproperty(id, name, 'IsIdentity') = 1 
            ) THEN 'IDENTITY(' + CAST(ident_seed(so.name) AS VARCHAR) + ',' + CAST(ident_incr(so.name) AS VARCHAR) + ')' 
            ELSE '' 
        END + ' ' +
        (CASE WHEN UPPER(IS_NULLABLE) = 'NO' THEN 'NOT ' ELSE '' END) + 'NULL ' + 
        CASE 
            WHEN information_schema.columns.COLUMN_DEFAULT IS NOT NULL THEN 'DEFAULT ' + information_schema.columns.COLUMN_DEFAULT 
            ELSE '' 
        END + ', ' 
    FROM information_schema.columns 
    WHERE table_name = so.name
    ORDER BY ordinal_position
    FOR XML PATH('')
) o (list)
LEFT JOIN information_schema.table_constraints tc
    ON tc.Table_name = so.Name
    AND tc.Constraint_Type = 'PRIMARY KEY'
CROSS APPLY (
    SELECT '[' + Column_Name + '], '
    FROM information_schema.key_column_usage kcu
    WHERE kcu.Constraint_Name = tc.Constraint_Name
    ORDER BY ORDINAL_POSITION
    FOR XML PATH('')
) j (list)
WHERE so.xtype = 'U'
AND s.name = '{}'
AND so.name = '{}';",schema_name,table_name)
}
fn get_mssql_table_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MSSQL_TABLE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Columns", "columns");
        map.insert("Index", "index");
        map
    })
}
fn get_index_sql(schema_name: String, table_name: String) -> String {
    format!(
        "SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    c.name AS ColumnName,
    ic.key_ordinal AS KeyOrdinal,
    i.is_unique AS IsUnique,
    i.is_primary_key AS IsPrimaryKey
FROM 
    sys.indexes i
INNER JOIN 
    sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN 
    sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE 
    i.object_id = OBJECT_ID('{}.{}');",
        schema_name, table_name
    )
}
async fn run_sql(conn: &mut Client<Compat<TcpStream>>, sql: &str) -> Result<(), anyhow::Error> {
    if sql.contains("CREATE SCHEMA") {
        conn.simple_query(sql).await?;
    } else {
        conn.execute(sql, &[]).await?;
    }
    Ok(())
}
#[derive(Deserialize, Serialize, Clone)]
pub struct MssqlConfig {
    pub config: DatabaseHostStruct,
}

impl MssqlConfig {
    pub async fn update_record(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        sqls: Vec<String>,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();

        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let mut vec = vec![];
        for sql in sqls {
            info!("sql: {}", sql);
            let result = conn.execute(&*sql, &[]).await.map_err(|e| anyhow!(e));
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

        let sql = format!("TRUNCATE TABLE {}.{};", schema_name, table_name);
        info!("truncate_table  sql: {}", sql);
        let _ = conn.execute(&sql, &[]).await?;
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
            "SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{}' AND TABLE_SCHEMA = '{}';",
            table_name, schema_name
        );
        let mut rows = conn.query(&show_column_sql, &[]).await?;
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
                        headers.push(ShowColumnHeader {
                            name: column_name.to_string(),
                            type_name: type_name_str.to_uppercase(),
                        });
                    }
                }
            }
        }

        let exe_sql_response = ShowColumnsResponse::from(headers, response_rows);

        Ok(exe_sql_response)
    }
    pub async fn remove_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
        column_name: String,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();

        let table_name = level_infos[4].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!(
            "ALTER TABLE {}.{} DROP COLUMN {};",
            schema_name, table_name, column_name
        );
        info!("remove_column sql: {}", sql);
        let _ = conn.execute(&sql, &[]).await?;
        Ok(())
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
                    run_sql(&mut conn, &sql_buffer).await?;
                    sql_buffer.clear();
                }
            } else {
                sql_buffer.push_str(&line);
                sql_buffer.push('\n');
            }
        }

        if !sql_buffer.trim().is_empty() {
            info!("Executing final SQL: {}", sql_buffer);
            // conn.execute(&*sql_buffer, &[]).await?;
            run_sql(&mut conn, &sql_buffer).await?;
        }
        Ok(())
    }

    pub async fn get_procedure_details(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();
        let procedure_name = level_infos[4].config_value.clone();

        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!("EXEC sp_helptext '{}.{}';", schema_name, procedure_name);

        let res_row = conn.query(&sql, &[]).await?.into_first_result().await?;
        let mut vecs = vec![];
        for item in res_row.iter() {
            let query: &str = item.try_get(0)?.ok_or(anyhow!(""))?;
            vecs.push(query);
        }

        Ok(vecs.join(""))
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

        let sql = get_ddl_sql(schema_name, table_name);
        let row = conn
            .query(&sql, &[])
            .await?
            .into_row()
            .await?
            .ok_or(anyhow!(""))?;
        let ddl: &str = row.try_get(0)?.ok_or(anyhow!(""))?;
        Ok(ddl.to_string())
    }
    pub async fn get_complete_words(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<Vec<String>, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let mut conn = self
            .get_connection_with_database(database_name.clone())
            .await?;

        let mut set = HashSet::new();

        let schema_names_res = conn
            .query(get_schema_sql(database_name), &[])
            .await?
            .into_first_result()
            .await?;
        let schema_names = schema_names_res
            .iter()
            .map(|item| -> Result<&str, anyhow::Error> {
                item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
            });
        for item in schema_names {
            let schema_name = item?;

            set.insert(schema_name.to_string());
            let table_names_res = conn
                .query(get_table_sql(schema_name.to_string()), &[])
                .await?
                .into_first_result()
                .await?;
            let table_names = table_names_res
                .iter()
                .map(|item| -> Result<&str, anyhow::Error> {
                    item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
                });
            for table_name_item in table_names {
                let table_name = table_name_item?;
                set.insert(table_name.to_string());
                let get_column_sql = format!(
                    "SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = '{}'
  AND TABLE_NAME = '{}';",
                    schema_name, table_name
                );
                let column_names_res = conn
                    .query(get_column_sql, &[])
                    .await?
                    .into_first_result()
                    .await?;
                let column_names =
                    column_names_res
                        .iter()
                        .map(|item| -> Result<&str, anyhow::Error> {
                            item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
                        });

                for column_name_item in column_names {
                    let column_name = column_name_item?;
                    set.insert(column_name.to_string());
                }
            }
        }
        let vec: Vec<String> = set.into_iter().collect();

        Ok(vec)
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
            "SELECT 
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.IS_NULLABLE,
    c.COLUMN_DEFAULT,
    CASE
        WHEN pk.COLUMN_NAME IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END AS is_primary_key
FROM INFORMATION_SCHEMA.COLUMNS c
LEFT JOIN (
    SELECT 
        kcu.COLUMN_NAME,
        kcu.TABLE_NAME,
        kcu.TABLE_SCHEMA
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        AND kcu.TABLE_NAME = tc.TABLE_NAME
        AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
        AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
) pk
    ON c.COLUMN_NAME = pk.COLUMN_NAME
    AND c.TABLE_NAME = pk.TABLE_NAME
    AND c.TABLE_SCHEMA = pk.TABLE_SCHEMA
WHERE c.TABLE_SCHEMA = '{}' 
  AND c.TABLE_NAME = '{}';",
            schema_name, table_name
        );
        let rows = conn.query(&sql, &[]).await?.into_first_result().await?;
        let mut response_rows = vec![];
        info!("rows: {:?}", rows);
        for item in rows.iter() {
            let column_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;
            let column_type: &str = item.try_get(1)?.ok_or(anyhow!(""))?;
            let key_type: &str = item.try_get(4)?.ok_or(anyhow!(""))?;
            let is_primary = key_type == "YES";

            let type_flag = ColumnTypeFlag::from(column_type.to_string().clone());

            let get_column_info_for_is_response_item = GetColumnInfoForInsertSqlResponseItem::from(
                column_name.to_string(),
                column_type.to_string(),
                type_flag,
                is_primary,
            );

            response_rows.push(get_column_info_for_is_response_item);
        }
        Ok(GetColumnInfoForInsertSqlResponse::from(response_rows))
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

        let rows = conn
            .query(&get_schema_sql(database_name.clone()), &[])
            .await?
            .into_first_result()
            .await?;
        let schema_names = rows.iter().map(|row| -> Result<&str, anyhow::Error> {
            row.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
        });
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
        for item in schema_names {
            let schema_name = item?.to_string();
            let get_table_sql = get_table_sql(schema_name.clone());

            let rows = conn
                .query(&get_table_sql, &[])
                .await?
                .into_first_result()
                .await?;
            let table_rows = rows.iter().map(|item| -> Result<&str, anyhow::Error> {
                item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
            });

            for table_rows_item in table_rows {
                let table_name = table_rows_item?.to_string();
                let show_column_sql = format!(
                    "SELECT 
    COLUMN_NAME AS column_name, 
    DATA_TYPE AS data_type, 
    IS_NULLABLE AS is_nullable, 
    COLUMN_DEFAULT AS column_default
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{}' 
  AND TABLE_SCHEMA = '{}';",
                    table_name, schema_name
                );
                let mut rows = conn.query(&show_column_sql, &[]).await?;
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
                                headers.push(ShowColumnHeader {
                                    name: column_name.to_string(),
                                    type_name: type_name_str.to_uppercase(),
                                });
                            }
                        }
                    }
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
            let create_schema = format!("CREATE SCHEMA [{}];", schema_name.clone());
            let mut dump_data_list = vec![];

            for table in schema.table_list {
                let table_checked = table.checked;
                if !table_checked {
                    continue;
                }
                let table_name = table.table_name;
                let create_table_sql = get_ddl_sql(schema_name.clone(), table_name.clone());
                info!("create_table_sql: {}", create_table_sql);
                let creat_table_row = conn
                    .query(&create_table_sql, &[])
                    .await?
                    .into_row()
                    .await?
                    .ok_or(anyhow!(""))?;
                let create_table: &str = creat_table_row.try_get(0)?.ok_or(anyhow!(""))?;

                let mut dump_database_res_item = DumpDatabaseResItem::new();
                dump_database_res_item.table_name = table_name.clone();
                dump_database_res_item.table_struct = create_table.to_string();
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
                    info!("sql: {}", sql);
                    let rows = conn.query(&sql, &[]).await?.into_first_result().await?;
                    if !rows.is_empty() {
                        let mut vec = vec![];
                        let mut column_structs = vec![];
                        for (row_index, item) in rows.iter().enumerate() {
                            let mut database_res_column_list = vec![];
                            for (column, column_data) in item.cells() {
                                let column_name = column.name();
                                let column_type = column.column_type();
                                let type_name_str = format!("{:?}", column_type);

                                let column_value = mssql_row_to_json(column_data)?;
                                let database_res_column_item =
                                    DumpDatabaseResColumnItem::from(column_value);
                                database_res_column_list.push(database_res_column_item);

                                if row_index == 0 {
                                    let database_res_column_struct_item =
                                        DumpDatabaseResColumnStructItem::from(
                                            column_name.to_string(),
                                            type_name_str.to_string(),
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
            let mssql_dump_data_item = MssqlDumpDataItem::from(
                create_schema.to_string(),
                DumpTableList::from(dump_data_list),
            );
            vecs.push(mssql_dump_data_item);
        }
        info!("dump_data_list: {:#?}", vecs);
        let dump_database_res = MssqlDumpData::from(vecs);
        dump_database_res.export_to_file(dump_database_req)?;
        Ok(())
    }
    pub async fn init_dump_data(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<InitDumpDataResponse, anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();

        let mut conn = self
            .get_connection_with_database(database_name.clone())
            .await?;
        let sql = get_schema_sql(database_name);

        let schema_rows = conn.query(&sql, &[]).await?.into_first_result().await?;
        let schema_names = schema_rows
            .iter()
            .map(|item| -> Result<&str, anyhow::Error> {
                item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
            });

        let mut init_dump_data_response = vec![];
        for item in schema_names {
            let schema_name = item?;
            let mut sql = get_table_sql(schema_name.to_string());
            let table_rows = conn.query(&sql, &[]).await?.into_first_result().await?;
            let table_names = table_rows
                .iter()
                .map(|item| -> Result<&str, anyhow::Error> {
                    item.try_get::<&str, _>(0)?.ok_or(anyhow!(""))
                });

            let mut init_dump_tables_responses = vec![];

            for table_item in table_names {
                let table_name = table_item?;
                sql = format!(
                    "SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = '{}'  
  AND table_name = '{}';",
                    schema_name, table_name
                );
                let rows = conn.query(&sql, &[]).await?.into_first_result().await?;

                let mut vec = vec![];
                for item in rows.iter() {
                    let column_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;
                    let column_type: &str = item.try_get(1)?.ok_or(anyhow!(""))?;
                    let init_column_item = InitDumpDataColumnItem::from(
                        column_name.to_string(),
                        column_type.to_string(),
                    );
                    vec.push(init_column_item);
                }
                let init_dump_tables = InitDumpTableResponseItem::from(table_name.to_string(), vec);
                init_dump_tables_responses.push(init_dump_tables);
            }
            let init_dump_schema = InitDumpSchemaResponseItem::from(
                schema_name.to_string(),
                init_dump_tables_responses,
            );
            init_dump_data_response.push(init_dump_schema);
        }
        Ok(InitDumpDataResponse::from_schema_list(
            init_dump_data_response,
        ))
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
        let drop_table_sql = format!("DROP TABLE {}.{};", schema_name, table_name);
        let _ = conn.execute(&drop_table_sql, &[]).await?;

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

        let table_name = level_infos[4].config_value.clone();
        let index_name = level_infos[6].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;
        let show_index_sql = get_index_sql(schema_name.clone(), table_name.clone());
        let rows = conn
            .query(&show_index_sql, &[])
            .await?
            .into_first_result()
            .await?;
        let row = rows
            .iter()
            .find(|item| {
                item.try_get(0)
                    .ok()
                    .flatten()
                    .map_or(false, |value: &str| value == index_name)
            })
            .ok_or(anyhow!("Not found index"))?;
        let is_primary: bool = row.try_get(5)?.ok_or(anyhow!(""))?;
        let is_unique: bool = row.try_get(4)?.ok_or(anyhow!(""))?;

        let drop_sql = if is_primary || is_unique {
            format!(
                "ALTER TABLE {}.{} DROP CONSTRAINT {};",
                schema_name, table_name, index_name
            )
        } else {
            format!("DROP INDEX {}.{}.{};", schema_name, table_name, index_name)
        };

        info!("drop_sql sql: {}", drop_sql);
        let _ = conn.execute(&drop_sql, &[]).await?;
        Ok(())
    }
    pub async fn drop_column(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<(), anyhow::Error> {
        let level_infos = list_node_info_req.level_infos;
        let database_name = level_infos[1].config_value.clone();
        let schema_name = level_infos[2].config_value.clone();

        let table_name = level_infos[4].config_value.clone();
        let column_name = level_infos[6].config_value.clone();
        let mut conn = self.get_connection_with_database(database_name).await?;

        let sql = format!(
            "ALTER TABLE {}.{} DROP COLUMN {};",
            schema_name, table_name, column_name
        );
        info!("drop_column sql: {}", sql);
        let _ = conn.execute(&sql, &[]).await?;
        Ok(())
    }
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
                let sql = get_schema_sql(db_name);
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
                let db_name = level_infos[1].config_value.clone();
                let schema_name = level_infos[2].config_value.clone();
                let node_name = level_infos[3].config_value.clone();
                let mut conn = self.get_connection_with_database(db_name.clone()).await?;

                if node_name == "Tables" {
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
                } else if node_name == "Views" {
                    let sql = format!(
                        "SELECT TABLE_NAME AS ViewName
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_SCHEMA = '{}';",
                        schema_name
                    );
                    let rows = conn.query(&sql, &[]).await?.into_first_result().await?;

                    for item in rows {
                        let table_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;
                        let sql = format!(
                            "select count(*) from {}.{}",
                            schema_name.clone(),
                            table_name
                        );
                        info!("sql: {}", sql);
                        let row = conn
                            .query(&sql, &[])
                            .await?
                            .into_row()
                            .await?
                            .ok_or(anyhow!(""))?;
                        let record_count: i32 = row.try_get(0)?.ok_or(anyhow!(""))?;
                        let description = if record_count > 0 {
                            Some(format!("{}", record_count))
                        } else {
                            None
                        };
                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            true,
                            true,
                            "singleTable".to_string(),
                            table_name.to_string(),
                            description,
                        );
                        vec.push(list_node_info_response_item);
                    }
                    info!("list_node_info: {:?}", vec);
                    return Ok(ListNodeInfoResponse::new(vec));
                } else if node_name == "Functions" {
                    let list_functions_sql = format!(
                        "SELECT 
    o.name AS ROUTINE_NAME,
    CASE 
        WHEN o.type = 'FN' THEN 'FUNCTION'
        WHEN o.type = 'IF' THEN 'FUNCTION' 
        WHEN o.type = 'TF' THEN 'FUNCTION'
        ELSE 'UNKNOWN'
    END AS ROUTINE_TYPE,
    sm.definition AS DATA_TYPE,
    o.create_date AS CREATED,
    o.modify_date AS LAST_ALTERED
FROM 
    sys.objects o
JOIN 
    sys.sql_modules sm ON o.object_id = sm.object_id
WHERE 
    o.type IN ('FN', 'IF', 'TF')  -- 'FN' = Scalar Function, 'IF' = Inline Table-Valued Function, 'TF' = Table-Valued Function
    AND SCHEMA_NAME(o.schema_id) = '{}';
",
                        schema_name.clone()
                    );
                    let rows = conn
                        .query(&list_functions_sql, &[])
                        .await?
                        .into_first_result()
                        .await?;
                    for item in rows {
                        let function_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;

                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "singleFunction".to_string(),
                            function_name.to_string(),
                            None,
                        );
                        vec.push(list_node_info_response_item);
                    }
                    info!("list_node_info: {:?}", vec);
                    return Ok(ListNodeInfoResponse::new(vec));
                } else if node_name == "Procedures" {
                    let list_functions_sql = format!(
                        "SELECT name AS ProcedureName
FROM sys.procedures
WHERE SCHEMA_NAME(schema_id) = '{}'
ORDER BY name;",
                        schema_name.clone()
                    );
                    let rows = conn
                        .query(&list_functions_sql, &[])
                        .await?
                        .into_first_result()
                        .await?;
                    for item in rows {
                        let function_name: &str = item.try_get(0)?.ok_or(anyhow!(""))?;

                        let list_node_info_response_item = ListNodeInfoResponseItem::new(
                            false,
                            true,
                            "singleProcedure".to_string(),
                            function_name.to_string(),
                            None,
                        );
                        vec.push(list_node_info_response_item);
                    }
                    info!("list_node_info: {:?}", vec);
                    return Ok(ListNodeInfoResponse::new(vec));
                }
            }
            5 => {
                for (name, icon_name) in get_mssql_table_data().iter() {
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
            }
            6 => {
                let database_name = level_infos[1].config_value.clone();
                let schema_name = level_infos[2].config_value.clone();

                let table_name = level_infos[4].config_value.clone();
                let node_name = level_infos[5].config_value.clone();
                if node_name == "Columns" {
                    let show_column_sql = format!(
                        "SELECT 
    c.name AS ColumnName, 
    t.name AS DataType, 
    c.max_length AS MaxLength, 
    c.is_nullable AS IsNullable, 
    c.is_identity AS IsIdentity
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('{}');",
                        table_name
                    );
                    let mut conn = self.get_connection_with_database(database_name).await?;
                    let vecs = conn
                        .query(&show_column_sql, &[])
                        .await?
                        .into_first_result()
                        .await?;
                    for row in vecs {
                        let column_name: &str = row.try_get(0)?.ok_or(anyhow!(""))?;
                        let column_type: &str = row.try_get(1)?.ok_or(anyhow!(""))?;

                        let key_type: bool = row.try_get(4)?.ok_or(anyhow!(""))?;
                        if key_type {
                            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                                false,
                                true,
                                "primary".to_string(),
                                column_name.to_string(),
                                Some(column_type.to_string()),
                            );
                            vec.push(list_node_info_response_item);
                        } else {
                            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                                false,
                                true,
                                "column".to_string(),
                                column_name.to_string(),
                                Some(column_type.to_string()),
                            );
                            vec.push(list_node_info_response_item);
                        }
                    }
                    return Ok(ListNodeInfoResponse::new(vec));
                } else if node_name == "Index" {
                    let sql = get_index_sql(schema_name, table_name);
                    let mut conn = self.get_connection_with_database(database_name).await?;
                    let vecs = conn.query(&sql, &[]).await?.into_first_result().await?;
                    for row in vecs {
                        let index_name: &str = row.try_get(0)?.ok_or(anyhow!(""))?;

                        let key_type: bool = row.try_get(5)?.ok_or(anyhow!(""))?;
                        if key_type {
                            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                                false,
                                true,
                                "singlePrimaryIndex".to_string(),
                                index_name.to_string(),
                                None,
                            );
                            vec.push(list_node_info_response_item);
                        } else {
                            let list_node_info_response_item = ListNodeInfoResponseItem::new(
                                false,
                                true,
                                "singleCommonIndex".to_string(),
                                index_name.to_string(),
                                None,
                            );
                            vec.push(list_node_info_response_item);
                        }
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
            || sql.contains("CREATE FUNCTION") && !sql.contains("SHOW CREATE FUNCTION")
            || sql.contains("CREATE SCHEMA"));
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
            let row_affected = if sql.contains("CREATE SCHEMA") {
                let _ = conn.simple_query(&sql).await?;
                "0".to_string()
            } else {
                let exe_res = conn.execute(&sql, &[]).await?;
                exe_res
                    .rows_affected()
                    .iter()
                    .map(|item| item.to_string())
                    .collect::<Vec<String>>()
                    .join(", ")
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
