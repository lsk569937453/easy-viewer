use serde::{Deserialize, Serialize};

use std::fmt::Debug;
#[derive(Deserialize, Serialize, Debug)]
pub struct DumpDatabaseReq {
    pub tables: Vec<DumpDatabaseTableItem>,
    pub columns: Vec<Vec<DumpDatabaseColumnItem>>,
    pub export_type: ExportType,
    pub export_option: ExportOption,
    pub file_path: String,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct DumpDatabaseTableItem {
    pub name: String,
    pub checked: bool,
}
#[derive(Deserialize, Serialize, Debug)]
pub struct DumpDatabaseColumnItem {
    pub column_name: String,
    pub checked: bool,
}
#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ExportType {
    Sql,
    Json,
    Xml,
    Csv,
    Excel,
}
#[derive(Deserialize, Serialize, Debug)]
pub enum ExportOption {
    #[serde(rename = "dumapAll")]
    ExportAll,
    #[serde(rename = "dumpData")]
    ExportStruct,
    #[serde(rename = "dumpStructure")]
    ExportData,
}
impl ExportOption {
    pub fn is_export_struct(&self) -> bool {
        matches!(self, ExportOption::ExportAll | ExportOption::ExportStruct)
    }
    pub fn is_export_data(&self) -> bool {
        matches!(self, ExportOption::ExportAll | ExportOption::ExportData)
    }
}
