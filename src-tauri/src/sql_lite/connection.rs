use rusqlite::{params, Connection, Result};
use std::env;
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::RwLock;
pub struct SqlLite {
    pub connection: Connection,
}

pub struct SqlLiteState(pub Mutex<SqlLite>);

impl SqlLite {
    pub fn new() -> Result<SqlLite, anyhow::Error> {
        let home_dir = dirs::home_dir().ok_or(anyhow!("failed to get home directory"))?;
        let db_path = home_dir.join(".easyviewer.db");
        let connection = Connection::open(db_path)?;
        connection.execute(
            "CREATE TABLE IF NOT EXISTS base_config (
            id   INTEGER PRIMARY KEY AUTOINCREMENT, 
            config_type    INTEGER NOT NULL, 
            connection_json  TEXT NOT NULL
            )",
            params![],
        )?;
        Ok(SqlLite { connection })
    }
}
