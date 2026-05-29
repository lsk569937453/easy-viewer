/**
 * @description 生成树形结构的子节点
 * @param {string} parentId - 父节点的ID
 * @param {string} parentName - 父节点的名称
 * @param {number} currentLevel - 当前正在生成的层级
 * @param {number} maxLevel - 需要生成的最大层级
 * @param {Array<string>} levelNames - 每个层级的名称前缀
 * @returns {Array|undefined} - 返回子节点数组，如果是最深层则返回 undefined
 */
const createChildren = (parentId, parentName, currentLevel, maxLevel, levelNames) => {
  // 如果当前层级超过了最大层级，则停止递归，返回 undefined 表示没有子节点
  if (currentLevel > maxLevel) {
    return undefined;
  }

  const children = [];
  // 为了让树看起来更自然，每层的子节点数量是随机的 (2到4个)
  const numberOfChildren = Math.floor(Math.random() * 3) + 2;
  const levelName = levelNames[currentLevel - 1] || `子项`;

  for (let i = 1; i <= numberOfChildren; i++) {
    const nodeId = `${parentId}-L${currentLevel}-${i}`;
    const nodeName = `${parentName} -> ${levelName} ${i}`;
    const node = {
      id: nodeId,
      name: nodeName,
      details: `这是 ${nodeName} 的详细描述。\n位于层级: ${currentLevel}\n父节点ID: ${parentId}`,
      // 递归调用为当前节点生成子节点
      children: createChildren(nodeId, nodeName, currentLevel + 1, maxLevel, levelNames),
    };
    // 如果递归返回 undefined (即没有子节点)，则删除 children 属性
    if (node.children === undefined) {
      delete node.children;
    }
    children.push(node);
  }

  return children;
};

/**
 * @description 生成主树数据
 * @returns {Array} - 包含5个根节点的树数据数组
 */
const generateComplexTreeData = () => {
  const allTrees = [];
  const rootProjectNames = [
    "“天马”内容分发平台",
    "“北极星”数据分析系统",
    "“磐石”企业级中台",
    "“灯塔”智能营销引擎",
    "“方舟”云原生迁移计划",
  ];
  // 定义从第3级开始的层级名称
  const levelNames = ["功能", "任务", "子任务"];

  // 1. 生成 5 棵主树
  for (let i = 1; i <= 5; i++) {
    const rootId = `project-${i}`;
    const rootName = rootProjectNames[i - 1];
    const rootNode = {
      id: rootId,
      name: rootName,
      details: `这是关于 ${rootName} 的宏伟计划，一个复杂的系统工程。`,
      children: [],
    };

    // 2. 为每个主树生成 100 个二级模块
    for (let j = 1; j <= 100; j++) {
      const moduleId = `${rootId}-module-${j}`;
      const moduleName = `核心模块 ${j}`;
      const moduleNode = {
        id: moduleId,
        name: moduleName,
        details: `这是 ${rootName} 的 ${moduleName}。负责处理关键业务逻辑。`,
        // 3. 为每个二级模块递归生成 3, 4, 5 级子节点
        children: createChildren(moduleId, moduleName, 3, 5, levelNames),
      };
       if (moduleNode.children === undefined) {
          delete moduleNode.children;
       }
      rootNode.children.push(moduleNode);
    }

    allTrees.push(rootNode);
  }
  return allTrees;
};

export const treeData = generateComplexTreeData();