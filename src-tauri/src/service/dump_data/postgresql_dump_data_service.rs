use super::dump_database_service::DumpTableList;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::dump_database_req::ExportOption;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use std::io::Write;
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PostgresqlDumpData {
    pub dump_data_list: Vec<PostgresqlDumpDataItem>,
}
impl PostgresqlDumpData {
    pub fn empty() -> Self {
        PostgresqlDumpData {
            dump_data_list: Vec::new(),
        }
    }
    pub fn from(dump_data_list: Vec<PostgresqlDumpDataItem>) -> Self {
        PostgresqlDumpData { dump_data_list }
    }
    pub fn export_to_file(&self, dump_database_req: DumpDatabaseReq) -> Result<(), anyhow::Error> {
        let file_path = dump_database_req.file_path.clone();
        info!("req:{:?}", dump_database_req);
        match dump_database_req.export_option {
            ExportOption::ExportAll => {
                let mut file = std::fs::File::create(file_path)?;
                info!("file created success");
                for schema in self.dump_data_list.clone() {
                    writeln!(file, "{}", schema.create_schema.clone())?;
                    writeln!(file)?;
                    for table in schema.table_list.0 {
                        writeln!(file, "{}", table.table_struct.clone())?;
                        writeln!(file)?;
                        let sql = table.get_data_for_sql()?;
                        writeln!(file, "{};", sql)?;
                        writeln!(file)?;
                    }
                }
            }
            ExportOption::ExportStruct => {
                let mut file = std::fs::File::create(file_path)?;
                info!("file created success");
                for schema in self.dump_data_list.clone() {
                    writeln!(file, "{}", schema.create_schema.clone())?;
                    writeln!(file)?;
                    for table in schema.table_list.0 {
                        writeln!(file, "{}", table.table_struct.clone())?;
                        writeln!(file)?;
                    }
                }
            }
            ExportOption::ExportData => {
                let mut merged_tables = Vec::new();

                for schema in self.dump_data_list.clone() {
                    let table_list = schema.table_list;
                    merged_tables.extend(table_list.0.clone());
                }
                DumpTableList(merged_tables).export_data(dump_database_req)?;
            }
        }
        Ok(())
    }
}
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PostgresqlDumpDataItem {
    pub create_schema: String,

    pub table_list: DumpTableList,
}
impl PostgresqlDumpDataItem {
    pub fn from(create_schema: String, table_list: DumpTableList) -> Self {
        PostgresqlDumpDataItem {
            create_schema,
            table_list,
        }
    }
}
