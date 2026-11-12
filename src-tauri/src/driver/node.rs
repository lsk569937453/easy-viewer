//! 左侧树节点的构造helper。
//!
//! 重构前「可展开节点 / 叶子节点」的构造和「列出 Query 文件夹」的查询在
//! mysql / postgresql / sqlite 三个驱动里各写了一遍（其中 Query 列表的 SQL 逐字相同），
//! 这里是它们的唯一实现。

use sqlx::Row;

use crate::error::AppResult;
use crate::sql_lite::connection::AppState;
use crate::vojo::list_node_info_response::ListNodeInfoResponseItem;

/// 可展开节点（有子级）。
pub fn expandable(
    icon: &str,
    name: impl Into<String>,
    description: Option<String>,
) -> ListNodeInfoResponseItem {
    ListNodeInfoResponseItem::new(true, true, icon.to_string(), name.into(), description)
}

/// 叶子节点（无子级）。
pub fn leaf(
    icon: &str,
    name: impl Into<String>,
    description: Option<String>,
) -> ListNodeInfoResponseItem {
    ListNodeInfoResponseItem::new(false, true, icon.to_string(), name.into(), description)
}

/// 记录数角标：0 条不展示，避免树上挂满 `(0)`。
pub fn count_description(count: i64) -> Option<String> {
    if count > 0 {
        Some(count.to_string())
    } else {
        None
    }
}

/// 「Query」文件夹下已保存的查询名列表。
///
/// 这份数据来自应用自身的 SQLite（`sql_query` 表），与所连数据源无关，
/// 因此所有 SQL 类驱动共用同一段实现。
pub async fn query_nodes(
    app: &AppState,
    connection_id: i32,
) -> AppResult<Vec<ListNodeInfoResponseItem>> {
    let rows = sqlx::query("select query_name from sql_query where connection_id=?1")
        .bind(connection_id)
        .fetch_all(&app.pool)
        .await?;
    let mut items = Vec::with_capacity(rows.len());
    for row in rows {
        let name: String = row.try_get(0)?;
        items.push(leaf("singleQuery", name, None));
    }
    Ok(items)
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
mod tests {
    use super::*;

    #[test]
    fn zero_count_has_no_badge() {
        assert_eq!(count_description(0), None);
        assert_eq!(count_description(7), Some("7".to_string()));
    }

    #[test]
    fn expandable_and_leaf_differ_in_expandable_flag() {
        let parent = expandable("database", "demo", None);
        let child = leaf("column", "id", Some("INTEGER".to_string()));
        assert!(parent.show_first_icon);
        assert!(!child.show_first_icon);
        assert_eq!(child.name, "id");
        assert_eq!(child.description.as_deref(), Some("INTEGER"));
    }
}
