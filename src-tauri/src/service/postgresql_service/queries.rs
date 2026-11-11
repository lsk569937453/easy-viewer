use linked_hash_map::LinkedHashMap;
use std::sync::OnceLock;

static POSTGRESQL_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> =
    OnceLock::new();
static POSTGRESQL_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();
pub(super) const GET_SCHEMA_SQL: &str = "SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  AND schema_name NOT LIKE 'pg_%';";

pub(super) fn generate_ddl(schema_name: String, table_name: String) -> String {
    format!(
        "SELECT 'CREATE TABLE ' || table_schema || '.' || table_name || ' (' || E'\n' ||
       array_to_string(
           array_agg(
               '    ' || column_name || ' ' || 
               data_type || 
               CASE 
                   WHEN character_maximum_length IS NOT NULL 
                   THEN '(' || character_maximum_length || ')'
                   ELSE ''
               END ||
               CASE 
                   WHEN numeric_precision IS NOT NULL 
                   THEN '(' || numeric_precision || ',' || numeric_scale || ')'
                   ELSE ''
               END ||
               CASE 
                   WHEN is_nullable = 'NO' THEN ' NOT NULL'
                   ELSE ''
               END
           ), E',\n'
       ) || E'\n);'
FROM information_schema.columns
WHERE table_name = '{}' 
  AND table_schema = '{}'
GROUP BY table_schema, table_name;
",
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
