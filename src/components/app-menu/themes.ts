/** daisyUI 主题列表（顺序即菜单顺序） */
export const THEMES: readonly string[] = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
];

/** 主题展示名：首字母大写，其余保持 daisyUI 原始拼写。 */
export const formatThemeLabel = (themeName: string): string =>
  themeName.charAt(0).toUpperCase() + themeName.slice(1);
