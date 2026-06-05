use std::fs;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use sqlx::Executor;
use std::io::Write;
use std::str::FromStr;
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
            info!("File created: {:?}", db_path);
        } else {
            info!("File already exists: {:?}", db_path);
        }

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
        conn.execute(
            "CREATE TABLE IF NOT EXISTS base_config (
            id   INTEGER PRIMARY KEY AUTOINCREMENT, 
            connection_name    TEXT NOT NULL UNIQUE, 
            connection_json  TEXT NOT NULL
            )",
        )
        .await?;
        // Migrate sql_query table: add database_name column if missing
        {
            // First, ensure the table exists (for fresh installs)
            conn.execute(
                "CREATE TABLE IF NOT EXISTS sql_query (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                connection_id    INTEGER NOT NULL,
                query_name  TEXT NOT NULL,
                query  TEXT,
                UNIQUE (connection_id, query_name)
                )",
            )
            .await?;

            // Check if database_name column already exists
            let has_db_name: bool = sqlx::query_scalar(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('sql_query') WHERE name='database_name'",
            )
            .fetch_one(&mut *conn)
            .await?;

            if !has_db_name {
                // Migrate: create new table, copy data, swap
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS sql_query_v2 (
                    id   INTEGER PRIMARY KEY AUTOINCREMENT,
                    connection_id    INTEGER NOT NULL,
                    database_name    TEXT NOT NULL DEFAULT '',
                    query_name  TEXT NOT NULL,
                    query  TEXT,
                    UNIQUE (connection_id, database_name, query_name)
                    )",
                )
                .await?;
                conn.execute(
                    "INSERT OR IGNORE INTO sql_query_v2 (id, connection_id, database_name, query_name, query)
                     SELECT id, connection_id, '', query_name, query FROM sql_query",
                )
                .await?;
                conn.execute("DROP TABLE sql_query").await?;
                conn.execute("ALTER TABLE sql_query_v2 RENAME TO sql_query").await?;
            }
        }
        conn.execute(
            "CREATE TABLE IF NOT EXISTS complete_words (
            id   INTEGER PRIMARY KEY AUTOINCREMENT, 
            connection_id    INTEGER NOT NULL, 
            words  TEXT,
            'datatime' DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
            UNIQUE (connection_id)  
            )",
        )
        .await?;

        Ok(AppState { pool })
    }
}
