use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct ExeSqlResponse {
    pub header: Vec<Header>,
    pub rows: Vec<Vec<Option<String>>>,
}
impl ExeSqlResponse {
    pub fn new() -> ExeSqlResponse {
        ExeSqlResponse {
            header: vec![],
            rows: vec![],
        }
    }
    pub fn from(header: Vec<Header>, rows: Vec<Vec<Option<String>>>) -> ExeSqlResponse {
        ExeSqlResponse { header, rows }
    }
}
#[derive(Deserialize, Serialize)]

pub struct Header {
    pub name: String,
    pub type_name: String,
}
