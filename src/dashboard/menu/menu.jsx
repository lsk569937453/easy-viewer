"use client"

import { useState } from "react"
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
import { AboutDialog } from "./about-dialog"
import { CreateLinkDialog } from "./createLinkDialog"
import { LanguageMenu } from "./languageMenu"
import { PreferenceDialog } from "./preferenceDialog"
import { MenuModeToggle } from "./themModeMenu"

export function Menu() {
  const [showAboutDialog, setShowAboutDialog] = useState(false)
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false)
  const [showCreateLinkDialog, setShowCreateLinkDialog] = useState(false)
  const { t, i18n } = useTranslation()
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
        <Dialog
          open={showCreateLinkDialog}
          onOpenChange={setShowCreateLinkDialog}
        >
          <CreateLinkDialog />
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
          <MenubarTrigger className="font-bold">配置</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setShowCreateLinkDialog(true)}>
              创建连接
            </MenubarItem>
            {/* <MenubarSeparator />
        <MenubarItem onClick={() => setShowPreferenceDialog(true)}>
          {t('toolBar.app.second_item')}
        </MenubarItem> */}
          </MenubarContent>
        </MenubarMenu>
        <MenuModeToggle />
        <LanguageMenu />
      </Menubar>
    </div>
  )
}
