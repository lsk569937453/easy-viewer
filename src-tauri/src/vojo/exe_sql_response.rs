use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct ExeSqlResponse {
    pub header: Vec<Header>,
    pub rows: Vec<Vec<Option<String>>>,
    pub table_name: Option<String>,
}
impl ExeSqlResponse {
    pub fn new() -> ExeSqlResponse {
        ExeSqlResponse {
            header: vec![],
            rows: vec![],
            table_name: None,
        }
    }
    pub fn from(
        header: Vec<Header>,
        rows: Vec<Vec<Option<String>>>,
        table_name: Option<String>,
    ) -> ExeSqlResponse {
        ExeSqlResponse {
            header,
            rows,
            table_name,
        }
    }
}
#[derive(Deserialize, Serialize, Debug)]
pub struct Header {
    pub name: String,
    pub type_name: String,
    pub is_primary_key: bool,
}
