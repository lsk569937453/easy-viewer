
import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { Tree } from "react-arborist";
import { invoke } from "@tauri-apps/api/core";
import { uuid } from "../../lib/utils";
import { getIcon } from "../../lib/iconUtils";
import useResizeObserver from "use-resize-observer";


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
const mysqlDatabaseData = [{
    name: "Query",
    iconName: "query",
}, {
    name: "Tables",
    iconName: "tables",
},
{
    name: "Views",
    iconName: "views",
},
{
    name: "Functions",
    iconName: "functions",
},
{
    name: "Procedures",
    iconName: "procedures",
}
]
const mysqlTableData = [{
    name: "Columns",
    iconName: "columns",
}, {
    name: "Index",
    iconName: "index",
},
{
    name: "Partitions",
    iconName: "partitions",
},]
const Sidebar = ({ menuList, onButtonClick }) => {
    const treeRef = useRef();
    const { ref, width, height } = useResizeObserver();

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
    const findParentNode = (node) => {
        let temNode = node;
        while (temNode.level !== 0) {
            temNode = temNode.parent;
        }
        return temNode;

    }
    const clickNode = async (node) => {
        console.log(node);
        //if the parent node is mysql
        if (node.level == 1 && node.parent.data.connectionType == 0) {
            const newChildren = mysqlDatabaseData.map((item, index) => {
                return {
                    id: uuid(),
                    name: item.name,
                    iconName: item.iconName,
                    showFirstIcon: true,
                    showSecondIcon: true,
                }
            });
            findAndReplaceChildren(currentMenuList, node.data.id, newChildren);
            setCurrentMenuList([...currentMenuList]);
            return;

        } else if (node.level == 3 && findParentNode(node).data.connectionType == 0) {
            const newChildren = mysqlTableData.map((item, index) => {
                return {
                    id: uuid(),
                    name: item.name,
                    iconName: item.iconName,
                    showFirstIcon: true,
                    showSecondIcon: true,
                }
            });
            findAndReplaceChildren(currentMenuList, node.data.id, newChildren);
            setCurrentMenuList([...currentMenuList]);
            return;
        }

        console.log(node);
        const listNodeInfoReq = {
            level_infos: getLevelInfos(node),
        };
        console.log(listNodeInfoReq);
        const { response_code, response_msg } = JSON.parse(await invoke("list_node_info", { listNodeInfoReq: listNodeInfoReq }));

        console.log(response_code);
        console.log(response_msg);

        let newChildren;
        if (response_msg.length == 0) {
            newChildren = [{
                id: uuid(),
                name: "No Data",
                iconName: "",
                showFirstIcon: false,
                showSecondIcon: false,
            }]
        }
        else {
            newChildren = response_msg.map((item, index) => {
                return {
                    id: uuid(),
                    name: item[0],
                    iconName: item[1],
                    showFirstIcon: true,
                    showSecondIcon: true,
                }
            })
        };
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
        console.log(treeRef.current.root);
        if (node.children && node.children.length > 0) {
            node.isInternal && node.toggle()
        } else {
            clickNode(node);
        }

    };

    const treeNode = ({ node, style, dragHandle }) => {
        return (
            <div style={style} ref={dragHandle} className="flex flex-row cursor-pointer gap-2 content-center items-center justify-items-center  hover:bg-slate-200 group/item p-1" onClick={() => node.data.showFirstIcon ? handleClickIcon(node) : null} >
                {node.data.showFirstIcon && node.isOpen && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-down"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 9l6 6l6 -6" /></svg>}
                {node.data.showFirstIcon && !node.isOpen && < svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-right"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 6l6 6l-6 6" /></svg>}
                {getIcon(node)}
                {/* <p className="text-sm"  >{node.data.name}</p>

                <div className="flex flex-row ml-auto ">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-refresh group/edit invisible hover:bg-slate-200 group-hover/item:visible "><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-plus group/edit invisible hover:bg-slate-200 group-hover/item:visible "><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
                </div> */}
            </div >
        );
    }
    return (
        <div className={"h-screen flex  top-0  overflow-y-auto overscroll-x-none  col-span-2"} ref={ref}>
            <Tree data={currentMenuList} ref={treeRef} width={"100%"} className="overflow-y-auto overscroll-x-none " indent={10} height={height}
            >
                {treeNode}
            </Tree>

        </div >);
};
export default Sidebar;
