use crate::vojo::dump_database_req::DumpDatabaseReq;
use crate::vojo::dump_database_req::ExportOption;
use crate::vojo::dump_database_req::ExportType;
use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::Value;
use std::fmt::Debug;
use std::io::Write;
use xlsxwriter::Workbook;
#[derive(Deserialize, Serialize, Debug)]
pub struct DumpDatabaseRes {
    pub data_list: DumpTableList,
}

impl DumpDatabaseRes {
    pub fn from(data_list: DumpTableList) -> Self {
        DumpDatabaseRes { data_list }
    }
    pub fn export_to_file(&self, dump_database_req: DumpDatabaseReq) -> Result<(), anyhow::Error> {
        let file_path = dump_database_req.file_path.clone();
        info!("req:{:?}", dump_database_req);
        match dump_database_req.export_option {
            ExportOption::All => {
                let mut file = std::fs::File::create(file_path)?;
                info!("file created success");
                for i in 0..self.data_list.0.len() {
                    let item = &self.data_list.0[i];
                    writeln!(file, "{};", item.table_struct.clone())?;
                    writeln!(file)?;
                    let sql = item.get_data_for_sql(item)?;
                    writeln!(file, "{};", sql)?;
                    writeln!(file)?;
                }
            }
            ExportOption::Struct => {
                let mut file = std::fs::File::create(file_path)?;

                for i in 0..self.data_list.0.len() {
                    let item = &self.data_list.0[i];
                    writeln!(file, "{};", item.table_struct.clone())?;
                    writeln!(file)?;
                }
            }
            ExportOption::Data => {
                self.data_list.export_data(dump_database_req)?;
            }
        }
        Ok(())
    }
}
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct DumpTableList(pub Vec<DumpDatabaseResItem>);
impl DumpTableList {
    pub fn from(table_list: Vec<DumpDatabaseResItem>) -> Self {
        DumpTableList(table_list)
    }
    pub fn export_data(&self, dump_database_req: DumpDatabaseReq) -> Result<(), anyhow::Error> {
        let file_path = dump_database_req.file_path.clone();

        match dump_database_req.export_type {
            ExportType::Sql => {
                let mut file = std::fs::File::create(file_path)?;

                for i in 0..self.0.len() {
                    let item = &self.0[i];
                    let sql = item.get_data_for_sql(item)?;
                    writeln!(file, "{};", sql)?;
                    writeln!(file)?;
                }
            }
            ExportType::Json => {
                let mut file = std::fs::File::create(file_path)?;

                for i in 0..self.0.len() {
                    let item = &self.0[i];
                    let sql = item.get_data_for_json()?;
                    writeln!(file, "{}", sql)?;
                }
            }
            ExportType::Xml => {
                let mut file = std::fs::File::create(file_path)?;

                for i in 0..self.0.len() {
                    let item = &self.0[i];
                    let sql = item.get_data_for_xml()?;
                    writeln!(file, "{}", sql)?;
                }
            }
            ExportType::Csv => {}
            ExportType::Xlsx => {
                let workbook = Workbook::new(&file_path)?;

                for i in 0..self.0.len() {
                    let item = &self.0[i];
                    let table_name = item.table_name.clone();
                    let mut sheet = workbook.add_worksheet(Some(table_name.as_str()))?;

                    let mut row = 0;

                    for (column_index, column_item) in item.column_structs.iter().enumerate() {
                        sheet.write_string(
                            row,
                            column_index as u16,
                            column_item.column_name.as_str(),
                            None,
                        )?;
                    }
                    row += 1;

                    for column_list in item.column_list.iter() {
                        for (column_index, column_item) in column_list.iter().enumerate() {
                            sheet.write_string(
                                row,
                                column_index as u16,
                                serde_json::to_string_pretty(&column_item.column_value)?.as_str(),
                                None,
                            )?;
                        }
                        row += 1;
                    }
                }
            }
        }
        Ok(())
    }
}
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct DumpDatabaseResItem {
    pub table_struct: String,
    pub column_list: Vec<Vec<DumpDatabaseResColumnItem>>,
    pub table_name: String,
    pub column_structs: Vec<DumpDatabaseResColumnStructItem>,
}
pub trait DumpDatabaseResItemTrait {
    fn get_data_for_sql(
        &self,
        dump_database_res_item: &DumpDatabaseResItem,
    ) -> Result<String, anyhow::Error> {
        let mut sql = format!(
            "INSERT INTO `{}` VALUES",
            dump_database_res_item.table_name.clone()
        );
        for (index, item) in dump_database_res_item.column_list.iter().enumerate() {
            let mut row = vec![];
            for (column_index, column_item) in item.iter().enumerate() {
                let type_name = dump_database_res_item.column_structs[column_index]
                    .column_type
                    .clone();
                let mut pretty_string = serde_json::to_string_pretty(&column_item.column_value)?;
                if type_name == "LONGBLOB"
                    || type_name == "BINARY"
                    || type_name == "VARBINARY"
                    || type_name == "BLOB"
                {
                    pretty_string = pretty_string.trim_matches('"').to_string();
                }
                row.push(pretty_string);
            }
            let formatted_row = row.join(",");
            let formatted_row = if index == 0 {
                format!("({})", formatted_row)
            } else {
                format!(",({})", formatted_row)
            };
            sql.push_str(formatted_row.as_str());
        }

        Ok(sql)
    }
}
impl DumpDatabaseResItemTrait for DumpDatabaseResItem {}
impl DumpDatabaseResItem {
    pub fn new() -> DumpDatabaseResItem {
        DumpDatabaseResItem {
            table_struct: "".to_string(),
            column_list: vec![],
            table_name: "".to_string(),
            column_structs: vec![],
        }
    }

    pub fn get_data_for_json(&self) -> Result<String, anyhow::Error> {
        let mut res_array = vec![];
        for item in self.column_list.iter() {
            let mut row = vec![];
            for (column_index, column_item) in item.iter().enumerate() {
                let column_name = self.column_structs[column_index].column_name.clone();
                let column_value = column_item.column_value.clone();
                row.push(json!({column_name: column_value}));
            }
            res_array.push(row);
        }
        let pretty_string = serde_json::to_string_pretty(&res_array)?;

        Ok(pretty_string)
    }
    pub fn get_data_for_xml(&self) -> Result<String, anyhow::Error> {
        let mut res_array = vec![];
        for item in self.column_list.iter() {
            let mut row = vec![];
            for (column_index, column_item) in item.iter().enumerate() {
                let column_name = self.column_structs[column_index].column_name.clone();
                let column_value = column_item.column_value.clone();
                row.push(json!({column_name: column_value}));
            }
            res_array.push(row);
        }
        let pretty_string = serde_xml_rs::to_string(&res_array)?;

        Ok(pretty_string)
    }
}
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct DumpDatabaseResColumnItem {
    pub column_value: Value,
}
impl DumpDatabaseResColumnItem {
    pub fn from(column_value: Value) -> Self {
        DumpDatabaseResColumnItem { column_value }
    }
}
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct DumpDatabaseResColumnStructItem {
    pub column_name: String,
    pub column_type: String,
}
impl DumpDatabaseResColumnStructItem {
    pub fn from(column_name: String, column_type: String) -> Self {
        DumpDatabaseResColumnStructItem {
            column_name,
            column_type,
        }
    }
}
