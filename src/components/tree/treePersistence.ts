/**
 * 树展开状态的本地持久化（localStorage）。
 * 只保存 openNodes 中为 true 的键；解析失败或版本不符时回退为空状态。
 */
import type { OpenNodes } from "../../types/tree";

const STORAGE_KEY = "easy-viewer.tree.state.v1";
const STATE_VERSION = 1;

interface PersistedTreeState {
  version: number;
  openNodes: OpenNodes;
}

export const TREE_STATE_SAVE_DEBOUNCE_MS = 300;

function isPersistedTreeState(value: unknown): value is PersistedTreeState {
  if (typeof value !== "object" || value === null) return false;
  if (!("version" in value) || !("openNodes" in value)) return false;
  return (
    value.version === STATE_VERSION &&
    typeof value.openNodes === "object" &&
    value.openNodes !== null
  );
}

export const loadPersistedOpenNodes = (): OpenNodes => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedTreeState(parsed)) {
      return {};
    }

    const openNodes: OpenNodes = {};
    for (const [key, value] of Object.entries(parsed.openNodes)) {
      if (value) openNodes[key] = true;
    }
    return openNodes;
  } catch (error) {
    console.warn("读取树展开状态失败，已回退为空状态:", error);
    return {};
  }
};

export const savePersistedOpenNodes = (
  openNodes: OpenNodes | null | undefined,
): void => {
  try {
    const compact: OpenNodes = {};
    for (const [key, value] of Object.entries(openNodes || {})) {
      if (value) compact[key] = true;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STATE_VERSION, openNodes: compact }),
    );
  } catch (error) {
    console.warn("保存树展开状态失败:", error);
  }
};
