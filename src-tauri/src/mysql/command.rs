use sqlx::mysql::MySqlPoolOptions;
pub async fn get_table_list() -> Result<String, anyhow::Error> {
    let pool = MySqlPoolOptions::new()
        .max_connections(5)
        .connect("postgres://postgres:password@localhost/test")
        .await?;

    // Make a simple query to return the given parameter (use a question mark `?` instead of `$1` for MySQL)
    let row: (i64,) = sqlx::query_as("SELECT $1")
        .bind(150_i64)
        .fetch_one(&pool)
        .await?;
    Ok(String::from("a"))
}
