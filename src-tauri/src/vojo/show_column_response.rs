use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct ShowColumnsResponse {
    pub header: Vec<ShowColumnHeader>,
    pub rows: Vec<Vec<Option<String>>>,
}
impl ShowColumnsResponse {
    pub fn new() -> ShowColumnsResponse {
        ShowColumnsResponse {
            header: vec![],
            rows: vec![],
        }
    }
    pub fn from(
        header: Vec<ShowColumnHeader>,
        rows: Vec<Vec<Option<String>>>,
    ) -> ShowColumnsResponse {
        ShowColumnsResponse { header, rows }
    }
}
#[derive(Deserialize, Serialize, Debug)]
pub struct ShowColumnHeader {
    pub name: String,
    pub type_name: String,
}
