import { useEffect, useState } from "react";

/**
 * daisyUI 预设里明确偏暗的主题。
 * 命中名单直接用名字判断，未命中时退化为读取实际背景亮度，
 * 这样自定义主题也能得到正确结果。
 */
const DARK_THEME_NAMES = new Set([
  "dark",
  "night",
  "black",
  "luxury",
  "dracula",
  "business",
  "coffee",
  "dim",
  "forest",
  "halloween",
  "synthwave",
]);

const parseRgb = (value: string): [number, number, number] | null => {
  const match = /rgba?\(([^)]+)\)/.exec(value);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => Number.parseFloat(part));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
  return [parts[0], parts[1], parts[2]];
};

const readIsDark = (): boolean => {
  if (typeof document === "undefined") return false;

  const root = document.documentElement;
  const themeName = root.dataset.theme ?? "";
  if (DARK_THEME_NAMES.has(themeName)) return true;

  const backgrounds = [
    getComputedStyle(root).backgroundColor,
    document.body ? getComputedStyle(document.body).backgroundColor : "",
  ];

  for (const background of backgrounds) {
    const rgb = parseRgb(background ?? "");
    if (!rgb) continue;
    const [r, g, b] = rgb;
    // 相对亮度（sRGB 近似，够判断明暗）
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
  }

  return false;
};

/**
 * 当前主题是否为暗色：供代码高亮等需要"两套配色"的地方使用。
 * 监听 <html data-theme> 变化，主题切换后立即跟随。
 */
export function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState<boolean>(readIsDark);

  useEffect(() => {
    const update = () => setIsDark(readIsDark());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export default useIsDarkTheme;
