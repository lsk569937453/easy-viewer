//! 行值展示化。
//!
//! 各驱动把 `serde_json::Value` 转成表格单元格（`Option<String>`）的代码此前在 8 处
//! 逐字重复：
//!
//! ```ignore
//! if val.is_string() { Some(val.as_str().unwrap_or_default().to_string()) }
//! else if val.is_null() { None }
//! else { Some(val.to_string()) }
//! ```
//!
//! 现在统一走 [`cell_to_display`]，行为完全一致（字符串不加引号、null 变空单元格、
//! 其余按 JSON 文本展示），只是不再复制。

use serde_json::Value;

use crate::vojo::exe_sql_response::Header;

/// 把单个 JSON 值转成表格单元格。
pub fn cell_to_display(value: &Value) -> Option<String> {
    if value.is_null() {
        return None;
    }
    if let Some(text) = value.as_str() {
        return Some(text.to_string());
    }
    Some(value.to_string())
}

/// 构造表头。`type_name` 统一大写，兼容前端既有的 `type_name` 展示约定。
pub fn header(name: impl Into<String>, type_name: &str, is_primary_key: bool) -> Header {
    Header {
        name: name.into(),
        type_name: type_name.to_uppercase(),
        is_primary_key,
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn null_becomes_empty_cell() {
        assert_eq!(cell_to_display(&json!(null)), None);
    }

    #[test]
    fn string_keeps_raw_text() {
        assert_eq!(
            cell_to_display(&json!("hello \"world\"")),
            Some("hello \"world\"".to_string())
        );
    }

    #[test]
    fn numbers_render_as_json() {
        assert_eq!(cell_to_display(&json!(42)), Some("42".to_string()));
        assert_eq!(cell_to_display(&json!(1.5)), Some("1.5".to_string()));
    }

    #[test]
    fn header_uppercases_type() {
        let item = header("id", "integer", true);
        assert_eq!(item.type_name, "INTEGER");
        assert!(item.is_primary_key);
    }
}
