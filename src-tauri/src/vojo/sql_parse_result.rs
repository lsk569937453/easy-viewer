use sqlparser::{
    ast::{Expr, GroupByExpr, SelectItem, SetExpr, Statement, TableFactor, TableWithJoins},
    dialect::GenericDialect,
    parser::Parser,
};

pub struct SqlParseResult {
    pub ast: Vec<Statement>,
}
impl SqlParseResult {
    pub fn new(sql: String) -> Result<SqlParseResult, anyhow::Error> {
        let dialect = GenericDialect {};
        let ast = Parser::parse_sql(&dialect, &sql)?;
        if ast.is_empty() {
            return Err(anyhow::anyhow!("Invalid SQL"));
        }
        Ok(SqlParseResult { ast })
    }
    pub fn is_simple_select(&self) -> Result<Option<String>, anyhow::Error> {
        let ast = self.ast.clone();

        // Ensure there's only one statement and it's a SELECT statement
        if ast.len() != 1 {
            return Ok(None);
        }

        if let Statement::Query(query) = &ast[0] {
            if let SetExpr::Select(select) = &*query.body {
                // Check that there is only one table in the FROM clause without joins
                if select.from.len() != 1 {
                    return Ok(None);
                }
                if let Some(TableWithJoins { joins, .. }) = select.from.first() {
                    if !joins.is_empty() {
                        return Ok(None); // There's a JOIN in the query
                    }
                }

                // Check for GROUP BY clause
                match &select.group_by {
                    GroupByExpr::All(_) => return Ok(None), // GROUP BY clause found
                    GroupByExpr::Expressions(first, second) => {
                        if !first.is_empty() || !second.is_empty() {
                            return Ok(None);
                        }
                    }
                };

                // Check for aggregate functions in the SELECT clause
                for item in &select.projection {
                    if let SelectItem::UnnamedExpr(expr) = item {
                        if contains_aggregate(expr) {
                            return Ok(None); // Aggregation function found
                        }
                    }
                }
                let table = match &select.from[0].relation {
                    TableFactor::Table { name, .. } => name,
                    _ => return Ok(None),
                };
                return Ok(Some(format!("{}", table)));
            }
        }

        Ok(None)
    }
    pub fn has_multiple_rows(&self) -> Result<bool, anyhow::Error> {
        let ast = self.ast.clone();
        let last = &ast[0];

        let res = match last {
            Statement::Insert(_) => false,
            Statement::Update { .. } => false,
            Statement::Delete(_) => false,

            _ => true,
        };
        Ok(res)
    }
}
fn contains_aggregate(expr: &Expr) -> bool {
    match expr {
        Expr::Function(func) => {
            // Check if the function is an aggregate by name
            matches!(
                func.name.to_string().to_uppercase().as_str(),
                "SUM" | "COUNT" | "AVG" | "MIN" | "MAX"
            )
        }
        Expr::BinaryOp { left, right, .. } => contains_aggregate(left) || contains_aggregate(right),
        Expr::UnaryOp { expr, .. } => contains_aggregate(expr),
        Expr::Nested(expr) => contains_aggregate(expr),
        _ => false,
    }
}
