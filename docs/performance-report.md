# 性能报告（重构前后对比）

> 口径与采集方法见 `scripts/bench/README.md`；原始数字见 `scripts/bench/baseline.json`。

## 结论

**没有性能退化，也没有可测量的提升。** 这次是结构重构，不是性能优化：
热路径（取数 + 行值转换）逻辑完全没变，只是把重复实现收敛成一处。

附带收益：基准用例直接暴露了一个**存量 bug** —— SQLite 的 `REAL` 列无法解码
（`sql_utils::sqlite_row_to_json` 只匹配 `DOUBLE`/`FLOAT`）。改造前，任何带
`REAL` 列的 SQLite 表在数据网格与导出时都会**直接报错**，而不是慢。已修复。

## 三个指标的实测值

### 1. `open_100k_rows`（10 万行 × 5 列，release 构建）

| 阶段 | fetch（取数） | convert（行值→单元格） | total |
| --- | --- | --- | --- |
| 阶段 1 完成时（参考点） | 90 ms | 43 ms | **134 ms** |
| 全部阶段完成 | 90 ms | 42 ms | **133 ms** |

差异在噪声范围内（±1 ms）。

**关于"真正的改前基线"**：基准用例是本轮阶段 0 才建立的，因此**无法**给出
"重构前原始代码"的实测数字 —— 声称有那个数字就是编造。上表的"阶段 1 完成时"
是第一个可测量点，它已经隔离了阶段 2/4 的全部改动（前端与去重），
对这部分的对比结论是可信的。

如果要补一个真正的改前基线：`git worktree add` 检出 `f693d20~1`，
把 `src-tauri/src/perf_bench.rs` 拷进去（该版本没有 `sql::row`，把
`cell_to_display` 换回内联的 `is_string` 分支即可），跑同一条
`cargo test --release bench_open_100k_rows -- --ignored`。预计耗时由 release 编译主导。

### 2. `bundle_size`（前端 `dist/`）

| 阶段 | 总字节 | 主 chunk |
| --- | --- | --- |
| 阶段 0 完成 | 1 281 896 B（1251.85 KiB） | 1143.46 kB |
| 全部完成 | 1 282 837 B（1252.77 KiB） | 1144.41 kB |

**基本没变，这符合预期**：删掉的 7 个依赖（react-router-dom / axios / echarts×3 /
react-datepicker / date-fns）在全仓库**零引用**，Vite 本来就不会把它们打进产物。
删除它们换来的是安装体积、依赖审计面和 lockfile 规模，不是 bundle 体积。
新增的约 1 kB 来自 DDL 模板迁移后的错误信封与常量。

### 3. 发布二进制体积

新 release profile（`lto=true` + `opt-level="s"` + `panic="abort"` + `strip=true`
+ `codegen-units=1`）实测：`easy_viewer.exe` = **26.49 MiB**。

旧 profile 未重新打包测量（`opt-level="z"` + `lto="thin"`），因此**不给出前后对比数字**。
方向性预期：`s` 比 `z` 生成更大但更快的代码，`lto=true` 比 `thin` 更激进地内联；
两者都会让二进制略增、少数路径略快。这是"用体积换启动/执行速度"的主动取舍，
若要严格验证需把旧 profile 的包也打出来对比。

### 4. `cold_start` / `scroll_fps`
**未测量。** 两者都需要真实窗口（WebView + 实际渲染），本环境无头，无法复现。
不做测量就不写数字。测量方法已写进 `scripts/bench/README.md`：

- `cold_start`：release 可执行文件双击 → 主窗口可交互（秒表，3 次取中位数）
- `scroll_fps`：打开 10 万行结果集 → DevTools Performance 记录滚动期间平均帧率

## 为什么这轮不该期待变快

改造动的是**编译期结构**（trait 分发、codegen、命令层压缩），不是执行路径：

| 改动 | 对运行时的影响 |
| --- | --- |
| 三层命令压成两层 | 每条命令少一次函数转发（纳秒级）；实际收益是**可维护性** |
| `Box<dyn Driver>` + 配置克隆 | 每条命令多一次 `Box` 分配 + 一次小结构体克隆（µs 级，被 IO 淹没） |
| 行值转换收敛成 `cell_to_display` | 语义完全一致（null→空、字符串原样、其余 `to_string`），无额外分支 |
| YAML + `build.rs` codegen | 纯编译期，运行时零成本 |
| release profile：`lto=thin → lto`、`opt-level=z → s`、`panic=abort` | 预期二进制更小、少数路径略快；需重新打 release 包后实测 |
| 删 7 个零引用依赖 | 运行时零影响（本来没被打包） |

## 后续性能建议（按收益排序）

1. **`convert` 阶段占比不低**（43ms / 410k 单元格 ≈ 105ns/格）。若表更宽（20+ 列），
   这里会线性放大。可行方向：按列类型缓存转换分支、对纯文本列传 `&str` 而非 `String`。
2. **`fetch` 阶段固定 90ms** 来自 sqlx 全量 `fetch_all` 到内存。超大结果集应改为
   流式/分页取数（`fetch` + `try_next`），首页响应时间不随总行数增长。
3. 前端的表格虚拟滚动已在上一轮树重构中落地，本轮的 `scroll_fps` 需要实测确认
   没有因为新的 `forward()` 包装引入额外开销（逻辑上不会：它只包了一层 promise）。
