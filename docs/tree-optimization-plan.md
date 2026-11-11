# easy-viewer 左侧树重构技术方案（P0–P3 全量）

> 本文档是给执行 AI 的完整施工说明书。目标：**独立完成本文所有任务，不需要向用户提问**。
> 优先级标记对应前期分析：P0=行为 bug，P1=性能与结构，P2=功能补齐，P3=清理与小修。

---

## 0. 背景摘要（为什么做）

当前左侧树（`src/components/DaisyTreeNode.jsx` + `src/components/DatabaseViewer.jsx`）是"自递归组件 + 全量重渲染 + 无虚拟化 + 无搜索"，对照 dbx 项目的树实现后确定以下问题：

| # | 问题 | 位置 |
|---|---|---|
| P0-1 | `connections` 数组引用一变就整树重建，已加载的 children 全被清空 | `DatabaseViewer.jsx:265-326`、`App.jsx:60-61,105-111` |
| P0-2 | 节点 id 含 `index`，兄弟顺序变化导致 key 错位、openNodes 错乱 | `DatabaseViewer.jsx:198,880` |
| P0-3 | 加载失败被写成 `children: []`，错误被吞成"空目录"，无重试 | `DatabaseViewer.jsx:228-236` |
| P0-4 | 无加载竞态防护，旧请求后返回会覆盖新数据 | `DatabaseViewer.jsx:183-237` |
| P1-5 | 无虚拟化、无 memo，大列表（几千节点的 S3 bucket/大库）会卡死 | `DaisyTreeNode.jsx:383-400` |
| P1-6 | 根节点分支重复约 70 行 JSX | `DaisyTreeNode.jsx:130-291 vs 296-372` |
| P1-7 | 子节点映射逻辑在 fetch/refresh 里抄了两遍 | `DatabaseViewer.jsx:197-215 vs 879-892` |
| P2-8 | 无树搜索/过滤 | — |
| P2-9 | 无键盘导航（↑↓←→） | — |
| P2-10 | 展开状态不持久化，重启全部丢失 | — |
| P3-11 | JS 手动截断与 CSS truncate 双重截断；version `padEnd` hack；`<a>` 无 href 不可访问；`treeData.js` 死代码；"信息"按钮无任何行为；下载按钮用了编辑图标 | `DaisyTreeNode.jsx:158,151,131,279-286,246-254`、`treeData.js` 全文件 |

**选型决策（已定，不要更换）**：渲染层用 `@tanstack/react-virtual`（已在 dependencies 中，React 19 官方兼容）自建"扁平化 + 虚拟滚动"方案，对标 dbx 的 flat list + RecycleScroller 架构。**不采用 react-arborist**（虽然也在依赖里）：它内部自持展开/选中状态，而本项目要求展开状态归 `openNodes`、选中状态跟随 activeTab；且其拖拽基于 react-dnd，纯属负担。施工完成后把 react-arborist 从 `package.json` 移除。

---

## 1. 全局约束（执行 AI 必读）

1. **只改前端 `src/`**。`src-tauri/` 一律不动（唯一例外：可选任务 C3-Rust，默认跳过）。
2. **不改动对外契约**：`DatabaseViewer` 的 props（`connections/onConnectionUpdated/onConnectionDeleted`）、传给 `TabPanel` 的 props（`treeData/onQuerySaved/onRedisKeyDeleted` 等）保持不变。
3. **树的状态（`treeData`、`openNodes`、`tabs`）仍由 `DatabaseViewer` 持有**。新组件是展示层，不引入全局 store。
4. UI 风格沿用 daisyUI 5 + Tailwind 4，文案用中文，保持现有视觉（hover 高亮、选中态、缩进、图标配色）不变。
5. 不升级任何依赖；仅允许两处 package.json 变更：删除 `react-arborist`（B4）、新增 devDependency `vitest`（D1）。
6. 按阶段提交 commit，一个阶段一个 commit，message 格式 `Refactor(tree): <阶段说明>`。
7. 每个任务完成即跑 `pnpm build`，必须零报错才能进入下一任务。

---

## 2. 目标架构

```
src/components/tree/                    ← 新目录
├── nodeIcons.jsx       # ICON_MAP + getNodeIcon（从 DatabaseViewer.jsx:60-99 迁出）
├── treeModel.js        # 纯函数（无 React 依赖，可单测）：
│                       #   createNodeId / mapChildList / updateNodeInTree / findParentNode /
│                       #   collectSubtreeIds / syncRootsWithConnections /
│                       #   flattenVisibleNodes / filterTreeByQuery / getRowActions /
│                       #   isNodeExpandable / shouldToggleOnActivate
├── TreeSidebar.jsx     # 搜索框 + 虚拟滚动容器 + 键盘导航（展示层）
└── TreeRow.jsx         # 单行渲染（非递归），动作按钮由 getRowActions 配置驱动

src/components/DatabaseViewer.jsx        # 状态与 handlers 留守，渲染段替换为 <TreeSidebar/>
src/components/DaisyTreeNode.jsx         # B4 阶段删除
src/components/treeData.js               # B4 阶段删除（死代码）
```

数据流：`connections` → `syncRootsWithConnections`（按 id 合并，不再全量重建）→ `treeData` → `flattenVisibleNodes`（受 `openNodes`/搜索过滤控制）→ `useVirtualizer` 只渲染可视行 → `TreeRow`。

---

## 3. 任务清单

### 阶段 A：数据层行为修复（不动渲染层，DaisyTreeNode 暂时保留）

#### A1（P1-7，前置基建）抽出纯函数模块

- 新建 `src/components/tree/nodeIcons.jsx`：迁出 `DatabaseViewer.jsx:60-99` 的 `ICON_MAP`、`getNodeIcon`。
- 新建 `src/components/tree/treeModel.js`：迁出 `updateNodeInTree`（:101-114）、`findParentNode`（:123-132）、`collectSubtreeIds`（:134-140），逻辑不变。
- 在 `treeModel.js` 新增统一映射函数，替代两处重复代码：

```js
export const LEAF_ICON_NAMES = new Set(["textFile"]);

export const createNodeId = (parentId, childName) =>
  `${parentId}/${encodeURIComponent(childName)}`;

export const mapChildList = (parent, childList, getNodeIcon) =>
  childList.map((child) => ({
    id: createNodeId(parent.id, child.name),   // 注意：A2 之前先保持旧 id 格式，A2 一次性切换
    name: child.name,
    type: child.type || "default",
    icon: getNodeIcon(child.type, child.icon_name),
    description: child.description || "",
    iconName: child.icon_name,
    details: `节点: ${child.name}\n类型: ${child.type || "未知"}`,
    children: LEAF_ICON_NAMES.has(child.icon_name) ? [] : null,
    path: [...parent.path, { level: parent.path.length + 1, config_value: child.name }],
  }));
```

- `fetchNodeChildren`（`DatabaseViewer.jsx:197-215`）与 `handleRefreshNode`（:879-892）的映射段全部替换为 `mapChildList` 调用。
- **验收**：`pnpm build` 通过；行为零变化。

#### A2（P0-2）稳定节点 id

- 现状：`DatabaseViewer.jsx:198` 为 `` `${parentNode.id}-${child.name}-${index}` ``，index 参与 id → React key 与 `openNodes` 随顺序变化错位。
- 改动：id 改用 A1 的 `createNodeId`（`父id/encodeURIComponent(name)`，`/` 不会出现在编码后的名字里，天然无歧义）。`mapChildList` 内部统一生成，其余代码通过 `node.id` 传递自动跟随（如 `redis-key-${node.id}` 这类 tabId 无需改动）。
- 说明：后端 `ListNodeInfoResponseItem.id` 是每次随机的 uuid（`src-tauri/src/vojo/list_node_info_response.rs`），刷新即变，**不能**用它做树节点 id，继续忽略它。
- **验收**：同一父节点下子项顺序变化后，已展开的孙节点展开状态不丢失（S3 bucket 刷新验证）；`pnpm build` 通过。

#### A3（P0-1）connections 变化改为按 id 合并

- 现状：`DatabaseViewer.jsx:265-326` 的 effect 在 `connections` 变化时 `setTreeData(newTreeData)` 全量替换（children 重置为 null），而 `App.jsx:60-61`（新建后 `fetchConnections`）和 `App.jsx:105-111`（编辑单连接后替换数组元素）都会触发 → 用户编辑一个连接名，整棵树已加载数据全部丢失。
- 改动：`treeModel.js` 新增：

```js
// 返回 { roots, addedIds, removedIds, resetIds }
// - 同 id 根节点：保留 children/isLoading/isLoading 展开态/version/offline/error，
//   仅更新 name/description/type/icon；若 conn 的 host 或 port 变化，
//   则 children 置 null 并加入 resetIds（保留 openNodes，走既有懒加载路径重拉）
// - 新增 conn：追加根节点 { ..., children: null }，id 进 addedIds
// - 已删除 conn：移除根节点，id 进 removedIds
// - 输出顺序遵循 connections 顺序
export function syncRootsWithConnections(prevRoots, connections, toRootDescriptor) { ... }
```

`DatabaseViewer` 侧改造：

1. 现有 `newTreeData` 的构造逻辑（:268-287）提为 `toRootDescriptor(conn)`（返回不含 children 的根节点字段）。
2. effect 重写为：

```js
useEffect(() => {
  setTreeData((prev) => {
    const result = syncRootsWithConnections(prev, connections, toRootDescriptor);
    syncResultRef.current = result;   // 供下面两个 effect 读取
    return result.roots;
  });
  // removedIds → 同步清理 openNodes（复用 collectSubtreeIds 已做不到，节点已删，直接按前缀 `${rootId}/` + rootId 本身清理 openNodes 键）
}, [connections]);
```

3. 版本探测拆成独立 effect：只对 `addedIds`（含首次挂载的全部根）调用 `get_server_version`，逻辑复用现有 `Promise.allSettled` 段（:292-315），`isRefreshing` 遮罩行为保留。**不再对未变化的连接重复探测**。
4. 根节点 hover 的"刷新"按钮（`handleRefreshNode`）增加一步：同时重新调用 `get_server_version` 刷新该根的 `version/offline`。
5. 懒加载恢复循环（:317-322）保留并泛化：`openNodes` 中为 true 且 `children === null` 的根节点重新 `fetchNodeChildren`（初始挂载 + resetIds 两种场景都覆盖）。

- **验收**：
  - [ ] 编辑某连接（改描述）后：该连接子树展开状态与已加载 children 不丢失，且不再触发"正在检测连接状态..."全屏遮罩。
  - [ ] 新建连接：出现在树中并探测版本；删除连接：根节点与 openNodes 残留键一并清除。
  - [ ] 修改连接 host/port：该连接子树重置懒加载，其余连接不受影响。
  - [ ] `pnpm build` 通过。

#### A4（P0-3）错误状态与重试

- 现状：`DatabaseViewer.jsx:228-236` catch 里 `children: []`，加载失败显示为空目录。
- 改动：
  1. 节点模型增加 `error: string | null`（`mapChildList` 生成时缺省为 `null`）。
  2. `fetchNodeChildren` 失败分支改为 `{ isLoading: false, error: message, children: null }`（保持 null，让重试可以再次触发拉取）；成功分支显式 `error: null`。
  3. `DaisyTreeNode`（阶段 A 还在用）加错误展示：`node.error && !node.isLoading` 时，节点名右侧渲染红色小字 `加载失败`，hover 动作区显示重试按钮（调 `onRefresh(node)`，refresh 已有的 `setOpenNodes(...,true)` 会驱动重拉）。
  4. `handleRefreshNode` 的孙辈重拉段（:857-872）失败时不再静默 `return null`，同样写入该子节点 `error`。
- **验收**：把某连接端口改错后展开：显示"加载失败"+ 重试；改回正确端口点重试：正常加载并清除错误态。

#### A5（P0-4）加载竞态守卫

- 现状：快速 toggle/refresh 并发时，先发出的旧请求后返回会覆盖新结果。
- 改动：`DatabaseViewer` 增加：

```js
const loadSeqRef = useRef(new Map()); // nodeId -> 递增序号
const nextLoadSeq = (nodeId) => {
  const seq = (loadSeqRef.current.get(nodeId) ?? 0) + 1;
  loadSeqRef.current.set(nodeId, seq);
  return seq;
};
```

`fetchNodeChildren` 开头取号；**所有** `setTreeData` 写入前检查 `loadSeqRef.current.get(parent.id) === mySeq`，不等则丢弃本次结果（对标 dbx 的 TreeNodeLoadRegistry generation 方案的轻量版）。组件卸载时清空 Map。`handleRefreshNode` 的并行孙辈重拉对每个 child 同样取号检查。
- **验收**：对同一节点快速连点"刷新"数次，最终树内容与最后一次请求一致，无旧数据回灌（可用 console.log 打序号自证）。

---

### 阶段 B：渲染层重构（扁平化 + 虚拟滚动 + 键盘导航）

#### B1（P1-6 + P3 子项）TreeRow 单行组件

- 新建 `src/components/tree/TreeRow.jsx`，把 `DaisyTreeNode` 的**行内容**（:130-291）迁入，做以下修改：
  1. **非递归**：删除子节点渲染段（:380-408），行组件只画自己。
  2. **去重**：根/非根两份几乎相同的 JSX（:130-291 vs :296-372）合并为一份。
  3. **动作配置驱动**：`treeModel.js` 新增 `getRowActions(node)`，返回 `{ key, title, icon }[]`，`key ∈ refresh|add|edit|delete|deleteQuery|info`。现有按钮规则迁移如下（行为保持一致，两处例外见 ★）：
     - 根节点（`ACTIONABLE_DB_TYPES` 含 type）：`s3` → add("新增 Bucket")；`webdav` → add("上传文件")；refresh("刷新")；delete("删除")
     - `singleQuery` → deleteQuery("删除查询")
     - `NODES_WITH_REFRESH_ADD`（query/tables/views/columns/index/partitions/collections/database/bucket）→ refresh；其中非 bucket 再加 add("新增")；bucket → add("上传文件") + delete("删除 Bucket")
     - `folder` → add("上传文件") + ★download + delete
     - `textFile` → ★download + delete
     - `NODES_WITH_EDIT`（singleTable）→ edit("编辑")
     - 其余不再渲染任何按钮（★删除现有无行为的"信息"按钮，`DaisyTreeNode.jsx:273-286`）
     - ★新增 action key `download`：title "下载"，图标 `FaDownload`（现状误用 `FaEdit`，`DaisyTreeNode.jsx:246-254`），回调沿用原 `onEdit` 通道（B2 传参时映射）。
  4. **截断修复**（P3）：删除 `name.length > 20 ? substring(0,18)+'...'`（:158/:323），保留 `truncate` class + `title` 属性。
  5. **version 展示修复**（P3）：删除 `padEnd(11,' ').substring(0,11)`（:151/:316），改为 `<span className="block w-14 truncate text-center text-[9px] text-base-content/40 leading-tight mt-0.5">{node.version}</span>`。
  6. **语义化**（P3）：最外层从 `<a>`（无 href）改为 `<div role="treeitem" aria-selected={...} aria-expanded={...}>`。
  7. 右键菜单包装保持现状：根节点用 `rootNodeMenuItems`，非根且 `nodeContextMenuItems(node)` 非空时用 `ContextMenuWrapper`（注意它自带 `onClick` 转发，行为等同现状，勿重复绑定）。
  8. 错误态展示（A4 第 3 条）与"加载中"占位：`isLoading` 时行内 spinner（现状行为）；`children === null && !isLoading && !error && 已展开` 由父层渲染"加载中..."行（见 B2）。
  9. Props：`{ row, selectedNodeId, query, onRowClick, onToggle, onAction, nodeContextMenuItems, onEditConnection, onDeleteConnection }`，其中 `query` 用于搜索高亮（C1）：命中片段包 `<mark>`。
- **验收**：临时在旧渲染处并列渲染新旧两棵树人工比对（或直接进入 B2 一起验）；动作按钮集合与现状逐类型一致（除★三处有意变更）。

#### B2（P1-5）TreeSidebar + @tanstack/react-virtual 虚拟滚动

- 新建 `src/components/tree/TreeSidebar.jsx`，替换 `DatabaseViewer.jsx:1609-1639` 的渲染段（外层布局、`isRefreshing` 遮罩、空态文案原样保留）。
- `treeModel.js` 新增：

```js
// DFS 展平"当前可见"节点：跳过未展开节点的 children
// 返回 [{ key: node.id, node, depth, parentId, hasChildren }]
export function flattenVisibleNodes(roots, openNodes) { ... }
```

- TreeSidebar 主体：

```jsx
const flatRows = useMemo(() => flattenVisibleNodes(roots, openNodes), [roots, openNodes]);
const virtualizer = useVirtualizer({
  count: flatRows.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 36,
  measureElement: (el) => el.getBoundingClientRect().height, // 根节点带 version 徽章行高不同，动态测量
  getItemKey: (i) => flatRows[i].key,
  overscan: 10,
});
```

  标准虚拟滚动结构：外层 `div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden"` → 内层 `div style={{height: virtualizer.getTotalSize()}} className="relative"` → 每行绝对定位 `translateY(virtualizer.getVirtualItems()[i].start)`。
- 行内容：缩进 `paddingLeft: 8 + depth * 16`；其余复用 TreeRow。选中/hover 样式对齐现状 daisyUI menu 视觉（hover 可用 `hover:bg-base-content/5`，选中沿用 `.active` 视觉或等效的 `bg-primary/10`，以肉眼与现状一致为准）。
- **选中态修复**（顺带修一个现存 bug）：现状 `DatabaseViewer.jsx:1616` 传 `selectedNode={tabs.find(t => t.id === activeTabId)}`，而 tab id 都有前缀（`s3-object-`/`redis-key-`/`sql-editor-`…），`selectedNode?.id === node.id` 永远不成立 → 树选中高亮实际是死功能。改为派生：

```js
const activeTab = tabs.find((t) => t.id === activeTabId);
const selectedNodeId = activeTab?.node?.id ?? activeTab?.sourceNodeId ?? null;
```

  并在 `handleNodeActivate` 的 `singleQuery` 分支（`DatabaseViewer.jsx:504-514`）给 tab 增加 `sourceNodeId: node.id`（该分支的 tab 不含 node 对象）。其余分支已带 `node`，无需改。
- 点击行为保持现状语义：`TreeRow.onRowClick` → `handleNodeActivate`；展开/折叠逻辑沿用现有判断，迁到 `treeModel.js` 导出 `isNodeExpandable(node)`（原 `DaisyTreeNode.jsx:51-57`，含 `offline`/叶子 iconName 判断）与 `shouldToggleOnActivate(iconName)`（原 `SELF_TOGGLE_TYPES` 逻辑，:62-72）。
- `DatabaseViewer` 传给 TreeSidebar：`roots={treeData} openNodes selectedNodeId onRowClick onToggle onAction(actionKey→现有 handler 映射) onEditConnection onDeleteConnection nodeContextMenuItems isRefreshing`。
- **验收**：
  - [ ] `pnpm build` 通过；所有连接类型的展开/点击/tab 打开行为与重构前一致。
  - [ ] 点击表/Redis key/S3 文件后，对应树行出现选中高亮（修复项）。
  - [ ] 构造 5000+ 子节点的目录（可临时 mock），滚动流畅，DOM 中行数 ~ 可视区 + overscan。
  - [ ] 根节点（带 version 徽章）与普通行混排时无跳动。

#### B3（P2-9）键盘导航

- TreeSidebar 容器：`role="tree" aria-label="导航树" tabIndex={0}` + `onKeyDown`；新增 `focusedId` state。
- 按键语义（对标 VS Code / dbx）：
  - `↑/↓`：在 flatRows 中上下移动焦点；`virtualizer.scrollToIndex(idx, { align: "auto" })`。
  - `→`：可展开且未展开 → 展开（走 onToggle 懒加载）；已展开 → 焦点移到第一个子节点。
  - `←`：已展开 → 折叠；未展开 → 焦点移到父节点。
  - `Enter/Space`：等同点击该行（onRowClick）。
  - `Home/End`：首/末行。
- 焦点行样式 `ring-1 ring-primary/40`；行上 `id={"tree-item-" + rowId}`，容器 `aria-activedescendant` 指向它，实现 roving tabindex（行本身 `tabIndex={-1}`）。点击行时同步 `setFocusedId`。
- 搜索框（C1 实装后）中 `Enter` 聚焦第一个匹配行（平移 dbx 行为，可一并实现）。
- **验收**：纯键盘可完成"展开连接→进入库→进入表→打开 tab"全流程；焦点不丢、滚动跟随。

#### B4（P3）清理

- 删除 `src/components/DaisyTreeNode.jsx`、`src/components/treeData.js`（已确认无任何 import）。
- `package.json` 移除 `react-arborist`，`pnpm install` 后 `pnpm build` 通过。
- 全局搜索确认无残留引用（`grep -r "DaisyTreeNode\|treeData.js\|react-arborist" src/`）。

---

### 阶段 C：功能增强

#### C1（P2-8）树搜索/过滤

- TreeSidebar 顶部（"导航"标题栏下）加搜索输入框：`<input className="input input-sm input-ghost w-full" placeholder="搜索节点..." />`，右侧带清空按钮（daisyUI `input` 内嵌 X）。
- 行为（对标 dbx：300ms debounce）：
  1. 输入 300ms 防抖后生效；`query` 非空时走过滤后的扁平列表。
  2. `treeModel.js` 新增 `filterTreeByQuery(roots, query)`：对 `name + description` 做大小写不敏感的子串匹配；命中节点标记 `_matched: true`；**祖先链保留**且过滤态下强制视为展开（flatten 时传 `{...openNodes, ...命中祖先展开集}`，但**不写回** openNodes state）；返回过滤后的 roots 与匹配计数。
  3. TreeRow 高亮：`_matched` 节点将命中片段包 `<mark className="bg-transparent text-primary font-semibold">`。
  4. 状态栏：搜索框下方显示 `N 项匹配`；无匹配显示"无匹配结果"。
  5. `Esc` 清空搜索并还原原树；清空后 openNodes 恢复用户真实展开状态。
  6. 防抖实现用 `useEffect` + `setTimeout`，不引入新依赖。
- **验收**：输入表名片段，全树只剩相关分支且自动展开到可见；高亮正确；Esc/清空完全还原；连续快速输入不抖动（只发最后一次）。

#### C2（P2-10）展开状态持久化

- localStorage key：`easy-viewer.tree.state.v1`，值 `{ version: 1, openNodes: { [nodeId]: true } }`。
- 写入：`openNodes` 变化后 300ms 防抖序列化（直接整表覆盖，无需增量）。
- 读取：`DatabaseViewer` 的 `useState(() => loadPersistedOpenNodes())` 初始化（解析失败/版本不符返回 `{}`）。
- 启动 hydrate：A3 第 5 条的恢复循环天然覆盖根层；将其泛化为 BFS：初始同步后，对 openNodes 中为 true 且 `children === null` 的节点逐层 `fetchNodeChildren`（父层返回后再扫子层，直到没有可拉节点）。
- 边界：持久化的 id 若已失效（连接被删）无害——sync 时已按前缀清理，未命中的键 hydrate 时直接跳过。注意 A2 改了 id 格式，`v1` 即新格式起点，无需迁移旧数据。
- **验收**：展开 MySQL 连接到表级 → 重启应用 → 自动恢复展开并回填数据（可见短暂加载态）；删除连接后其持久化键被清理。

#### C3（可选，默认跳过，需用户另行确认）

- C3-前端：子节点 > 500 的目录做"显示更多"行（纯渲染限制，`node.renderLimit` 逐次 +500）。虚拟化后收益有限，优先级低。
- C3-Rust：`ListNodeInfoResponseItem` 增加 `is_leaf` 字段（`#[serde(default)]` 兼容），各 service 填充。涉及全部 service 文件与 Rust 重编译，**默认不做**。

---

### 阶段 D：验证与收尾

#### D1 纯函数单测（新增 devDependency vitest）

- `pnpm add -D vitest`；`package.json` scripts 增加 `"test": "vitest run"`。vitest 复用 `vite.config.js` 的 react 插件即可，纯函数测试无需 jsdom。
- 新建 `src/components/tree/treeModel.test.js`，覆盖：
  - `createNodeId`：编码特殊字符、嵌套唯一性
  - `mapChildList`：叶子/懒加载 children 语义、path 递增
  - `syncRootsWithConnections`：新增/删除/改名保留 children、host 变化触发 reset
  - `flattenVisibleNodes`：折叠裁剪、深度正确
  - `filterTreeByQuery`：命中保留祖先链、计数、大小写
  - `getRowActions`：各 iconName 的动作集合（含 ★ 三处变更）
- **验收**：`pnpm test` 全绿。

#### D2 手动冒烟清单（`pnpm tauri dev`）

按顺序验证（无真实数据库时至少覆盖 SQLite/S3/WebDAV 三种）：

- [ ] 新建/编辑/删除连接：树不整体重置（P0-1）；新建即探测版本；删除后无残留展开键
- [ ] 展开 MySQL→库→表→列；表点击开 tab 且树行高亮（选中修复）
- [ ] 断连场景：错误行 + 重试成功（P0-3）
- [ ] 同一节点连点刷新：结果稳定无回灌（P0-4）
- [ ] S3/WebDAV：bucket/文件夹展开、上传、下载（图标已换 FaDownload）、删除、右键菜单（复制/重命名）正常
- [ ] 保存查询后树节点改名（`updateQueryNodeNameInTree` 回归）与 Redis key 删除联动（`handleRedisKeyDeleted` 回归）
- [ ] 大目录滚动流畅；键盘全流程（B3）；搜索过滤/高亮/清空（C1）；重启恢复展开（C2）
- [ ] `pnpm build`、`pnpm test` 全绿

---

## 4. 回归风险清单（易踩坑，动手前重读）

1. **`handleNodeActivate` 的 toggle 副作用**：folder/textFile/singleTable/redis/es 等分支激活后会 `await handleToggleNode`（:535,:560,:582,:612...），TreeRow 的点击→展开判断必须保持"由 activate 内部 self-toggle 的类型不再额外 toggle"（原 `SELF_TOGGLE_TYPES` 语义），否则双 toggle。
2. **`ContextMenuWrapper` 自带 `onClick` 转发**（`ContextMenuWrapper.jsx:48`），TreeRow 包裹时不要重复绑定行点击。
3. **tab 与树的双向依赖**：TabPanel 仍接收整个 `treeData` 并用 `findNodeInTree(treeData, activeTabId)`（`TabPanel.jsx:300`）——不要改变 `treeData` 的节点形状（只增不删字段），否则 TabPanel 内查找会碎。
4. **`openNodesRef`**：多处 handler 读它拿最新展开态，保持 ref 同步代码不动。
5. **虚拟滚动容器高度**：外层必须是 `flex-1` 且父链有确定高度（现布局已满足），否则 virtualizer 测得 0 高度渲染空白。
6. **行高动态测量**：根节点带 version 副标题，统一 36px 估高 + `measureElement` 实测，勿用固定 size。
7. **阶段 A 期间不动 DaisyTreeNode 的渲染结构**（除 A4 第 3 条的错误展示），A/B 分两个 commit，出问题可独立回滚。

## 5. 附录：本次范围外、建议另行处理

- `App.jsx:17-38` `parseConnectionJson` 的类型映射与 `DatabaseViewer.jsx:269` 的 `dbTypeMap` 疑似不一致（App 注释 type1=MySQL 且仅解析 1/2/3；Viewer 映射 1=postgresql），且 s3/redis 等类型无 host/port 解析 —— 需人工对照 Rust 端确认。
- 后端 `ListNodeInfoResponseItem` 已返回 uuid `id` 与 `show_first_icon/show_second_icon`，前端全部忽略；长期看应协商稳定的业务 id 下发。
- `DatabaseViewer.jsx` 1800+ 行承载树+tab+十余种面板编排，后续可拆 hook（本次刻意不动，缩小爆炸半径）。
