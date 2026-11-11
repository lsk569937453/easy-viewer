import { describe, expect, it } from "vitest";
import { formatThemeLabel, THEMES } from "./themes";

describe("themes", () => {
  it("保留 daisyUI 全部主题且首尾不变", () => {
    expect(THEMES).toHaveLength(29);
    expect(THEMES[0]).toBe("light");
    expect(THEMES[THEMES.length - 1]).toBe("winter");
  });

  it("主题展示名首字母大写", () => {
    expect(formatThemeLabel("cyberpunk")).toBe("Cyberpunk");
    expect(formatThemeLabel("")).toBe("");
  });
});
