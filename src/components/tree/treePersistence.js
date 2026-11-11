/**
 * 树展开状态的本地持久化（localStorage）。
 * 只保存 openNodes 中为 true 的键；解析失败或版本不符时回退为空状态。
 */
const STORAGE_KEY = "easy-viewer.tree.state.v1";
const STATE_VERSION = 1;

export const TREE_STATE_SAVE_DEBOUNCE_MS = 300;

export const loadPersistedOpenNodes = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      parsed.version !== STATE_VERSION ||
      typeof parsed.openNodes !== "object" ||
      parsed.openNodes === null
    ) {
      return {};
    }

    const openNodes = {};
    for (const [key, value] of Object.entries(parsed.openNodes)) {
      if (value) openNodes[key] = true;
    }
    return openNodes;
  } catch (error) {
    console.warn("读取树展开状态失败，已回退为空状态:", error);
    return {};
  }
};

export const savePersistedOpenNodes = (openNodes) => {
  try {
    const compact = {};
    for (const [key, value] of Object.entries(openNodes || {})) {
      if (value) compact[key] = true;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STATE_VERSION, openNodes: compact })
    );
  } catch (error) {
    console.warn("保存树展开状态失败:", error);
  }
};
