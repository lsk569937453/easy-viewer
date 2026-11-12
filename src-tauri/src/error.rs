//! 统一错误模型。
//!
//! 三层约定（参考 dbx 的做法，但用小项目负担得起的简化版）：
//! 1. **底层驱动**继续返回 `anyhow::Error` / 各类库错误，不强迫每个驱动自建错误体系；
//! 2. **跨模块边界**统一收敛成 [`AppError`]，携带稳定 `code` 与面向用户的中文 `message`；
//! 3. **IPC 边界**由 [`crate::service::cmd`] 把 `AppError` 编码进既有的
//!    `BaseResponse` 信封（`response_code` 保持 0/1 语义不变，只追加 `error` 字段）。
//!
//! `code` 只允许追加，禁止改语义：前端按 `code` 区分“可重试 / 不支持 / 参数错误”，
//! 而不是去解析错误文本。

use std::fmt;

use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};

/// 统一结果类型。
pub type AppResult<T> = Result<T, AppError>;

/// 错误码最大值：`detail` 截断长度（字节），避免把整段驱动 SQL 和堆栈灌进前端。
const DETAIL_LIMIT: usize = 64 * 1024;

/// 稳定错误码。
///
/// 命名规则 `EV-<域>-<四位序号>`，域含义：
/// - `CONN` 连接相关
/// - `DRV` 驱动/操作相关
/// - `ARG` 入参校验
/// - `IO` 文件系统
/// - `SQL` SQL 解析
/// - `CFG` 连接配置
/// - `INT` 未归类的内部错误
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ErrorCode {
    ConnectionFailed,
    ConnectionNotFound,
    ConnectionTimeout,
    UnsupportedOperation,
    QueryFailed,
    ObjectNotFound,
    InvalidArgument,
    IoError,
    SqlParseError,
    ConfigInvalid,
    Internal,
}

impl ErrorCode {
    pub const fn as_str(self) -> &'static str {
        match self {
            ErrorCode::ConnectionFailed => "EV-CONN-0001",
            ErrorCode::ConnectionNotFound => "EV-CONN-0002",
            ErrorCode::ConnectionTimeout => "EV-CONN-0003",
            ErrorCode::UnsupportedOperation => "EV-DRV-1002",
            ErrorCode::QueryFailed => "EV-DRV-1003",
            ErrorCode::ObjectNotFound => "EV-DRV-1004",
            ErrorCode::InvalidArgument => "EV-ARG-2001",
            ErrorCode::IoError => "EV-IO-3001",
            ErrorCode::SqlParseError => "EV-SQL-4001",
            ErrorCode::ConfigInvalid => "EV-CFG-5001",
            ErrorCode::Internal => "EV-INT-9001",
        }
    }

    /// 该错误是否值得让用户直接重试。
    pub const fn is_retryable(self) -> bool {
        matches!(self, ErrorCode::ConnectionTimeout | ErrorCode::ConnectionFailed)
    }
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// 跨模块统一错误。字段私有：只能经构造器与 [`AppError::with_detail`] 组装，
/// 防止各调用点随意拼装出前后不一致的 `code` / `detail` 组合。
#[derive(Debug, Clone)]
pub struct AppError {
    code: ErrorCode,
    message: String,
    detail: Option<String>,
}

impl AppError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            detail: None,
        }
    }

    /// 追加驱动/底层库的原文信息。会做凭据脱敏与长度截断。
    pub fn with_detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = Some(sanitize_detail(&detail.into()));
        self
    }

    pub const fn code(&self) -> ErrorCode {
        self.code
    }

    pub fn message(&self) -> &str {
        &self.message
    }

    #[allow(dead_code, reason = "公共访问器：序列化已包含 detail，此处供日志/诊断按需读取")]
    pub fn detail(&self) -> Option<&str> {
        self.detail.as_deref()
    }

    /// 可重试判定，供前端决定是否展示“重试”按钮。
    pub const fn is_retryable(&self) -> bool {
        self.code.is_retryable()
    }

    pub fn unsupported(operation: &str, db_type: &str) -> Self {
        Self::new(
            ErrorCode::UnsupportedOperation,
            format!("{db_type} 不支持此操作"),
        )
        .with_detail(format!("unsupported operation: {operation}"))
    }

    /// 把 `anyhow::Error` 归类成可用的错误码。
    ///
    /// 这里用关键字启发式而非类型匹配：项目里绝大多数驱动错误都是库自定义类型，
    /// 逐一定义错误类型成本高于收益。需要精确语义的调用点应显式构造 `AppError`。
    pub fn classify(err: &anyhow::Error) -> Self {
        let detail = err.to_string();
        let lowered = detail.to_lowercase();
        let code = if lowered.contains("unsupported")
            || lowered.contains("not support")
            || lowered.contains("not supported")
        {
            ErrorCode::UnsupportedOperation
        } else if lowered.contains("timeout") || lowered.contains("timed out") {
            ErrorCode::ConnectionTimeout
        } else if lowered.contains("not found") || lowered.contains("no such") {
            ErrorCode::ObjectNotFound
        } else if lowered.contains("connection refused")
            || lowered.contains("access denied")
            || lowered.contains("authentication failed")
            || lowered.contains("invalid password")
            || lowered.contains("connect")
        {
            ErrorCode::ConnectionFailed
        } else if lowered.contains("parse") && lowered.contains("sql") {
            ErrorCode::SqlParseError
        } else {
            ErrorCode::QueryFailed
        };
        Self::new(code, message_for(code)).with_detail(detail)
    }
}

fn message_for(code: ErrorCode) -> &'static str {
    match code {
        ErrorCode::ConnectionFailed => "连接失败，请检查主机、端口与凭据",
        ErrorCode::ConnectionNotFound => "连接配置不存在，可能已被删除",
        ErrorCode::ConnectionTimeout => "连接超时",
        ErrorCode::UnsupportedOperation => "该数据源不支持此操作",
        ErrorCode::QueryFailed => "执行失败",
        ErrorCode::ObjectNotFound => "目标对象不存在",
        ErrorCode::InvalidArgument => "参数不合法",
        ErrorCode::IoError => "文件操作失败",
        ErrorCode::SqlParseError => "SQL 解析失败",
        ErrorCode::ConfigInvalid => "连接配置无效",
        ErrorCode::Internal => "内部错误",
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "[{}] {}", self.code.as_str(), self.message)?;
        if let Some(detail) = &self.detail {
            write!(formatter, ": {detail}")?;
        }
        Ok(())
    }
}

impl std::error::Error for AppError {}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("AppError", 4)?;
        state.serialize_field("code", self.code.as_str())?;
        state.serialize_field("message", &self.message)?;
        state.serialize_field("detail", &self.detail)?;
        state.serialize_field("retryable", &self.is_retryable())?;
        state.end()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::classify(&err)
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::classify(&anyhow::Error::new(err))
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::new(ErrorCode::Internal, "序列化失败").with_detail(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::new(ErrorCode::IoError, "文件操作失败").with_detail(err.to_string())
    }
}

impl From<String> for AppError {
    fn from(value: String) -> Self {
        AppError::new(ErrorCode::Internal, value)
    }
}

impl From<&str> for AppError {
    fn from(value: &str) -> Self {
        AppError::new(ErrorCode::Internal, value)
    }
}

/// 脱敏 + 截断。
///
/// 连接串里的明文密码会原样出现在驱动错误里，必须在这里挡掉，否则错误详情会
/// 经 IPC 直达前端日志/界面。SQL 正文不脱敏（脱敏会破坏方言可读性）。
fn sanitize_detail(detail: &str) -> String {
    let redacted = redact_credentials(detail);
    truncate_on_char_boundary(&redacted, DETAIL_LIMIT)
}

fn redact_credentials(text: &str) -> String {
    let mut out = text.to_string();
    // 形如 scheme://user:password@host
    out = redact_between(&out, "://", "@");
    // 形如 password=xxx / password: xxx / pwd=xxx
    for key in ["password", "passwd", "pwd", "secret_key", "secretkey", "secret"] {
        out = redact_assignment(&out, key);
    }
    out
}

/// 把 `prefix` 与 `suffix` 之间的内容替换成 `***`（保留分隔符本身）。
fn redact_between(text: &str, prefix: &str, suffix: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(prefix_at) = rest.find(prefix) {
        let after_prefix = prefix_at + prefix.len();
        let Some(suffix_rel) = rest[after_prefix..].find(suffix) else {
            break;
        };
        let suffix_at = after_prefix + suffix_rel;
        let candidate = &rest[after_prefix..suffix_at];
        result.push_str(&rest[..after_prefix]);
        if candidate.contains(':') {
            // 只有 `user:password` 形态才需要脱敏。
            if let Some(colon_at) = candidate.find(':') {
                result.push_str(&candidate[..colon_at]);
                result.push_str(":***");
            } else {
                result.push_str(candidate);
            }
        } else {
            result.push_str(candidate);
        }
        rest = &rest[suffix_at..];
    }
    result.push_str(rest);
    result
}

/// 把 `key=value` / `key: value` 里的 value 替换成 `***`。
fn redact_assignment(text: &str, key: &str) -> String {
    let lowered = text.to_lowercase();
    let mut result = String::with_capacity(text.len());
    let mut cursor = 0_usize;
    while let Some(rel_at) = lowered[cursor..].find(key) {
        let key_at = cursor + rel_at;
        let after_key = key_at + key.len();
        // 要求 key 后面紧跟可选空白 + 分隔符，避免误伤 `passwords`。
        let tail = &text[after_key..];
        let trimmed_offset = tail.len() - tail.trim_start().len();
        let after_ws = after_key + trimmed_offset;
        let Some(separator) = text[after_ws..].chars().next() else {
            break;
        };
        if separator != '=' && separator != ':' {
            result.push_str(&text[cursor..after_key]);
            cursor = after_key;
            continue;
        }
        let value_start = after_ws + separator.len_utf8();
        let value_tail = &text[value_start..];
        let value_end_rel = value_tail
            .find([',', ';', '}', '\n', ' '])
            .unwrap_or(value_tail.len());
        result.push_str(&text[cursor..value_start]);
        result.push_str("***");
        cursor = value_start + value_end_rel;
    }
    if cursor == 0 {
        return text.to_string();
    }
    result.push_str(&text[cursor..]);
    result
}

fn truncate_on_char_boundary(text: &str, limit: usize) -> String {
    if text.len() <= limit {
        return text.to_string();
    }
    let mut end = limit;
    while end > 0 && !text.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}…（已截断）", &text[..end])
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
mod tests {
    use super::*;

    #[test]
    fn redacts_password_in_url() {
        let text = "connect failed: mysql://root:s3cret@127.0.0.1:3306/demo";
        let out = redact_credentials(text);
        assert!(!out.contains("s3cret"));
        assert!(out.contains("root:***@"));
    }

    #[test]
    fn redacts_password_assignment() {
        let text = "auth error password=topsecret, retry later";
        let out = redact_credentials(text);
        assert!(!out.contains("topsecret"));
        assert!(out.contains("password=***"));
    }

    #[test]
    fn keeps_sql_body_intact() {
        let text = "select * from t where x = 'a b'";
        assert_eq!(redact_credentials(text), text);
    }

    #[test]
    fn classifies_timeout() {
        let err = anyhow::anyhow!("operation timed out after 1s");
        assert_eq!(AppError::classify(&err).code(), ErrorCode::ConnectionTimeout);
    }

    #[test]
    fn classifies_unsupported() {
        let err = anyhow::anyhow!("sqlite not support update comment");
        assert_eq!(
            AppError::classify(&err).code(),
            ErrorCode::UnsupportedOperation
        );
    }

    #[test]
    fn truncates_long_detail() {
        let long = "x".repeat(DETAIL_LIMIT + 100);
        let err = AppError::new(ErrorCode::Internal, "boom").with_detail(long);
        let detail = err.detail().unwrap_or_default();
        assert!(detail.len() < DETAIL_LIMIT + 32);
    }
}
