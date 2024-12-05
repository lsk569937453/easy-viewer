use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub enum InitDumpDataResponse {
    #[serde(rename = "tableList")]
    TableList(Vec<InitDumpTableResponseItem>),
    #[serde(rename = "schemaList")]
    SchemaList(Vec<InitDumpSchemaResponseItem>),
}
impl InitDumpDataResponse {
    pub fn new() -> Self {
        InitDumpDataResponse::TableList(vec![])
    }
    pub fn from_table_list(list: Vec<InitDumpTableResponseItem>) -> Self {
        InitDumpDataResponse::TableList(list)
    }
    pub fn from_schema_list(list: Vec<InitDumpSchemaResponseItem>) -> Self {
        InitDumpDataResponse::SchemaList(list)
    }
}
#[derive(Deserialize, Serialize)]
pub struct InitDumpSchemaResponseItem {
    pub schema_name: String,
    pub table_list: Vec<InitDumpTableResponseItem>,
}
impl InitDumpSchemaResponseItem {
    pub fn from(schema_name: String, table_list: Vec<InitDumpTableResponseItem>) -> Self {
        InitDumpSchemaResponseItem {
            schema_name,
            table_list,
        }
    }
}
#[derive(Deserialize, Serialize)]
pub struct InitDumpTableResponseItem {
    pub table_name: String,
    pub columns: Vec<InitDumpDataColumnItem>,
}
impl InitDumpTableResponseItem {
    pub fn from(table_name: String, columns: Vec<InitDumpDataColumnItem>) -> Self {
        InitDumpTableResponseItem {
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
