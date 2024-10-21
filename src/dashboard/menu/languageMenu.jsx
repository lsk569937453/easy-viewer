"use client";
import * as React from "react";
import { MenubarContent, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarTrigger, } from "@/components/ui/menubar";
import { useTranslation } from "react-i18next";
export function LanguageMenu() {
    const { t, i18n } = useTranslation();
    return (<MenubarMenu>
      <MenubarTrigger className="font-bold">{t('toolBar.language.name')}</MenubarTrigger>
      <MenubarContent forceMount>
        <MenubarRadioGroup value={i18n.language}>
          <MenubarRadioItem value="en" onClick={() => i18n.changeLanguage("en")}>
            <span>{t('toolBar.language.english')}</span>
          </MenubarRadioItem>
          <MenubarRadioItem value="zh" onClick={() => i18n.changeLanguage("zh")}>
            <span>{t('toolBar.language.chinese')}</span>
          </MenubarRadioItem>
        </MenubarRadioGroup>
      </MenubarContent>
    </MenubarMenu>);
}
