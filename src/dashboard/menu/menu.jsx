"use client"

import { useContext, useState } from "react"
import { useTranslation } from "react-i18next"

// import { WindowTitlebar } from "tauri-controls"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar"

import { Dialog } from "../../components/ui/dialog"
import { MainPageDialogContext, SidebarContext } from "../page"
import { AboutDialog } from "./about-dialog"
import { CreateConnectionDialog } from "./createConnectionDialog"
import { HelpMenu } from "./helpMenu"
import { LanguageMenu } from "./languageMenu"
import { PreferenceDialog } from "./preferenceDialog"
import { MenuModeToggle } from "./themModeMenu"

export function Menu() {
  const [showAboutDialog, setShowAboutDialog] = useState(false)
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false)
  // const [showCreateConnectionDialog, setShowCreateConnectionDialog] = useState(false)
  const { setBaseConfigId, setIsSave } = useContext(SidebarContext)
  const { setShowEditConnectionDialog } = useContext(MainPageDialogContext)
  const { t, i18n } = useTranslation()

  const handleNewConnectionButtonClick = () => {
    setShowEditConnectionDialog(true)
    setBaseConfigId(null)
    setIsSave(false)
  }
  return (
    <div>
      <Menubar className="rounded-none border-b border-none pl-2 lg:pl-3">
        <MenubarMenu></MenubarMenu>
        <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
          <AboutDialog />
        </Dialog>

        <Dialog
          open={showPreferenceDialog}
          onOpenChange={setShowPreferenceDialog}
        >
          <PreferenceDialog />
        </Dialog>

        <MenubarMenu>
          <MenubarTrigger className="font-bold">
            {t("toolBar.app.name")}
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setShowAboutDialog(true)}>
              {t("toolBar.app.first_item")}
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setShowPreferenceDialog(true)}>
              {t("toolBar.app.second_item")}
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger className="font-bold">Config</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => handleNewConnectionButtonClick()}>
              Create Connection
            </MenubarItem>
            {/* <MenubarSeparator />
        <MenubarItem onClick={() => setShowPreferenceDialog(true)}>
          {t('toolBar.app.second_item')}
        </MenubarItem> */}
          </MenubarContent>
        </MenubarMenu>
        <MenuModeToggle />
        <LanguageMenu />
        <HelpMenu />
      </Menubar>
    </div>
  )
}
