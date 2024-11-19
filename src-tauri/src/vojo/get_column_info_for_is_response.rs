use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct GetColumnInfoForInsertSqlResponse {
    pub list: Vec<GetColumnInfoForInsertSqlResponseItem>,
}
impl GetColumnInfoForInsertSqlResponse {
    pub fn new() -> GetColumnInfoForInsertSqlResponse {
        GetColumnInfoForInsertSqlResponse { list: vec![] }
    }
    pub fn from(
        list: Vec<GetColumnInfoForInsertSqlResponseItem>,
    ) -> GetColumnInfoForInsertSqlResponse {
        GetColumnInfoForInsertSqlResponse { list }
    }
}
#[derive(Deserialize, Serialize)]

pub struct GetColumnInfoForInsertSqlResponseItem {
    pub column_name: String,
    pub column_type: String,
    pub type_flag: i32,
}
impl GetColumnInfoForInsertSqlResponseItem {
    pub fn from(
        column_name: String,
        column_type: String,
        type_flag: i32,
    ) -> GetColumnInfoForInsertSqlResponseItem {
        GetColumnInfoForInsertSqlResponseItem {
            column_name,
            column_type,
            type_flag,
        }
    }
}
