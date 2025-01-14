"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar"

export function HelpMenu() {
  const { t, i18n } = useTranslation()
  return (
    <MenubarMenu>
      <MenubarTrigger className="font-bold">Help</MenubarTrigger>
      <MenubarContent>
        <MenubarItem
          onClick={() =>
            open("https://github.com/lsk569937453/easy-viewer/issues")
          }
        >
          Report Issue
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  )
}
