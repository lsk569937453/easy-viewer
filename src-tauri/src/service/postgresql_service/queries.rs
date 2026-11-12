use linked_hash_map::LinkedHashMap;
use std::sync::OnceLock;

static POSTGRESQL_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> =
    OnceLock::new();
static POSTGRESQL_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();
pub(super) const GET_SCHEMA_SQL: &str = "SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  AND schema_name NOT LIKE 'pg_%';";

/// DDL 只取列元数据，字符串拼接放到 Rust 侧完成：
/// SQL 端的 `||`、array_agg 等在磐维等 openGauss 内核的 MySQL 兼容库下不可用。
pub(super) fn generate_ddl_columns_sql(schema_name: String, table_name: String) -> String {
    format!(
        "SELECT column_name,
       data_type,
       character_maximum_length,
       numeric_precision,
       numeric_scale,
       is_nullable
FROM information_schema.columns
WHERE table_name = '{}'
  AND table_schema = '{}'
ORDER BY ordinal_position;",
        table_name, schema_name
    )
}

pub(super) fn get_postgresql_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    POSTGRESQL_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}

pub(super) fn get_postgresql_table_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    POSTGRESQL_TABLE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Columns", "columns");
        map.insert("Index", "index");
        map
    })
}
