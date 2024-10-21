import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { invoke } from "@tauri-apps/api/core";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
const Sidebar = ({ menuList, onButtonClick }) => {
    const [currentMenuList, setCurrentMenuList] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const { t, i18n } = useTranslation();
    const { toast } = useToast();
    useEffect(() => {
        setCurrentMenuList(menuList);
    }, [menuList]);
    const handleButtonClick = (index) => {
        onButtonClick(index);
        setSelectedIndex(index);
    };

    return (<div className={"pb-12 h-screen flex col-span-2 sticky top-0 overflow-auto"}>
        <div className="space-y-4 py-4">
            <div className="px-3 py-2">
                <div className="space-y-1">
                    {(<>
                        {menuList.map((item, index) =>
                        (
                            <div key={index}>
                                <Button key={item.menuIndex} variant="ghost" className="aria-selected:bg-primary/80 hover:bg-primary/80 w-full justify-start" onContextMenu={(e) => handleRightClick(e, item.sourceIndex)} aria-selected={selectedIndex === item.menuIndex} onClick={() => handleButtonClick(item.menuIndex)}>
                                    {t("menu." + item.sourceIndex)}
                                </Button>

                            </div>)
                        )}
                    </>)}

                </div>
            </div>
        </div>
    </div>);
};
export default Sidebar;
