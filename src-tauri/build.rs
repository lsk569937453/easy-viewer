//! 构建期代码生成：把 `plugins/connection-types/*.yaml` 变成 Rust 枚举与前端 TS 常量。
//!
//! 数据源清单只允许存在一份真相源（YAML），Rust 与前端两侧均由这里生成，
//! 从根上消灭“前后端各自手写一份数据源列表”导致的漂移。
use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::path::{Path, PathBuf};

use serde::Deserialize;

/// 能力位的固定顺序：新增能力只能追加到末尾，禁止插队（否则所有 YAML 的含义会漂移）。
const CAPABILITIES: &[&str] = &[
    "test_connection",
    "schema",
    "query",
    "ddl",
    "columns",
    "comments",
    "column_info",
    "move_column",
    "import_data",
    "dump_data",
    "generate_document",
    "complete_words",
    "procedures",
    "object_store",
    "buckets",
    "key_value",
    "topics",
    "messages",
    "search",
    "documents",
    "update_rows",
    "truncate",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConnectionType {
    db_type: String,
    rust_variant: String,
    label: String,
    connection_type: i32,
    category: String,
    icon: String,
    default_port: u16,
    order: i32,
    rust_type: String,
    capabilities: Vec<String>,
}

fn main() {
    if let Err(err) = generate() {
        // build script 里无法 `unwrap`（项目规范禁止），直接 panic 让编译失败并打印原因。
        panic!("connection-type codegen failed: {err}");
    }
    tauri_build::build();
}

fn generate() -> Result<(), String> {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
        .map_err(|_| "CARGO_MANIFEST_DIR not set".to_string())?;
    let manifest_dir = PathBuf::from(manifest_dir);
    let descriptor_dir = manifest_dir.join("plugins").join("connection-types");

    println!("cargo:rerun-if-changed={}", descriptor_dir.display());

    let mut types = load_descriptors(&descriptor_dir)?;
    types.sort_by_key(|item| item.order);

    let rust_source = render_rust(&types)?;
    let out_path = PathBuf::from(
        std::env::var("OUT_DIR").map_err(|_| "OUT_DIR not set".to_string())?,
    )
    .join("database_types.rs");
    std::fs::write(&out_path, rust_source)
        .map_err(|err| format!("write {} failed: {err}", out_path.display()))?;

    let ts_path = manifest_dir
        .join("..")
        .join("src")
        .join("types")
        .join("generated")
        .join("databaseTypes.ts");
    if let Some(parent) = ts_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|err| format!("create {} failed: {err}", parent.display()))?;
    }
    std::fs::write(&ts_path, render_typescript(&types))
        .map_err(|err| format!("write {} failed: {err}", ts_path.display()))?;
    println!("cargo:rerun-if-changed={}", ts_path.display());

    Ok(())
}

fn load_descriptors(dir: &Path) -> Result<Vec<ConnectionType>, String> {
    let entries = std::fs::read_dir(dir)
        .map_err(|err| format!("read_dir {} failed: {err}", dir.display()))?;

    let mut by_db_type: BTreeMap<String, ConnectionType> = BTreeMap::new();
    for entry in entries {
        let entry = entry.map_err(|err| format!("dir entry error: {err}"))?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("yaml") {
            continue;
        }
        println!("cargo:rerun-if-changed={}", path.display());
        let text = std::fs::read_to_string(&path)
            .map_err(|err| format!("read {} failed: {err}", path.display()))?;
        let parsed: ConnectionType = serde_yaml::from_str(&text)
            .map_err(|err| format!("parse {} failed: {err}", path.display()))?;
        validate(&parsed, &path)?;
        if by_db_type.insert(parsed.db_type.clone(), parsed).is_some() {
            return Err(format!("duplicate dbType in {}", path.display()));
        }
    }

    if by_db_type.is_empty() {
        return Err("no connection-type descriptor found".to_string());
    }

    let mut types: Vec<ConnectionType> = by_db_type.into_values().collect();
    ensure_unique(&types, |item| item.rust_variant.clone(), "rustVariant")?;
    ensure_unique(
        &types,
        |item| item.connection_type.to_string(),
        "connectionType",
    )?;
    ensure_unique(&types, |item| item.order.to_string(), "order")?;
    types.sort_by_key(|item| item.order);
    Ok(types)
}

fn validate(item: &ConnectionType, path: &Path) -> Result<(), String> {
    let where_ = path.display().to_string();
    if item.db_type.trim().is_empty() {
        return Err(format!("{where_}: dbType is empty"));
    }
    if !item
        .db_type
        .chars()
        .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '_')
    {
        return Err(format!("{where_}: dbType must be lowercase snake_case"));
    }
    if !item
        .rust_variant
        .chars()
        .next()
        .map(|ch| ch.is_ascii_uppercase())
        .unwrap_or(false)
    {
        return Err(format!("{where_}: rustVariant must start uppercase"));
    }
    for cap in &item.capabilities {
        if !CAPABILITIES.contains(&cap.as_str()) {
            return Err(format!("{where_}: unknown capability `{cap}`"));
        }
    }
    Ok(())
}

fn ensure_unique<F>(types: &[ConnectionType], key: F, field: &str) -> Result<(), String>
where
    F: Fn(&ConnectionType) -> String,
{
    let mut seen: BTreeMap<String, usize> = BTreeMap::new();
    for item in types {
        *seen.entry(key(item)).or_insert(0) += 1;
    }
    for (value, count) in seen {
        if count > 1 {
            return Err(format!("duplicate {field} `{value}` ({count} descriptors)"));
        }
    }
    Ok(())
}

fn render_rust(types: &[ConnectionType]) -> Result<String, String> {
    let mut out = String::new();
    out.push_str("// @generated by src-tauri/build.rs from plugins/connection-types/*.yaml\n");
    out.push_str("// 不要手工修改；改 YAML 后重新构建即可。\n\n");

    // 能力位常量
    for (index, cap) in CAPABILITIES.iter().enumerate() {
        writeln!(
            out,
            "pub const CAP_{}: u64 = 1 << {};",
            cap.to_uppercase(),
            index
        )
        .map_err(|err| err.to_string())?;
    }
    out.push('\n');
    out.push_str("/// 数据源能力位集合：由 YAML 声明，前端据此隐藏入口，后端据此拒绝不支持的操作。\n");
    out.push_str("#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]\npub struct Capabilities(u64);\n\n");
    out.push_str("/// 能力位的规范顺序与名称（用于序列化给前端）。\n");
    out.push_str("pub const CAPABILITY_NAMES: &[&str] = &[\n");
    for cap in CAPABILITIES {
        out.push_str(&format!("    \"{cap}\",\n"));
    }
    out.push_str("];\n\n");
    out.push_str("#[allow(dead_code)] // 生成的能力位方法按 YAML 声明全量产出，未使用的分支由后续阶段消费\nimpl Capabilities {\n    /// 展开成能力名列表，供前端按能力隐藏入口。\n    pub fn names(self) -> Vec<&'static str> {\n        CAPABILITY_NAMES\n            .iter()\n            .enumerate()\n            .filter(|(index, _)| (self.0 & (1 << index)) != 0)\n            .map(|(_, name)| *name)\n            .collect()\n    }\n\n    pub const fn from_bits(bits: u64) -> Self {\n        Self(bits)\n    }\n\n    pub const fn bits(self) -> u64 {\n        self.0\n    }\n\n    pub const fn contains(self, other: Self) -> bool {\n        (self.0 & other.0) == other.0\n    }\n");
    for cap in CAPABILITIES {
        writeln!(
            out,
            "\n    /// 是否具备 `{cap}` 能力。\n    pub const fn {cap}(self) -> bool {{\n        (self.0 & CAP_{}) != 0\n    }}",
            cap.to_uppercase()
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("}\n\n");

    // 枚举
    out.push_str("/// 数据源类型。由 plugins/connection-types/*.yaml 生成。\n");
    out.push_str(
        "#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, serde::Serialize, serde::Deserialize)]\n#[serde(rename_all = \"lowercase\")]\npub enum DatabaseType {\n",
    );
    for item in types {
        writeln!(out, "    {},", item.rust_variant).map_err(|err| err.to_string())?;
    }
    out.push_str("}\n\n");

    out.push_str("#[allow(dead_code)] // 生成的描述符访问器对前端与文档开放\nimpl DatabaseType {\n");
    out.push_str(&format!(
        "    pub const ALL: [DatabaseType; {}] = [\n",
        types.len()
    ));
    for item in types {
        writeln!(out, "        DatabaseType::{},", item.rust_variant)
            .map_err(|err| err.to_string())?;
    }
    out.push_str("    ];\n\n");

    out.push_str("    /// YAML 里的 `dbType`，同时是持久化用的稳定标识。\n    pub const fn as_str(self) -> &'static str {\n        match self {\n");
    for item in types {
        writeln!(
            out,
            "            DatabaseType::{} => \"{}\",",
            item.rust_variant, item.db_type
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("        }\n    }\n\n");

    out.push_str("    pub fn from_db_type(value: &str) -> Option<Self> {\n        match value {\n");
    for item in types {
        writeln!(
            out,
            "            \"{}\" => Some(DatabaseType::{}),",
            item.db_type, item.rust_variant
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("            _ => None,\n        }\n    }\n\n");

    out.push_str("    /// 前端 `connection_type` 数值（历史兼容，禁止改动已有值）。\n    pub const fn connection_type(self) -> i32 {\n        match self {\n");
    for item in types {
        writeln!(
            out,
            "            DatabaseType::{} => {},",
            item.rust_variant, item.connection_type
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("        }\n    }\n\n");

    out.push_str("    pub fn from_connection_type(value: i32) -> Option<Self> {\n        match value {\n");
    for item in types {
        writeln!(
            out,
            "            {} => Some(DatabaseType::{}),",
            item.connection_type, item.rust_variant
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("            _ => None,\n        }\n    }\n\n");

    out.push_str("    pub const fn label(self) -> &'static str {\n        match self {\n");
    for item in types {
        writeln!(
            out,
            "            DatabaseType::{} => \"{}\",",
            item.rust_variant, item.label
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("        }\n    }\n\n");

    out.push_str("    pub const fn icon(self) -> &'static str {\n        match self {\n");
    for item in types {
        writeln!(
            out,
            "            DatabaseType::{} => \"{}\",",
            item.rust_variant, item.icon
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("        }\n    }\n\n");

    out.push_str("    pub const fn category(self) -> &'static str {\n        match self {\n");
    for item in types {
        writeln!(
            out,
            "            DatabaseType::{} => \"{}\",",
            item.rust_variant, item.category
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("        }\n    }\n\n");

    out.push_str("    /// 默认端口，0 表示该数据源不使用网络端口。\n    pub const fn default_port(self) -> u16 {\n        match self {\n");
    for item in types {
        writeln!(
            out,
            "            DatabaseType::{} => {},",
            item.rust_variant, item.default_port
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("        }\n    }\n\n");

    out.push_str("    pub const fn order(self) -> i32 {\n        match self {\n");
    for item in types {
        writeln!(
            out,
            "            DatabaseType::{} => {},",
            item.rust_variant, item.order
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("        }\n    }\n\n");

    out.push_str("    pub const fn capabilities(self) -> Capabilities {\n        match self {\n");
    for item in types {
        let bits = capability_expression(&item.capabilities);
        writeln!(
            out,
            "            DatabaseType::{} => Capabilities::from_bits({}),",
            item.rust_variant, bits
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("        }\n    }\n\n");

    out.push_str("    /// YAML 里引用的 Rust 配置结构体名，供文档与调试输出使用。\n    pub const fn rust_type(self) -> &'static str {\n        match self {\n");
    for item in types {
        writeln!(
            out,
            "            DatabaseType::{} => \"{}\",",
            item.rust_variant, item.rust_type
        )
        .map_err(|err| err.to_string())?;
    }
    out.push_str("        }\n    }\n}\n");

    Ok(out)
}

/// 生成 `CAP_X | CAP_Y` 形式的表达式，让常量本身被真实使用（而不是内联成魔数）。
fn capability_expression(caps: &[String]) -> String {
    let mut parts: Vec<String> = Vec::new();
    for cap in caps {
        if CAPABILITIES.contains(&cap.as_str()) {
            parts.push(format!("CAP_{}", cap.to_uppercase()));
        }
    }
    if parts.is_empty() {
        "0".to_string()
    } else {
        parts.join(" | ")
    }
}

fn render_typescript(types: &[ConnectionType]) -> String {
    let mut out = String::new();
    out.push_str("// @generated by src-tauri/build.rs from src-tauri/plugins/connection-types/*.yaml\n");
    out.push_str("// 不要手工修改：改 YAML 后构建 Tauri 端即可重新生成。\n\n");

    out.push_str("/** 数据源能力位（与 Rust `Capabilities` 一一对应）。 */\nexport const CAPABILITIES = [\n");
    for cap in CAPABILITIES {
        out.push_str(&format!("  \"{cap}\",\n"));
    }
    out.push_str("] as const;\n\n");
    out.push_str("export type Capability = (typeof CAPABILITIES)[number];\n\n");

    out.push_str("export type DatabaseTypeId =\n");
    for (index, item) in types.iter().enumerate() {
        let terminator = if index + 1 == types.len() { ";\n\n" } else { "\n" };
        out.push_str(&format!("  | \"{}\"{}", item.db_type, terminator));
    }
    out.push_str("/** `connection_type` 数值 → 稳定标识。禁止改动已有数值，只允许追加。 */\n");
    out.push_str("export const CONNECTION_TYPE = {\n");
    for item in types {
        out.push_str(&format!(
            "  {}: \"{}\",\n",
            to_screaming_snake(&item.db_type),
            item.db_type
        ));
    }
    out.push_str("} as const;\n\n");

    out.push_str("export const CONNECTION_TYPE_VALUES = {\n");
    for item in types {
        out.push_str(&format!(
            "  {}: {},\n",
            to_screaming_snake(&item.db_type),
            item.connection_type
        ));
    }
    out.push_str("} as const;\n\n");

    out.push_str("export interface DatabaseTypeDescriptor {\n  /** YAML `dbType` */\n  dbType: DatabaseTypeId;\n  label: string;\n  /** 前端 `connection_type` 数值 */\n  connectionType: number;\n  category: string;\n  icon: string;\n  defaultPort: number;\n  capabilities: readonly Capability[];\n}\n\n");

    out.push_str("export const DATABASE_TYPES: readonly DatabaseTypeDescriptor[] = [\n");
    for item in types {
        out.push_str("  {\n");
        out.push_str(&format!("    dbType: \"{}\",\n", item.db_type));
        out.push_str(&format!("    label: \"{}\",\n", item.label));
        out.push_str(&format!("    connectionType: {},\n", item.connection_type));
        out.push_str(&format!("    category: \"{}\",\n", item.category));
        out.push_str(&format!("    icon: \"{}\",\n", item.icon));
        out.push_str(&format!("    defaultPort: {},\n", item.default_port));
        out.push_str("    capabilities: [\n");
        for cap in &item.capabilities {
            out.push_str(&format!("      \"{cap}\",\n"));
        }
        out.push_str("    ],\n  },\n");
    }
    out.push_str("];\n\n");

    out.push_str("const BY_CONNECTION_TYPE = new Map<number, DatabaseTypeDescriptor>(\n  DATABASE_TYPES.map((item) => [item.connectionType, item]),\n);\n\n");
    out.push_str("export const descriptorByConnectionType = (\n  connectionType: number,\n): DatabaseTypeDescriptor | undefined => BY_CONNECTION_TYPE.get(connectionType);\n\n");
    out.push_str("export const supportsCapability = (\n  connectionType: number,\n  capability: Capability,\n): boolean =>\n  descriptorByConnectionType(connectionType)?.capabilities.includes(capability) ??\n  false;\n");

    out
}

fn to_screaming_snake(value: &str) -> String {
    value
        .split('_')
        .map(|part| part.to_uppercase())
        .collect::<Vec<String>>()
        .join("_")
}
