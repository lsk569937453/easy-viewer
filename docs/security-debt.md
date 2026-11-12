# 安全债登记（本轮明确不处理）

> 本轮结构重构**按确认的范围不夹带安全改造**。这里把已知问题、证据位置和修复方案
> 记清楚，避免"知道有问题但没人记得在哪"。下一轮应优先处理第 1 项。

## 1. 连接凭证明文落盘 + 日志泄漏（优先级：高）

### 现状

| 问题 | 证据 |
| --- | --- |
| 密码以明文 `String` 存进 `connection_json` | `src-tauri/src/service/base_config_service.rs` 的 `DatabaseHostStruct.password: String` |
| 整行 JSON 存本地 SQLite | `~/.easyviewer.db` 的 `base_config.connection_json` |
| `PRAGMA key` 是**空操作** | `src-tauri/src/sql_lite/connection.rs`：依赖 `libsqlite3-sys` 普通 bundled 构建，未编入 SQLCipher，密钥还硬编码为 `the_password` |
| 历史日志泄漏 | 改造前的 `info!("save base config: {}", json_str)`、`info!("databse request url:{}", ...)` 会把含密码的 JSON 打进日志 |

### 本轮已做的部分（不改变存储方式）

重构时删除了那两条打印连接 JSON 的日志，改为只记录
`connection_name` 与 `db_type`（见 `store/mod.rs`、`common_tools/database.rs`）。
**没有新增任何会写出凭据的日志**。存储方式维持明文，按约定延后。

### 建议修复方案（下一轮）

参考 dbx 的分层做法，但按本项目体积简化：

1. **配置与凭证分表**：`base_config.connection_json` 只存非敏感字段，
   新增 `connection_secret(connection_id, key, secret, secret_enc)`。
2. **加密信封**：AES-256-GCM，密文前缀 `ev1` 便于将来换算法；密钥**不进数据库**。
3. **密钥来源**：Windows/macOS 走系统凭据管理器（`keyring` crate），
   无头环境退化为环境变量 `EV_SECRET_KEY`，最后才是本地密钥文件（并明确提示风险）。
4. **删掉无效 PRAGMA**：不要在代码里保留"看起来加密了"的配置，这比没有更危险 ——
   它会让人误以为库是加密的。
5. **一次性迁移**：读取旧明文 → 写入新表 → 清空 `connection_json` 里的密码字段。
6. **错误详情脱敏**：`AppError::with_detail` 已经做了 URL 内密码与
   `password=/pwd=/secret*=` 的脱敏与 64 KiB 截断（`src-tauri/src/error.rs`），
   新链路可直接复用，不需要在驱动层各写一遍。

### 验证方式（修复后）

- 在 `~/.easyviewer.db` 里 `strings` 搜索已存的密码明文，应查不到；
- 日志文件里搜索密码明文，应查不到；
- 断开系统凭据管理器条目后，连接应显式报"无法读取密钥"，而不是静默用空密码。

## 2. SQL 字符串拼接面（优先级：中）

驱动里存在 68 处 `format!("... '{}' ...", user_input)` 形式的 SQL 拼接
（表名、schema 名、库名来自元数据查询结果，理论上可被恶意对象名利用）。

`src-tauri/src/sql/dialect.rs` 已提供 `quote_ident` / `quote_literal`，
但逐点替换需要用真实库验证输出，本轮未动（见 `reconstruction-plan.md` 第 6 节）。

## 3. 本地库无版本号（优先级：低）

按既定决策，本地库 schema **不保留版本号与增量迁移**，遇到不兼容结构直接重建
（`sql_lite/connection.rs::drop_legacy_tables`）。这意味着升级会丢连接配置 ——
已确认可接受（单人使用）。

如果将来要发布给他人使用，这一条必须先改成幂等迁移 + 版本号。
