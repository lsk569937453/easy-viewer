
import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { Tree } from "react-arborist";
import { invoke } from "@tauri-apps/api/core";
import { uuid } from "../../lib/utils";
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

    const getLevelInfos = (node) => {
        const levelInfos = [];
        let tempNode = node;
        for (let i = node.level; i > 0; i--) {
            levelInfos.push({ level: i, config_value: tempNode.data.name });
            tempNode = tempNode.parent;
        }
        levelInfos.push({ level: 0, config_value: tempNode.data.baseConfigId.toString() });

        levelInfos.reverse();
        return levelInfos;

    }
    const clickNode = async (node) => {
        console.log(node);
        const listNodeInfoReq = {
            level_infos: getLevelInfos(node),
        };
        console.log(listNodeInfoReq);
        const { response_code, response_msg } = JSON.parse(await invoke("list_node_info", { listNodeInfoReq: listNodeInfoReq }));
        console.log(response_code);
        console.log(response_msg);
        const newChildren = response_msg.map((item, index) => {
            return {
                id: uuid(),
                name: item
            }
        })
        findAndReplaceChildren(currentMenuList, node.data.id, newChildren);
        setCurrentMenuList([...currentMenuList]);

    }

    const findAndReplaceChildren = (data, targetId, newChildren) => {
        for (let item of data) {
            // Check if the current item has the target id
            if (item.id === targetId) {
                // Replace the children with the new array
                item.children = newChildren;
                return true; // Return true after replacing children
            }
            // If the current item has children, search recursively
            if (item.children) {
                const found = findAndReplaceChildren(item.children, targetId, newChildren);
                if (found) {
                    return true;
                }
            }
        }
        return false; // Return false if the target id is not found
    }
    const handleClickIcon = (node) => {
        if (node.children.length > 0) {
            node.isInternal && node.toggle()
        } else {
            clickNode(node);
        }

    };
    const treeNode = ({ node, style, dragHandle }) => {
        return (
            <div style={style} ref={dragHandle} className="flex flex-row cursor-pointer gap-2"  >
                {node.isOpen && <svg onClick={() => handleClickIcon(node)} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-down"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 9l6 6l6 -6" /></svg>}
                {!node.isOpen && < svg onClick={() => handleClickIcon(node)} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-right"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 6l6 6l-6 6" /></svg>}
                <svg xmlns="http://www.w3.org/2000/svg"
                    width={16} height={16} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0}
                    strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-brand-mysql fill-slate-50">
                    <path stroke="none" d="M0 0h24v24H0z" className={`${node.isOpen ? 'fill-lime-500' : 'fill-slate-500'}`} />
                    <path d="M13 21c-1.427 -1.026 -3.59 -3.854 -4 -6c-.486 .77 -1.501 2 -2 2c-1.499 -.888 -.574 -3.973 0 -6c-1.596 -1.433 -2.468 -2.458 -2.5 -4c-3.35 -3.44 -.444 -5.27 2.5 -3h1c8.482 .5 6.421 8.07 9 11.5c2.295 .522 3.665 2.254 5 3.5c-2.086 -.2 -2.784 -.344 -3.5 0c.478 1.64 2.123 2.2 3.5 3" />
                    <path d="M9 7h.01" />
                </svg>
                <p className="text-sm" onClick={() => clickNode(node)} >{node.data.name}</p>
            </div >
        );
    }
    return (<div className={"pb-12 h-screen flex col-span-2 sticky top-0 overflow-auto"}>
        <div className="space-y-4 py-1">
            <div className="px-3 py-2">
                <Tree data={currentMenuList}>
                    {treeNode}
                </Tree>

            </div>
        </div>
    </div>);
};
export default Sidebar;
