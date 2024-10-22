import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { invoke } from "@tauri-apps/api/core";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { Tree } from "react-arborist";
const data = [
    { id: "1", name: "Unread" },
    { id: "2", name: "Threads" },
    {
        id: "3",
        name: "Chat Rooms",
        children: [
            { id: "c1", name: "General" },
            { id: "c2", name: "Random" },
            { id: "c3", name: "Open Source Projects" },
        ],
    },
    {
        id: "4",
        name: "Direct Messages",
        children: [
            { id: "d1", name: "Alice" },
            { id: "d2", name: "Bob" },
            { id: "d3", name: "Charlie" },
        ],
    },
];
const Sidebar = ({ menuList, onButtonClick }) => {
    const [currentMenuList, setCurrentMenuList] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const { t, i18n } = useTranslation();
    const { toast } = useToast();
    useEffect(() => {
        console.log(menuList);
        const currentMenuList = menuList.map((item, index) => {
            return {

                key: index,
                id: index.toString(),
                name: item.label,
            };
        });
        console.log(currentMenuList);

        setCurrentMenuList(currentMenuList);
    }, [menuList]);
    const handleButtonClick = (index) => {
        onButtonClick(index);
        setSelectedIndex(index);
    };

    return (<div className={"pb-12 h-screen flex col-span-2 sticky top-0 overflow-auto"}>
        <div className="space-y-4 py-1">
            <div className="px-3 py-2">
                <Tree data={currentMenuList} />

            </div>
        </div>
    </div>);
};
export default Sidebar;
