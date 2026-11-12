# 新增一个数据源：驱动开发指南

> 目标：让"加一个数据源"从改 5 处、跨 3 层，变成**加 1 个 YAML + 1 个 impl**。

## 全景：四步

```
1. plugins/connection-types/<dbType>.yaml   ← 声明数据源与能力
2. service/<name>_service.rs                ← 配置结构体 + 业务实现（既有风格）
3. driver/impls_*.rs                        ← impl Driver（只做粘合）
4. service/base_config_service.rs           ← 在 BaseConfigEnum 加一个变体
```

`build.rs` 会自动把 YAML 变成 Rust 枚举、能力位、前端 TS 常量；
`driver/registry.rs` 的 match 需要手动加一行（编译器会提醒你）。

## 第 1 步：描述符 YAML

新增 `src-tauri/plugins/connection-types/duckdb.yaml`：

```yaml
dbType: duckdb              # 持久化标识，snake_case，一经发布不可改
rustVariant: Duckdb         # 生成的 Rust 枚举变体名
label: DuckDB               # UI 展示名
connectionType: 13          # 前端历史整数；只能追加，禁止改已有值
category: relational        # relational | nosql | messaging | storage | search
icon: duckdb
defaultPort: 0              # 0 表示不用网络端口（如嵌入式/S3）
order: 130                  # 列表排序
rustType: DuckdbConfig      # 配置结构体名（文档与调试用）
capabilities:               # 只声明真正支持的能力
  - test_connection
  - schema
  - query
  - ddl
  - columns
```

`build.rs` 会校验：`dbType` 唯一且为小写、`rustVariant` 首字母大写、
`connectionType`/`order` 不重复、能力名在白名单内。校验失败**编译期报错**，不会带到运行时。

能力位清单（顺序即 Bit 顺序，新增只能追加到末尾）见
`src-tauri/build.rs` 的 `CAPABILITIES` 数组；
前端对应的字面量类型是 `src/types/generated/databaseTypes.ts` 的 `Capability`。

## 第 2 步：配置结构体与业务实现

放到 `src-tauri/src/service/duckdb_service.rs`，与既有驱动同风格：

```rust
#[derive(Deserialize, Serialize, Clone)]
pub struct DuckdbConfig {
    pub file_path: String,
}

impl DuckdbConfig {
    pub async fn test_connection(&self) -> Result<(), anyhow::Error> { /* ... */ }
    pub fn get_description(&self) -> Result<String, anyhow::Error> { /* ... */ }
    pub async fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        appstate: &AppState,
    ) -> Result<ListNodeInfoResponse, anyhow::Error> { /* ... */ }
}
```

约定：
- 业务错误用 `anyhow`，**不要**在这里建错误类型体系；跨模块边界由 `AppError` 统一收敛。
- 不要写 `unwrap()` / `expect()`（`clippy::unwrap_used` 已 deny）。
- 树节点请复用 `driver::node::{expandable, leaf, count_description, query_nodes}`，
  不要各自实现一遍。

## 第 3 步：`impl Driver`

在 `src-tauri/src/driver/impls_tabular.rs`（或 storage / misc，按类别）追加：

```rust
impl Driver for DuckdbConfig {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::Duckdb
    }

    fn description(&self) -> String {
        describe_or_default(
            DuckdbConfig::get_description(self),
            DatabaseType::Duckdb.label(),
        )
    }

    fn test_connection(&self) -> BoxFuture<'_, AppResult<()>> {
        delegate!(DuckdbConfig::test_connection(self))
    }

    fn list_node_info(
        &self,
        req: ListNodeInfoReq,
        app: &AppState,
    ) -> BoxFuture<'_, AppResult<ListNodeInfoResponse>> {
        delegate_app!(app, DuckdbConfig::list_node_info(self, req, &app))
    }
}
```

### 两个宏的用法

| 宏 | 何时用 | 展开含义 |
| --- | --- | --- |
| `delegate!(expr)` | 固有方法是 `async`，且不涉及 `AppState` | `Box::pin(async move { expr.await.map_err(AppError::from) })` |
| `delegate_app!(app, expr)` | 固有方法需要 `&AppState` | 先 `app.clone()`（内部只有 `Arc`，克隆是常数开销）再装箱 |

为什么要 `delegate_app!` 而不是直接借 `app`：trait 方法返回 `BoxFuture<'_, _>` 只带
`&self` 一个生命周期；若 future 同时借用 `app`，编译期无法证明两者寿命关系。
克隆 `AppState` 是最省事的解法（它本质是一个 `SqlitePool` 的智能指针）。

### 不建议用 `#[async_trait]`

trait 方法必须 dyn-compatible，因此不能用 RPITIT。手写 boxed future 即可，
不要引入 `#[async_trait]` 宏（隐式分配、错误可读性差）。

### 不支持的操作不要实现

trait 里所有方法都有默认实现，返回 `AppError::unsupported(op, label)`。
只实现你真正支持的方法 —— 这样"不支持"会变成明确错误码
（`EV-DRV-1002`），而不是静默返回空值。

## 第 4 步：接线

1. `src-tauri/src/service/base_config_service.rs`：给 `BaseConfigEnum` 加变体
   （`#[serde(rename = "duckdb")]` 必须与 YAML 的 `dbType` 一致）+ 加一行 `db_type()` 分支。
2. `src-tauri/src/service/mod.rs`：登记新模块。
3. `src-tauri/src/driver/registry.rs`：`build()` 里加一行 `BaseConfigEnum::Duckdb(item) => Box::new(item.clone()),`。
4. 若能力位包含 `object_store`/`topics` 等，确认对应命令已在 `service/cmd.rs` 调你的方法。

前端**无需任何改动**：类型下拉、图标、默认端口、能力位都来自
`src/types/generated/databaseTypes.ts`，由 `build.rs` 重新生成。

## 验收清单

```bash
cd src-tauri
cargo clippy --all-targets          # 必须 0 warning
cargo test                          # 新增驱动至少要有 test_connection 的参数校验单测
cd ..
pnpm typecheck && pnpm lint && pnpm test
git diff --stat src/types/generated  # 确认生成物已更新
```

再按 `scripts/bench/README.md` 的冒烟清单确认：新建连接 → 测试连接 → 树展开 →
执行一句 SQL → 对**不支持**的操作确认收到明确报错。
