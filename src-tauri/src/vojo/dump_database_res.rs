use super::dump_database_req::DumpDatabaseReq;
use crate::vojo::dump_database_req::ExportOption;
use crate::vojo::dump_database_req::ExportType;
use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::Value;
use std::fmt::Debug;
use std::io::Write;
use xlsxwriter::prelude::FormatColor;
use xlsxwriter::Format;
use xlsxwriter::Workbook;
#[derive(Deserialize, Serialize, Debug)]
pub struct DumpDatabaseRes {
    pub data_list: Vec<DumpDatabaseResItem>,
}
impl DumpDatabaseRes {
    pub fn export_to_file(&self, dump_database_req: DumpDatabaseReq) -> Result<(), anyhow::Error> {
        let file_path = dump_database_req.file_path.clone();

        match dump_database_req.export_option {
            ExportOption::ExportAll => {
                let mut file = std::fs::File::create(file_path)?;

                for i in 0..self.data_list.len() {
                    let item = &self.data_list[i];
                    writeln!(file, "{}", item.table_struct.clone())?;
                    let sql = item.get_data_for_sql()?;
                    writeln!(file, "{}", sql)?;
                }
            }
            ExportOption::ExportStruct => {
                let mut file = std::fs::File::create(file_path)?;

                for i in 0..self.data_list.len() {
                    let item = &self.data_list[i];
                    writeln!(file, "{}", item.table_struct.clone())?;
                }
            }
            ExportOption::ExportData => match dump_database_req.export_type {
                ExportType::Sql => {
                    let mut file = std::fs::File::create(file_path)?;

                    for i in 0..self.data_list.len() {
                        let item = &self.data_list[i];
                        let sql = item.get_data_for_sql()?;
                        writeln!(file, "{}", sql)?;
                    }
                }
                ExportType::Json => {
                    let mut file = std::fs::File::create(file_path)?;

                    for i in 0..self.data_list.len() {
                        let item = &self.data_list[i];
                        let sql = item.get_data_for_json()?;
                        writeln!(file, "{}", sql)?;
                    }
                }
                ExportType::Xml => {
                    let mut file = std::fs::File::create(file_path)?;

                    for i in 0..self.data_list.len() {
                        let item = &self.data_list[i];
                        let sql = item.get_data_for_xml()?;
                        writeln!(file, "{}", sql)?;
                    }
                }
                ExportType::Csv => {}
                ExportType::Excel => {
                    let workbook = Workbook::new("simple1.xlsx")?;
                    let mut sheet1 = workbook.add_worksheet(None)?;
                    sheet1.write_string(
                        0,
                        0,
                        "Red text",
                        Some(Format::new().set_font_color(FormatColor::Red)),
                    )?;
                }
            },
        }
        Ok(())
    }
}
#[derive(Deserialize, Serialize, Debug)]
pub struct DumpDatabaseResItem {
    pub table_struct: String,
    pub column_list: Vec<Vec<DumpDatabaseResColumnItem>>,
    pub table_name: String,
}
impl DumpDatabaseResItem {
    pub fn new() -> DumpDatabaseResItem {
        DumpDatabaseResItem {
            table_struct: "".to_string(),
            column_list: vec![],
            table_name: "".to_string(),
        }
    }
    pub fn from(
        table_struct: String,
        column_list: Vec<Vec<DumpDatabaseResColumnItem>>,
        table_name: String,
    ) -> Self {
        DumpDatabaseResItem {
            table_struct,
            column_list,
            table_name,
        }
    }
    fn get_data_for_sql(&self) -> Result<String, anyhow::Error> {
        let mut sql = format!("INSERT INTO `{}` VALUES", self.table_name.clone());
        for (index, item) in self.column_list.iter().enumerate() {
            let mut row = vec![];
            for column_item in item {
                let type_name = column_item.column_type.clone();
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
    fn get_data_for_json(&self) -> Result<String, anyhow::Error> {
        let mut res_array = vec![];
        for (index, item) in self.column_list.iter().enumerate() {
            let mut row = vec![];
            for column_item in item {
                let column_name = column_item.column_name.clone();
                let column_value = column_item.column_value.clone();
                row.push(json!({column_name: column_value}));
            }
            res_array.push(row);
        }
        let pretty_string = serde_json::to_string_pretty(&res_array)?;

        Ok(pretty_string)
    }
    fn get_data_for_xml(&self) -> Result<String, anyhow::Error> {
        let mut res_array = vec![];
        for (index, item) in self.column_list.iter().enumerate() {
            let mut row = vec![];
            for column_item in item {
                let column_name = column_item.column_name.clone();
                let column_value = column_item.column_value.clone();
                row.push(json!({column_name: column_value}));
            }
            res_array.push(row);
        }
        let pretty_string = serde_xml_rs::to_string(&res_array)?;

        Ok(pretty_string)
    }
}
#[derive(Deserialize, Serialize, Debug)]
pub struct DumpDatabaseResColumnItem {
    pub column_name: String,
    pub column_type: String,
    pub column_value: Value,
}
impl DumpDatabaseResColumnItem {
    pub fn from(column_name: String, column_type: String, column_value: Value) -> Self {
        DumpDatabaseResColumnItem {
            column_name,
            column_type,
            column_value,
        }
    }
}
