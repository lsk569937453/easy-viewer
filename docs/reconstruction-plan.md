# easy-viewer 结构重构方案与执行记录

> 参考项目：`D:\code\github\dbx`（Rust + Tauri，100+ 数据源，Apache-2.0）。
> 本文记录**为什么这样改**、**改了什么**、**哪些没改以及为什么**。

## 1. 起点：重构前的结构性问题

体检结论（基于代码实测，非猜测）：

| # | 问题 | 证据 |
| --- | --- | --- |
| 1 | 完全没有驱动抽象 | Rust 端 `trait` 声明 0 个；`BaseConfigEnum` 13 变体承载 36 个方法、共 161 个 `match` 臂 |
| 2 | 三层纯转发 | `cmd.rs`(926) + `cmd_service.rs`(1004) + `base_config_service.rs`(949)，占 Rust 总量 18.9% |
| 3 | 单驱动三套同构实现 | mysql/pg/mssql 28 个文件 4330 行，9 个同名文件 ×3（相似度 0.37） |
| 4 | 40 处复制的配置加载 | `select connection_json from base_config where id = ?` + 反序列化，逐字重复 |
| 5 | 契约靠手工同步 | 53 个命令 vs 前端 52 条登记，已出现 `download_bucket` 漏登记 |
| 6 | 前后端各写一份数据源清单 | Rust `BaseConfigEnum` 手写 13 变体 + 前端手写 13 项联合与 `0..12` 映射 |
| 7 | 存储无演进机制 | schema 内联、无版本号、仅一次手写换表 |
| 8 | 静默降级 | `_ => ExeSqlResponse::new()`、`_ => ()`：不支持的操作静默返回空 |

新增一个数据源在改造前要改 **5 处**；现在只需 **1 个 YAML + 1 个 impl**。

## 2. 从 dbx 学到什么、没学什么

调研 dbx 后有三个**反直觉**结论，直接改变了设计：

1. **dbx 没有统一 driver trait**：它用 `PoolKind` 枚举分发 + 各 driver crate 的同名自由函数约定。
   本项目规模小（13 个数据源、单 crate），仍选择 trait —— 目的是让调用方只认一个接口，
   从而把三层压成两层。**但 trait 采用"全部方法带默认实现"的形态**，避免 40 个方法
   在每个驱动里都写一遍。
2. **dbx 的错误体系是"底层 String、边界才类型化"**：全仓库 `thiserror`/`anyhow` 零使用。
   本项目沿用 `anyhow` 作为底层，只在跨模块边界收敛成 `AppError`。
3. **dbx 的数据源清单是 YAML + `build.rs` 生成**：88 个描述符，新增 JDBC 系数据源
   **只写 YAML 不写 Rust**。这是本次最大的一笔借鉴，直接消灭了前后端两份清单。

明确**没有**借鉴的部分：dbx 的 20+ crate 分层（本项目单 crate 足够）、
`clippy` 之外不建 workspace `[lints]`、37 个 YAML 方言表（本项目 6 个方言，Rust 表更省）。

## 3. 目标结构

```
src-tauri/
  build.rs                     # 读 YAML → 生成 Rust 枚举 + 前端 TS 常量
  plugins/connection-types/    # 13 个数据源描述符（单一真相源）
  src/
    error.rs                   # AppError{code,message,detail,retryable}
    generated/                 # include! OUT_DIR 产物
    sql/dialect.rs             # 方言表：标识符/分页/占位符/DDL 模板
    sql/row.rs                 # 行值 → 表格单元格（唯一实现）
    driver/traits.rs           # Driver trait（boxed future，全部方法有默认实现）
    driver/registry.rs         # 配置 → 驱动实例（唯一构造入口）
    driver/impls_*.rs          # 13 个数据源的 impl（只粘合，无业务逻辑）
    driver/node.rs             # 树节点构造与 Query 文件夹（唯一实现）
    store/mod.rs               # 连接配置读写（唯一实现）
    service/cmd.rs             # IPC 层：只做编码与错误信封
    service/<driver>_service.rs # 既有驱动实现（保留，未被上移的业务代码）
```

调用链：`cmd（IPC 编码） → Driver trait → 具体驱动实现`。共 **两层**。

前端：

```
src/api/client.ts    # BACKEND_COMMANDS 全量登记 + forward()：计时 + 错误透传
src/api/<domain>.ts  # 按域分文件的命令封装
src/api/ddl.ts       # 后端 DDL 模板
src/types/generated/ # build.rs 产出，前端不再手写数据源清单
```

## 4. 落地结果

| 项 | 改造前 | 改造后 |
| --- | --- | --- |
| 驱动抽象 | 0 trait，161 个 match 臂 | `Driver` trait + 13 个 impl + 13 行注册表 |
| 命令层 | 三层（926+1004+949） | 两层（cmd 942 行，纯 IPC） |
| 配置加载 | 40 处复制 | `store::load_config` 一处 |
| 数据源清单 | Rust + TS 各一份 | YAML 一份 → 两端生成 |
| 不支持的操作 | 静默返回空 | `EV-DRV-1002` 明确错误 |
| Rust 行数 | 15228 | 14924（新增 driver/sql/store/error 约 2400 行，删除约 2700 行样板） |
| Rust 单测 | 9 个（其中 1 个空测试） | 39 个 |
| clippy warning | 12 | 0 |
| 前端依赖 | 含 7 个零引用包 | 已删 |
| 前端类型漂移 | 手写两份清单 | 生成物推导 |

## 5. 关键决策台账

| 决策 | 选择 | 理由 |
| --- | --- | --- |
| 兼容性 | 不兼容旧连接配置 | 单人使用；换来的是一次干净的结构 |
| 本地库 schema | 只保留幂等建表，不留版本号/增量迁移 | 配置可重建；迁移框架对小项目是纯负债 |
| 工程结构 | 不拆 Cargo workspace | 13 个数据源不配 20 个 crate；用模块边界表达分层 |
| 抽象形态 | `SqlDriver` 类 trait 覆盖全部数据源，方法带默认实现 | 配合能力位，不支持即报错，而不是返回占位值 |
| 凭证存储 | **本轮不动**（见 `security-debt.md`） | 按确认延后；重构不夹带安全改造 |
| 架构守卫脚本 | 不做 | 单 crate 无法用 `cargo metadata` 断言；靠 review |
| 前端技术栈 | 保持 React + daisyUI | 只借组织方式，不换栈 |

## 6. 已知未完成项

1. **mysql/pg/mssql 的 28 个同名文件没有物理合并。** 差异比预想大：
   PostgreSQL 是 6 层树（database→schema→category→section→table→columns），
   MySQL 是 5 层，SQLite 是 2 层，SQL 文本与层次深度都不通用。
   本次只抽取了**真正逐字相同**的部分（节点构造、Query 文件夹、记录数角标）。
   强行合并成"一个泛型驱动"会把层次差异塞进大量 `if`，收益为负。
   下一步若要做，建议先统一树层次模型（引入 schema 抽象层）再谈合并。
2. `cmd.rs` 942 行、`webdav_service.rs` 857 行仍是仓库最大文件（均 < 1500 的硬阈值）。
3. 68 处手写 SQL 字符串插值（`format!("... '{}'", name)`）存在注入面，
   `sql/dialect.rs` 已具备 `quote_ident` 能力，但逐点替换需要真实库验证，本轮未动。

## 7. 如何验证本次改动

```bash
cd src-tauri && cargo clippy --all-targets && cargo test
pnpm typecheck && pnpm test && pnpm lint && pnpm build
```

全部通过（clippy 0 warning，Rust 39 测试，前端 223 测试）。
交互层按 `scripts/bench/README.md` 的 10 项冒烟清单人工确认。

⚠️ 升级前请备份 `~/.easyviewer.db`：本次不迁移旧表结构，遇到不兼容结构会重建。
