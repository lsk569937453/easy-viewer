use crate::service::base_config_service::DatabaseHostStruct;
use crate::vojo::exe_sql_response::ExeSqlResponse;
use crate::vojo::exe_sql_response::Header;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::list_node_info_response::ListNodeInfoResponse;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;
use crate::vojo::redis_command_response::RedisCommandResponse;
use crate::AppState;
use redis::Commands;
use serde::Deserialize;
use serde::Serialize;
use std::time::Duration;
use std::time::Instant;

#[derive(Deserialize, Serialize, Clone)]
pub struct RedisConfig {
    pub config: DatabaseHostStruct,
}

impl RedisConfig {
    pub fn get_description(&self) -> Result<String, anyhow::Error> {
        let description = format!("{}:{}", self.config.host, self.config.port);
        Ok(description)
    }

    pub async fn test_connection(&self) -> Result<(), anyhow::Error> {
        let client = self.get_connection()?;
        let mut con = client.get_connection_with_timeout(Duration::from_secs(5))?;
        redis::cmd("PING").query::<String>(&mut con)?;
        Ok(())
    }

    fn get_connection(&self) -> Result<redis::Client, anyhow::Error> {
        let url = if self.config.password.is_empty() {
            format!("redis://{}:{}", self.config.host, self.config.port)
        } else {
            format!(
                "redis://:{}@{}:{}",
                self.config.password, self.config.host, self.config.port
            )
        };
        info!("redis_url: {}", url);
        let client = redis::Client::open(url)?;
        info!("redis_url: success");

        Ok(client)
    }

    pub async fn list_node_info(
        &self,
        list_node_info_req: ListNodeInfoReq,
        _appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> {
        let client = self.get_connection()?;
        let mut con = client.get_connection()?;

        let level_infos = list_node_info_req.level_infos;
        let mut vec = vec![];

        match level_infos.len() {
            // Level 1: Show databases (or key categories)
            1 => {
                // Try to get database count from config
                let db_index: u16 = if let Some(ref db) = self.config.database {
                    db.parse().unwrap_or(0)
                } else {
                    0
                };

                // Select the database
                let _: () = redis::cmd("SELECT").arg(db_index).query(&mut con)?;

                // Get total key count
                let db_size: i64 = redis::cmd("DBSIZE").query(&mut con)?;
                let key_types = get_redis_key_type_map();

                for (name, icon_name) in key_types.iter() {
                    let description = if *name == "Keys" && db_size > 0 {
                        Some(format!("({})", db_size))
                    } else {
                        None
                    };
                    let item = ListNodeInfoResponseItem::new(
                        true,
                        true,
                        icon_name.to_string(),
                        name.to_string(),
                        description,
                    );
                    vec.push(item);
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            // Level 2: Show keys filtered by type
            2 => {
                let selected_type = level_infos[1].config_value.to_lowercase();
                let db_index: u16 = if let Some(ref db) = self.config.database {
                    db.parse().unwrap_or(0)
                } else {
                    0
                };
                let _: () = redis::cmd("SELECT").arg(db_index).query(&mut con)?;

                let keys: Vec<String> = redis::cmd("KEYS").arg("*").query(&mut con)?;

                for key in keys {
                    let key_type: String = redis::cmd("TYPE").arg(&key).query(&mut con)?;

                    let should_include = match selected_type.as_str() {
                        "keys" => true,            // show all keys
                        "strings" => key_type == "string",
                        "hashes" => key_type == "hash",
                        "lists" => key_type == "list",
                        "sets" => key_type == "set",
                        "sorted sets" => key_type == "zset",
                        "console" => false,        // console is not a key category
                        _ => false,
                    };

                    if should_include {
                        let item = ListNodeInfoResponseItem::new(
                            true,
                            true,
                            "singleTable".to_string(),
                            key,
                            Some(key_type.clone()),
                        );
                        vec.push(item);
                    }
                }
                return Ok(ListNodeInfoResponse::new(vec));
            }
            _ => {
                info!("level_infos: {:?}", level_infos);
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
        let client = self.get_connection()?;
        let mut con = client.get_connection()?;

        let db_index: u16 = if let Some(ref db) = self.config.database {
            db.parse().unwrap_or(0)
        } else {
            0
        };
        let _: () = redis::cmd("SELECT").arg(db_index).query(&mut con)?;

        // Parse SQL: SELECT * FROM <key_name> or SELECT * FROM <key_name> LIMIT <n>
        let key_name = parse_key_from_sql(&sql);
        let limit = parse_limit_from_sql(&sql);

        // Get the type of the key
        let key_type: String = redis::cmd("TYPE").arg(&key_name).query(&mut con)?;

        match key_type.as_str() {
            "string" => {
                let value: Option<String> = con.get(&key_name)?;
                let headers = vec![
                    Header {
                        name: "key".to_string(),
                        type_name: "String".to_string(),
                        is_primary_key: true,
                    },
                    Header {
                        name: "type".to_string(),
                        type_name: "String".to_string(),
                        is_primary_key: false,
                    },
                    Header {
                        name: "value".to_string(),
                        type_name: "String".to_string(),
                        is_primary_key: false,
                    },
                ];
                let rows = vec![vec![
                    Some(key_name.clone()),
                    Some("string".to_string()),
                    value,
                ]];
                Ok(ExeSqlResponse::from(headers, rows, Some(key_name)))
            }
            "hash" => {
                let all_fields: Vec<(String, String)> =
                    redis::cmd("HGETALL").arg(&key_name).query(&mut con)?;

                let headers = vec![
                    Header {
                        name: "field".to_string(),
                        type_name: "String".to_string(),
                        is_primary_key: true,
                    },
                    Header {
                        name: "value".to_string(),
                        type_name: "String".to_string(),
                        is_primary_key: false,
                    },
                ];
                let rows: Vec<Vec<Option<String>>> = all_fields
                    .into_iter()
                    .take(limit as usize)
                    .map(|(field, value)| vec![Some(field), Some(value)])
                    .collect();
                Ok(ExeSqlResponse::from(headers, rows, Some(key_name)))
            }
            "list" => {
                let values: Vec<Option<String>> = redis::cmd("LRANGE")
                    .arg(&key_name)
                    .arg(0)
                    .arg(limit as i64 - 1)
                    .query(&mut con)?;

                let headers = vec![
                    Header {
                        name: "index".to_string(),
                        type_name: "Integer".to_string(),
                        is_primary_key: true,
                    },
                    Header {
                        name: "value".to_string(),
                        type_name: "String".to_string(),
                        is_primary_key: false,
                    },
                ];
                let rows: Vec<Vec<Option<String>>> = values
                    .into_iter()
                    .enumerate()
                    .map(|(i, value)| vec![Some(i.to_string()), value])
                    .collect();
                Ok(ExeSqlResponse::from(headers, rows, Some(key_name)))
            }
            "set" => {
                let members: Vec<String> = redis::cmd("SMEMBERS").arg(&key_name).query(&mut con)?;

                let headers = vec![Header {
                    name: "member".to_string(),
                    type_name: "String".to_string(),
                    is_primary_key: true,
                }];
                let rows: Vec<Vec<Option<String>>> = members
                    .into_iter()
                    .take(limit as usize)
                    .map(|member| vec![Some(member)])
                    .collect();
                Ok(ExeSqlResponse::from(headers, rows, Some(key_name)))
            }
            "zset" => {
                let members: Vec<(String, f64)> = redis::cmd("ZRANGE")
                    .arg(&key_name)
                    .arg(0)
                    .arg(limit as i64 - 1)
                    .arg("WITHSCORES")
                    .query(&mut con)?;

                let headers = vec![
                    Header {
                        name: "member".to_string(),
                        type_name: "String".to_string(),
                        is_primary_key: true,
                    },
                    Header {
                        name: "score".to_string(),
                        type_name: "Double".to_string(),
                        is_primary_key: false,
                    },
                ];
                let rows: Vec<Vec<Option<String>>> = members
                    .into_iter()
                    .map(|(member, score)| vec![Some(member), Some(format!("{}", score))])
                    .collect();
                Ok(ExeSqlResponse::from(headers, rows, Some(key_name)))
            }
            _ => {
                // Unknown type - just show key info
                let headers = vec![
                    Header {
                        name: "key".to_string(),
                        type_name: "String".to_string(),
                        is_primary_key: true,
                    },
                    Header {
                        name: "type".to_string(),
                        type_name: "String".to_string(),
                        is_primary_key: false,
                    },
                ];
                let rows = vec![vec![Some(key_name.clone()), Some(key_type)]];
                Ok(ExeSqlResponse::from(headers, rows, Some(key_name)))
            }
        }
    }
}

fn get_redis_key_type_map() -> Vec<(&'static str, &'static str)> {
    vec![
        ("Keys", "redis_keys"),
        ("Strings", "strings"),
        ("Hashes", "hashes"),
        ("Lists", "lists"),
        ("Sets", "sets"),
        ("Sorted Sets", "zsets"),
        ("Console", "redis_console"),
    ]
}

/// Parse SQL to extract key name: SELECT * FROM <key> [LIMIT <n>]
fn parse_key_from_sql(sql: &str) -> String {
    let parts: Vec<&str> = sql.split_whitespace().collect();
    if let Some(from_idx) = parts.iter().position(|p| p.to_uppercase() == "FROM") {
        if from_idx + 1 < parts.len() {
            return parts[from_idx + 1].trim_matches('`').to_string();
        }
    }
    sql.trim().to_string()
}

fn parse_limit_from_sql(sql: &str) -> i64 {
    let parts: Vec<&str> = sql.split_whitespace().collect();
    if let Some(limit_idx) = parts.iter().position(|p| p.to_uppercase() == "LIMIT") {
        if limit_idx + 1 < parts.len() {
            if let Ok(val) = parts[limit_idx + 1].parse::<i64>() {
                return val;
            }
        }
    }
    100
}

impl RedisConfig {
    pub fn execute_raw_command(
        &self,
        cmd: &str,
        args: &[String],
    ) -> Result<RedisCommandResponse, anyhow::Error> {
        let start_time = Instant::now();
        let client = self.get_connection()?;
        let mut con = client.get_connection()?;

        let db_index: u16 = if let Some(ref db) = self.config.database {
            db.parse().unwrap_or(0)
        } else {
            0
        };
        let _: () = redis::cmd("SELECT").arg(db_index).query(&mut con)?;

        // 构建命令并执行
        let mut redis_cmd = redis::cmd(cmd);
        for arg in args {
            redis_cmd.arg(arg);
        }

        let result = redis_cmd.query::<redis::Value>(&mut con);
        let execution_time_ms = start_time.elapsed().as_millis() as u64;

        match result {
            Ok(value) => {
                let response = convert_redis_value(value, execution_time_ms);
                Ok(response)
            }
            Err(e) => {
                // Redis 错误也作为响应返回
                Ok(RedisCommandResponse {
                    response_type: "error".to_string(),
                    value: Some(format!("Redis error: {}", e)),
                    array_items: None,
                    execution_time_ms,
                })
            }
        }
    }
}

fn convert_redis_value(value: redis::Value, execution_time_ms: u64) -> RedisCommandResponse {
    match value {
        redis::Value::Nil => RedisCommandResponse {
            response_type: "nil".to_string(),
            value: Some("(nil)".to_string()),
            array_items: None,
            execution_time_ms,
        },
        redis::Value::Int(i) => RedisCommandResponse {
            response_type: "integer".to_string(),
            value: Some(i.to_string()),
            array_items: None,
            execution_time_ms,
        },
        redis::Value::BulkString(bytes) => {
            // 尝试将字节转换为 UTF-8 字符串
            let string_value = String::from_utf8(bytes).unwrap_or("(binary data)".to_string());
            RedisCommandResponse {
                response_type: "string".to_string(),
                value: Some(string_value),
                array_items: None,
                execution_time_ms,
            }
        }
        redis::Value::Array(values) => {
            // 数组类型，递归转换每个元素
            let array_items: Vec<String> = values
                .into_iter()
                .map(|v| match v {
                    redis::Value::Nil => "(nil)".to_string(),
                    redis::Value::Int(i) => i.to_string(),
                    redis::Value::BulkString(bytes) => {
                        String::from_utf8(bytes).unwrap_or("(binary data)".to_string())
                    }
                    redis::Value::Array(_) => "[array]".to_string(),
                    redis::Value::SimpleString(s) => s,
                    _ => "(unknown)".to_string(),
                })
                .collect();

            RedisCommandResponse {
                response_type: "array".to_string(),
                value: None,
                array_items: Some(array_items),
                execution_time_ms,
            }
        }
        redis::Value::SimpleString(s) => RedisCommandResponse {
            response_type: "status".to_string(),
            value: Some(s),
            array_items: None,
            execution_time_ms,
        },
        redis::Value::Okay => RedisCommandResponse {
            response_type: "ok".to_string(),
            value: Some("OK".to_string()),
            array_items: None,
            execution_time_ms,
        },
        _ => RedisCommandResponse {
            response_type: "unknown".to_string(),
            value: Some("(unknown response type)".to_string()),
            array_items: None,
            execution_time_ms,
        },
    }
}
