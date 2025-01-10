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
  MenubarSeparator,
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

          <MenubarRadioItem
            value="blueLight"
            onClick={() => setTheme("blueLight")}
          >
            <SunIcon className="mr-2 h-4 w-4" />
            <span>Blue Light</span>
          </MenubarRadioItem>
          <MenubarRadioItem
            value="midnightTokyo"
            onClick={() => setTheme("midnightTokyo")}
          >
            <SunIcon className="mr-2 h-4 w-4" />
            <span>Midnight Tokyo</span>
          </MenubarRadioItem>
          <MenubarRadioItem
            value="purpleDarkV2"
            onClick={() => setTheme("purpleDarkV2")}
          >
            <SunIcon className="mr-2 h-4 w-4" />
            <span>Purple Dark V2</span>
          </MenubarRadioItem>
          <MenubarRadioItem
            value="eviloma2"
            onClick={() => setTheme("eviloma2")}
          >
            <SunIcon className="mr-2 h-4 w-4" />
            <span>Eviloma2</span>
          </MenubarRadioItem>
          <MenubarSeparator />
          <MenubarRadioItem value="dark" onClick={() => setTheme("dark")}>
            <MoonIcon className="mr-2 h-4 w-4" />
            <span>{t("toolBar.theme.second_item")}</span>
          </MenubarRadioItem>
          <MenubarRadioItem
            value="yuzuMarmalade"
            onClick={() => setTheme("yuzuMarmalade")}
          >
            <MoonIcon className="mr-2 h-4 w-4" />
            <span>Yuzu Marmalade</span>
          </MenubarRadioItem>
          <MenubarRadioItem
            value="purpleillusionist"
            onClick={() => setTheme("purpleillusionist")}
          >
            <MoonIcon className="mr-2 h-4 w-4" />
            <span>Purple Illusionist</span>
          </MenubarRadioItem>
          <MenubarRadioItem
            value="vscodeMonkaiPro"
            onClick={() => setTheme("vscodeMonkaiPro")}
          >
            <MoonIcon className="mr-2 h-4 w-4" />
            <span>Vscode Monkai Pro</span>
          </MenubarRadioItem>
        </MenubarRadioGroup>
      </MenubarContent>
    </MenubarMenu>
  )
}
