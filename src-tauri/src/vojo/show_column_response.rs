use anyhow::Ok;
use docx_rs::*;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct ShowColumnsResponse {
    pub header: Vec<ShowColumnHeader>,
    pub rows: Vec<Vec<Option<String>>>,
}
impl ShowColumnsResponse {
    pub fn new() -> ShowColumnsResponse {
        ShowColumnsResponse {
            header: vec![],
            rows: vec![],
        }
    }
    pub fn from(
        header: Vec<ShowColumnHeader>,
        rows: Vec<Vec<Option<String>>>,
    ) -> ShowColumnsResponse {
        ShowColumnsResponse { header, rows }
    }
    pub fn into_docx_table(self) -> Result<Table, anyhow::Error> {
        let mut rows = vec![];
        let mut headers = vec![];
        for item in self.header.iter() {
            headers.push(
                TableCell::new()
                    .add_paragraph(
                        Paragraph::new()
                            .add_run(Run::new().add_text(item.name.clone()).size(30).bold())
                            .align(AlignmentType::Center),
                    )
                    .shading(Shading::new().shd_type(ShdType::Clear).fill("C0C0C0")),
            );
        }
        rows.push(TableRow::new(headers));
        info!("row len:{}", self.rows.len());
        for item in self.rows.iter() {
            let mut cells = vec![];
            for column in item {
                cells.push(
                    TableCell::new().add_paragraph(
                        Paragraph::new()
                            .add_run(Run::new().add_text(column.clone().unwrap_or("".to_string())))
                            .align(AlignmentType::Center),
                    ),
                );
            }
            rows.push(TableRow::new(cells));
        }

        let res = Table::new(rows);
        Ok(res)
    }
}
#[derive(Deserialize, Serialize, Debug)]
pub struct ShowColumnHeader {
    pub name: String,
    pub type_name: String,
}
