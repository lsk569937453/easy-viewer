//! 性能基线测量（仅在 `cargo test` 下编译）。
//!
//! 「打开 10 万行表」的耗时由三部分组成：SQL 取数、`sqlx` 行解析、行值转表格单元格。
//! 这里把后两步按真实代码路径跑一遍，得到一个可复现、可对比的数字；
//! 冷启动与滚动帧率必须在真实窗口里手测，见 `scripts/bench/README.md`。
//!
//! 用法：
//! ```bash
//! cargo test --release bench_open_100k_rows -- --ignored --nocapture
//! ```

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]
mod tests {
    use std::time::Instant;

    use sqlx::sqlite::SqliteConnectOptions;
    use sqlx::{Connection, Row, SqliteConnection, TypeInfo, ValueRef};

    /// 造表行数：与性能指标口径一致。
    const ROWS: usize = 100_000;

    #[tokio::test(flavor = "multi_thread")]
    #[ignore = "性能基线，需要显式 --ignored 运行"]
    async fn bench_open_100k_rows() {
        let dir = std::env::temp_dir().join("easy-viewer-bench");
        std::fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join(format!("bench-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&db_path);

        let options = SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true);
        let mut conn = SqliteConnection::connect_with(&options).await.unwrap();

        sqlx::query(
            "CREATE TABLE bench_rows (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                score REAL NOT NULL,
                created_at TEXT NOT NULL,
                note TEXT
            )",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        let insert_started = Instant::now();
        let mut tx = conn.begin().await.unwrap();
        for index in 0..ROWS {
            sqlx::query(
                "INSERT INTO bench_rows (id, name, score, created_at, note) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(index as i64)
            .bind(format!("row-{index}"))
            .bind(index as f64 * 0.5)
            .bind("2026-01-01 00:00:00")
            .bind(if index % 10 == 0 { Some("note") } else { None })
            .execute(&mut *tx)
            .await
            .unwrap();
        }
        tx.commit().await.unwrap();
        let seed_ms = insert_started.elapsed().as_millis();

        // 计时从「执行查询」开始，到「所有行转成单元格」结束。
        let started = Instant::now();
        let rows = sqlx::query("select * from bench_rows")
            .fetch_all(&mut conn)
            .await
            .unwrap();
        let fetch_ms = started.elapsed().as_millis();

        let convert_started = Instant::now();
        let mut cells = 0_usize;
        for row in rows.iter() {
            let column_count = row.columns().len();
            for index in 0..column_count {
                let raw = row.try_get_raw(index).unwrap();
                let type_info = raw.type_info();
                let type_name = type_info.name();
                let value =
                    crate::util::sql_utils::sqlite_row_to_json(row, type_name, index).unwrap();
                if crate::sql::row::cell_to_display(&value).is_some() {
                    cells += 1;
                }
            }
        }
        let convert_ms = convert_started.elapsed().as_millis();
        let total_ms = started.elapsed().as_millis();
        let row_count = rows.len();

        println!(
            "BENCH_JSON {{\"metric\":\"open_100k_rows\",\"rows\":{row_count},\"cells\":{cells},\
             \"seed_ms\":{seed_ms},\"fetch_ms\":{fetch_ms},\"convert_ms\":{convert_ms},\
             \"total_ms\":{total_ms}}}"
        );

        assert_eq!(row_count, ROWS);
        let _ = std::fs::remove_file(&db_path);
    }
}
