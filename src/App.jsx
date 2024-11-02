import "./i18n"

import { Menu } from "@/dashboard/menu/menu"

import { TailwindIndicator } from "./dashboard/menu/tailwind-indicator"
import { ThemeProvider } from "./dashboard/menu/theme-provider"
import DashboardPage from "./dashboard/page"
import { cn } from "./lib/utils"

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="h-screen overflow-clip">
        <Menu />
        <div
          className={cn(
            "h-full border-t border-foreground/30 bg-background pb-8",
            "scrollbar scrollbar-track-transparent scrollbar-thumb-accent scrollbar-thumb-rounded-md"
          )}
        >
          <DashboardPage />
        </div>
      </div>
    </ThemeProvider>
  )
}
export default App
