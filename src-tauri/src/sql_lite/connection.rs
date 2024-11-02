use std::fs;

use sqlx::sqlite::SqlitePool;
use sqlx::Executor;
use std::io::Write;
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
            println!("File created: {:?}", db_path);
        } else {
            println!("File already exists: {:?}", db_path);
        }
        let pool = SqlitePool::connect(db_path.to_str().ok_or(anyhow!("invalid db path"))?).await?;

        let mut conn = pool.acquire().await?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS base_config (
            id   INTEGER PRIMARY KEY AUTOINCREMENT, 
            connection_name    TEXT NOT NULL UNIQUE, 
            connection_json  TEXT NOT NULL
            )",
        )
        .await?;
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

        Ok(AppState { pool })
    }
}
