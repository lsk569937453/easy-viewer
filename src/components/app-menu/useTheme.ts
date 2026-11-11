import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "theme";

interface UseThemeResult {
  theme: string;
  setTheme: (theme: string) => void;
}

/** 主题状态：写入 data-theme 并持久化到 localStorage（键名保持不变）。 */
export const useTheme = (): UseThemeResult => {
  const [theme, setTheme] = useState(
    localStorage.getItem(THEME_STORAGE_KEY) || "light",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
};
