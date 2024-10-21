use sqlx::sqlite::SqlitePool;
use sqlx::Executor;

// pub struct SqlLite {
//     pub connection: Connection,
// }
pub struct AppState {
    pub pool: SqlitePool,
}
// pub struct SqlLiteState(pub Mutex<SqlLite>);

impl AppState {
    pub async fn new() -> Result<AppState, anyhow::Error> {
        let home_dir = dirs::home_dir().ok_or(anyhow!("failed to get home directory"))?;
        let db_path = home_dir.join(".easyviewer.db");
        let pool = SqlitePool::connect(db_path.to_str().ok_or(anyhow!("invalid db path"))?).await?;

        let mut conn = pool.acquire().await?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS base_config (
            id   INTEGER PRIMARY KEY AUTOINCREMENT, 
            config_type    INTEGER NOT NULL, 
            connection_json  TEXT NOT NULL
            )",
        );
        // connection.execute(
        //     "CREATE TABLE IF NOT EXISTS base_config (
        //     id   INTEGER PRIMARY KEY AUTOINCREMENT,
        //     config_type    INTEGER NOT NULL,
        //     connection_json  TEXT NOT NULL
        //     )",
        //     params![],
        // )?;
        Ok(AppState { pool })
    }
}
