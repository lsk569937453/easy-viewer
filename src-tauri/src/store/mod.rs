//! 连接配置持久化（本地 SQLite）。
//!
//! 重构前「读取一条连接的 JSON」这段 6 行代码在 `cmd_service.rs` 里复制了
//! **40 次**；现在只有 [`load_config`] 一处实现，所有调用方都走它。
//!
//! ⚠️ 安全债（本轮按约定不动，见 `docs/security-debt.md`）：
//! 密码仍以明文存放在 `connection_json` 里。本模块**不再**把这行 JSON 打进日志，
//! 避免错误排查时把凭据写进日志文件。

use sqlx::Row;
use sqlx::SqlitePool;

use crate::error::{AppError, AppResult, ErrorCode};
use crate::service::base_config_service::BaseConfig;
use crate::service::base_config_service::BaseConfigEnum;
use crate::sql_lite::connection::AppState;
use crate::vojo::get_base_config_response::GetBaseConnectionByIdResponse;
use crate::vojo::get_base_config_response::GetBaseConnectionResponse;
use crate::vojo::get_base_config_response::GetBaseConnectionResponseItem;
use crate::vojo::list_node_info_req::ListNodeInfoReq;
use crate::vojo::save_connection_req::SaveConnectionRequest;
use crate::vojo::update_connection_req::UpdateConnectionRequest;

const SELECT_JSON: &str = "select connection_json from base_config where id = ?";

/// 按 id 读取连接配置（唯一实现）。
pub async fn load_config(pool: &SqlitePool, connection_id: i64) -> AppResult<BaseConfigEnum> {
    let row = sqlx::query(SELECT_JSON)
        .bind(connection_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| {
            AppError::new(
                ErrorCode::ConnectionNotFound,
                "连接配置不存在，可能已被删除",
            )
            .with_detail(format!("connection id = {connection_id}"))
        })?;

    let json: String = row.try_get("connection_json")?;
    decode_config(&json)
}

fn decode_config(json: &str) -> AppResult<BaseConfigEnum> {
    let parsed: BaseConfig = serde_json::from_str(json).map_err(|err| {
        AppError::new(ErrorCode::ConfigInvalid, "连接配置格式不正确")
            .with_detail(err.to_string())
    })?;
    Ok(parsed.base_config_enum)
}

/// 从树节点请求里取出连接 id。
///
/// 约定：`level_infos[0]` 恒为连接 id。这是前后端既有的协议，不能改。
pub fn connection_id_from_request(req: &ListNodeInfoReq) -> AppResult<i64> {
    let first = req
        .level_infos
        .first()
        .ok_or_else(|| AppError::new(ErrorCode::InvalidArgument, "请求缺少连接层级信息"))?;
    first.config_value.parse::<i64>().map_err(|err| {
        AppError::new(ErrorCode::InvalidArgument, "连接 id 不是合法整数")
            .with_detail(err.to_string())
    })
}

/// 读取树节点请求对应的连接配置。
pub async fn load_config_for_request(
    app: &AppState,
    req: &ListNodeInfoReq,
) -> AppResult<BaseConfigEnum> {
    let connection_id = connection_id_from_request(req)?;
    load_config(&app.pool, connection_id).await
}

/// 读取树节点请求对应的驱动实例（命令层唯一入口）。
pub async fn load_driver_for_request(
    app: &AppState,
    req: &ListNodeInfoReq,
) -> AppResult<Box<dyn crate::driver::Driver>> {
    let config = load_config_for_request(app, req).await?;
    crate::driver::registry::build(&config)
}

/// 按 id 读取驱动实例（给只带 `connection_id` 的命令用）。
pub async fn load_driver_by_id(
    app: &AppState,
    connection_id: i64,
) -> AppResult<Box<dyn crate::driver::Driver>> {
    let config = load_config(&app.pool, connection_id).await?;
    crate::driver::registry::build(&config)
}

pub async fn save(state: &AppState, request: SaveConnectionRequest) -> AppResult<()> {
    let json = serde_json::to_string(&request.base_config)?;
    // 只记录可安全暴露的元信息：绝不把含密码的 JSON 写进日志。
    log::info!(
        "save connection: name={}, type={}",
        request.connection_name,
        request.base_config.base_config_enum.db_type().as_str()
    );
    sqlx::query("insert into base_config (connection_name,connection_json) values (?,?)")
        .bind(request.connection_name)
        .bind(json)
        .execute(&state.pool)
        .await?;
    Ok(())
}

pub async fn update(state: &AppState, request: UpdateConnectionRequest) -> AppResult<()> {
    let json = serde_json::to_string(&request.base_config)?;
    log::info!(
        "update connection: id={}, name={}, type={}",
        request.connection_id,
        request.connection_name,
        request.base_config.base_config_enum.db_type().as_str()
    );
    sqlx::query("UPDATE base_config SET connection_name = ?, connection_json = ? WHERE id = ?")
        .bind(request.connection_name)
        .bind(json)
        .bind(request.connection_id)
        .execute(&state.pool)
        .await?;
    Ok(())
}

pub async fn delete(state: &AppState, connection_id: i32) -> AppResult<()> {
    sqlx::query("DELETE FROM base_config WHERE id = ?")
        .bind(connection_id)
        .execute(&state.pool)
        .await?;
    Ok(())
}

pub async fn list(state: &AppState) -> AppResult<GetBaseConnectionResponse> {
    let rows = sqlx::query("select connection_name,id,connection_json from base_config")
        .fetch_all(&state.pool)
        .await?;

    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        // 单条配置损坏不应让整棵树挂掉：跳过并留一条 warn。
        let id: u64 = match row.try_get("id") {
            Ok(value) => value,
            Err(err) => {
                log::warn!("skip connection row: read id failed: {err}");
                continue;
            }
        };
        let json: String = match row.try_get("connection_json") {
            Ok(value) => value,
            Err(err) => {
                log::warn!("skip connection {id}: read json failed: {err}");
                continue;
            }
        };
        let config = match decode_config(&json) {
            Ok(value) => value,
            Err(err) => {
                log::warn!("skip connection {id}: {err}");
                continue;
            }
        };
        let connection_name: String = match row.try_get("connection_name") {
            Ok(value) => value,
            Err(err) => {
                log::warn!("skip connection {id}: read name failed: {err}");
                continue;
            }
        };
        items.push(GetBaseConnectionResponseItem {
            base_config_id: id,
            connection_name,
            connection_type: config.connection_type(),
            description: config.description(),
        });
    }

    Ok(GetBaseConnectionResponse {
        base_config_list: items,
    })
}

pub async fn get_by_id(
    state: &AppState,
    connection_id: i32,
) -> AppResult<GetBaseConnectionByIdResponse> {
    let row = sqlx::query("select connection_name,id,connection_json from base_config where id = ?")
        .bind(connection_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| {
            AppError::new(ErrorCode::ConnectionNotFound, "连接配置不存在").with_detail(format!(
                "connection id = {connection_id}"
            ))
        })?;

    let id: u64 = row.try_get("id")?;
    let json: String = row.try_get("connection_json")?;
    let config = decode_config(&json)?;
    Ok(GetBaseConnectionByIdResponse {
        base_config_id: id,
        connection_name: row.try_get("connection_name")?,
        connection_json: json,
        connection_type: config.connection_type(),
        description: config.description(),
    })
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
mod tests {
    use super::*;
    use crate::vojo::list_node_info_req::ListNodeInfoReqItem;

    fn request(values: &[&str]) -> ListNodeInfoReq {
        ListNodeInfoReq {
            level_infos: values
                .iter()
                .enumerate()
                .map(|(index, value)| ListNodeInfoReqItem {
                    level: index as i32,
                    config_value: (*value).to_string(),
                })
                .collect(),
        }
    }

    #[test]
    fn extracts_connection_id_from_first_level() {
        let parsed = connection_id_from_request(&request(&["7", "Tables"])).unwrap();
        assert_eq!(parsed, 7);
    }

    #[test]
    fn rejects_empty_request() {
        let err = connection_id_from_request(&request(&[])).unwrap_err();
        assert_eq!(err.code(), ErrorCode::InvalidArgument);
    }

    #[test]
    fn rejects_non_numeric_id() {
        let err = connection_id_from_request(&request(&["abc"])).unwrap_err();
        assert_eq!(err.code(), ErrorCode::InvalidArgument);
    }

    #[test]
    fn decodes_valid_config() {
        let config = decode_config(r#"{"base_config_enum":{"sqlite":{"file_path":"/tmp/a.db"}}}"#)
            .unwrap();
        assert_eq!(config.connection_type(), 3);
    }

    #[test]
    fn reports_invalid_config() {
        let err = decode_config("{}").err().unwrap();
        assert_eq!(err.code(), ErrorCode::ConfigInvalid);
    }
}
