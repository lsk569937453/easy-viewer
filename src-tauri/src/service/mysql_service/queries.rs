use linked_hash_map::LinkedHashMap;
use std::sync::OnceLock;

static MYSQL_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();
static MYSQL_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();

pub(super) fn get_mysql_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MYSQL_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}

pub(super) fn get_mysql_table_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MYSQL_TABLE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Columns", "columns");
        map.insert("Index", "index");
        map.insert("Partitions", "partitions");
        map
    })
}
