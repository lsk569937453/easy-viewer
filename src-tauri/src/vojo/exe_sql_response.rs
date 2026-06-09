use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct ExeSqlResponse {
    pub header: Vec<Header>,
    pub rows: Vec<Vec<Option<String>>>,
    pub table_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_count: Option<i64>,
}
impl ExeSqlResponse {
    pub fn new() -> ExeSqlResponse {
        ExeSqlResponse {
            header: vec![],
            rows: vec![],
            table_name: None,
            total_count: None,
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
            total_count: None,
        }
    }
}
#[derive(Deserialize, Serialize, Debug)]
pub struct Header {
    pub name: String,
    pub type_name: String,
    pub is_primary_key: bool,
}
