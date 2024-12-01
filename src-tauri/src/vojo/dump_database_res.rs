use serde::{Deserialize, Serialize};
use serde_json::Value;

use std::fmt::Debug;

use super::dump_database_req::{DumpDatabaseReq};
#[derive(Deserialize, Serialize, Debug)]
pub struct DumpDatabaseRes {
    pub data_list: Vec<DumpDatabaseResItem>,
}
impl DumpDatabaseRes {
    // let mut sql = format!("INSERT INTO `{}` VALUES", table_name.clone());
    // for (index, item) in rows.iter().enumerate() {
    //     let columns = item.columns();
    //     let len = columns.len();
    //     let mut row = vec![];
    //     for i in 0..len {
    //         let type_name = columns[i].type_info().name();
    //         let val = mysql_row_to_json(item, type_name, i)?;
    //         let mut pretty_string = serde_json::to_string_pretty(&val)?;
    //         if type_name == "LONGBLOB"
    //             || type_name == "BINARY"
    //             || type_name == "VARBINARY"
    //             || type_name == "BLOB"
    //         {
    //             pretty_string = pretty_string.trim_matches('"').to_string();
    //         }
    //         row.push(pretty_string);
    //     }
    //     let formatted_row = row.join(",");
    //     let formatted_row = if index == 0 {
    //         format!("({})", formatted_row)
    //     } else {
    //         format!(",({})", formatted_row)
    //     };
    //     sql.push_str(formatted_row.as_str());
    // }
    pub fn export_to_file(&self, dump_database_req: DumpDatabaseReq) -> Result<(), anyhow::Error> {
        Ok(())
    }
}
#[derive(Deserialize, Serialize, Debug)]
pub struct DumpDatabaseResItem {
    pub table_struct: Option<String>,
    pub column_list: Option<Vec<Vec<DumpDatabaseResColumnItem>>>,
}
impl DumpDatabaseResItem {
    pub fn new() -> DumpDatabaseResItem {
        DumpDatabaseResItem {
            table_struct: None,
            column_list: None,
        }
    }
    pub fn from(
        table_struct: Option<String>,
        column_list: Option<Vec<Vec<DumpDatabaseResColumnItem>>>,
    ) -> Self {
        DumpDatabaseResItem {
            table_struct,
            column_list,
        }
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
