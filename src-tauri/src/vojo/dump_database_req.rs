use serde::{Deserialize, Serialize};

use std::fmt::Debug;
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct DumpDatabaseReq {
    pub source_data: DumpDatabaseSourceData,
    pub export_type: ExportType,
    pub export_option: ExportOption,
    pub file_path: String,
}
#[derive(Deserialize, Serialize, Debug, Clone)]

pub enum DumpDatabaseSourceData {
    #[serde(rename = "commonData")]
    CommonData(CommonData),
    #[serde(rename = "schemaData")]
    SchemaData(SchemaData),
}
impl DumpDatabaseSourceData {
    pub fn get_common_data(&self) -> Result<CommonData, anyhow::Error> {
        match self {
            DumpDatabaseSourceData::CommonData(data) => Ok(data.clone()),
            _ => Err(anyhow!("not common data")),
        }
    }
    pub fn get_postgresql_data(&self) -> Result<SchemaData, anyhow::Error> {
        match self {
            DumpDatabaseSourceData::SchemaData(data) => Ok(data.clone()),
            _ => Err(anyhow!("not postgresql data")),
        }
    }
}
#[derive(Deserialize, Serialize, Debug, Clone)]

pub struct CommonData {
    pub tables: Vec<DumpDatabaseTableItem>,
    pub columns: Vec<Vec<DumpDatabaseColumnItem>>,
}
#[derive(Deserialize, Serialize, Debug, Clone)]

pub struct SchemaData {
    pub list: Vec<PostgresqlSchemaData>,
}
#[derive(Deserialize, Serialize, Debug, Clone)]

pub struct PostgresqlSchemaData {
    pub table_list: Vec<PostgresqlTableItem>,
    pub schema_name: String,
    pub checked: bool,
}
#[derive(Deserialize, Serialize, Debug, Clone)]

pub struct PostgresqlTableItem {
    pub columns: Vec<PostgresqlColumnItem>,
    pub table_name: String,
    pub checked: bool,
}
#[derive(Deserialize, Serialize, Debug, Clone)]

pub struct PostgresqlColumnItem {
    pub column_name: String,
    pub checked: bool,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct DumpDatabaseTableItem {
    pub name: String,
    pub checked: bool,
}
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct DumpDatabaseColumnItem {
    pub column_name: String,
    pub checked: bool,
}
#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub enum ExportType {
    Sql,
    Json,
    Xml,
    Csv,
    Xlsx,
}
#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum ExportOption {
    #[serde(rename = "dumapAll")]
    All,
    #[serde(rename = "dumpData")]
    Data,
    #[serde(rename = "dumpStructure")]
    Struct,
}
impl ExportOption {
    pub fn is_export_struct(&self) -> bool {
        matches!(self, ExportOption::All | ExportOption::Struct)
    }
    pub fn is_export_data(&self) -> bool {
        matches!(self, ExportOption::All | ExportOption::Data)
    }
}
