"use client"

import * as React from "react"
import { LaptopIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"

import {
  MenubarContent,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarTrigger,
} from "@/components/ui/menubar"

export function MenuModeToggle() {
  const { setTheme, theme } = useTheme()
  const { t, i18n } = useTranslation()
  return (
    <MenubarMenu>
      <MenubarTrigger className="font-bold">
        {t("toolBar.theme.name")}
      </MenubarTrigger>
      <MenubarContent forceMount>
        <MenubarRadioGroup value={theme}>
          <MenubarRadioItem value="light" onClick={() => setTheme("light")}>
            <SunIcon className="mr-2 h-4 w-4" />
            <span>{t("toolBar.theme.first_item")}</span>
          </MenubarRadioItem>
          <MenubarRadioItem value="dark" onClick={() => setTheme("dark")}>
            <MoonIcon className="mr-2 h-4 w-4" />
            <span>{t("toolBar.theme.second_item")}</span>
          </MenubarRadioItem>
          <MenubarRadioItem value="system" onClick={() => setTheme("system")}>
            <LaptopIcon className="mr-2 h-4 w-4" />
            <span>{t("toolBar.theme.third_item")}</span>
          </MenubarRadioItem>
        </MenubarRadioGroup>
      </MenubarContent>
    </MenubarMenu>
  )
}
