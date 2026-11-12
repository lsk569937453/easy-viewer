//! 应用自身状态：本地 SQLite（`~/.easyviewer.db`）连接池与建表。
//!
//! 建表策略（按既定决策）：**不引入版本号，不做增量迁移**。
//! 表结构只在这里定义一次，用 `CREATE TABLE IF NOT EXISTS` 保证幂等；
//! 一旦遇到历史遗留结构，直接丢掉重建 —— 本地只存连接配置与查询片段，
//! 属于可重建数据（此决策已确认，参见 `docs/reconstruction-plan.md`）。

use std::fs;
use std::io::Write;
use std::str::FromStr;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use sqlx::Executor;
use sqlx::SqliteConnection;

/// 本地库表结构（唯一真相源）。
const SCHEMA: &[&str] = &[
    "CREATE TABLE IF NOT EXISTS base_config (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_name TEXT NOT NULL UNIQUE,
        connection_json TEXT NOT NULL
    )",
    "CREATE TABLE IF NOT EXISTS sql_query (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id INTEGER NOT NULL,
        database_name TEXT NOT NULL DEFAULT '',
        query_name    TEXT NOT NULL,
        query         TEXT,
        UNIQUE (connection_id, database_name, query_name)
    )",
    "CREATE TABLE IF NOT EXISTS complete_words (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id INTEGER NOT NULL,
        words         TEXT,
        'datatime'    DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
        UNIQUE (connection_id)
    )",
];

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
}

impl AppState {
    pub async fn new() -> Result<AppState, anyhow::Error> {
        let home_dir = dirs::home_dir().ok_or(anyhow!("failed to get home directory"))?;
        let db_path = home_dir.join(".easyviewer.db");
        if !db_path.exists() {
            let mut file = fs::File::create(&db_path)?;
            file.write_all(b"")?;
            info!("local db created: {:?}", db_path);
        }

        // ⚠️ 以下 PRAGMA 目前是**空操作**：项目构建的是普通 bundled SQLite，
        // 没有编入 SQLCipher，因此 `key` 不会加密任何内容。
        // 按本轮约定（安全项延后处理）保持原样，详见 docs/security-debt.md。
        let options =
            SqliteConnectOptions::from_str(db_path.to_str().ok_or(anyhow!("invalid db path"))?)?
                .pragma("key", "the_password")
                .pragma("cipher_page_size", "1024")
                .pragma("kdf_iter", "64000")
                .pragma("cipher_hmac_algorithm", "HMAC_SHA1")
                .pragma("cipher_kdf_algorithm", "PBKDF2_HMAC_SHA1")
                .foreign_keys(false);
        let pool = SqlitePool::connect_with(options).await?;

        let mut conn = pool.acquire().await?;
        drop_legacy_tables(&mut conn).await?;
        for statement in SCHEMA {
            conn.execute(*statement).await?;
        }

        Ok(AppState { pool })
    }
}

/// 丢弃与当前结构不兼容的历史表。
///
/// 只针对 `sql_query` 缺 `database_name` 列的老结构；命中时整表重建，
/// 不做字段级搬迁（搬迁逻辑属于上一版的一次性补丁，已按决策删除）。
async fn drop_legacy_tables(conn: &mut SqliteConnection) -> Result<(), anyhow::Error> {
    let table_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='sql_query'",
    )
    .fetch_one(&mut *conn)
    .await?;
    if !table_exists {
        return Ok(());
    }

    let has_database_name: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('sql_query') WHERE name='database_name'",
    )
    .fetch_one(&mut *conn)
    .await?;

    if !has_database_name {
        warn!("legacy sql_query schema detected, recreating table");
        conn.execute("DROP TABLE sql_query").await?;
    }
    Ok(())
}
