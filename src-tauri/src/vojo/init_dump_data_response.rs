use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct InitDumpDataResponse {
    pub list: Vec<InitDumpDataResponseItem>,
}
impl InitDumpDataResponse {
    pub fn new() -> Self {
        InitDumpDataResponse { list: vec![] }
    }
    pub fn from(list: Vec<InitDumpDataResponseItem>) -> Self {
        InitDumpDataResponse { list }
    }
}
#[derive(Deserialize, Serialize)]
pub struct InitDumpDataResponseItem {
    pub table_name: String,
    pub columns: Vec<InitDumpDataColumnItem>,
}
impl InitDumpDataResponseItem {
    pub fn from(table_name: String, columns: Vec<InitDumpDataColumnItem>) -> Self {
        InitDumpDataResponseItem {
            table_name,
            columns,
        }
    }
}
#[derive(Deserialize, Serialize)]
pub struct InitDumpDataColumnItem {
    pub column_name: String,
    pub column_type: String,
}
impl InitDumpDataColumnItem {
    pub fn from(column_name: String, column_type: String) -> Self {
        InitDumpDataColumnItem {
            column_name,
            column_type,
        }
    }
}
