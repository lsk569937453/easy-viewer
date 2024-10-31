
import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { Tree } from "react-arborist";
import { invoke } from "@tauri-apps/api/core";
import { uuid, getLevelInfos } from "../../lib/utils";
import useResizeObserver from "use-resize-observer";
import TreeNode from "./treeNode";
import IconDiv from "./iconDiv";

const Sidebar = ({ menuList, handleAddPageClick }) => {
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








    const treeNode = ({ node, style, dragHandle }) => {
        return (
            <TreeNode node={node} style={style} dragHandle={dragHandle} handleAddPageClick={handleAddPageClick} setCurrentMenuList={setCurrentMenuList} currentMenuList={currentMenuList} />
        );
    }
    return (
        <div className={"h-full flex  top-0  overflow-y-auto overscroll-x-none  col-span-2"} ref={ref}>
            <Tree data={currentMenuList} ref={treeRef} width={"100%"} className="overflow-y-auto overscroll-x-none " indent={10} height={height}>
                {treeNode}
            </Tree>

        </div >);
};
export default Sidebar;
