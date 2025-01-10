import "./i18n"

import { Menu } from "@/dashboard/menu/menu"

import { TailwindIndicator } from "./dashboard/menu/tailwind-indicator"
import { ThemeProvider } from "./dashboard/menu/theme-provider"
import DashboardPage from "./dashboard/page"
import { cn } from "./lib/utils"

function App() {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
      <DashboardPage />
    </ThemeProvider>
  )
}
export default App
