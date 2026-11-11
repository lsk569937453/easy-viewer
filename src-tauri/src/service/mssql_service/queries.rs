use linked_hash_map::LinkedHashMap;
use std::sync::OnceLock;

static MSSQL_DATABASE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();
static MSSQL_TABLE_DATA: OnceLock<LinkedHashMap<&'static str, &'static str>> = OnceLock::new();

pub(super) fn get_mssql_database_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MSSQL_DATABASE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Query", "query");
        map.insert("Tables", "tables");
        map.insert("Views", "views");
        map.insert("Functions", "functions");
        map.insert("Procedures", "procedures");
        map
    })
}
pub(super) fn get_schema_sql(database: String) -> String {
    format!("SELECT schema_name
    FROM {}.information_schema.schemata WHERE schema_name NOT IN ('INFORMATION_SCHEMA', 'guest', 'db_accessadmin', 'db_owner', 'sys',   'db_denydatareader', 
    'db_denydatawriter', 'db_datareader', 'db_datawriter', 'db_ddladmin', 'db_securityadmin', 'db_backupoperator');",database)
}
pub(super) fn get_table_sql(schema_name: String) -> String {
    format!(
        "SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = '{}'
      AND TABLE_TYPE = 'BASE TABLE';",
        schema_name
    )
}
pub(super) fn get_ddl_sql(schema_name: String, table_name: String) -> String {
    format!("SELECT  
    'CREATE TABLE [' + s.name + '].[' + so.name + '] (' + 
    REPLACE(o.list, ', ', ',' + CHAR(13) + CHAR(10) + '    ') + ')' + CHAR(13) + CHAR(10) + 
    CASE 
        WHEN tc.Constraint_Name IS NULL THEN '' 
        ELSE 
            'ALTER TABLE [' + s.name + '].[' + so.Name + '] ADD CONSTRAINT ' + tc.Constraint_Name + CHAR(13) + CHAR(10) +
            '    PRIMARY KEY (' + LEFT(j.List, LEN(j.List) - 1) + ')' 
    END AS CreateTableScript
FROM sysobjects so
JOIN sys.schemas s ON so.uid = s.schema_id  -- Join with schemas to get schema name
CROSS APPLY (
    SELECT 
        '  [' + column_name + '] ' + 
        data_type + 
        CASE data_type
            WHEN 'sql_variant' THEN ''
            WHEN 'text' THEN ''
            WHEN 'ntext' THEN ''
            WHEN 'xml' THEN ''
            WHEN 'decimal' THEN '(' + CAST(numeric_precision AS VARCHAR) + ', ' + CAST(numeric_scale AS VARCHAR) + ')'
            ELSE COALESCE(
                '(' + CASE 
                          WHEN character_maximum_length = -1 THEN 'MAX' 
                          ELSE CAST(character_maximum_length AS VARCHAR) 
                      END + ')', 
                ''
            ) 
        END + ' ' +
        CASE 
            WHEN EXISTS ( 
                SELECT id 
                FROM syscolumns
                WHERE object_name(id) = so.name
                AND name = column_name
                AND columnproperty(id, name, 'IsIdentity') = 1 
            ) THEN 'IDENTITY(' + CAST(ident_seed(so.name) AS VARCHAR) + ',' + CAST(ident_incr(so.name) AS VARCHAR) + ')' 
            ELSE '' 
        END + ' ' +
        (CASE WHEN UPPER(IS_NULLABLE) = 'NO' THEN 'NOT ' ELSE '' END) + 'NULL ' + 
        CASE 
            WHEN information_schema.columns.COLUMN_DEFAULT IS NOT NULL THEN 'DEFAULT ' + information_schema.columns.COLUMN_DEFAULT 
            ELSE '' 
        END + ', ' 
    FROM information_schema.columns 
    WHERE table_name = so.name
    ORDER BY ordinal_position
    FOR XML PATH('')
) o (list)
LEFT JOIN information_schema.table_constraints tc
    ON tc.Table_name = so.Name
    AND tc.Constraint_Type = 'PRIMARY KEY'
CROSS APPLY (
    SELECT '[' + Column_Name + '], '
    FROM information_schema.key_column_usage kcu
    WHERE kcu.Constraint_Name = tc.Constraint_Name
    ORDER BY ORDINAL_POSITION
    FOR XML PATH('')
) j (list)
WHERE so.xtype = 'U'
AND s.name = '{}'
AND so.name = '{}';",schema_name,table_name)
}
pub(super) fn get_mssql_table_data() -> &'static LinkedHashMap<&'static str, &'static str> {
    MSSQL_TABLE_DATA.get_or_init(|| {
        let mut map = LinkedHashMap::new();
        map.insert("Columns", "columns");
        map.insert("Index", "index");
        map
    })
}
pub(super) fn get_index_sql(schema_name: String, table_name: String) -> String {
    format!(
        "SELECT 
    i.name AS IndexName,
    i.type_desc AS IndexType,
    c.name AS ColumnName,
    ic.key_ordinal AS KeyOrdinal,
    i.is_unique AS IsUnique,
    i.is_primary_key AS IsPrimaryKey
FROM 
    sys.indexes i
INNER JOIN 
    sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN 
    sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE 
    i.object_id = OBJECT_ID('{}.{}');",
        schema_name, table_name
    )
}
