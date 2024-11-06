use super::exe_sql_response::ExeSqlResponse;
use super::list_node_info_req::ListNodeInfoReq;
use super::sqlite_config::SqliteConfig;
use crate::sql_lite::connection::AppState;
use crate::util::sql_utils::is_simple_select;
use crate::util::sql_utils::mysql_row_to_json;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::show_column_response::ShowColumnHeader;
use crate::vojo::show_column_response::ShowColumnsResponse;
use anyhow::Ok;
use serde::Deserialize;
use serde::Serialize;
use sqlx::Column;
use sqlx::Connection;
use sqlx::Executor;
use sqlx::MySqlConnection;
use sqlx::Row;
use sqlx::TypeInfo;
#[derive(Deserialize, Serialize)]
pub enum BaseConfigEnum {
    #[serde(rename = "mysql")]
    Mysql(MysqlConfig),
    #[serde(rename = "postgresql")]
    Postgresql(PostgresqlConfig),
    #[serde(rename = "sqlite")]
    Sqlite(SqliteConfig),
    #[serde(rename = "kafka")]
    Kafka(KafkaConfig),
}
impl BaseConfigEnum {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        match self {
            BaseConfigEnum::Mysql(config) => {
                config.test_connection().await?;
            }
            BaseConfigEnum::Postgresql(config) => config.test_connection().await?,
            BaseConfigEnum::Sqlite(config) => config.test_connection().await?,

            _ => {}
        }

        Ok(())
    }
    pub fn get_connection_type(&self) -> i32 {
        match self {
            BaseConfigEnum::Mysql(_) => 0,
            BaseConfigEnum::Postgresql(_) => 1,
            BaseConfigEnum::Kafka(_) => 2,
            BaseConfigEnum::Sqlite(_) => 3,
        }
    }
    pub async fn list_node_info(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<(String, String)>, anyhow::Error> {
        let vec = match self {
            BaseConfigEnum::Mysql(config) => {
                config.list_node_info(list_node_info_req, appstate).await?
            }
            BaseConfigEnum::Postgresql(config) => config.list_node_info(list_node_info_req).await?,

            BaseConfigEnum::Sqlite(config) => config.list_node_info(list_node_info_req).await?,
            _ => vec![("".to_string(), "".to_string())],
        };
        Ok(vec)
    }

    pub async fn exe_sql(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
        sql: String,
    ) -> Result<ExeSqlResponse, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => {
                config.exe_sql(list_node_info_req, appstate, sql).await?
            }
            BaseConfigEnum::Postgresql(config) => {
                config.exe_sql(list_node_info_req, appstate, sql).await?
            }
            BaseConfigEnum::Sqlite(config) => {
                config.exe_sql(list_node_info_req, appstate, sql).await?
            }
            _ => ExeSqlResponse::new(),
        };
        Ok(data)
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => {
                config.show_columns(list_node_info_req, appstate).await?
            }
            BaseConfigEnum::Postgresql(config) => {
                config.show_columns(list_node_info_req, appstate).await?
            }
            BaseConfigEnum::Sqlite(config) => {
                config.show_columns(list_node_info_req, appstate).await?
            }
            _ => ShowColumnsResponse::new(),
        };
        Ok(data)
    }
    pub async fn get_ddl(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<String, anyhow::Error> {
        let data = match self {
            BaseConfigEnum::Mysql(config) => config.get_ddl(list_node_info_req, appstate).await?,

            BaseConfigEnum::Sqlite(config) => config.get_ddl(list_node_info_req, appstate).await?,
            _ => "ExeSqlResponse::new()".to_string(),
        };
        Ok(data)
    }
}

#[derive(Deserialize, Serialize, Clone)]
pub struct KafkaConfig {
    pub broker: String,
    pub topic: String,
}
#[derive(Deserialize, Serialize, Clone)]
pub struct MysqlConfig {
    pub config: DatabaseHostStruct,
}
impl MysqlConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("mysql".to_string());
        MySqlConnection::connect(&test_url).await.map(|_| ())?;
        Ok(())
    }
    pub async fn list_node_info(
        &self,

        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<Vec<(String, String)>, anyhow::Error> {
        let mut vec = vec![];
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        match level_infos.len() {
            1 => {
                let mut conn = MySqlConnection::connect(&connection_url).await?;

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
                    vec.push((
                        String::from_utf8_lossy(buf).to_string(),
                        "database".to_string(),
                    ));
                }
                info!("list_node_info: {:?}", vec);
                return Ok(vec);
            }
            2 => {}
            3 => {
                let base_config_id = level_infos[0].config_value.parse::<i32>()?;
                let database_name = level_infos[1].config_value.clone();
                let node_name = level_infos[2].config_value.clone();
                if node_name == "Tables" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;

                    let sql = format!("use {}", database_name);
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;

                    let rows = sqlx::query("SHOW tables").fetch_all(&mut conn).await?;
                    for item in rows {
                        let buf: &[u8] = item.try_get(0)?;
                        vec.push((
                            String::from_utf8_lossy(buf).to_string(),
                            "singleTable".to_string(),
                        ));
                    }
                    info!("list_node_info: {:?}", vec);
                    return Ok(vec);
                } else if node_name == "Query" {
                    let rows =
                        sqlx::query("select query_name from sql_query where connection_id=?1")
                            .bind(base_config_id)
                            .fetch_all(&appstate.pool)
                            .await?;
                    let mut vec = vec![];
                    for row in rows {
                        let row_str: String = row.try_get(0)?;
                        vec.push((row_str, "singleQuery".to_string()));
                    }

                    info!("list_node_info: {:?}", vec);
                    return Ok(vec);
                }
            }
            4 => {}
            5 => {
                let base_config_id = level_infos[0].config_value.parse::<i32>()?;
                let database_name = level_infos[1].config_value.clone();
                let table_name = level_infos[3].config_value.clone();
                let node_name = level_infos[4].config_value.clone();

                if node_name == "Columns" {
                    let mut conn = MySqlConnection::connect(&connection_url).await?;
                    let mut sql = format!("use {}", database_name);
                    info!("sql: {}", sql);
                    conn.execute(&*sql).await?;
                    sql = format!("describe {};", table_name);
                    info!("sql: {}", sql);
                    let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
                    for item in rows {
                        let buf: &[u8] = item.try_get(0)?;
                        let key: &[u8] = item.try_get(3)?;
                        info!("key: {}", String::from_utf8_lossy(key).to_string());
                        if key == b"PRI" {
                            vec.push((
                                String::from_utf8_lossy(buf).to_string(),
                                "primary".to_string(),
                            ));
                        } else {
                            vec.push((
                                String::from_utf8_lossy(buf).to_string(),
                                "column".to_string(),
                            ));
                        }
                    }
                }
            }

            _ => {}
        }

        Ok(vec)
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
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();

        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(&*use_database_sql).await?;
        info!("sql: {}", sql);

        //check the sql is singleSelect
        let is_simple_select_option = is_simple_select(&sql)?;
        let primary_column_option = if let Some(table_name) = &is_simple_select_option {
            let sql = format!(r#"show columns from {}  where `Key` = "PRI""#, table_name);
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
        // info!("rows: {:?}", rows);
        for item in rows.iter() {
            let columns = item.columns();
            let len = columns.len();
            let mut row = vec![];
            for i in 0..len {
                let type_name = columns[i].type_info().name();
                let val = mysql_row_to_json(item, type_name, i)?;
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
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(&*use_database_sql).await?;

        let sql = format!("show create table {}", table_name);
        let row = sqlx::query(&sql)
            .fetch_optional(&mut conn)
            .await?
            .ok_or(anyhow!("Not found table"))?;
        let ddl: String = row.try_get(1)?;

        Ok(ddl)
    }
    pub async fn show_columns(
        &self,
        list_node_info_req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ShowColumnsResponse, anyhow::Error> {
        let connection_url = self.config.to_url("mysql".to_string());
        let level_infos = list_node_info_req.level_infos;
        let base_config_id = level_infos[0].config_value.parse::<i32>()?;
        let database_name = level_infos[1].config_value.clone();
        let table_name = level_infos[3].config_value.clone();
        let mut conn = MySqlConnection::connect(&connection_url).await?;
        let use_database_sql = format!("use {}", database_name);
        info!("use_database_sql: {}", use_database_sql);
        conn.execute(&*use_database_sql).await?;
        let sql = format!("show columns from {}", table_name);
        info!("sql: {}", sql);
        let rows = sqlx::query(&sql).fetch_all(&mut conn).await?;
        if rows.is_empty() {
            return Ok(ShowColumnsResponse::new());
        }
        let first_item = rows.first().ok_or(anyhow!(""))?;
        let mut headers = vec![];
        for item in first_item.columns() {
            let type_name = item.type_info().name();
            let column_name = item.name();
            headers.push(ShowColumnHeader {
                name: column_name.to_string(),
                type_name: type_name.to_string().to_lowercase(),
            });
        }
        let mut response_rows = vec![];
        // info!("rows: {:?}", rows);
        for item in rows.iter() {
            let columns = item.columns();
            let len = columns.len();
            let mut row = vec![];
            for i in 0..len {
                let type_name = columns[i].type_info().name();
                let val = mysql_row_to_json(item, type_name, i)?;
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
}

#[derive(Deserialize, Serialize, Clone)]
pub struct PostgresqlConfig {
    pub config: DatabaseHostStruct,
}
impl PostgresqlConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let test_url = self.config.to_url("mysql".to_string());
        MySqlConnection::connect(&test_url).await.map(|_| ())?;
        Ok(())
    }
    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
    ) -> Result<Vec<(String, String)>, anyhow::Error> {
        let vec = vec![];
        let test_url = self.config.to_url("mysql".to_string());
        Ok(vec)
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
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DatabaseHostStruct {
    pub host: String,
    pub database: Option<String>,
    pub user_name: String,
    pub password: String,
    pub port: i32,
}
impl DatabaseHostStruct {
    pub fn to_url(&self, protocol_name: String) -> String {
        if let Some(database) = &self.database {
            format!(
                "{}://{}:{}@{}:{}/{}",
                protocol_name, self.user_name, self.password, self.host, self.port, database
            )
        } else {
            format!(
                "{}://{}:{}@{}:{}",
                protocol_name, self.user_name, self.password, self.host, self.port
            )
        }
    }
}
#[derive(Deserialize, Serialize)]
pub struct BaseConfig {
    pub base_config_enum: BaseConfigEnum,
}

#[test]
fn test_host() -> Result<(), anyhow::Error> {
    Ok(())
}
