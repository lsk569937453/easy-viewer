use super::dump_database_service::DumpTableList;
use crate::service::dump_data::dump_database_service::DumpDatabaseResItem;
use crate::service::dump_data::dump_database_service::DumpDatabaseResItemTrait;
use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::dump_database_req::ExportOption;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use std::io::Write;
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct MssqlDumpData {
    pub dump_data_list: Vec<MssqlDumpDataItem>,
}
impl DumpDatabaseResItemTrait for MssqlDumpData {
    fn get_data_for_sql(
        &self,
        dump_database_res_item: &DumpDatabaseResItem,
    ) -> Result<String, anyhow::Error> {
        let column_names = dump_database_res_item
            .column_structs
            .iter()
            .map(|item| item.column_name.clone())
            .collect::<Vec<String>>();
        let column_names_str = column_names.join(",");
        let mut sql = format!(
            "INSERT INTO {} ({}) VALUES",
            dump_database_res_item.table_name.clone(),
            column_names_str
        );
        for (index, item) in dump_database_res_item.column_list.iter().enumerate() {
            let mut row = vec![];
            for (column_index, column_item) in item.iter().enumerate() {
                let type_name = dump_database_res_item.column_structs[column_index]
                    .column_type
                    .clone();
                // let mut pretty_string =
                //     serde_json::to_string_pretty(&column_item.column_value)?.replace("\"", "'");
                info!("type_name:{}", type_name);
                let pretty_string = if type_name == "Int4" {
                    format!("'{}'", column_item.column_value)
                } else {
                    format!(
                        "'{}'",
                        column_item.column_value.as_str().ok_or(anyhow!(""))?
                    )
                };
                row.push(pretty_string);
            }
            let formatted_row = row.join(",");
            let formatted_row = if index == 0 {
                format!("({})", formatted_row)
            } else {
                format!(",({})", formatted_row)
            };
            info!("formatted_row:{}", formatted_row);
            sql.push_str(formatted_row.as_str());
        }

        Ok(sql)
    }
}
impl MssqlDumpData {
    pub fn from(dump_data_list: Vec<MssqlDumpDataItem>) -> Self {
        MssqlDumpData { dump_data_list }
    }
    pub fn export_to_file(&self, dump_database_req: DumpDatabaseReq) -> Result<(), anyhow::Error> {
        let file_path = dump_database_req.file_path.clone();
        info!("req:{:?}", dump_database_req);
        match dump_database_req.export_option {
            ExportOption::All => {
                let mut file = std::fs::File::create(file_path)?;
                info!("file created success");
                for mssql_dump_data_item in self.dump_data_list.clone() {
                    writeln!(file, "{}", mssql_dump_data_item.create_schema.clone())?;
                    writeln!(file)?;
                    for table in mssql_dump_data_item.table_list.0 {
                        writeln!(file, "{}", table.table_struct.clone())?;
                        writeln!(file)?;
                        let sql = self.get_data_for_sql(&table)?;
                        writeln!(file, "{};", sql)?;
                        writeln!(file)?;
                    }
                }
            }
            ExportOption::Struct => {
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
            ExportOption::Data => {
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
pub struct MssqlDumpDataItem {
    pub create_schema: String,

    pub table_list: DumpTableList,
}
impl MssqlDumpDataItem {
    pub fn from(create_schema: String, table_list: DumpTableList) -> Self {
        MssqlDumpDataItem {
            create_schema,
            table_list,
        }
    }
}
