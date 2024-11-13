use std::collections::HashMap;
use std::sync::OnceLock;
static MYSQL_DATABASE_DATA: OnceLock<HashMap<&'static str, &'static str>> = OnceLock::new();

fn get_mysql_database_data() -> &'static HashMap<&'static str, &'static str> {
    MYSQL_DATABASE_DATA.get_or_init(|| {
        let mut map = HashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}
