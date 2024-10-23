
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
        setCurrentMenuList(menuList);
    }, [menuList]);

    const updateNode = (node) => {
        console.log(node);

    }
    const treeNode = ({ node, style, dragHandle }) => {
        return (
            <div style={style} ref={dragHandle} onClick={() => updateNode(node)} className="flex flex-row">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-mysql"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M13 21c-1.427 -1.026 -3.59 -3.854 -4 -6c-.486 .77 -1.501 2 -2 2c-1.499 -.888 -.574 -3.973 0 -6c-1.596 -1.433 -2.468 -2.458 -2.5 -4c-3.35 -3.44 -.444 -5.27 2.5 -3h1c8.482 .5 6.421 8.07 9 11.5c2.295 .522 3.665 2.254 5 3.5c-2.086 -.2 -2.784 -.344 -3.5 0c.478 1.64 2.123 2.2 3.5 3" /><path d="M9 7h.01" /></svg>
                {node.data.name}
            </div>
        );
    }
    return (<div className={"pb-12 h-screen flex col-span-2 sticky top-0 overflow-auto"}>
        <div className="space-y-4 py-1">
            <div className="px-3 py-2">
                <Tree data={data}>
                    {treeNode}
                </Tree>

            </div>
        </div>
    </div>);
};
export default Sidebar;
