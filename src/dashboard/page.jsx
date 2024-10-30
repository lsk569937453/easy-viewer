import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/sidebar";
import { useState, useEffect } from "react";
import { uuid } from "../lib/utils";
import { useTranslation } from "react-i18next";
import { Menu, MenuItem, IconMenuItem } from '@tauri-apps/api/menu';
import { Button } from "@/components/ui/button"

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

export default function DashboardPage() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { t, i18n } = useTranslation();
    const [menulist, setMenulist] = useState([]);
    const [pageDataArray, setPageDataArray] = useState([]);
    const [tabValue, setTabValue] = useState(null);
    useEffect(() => {
        loadData();
    }, []);
    const handleContextMenu = async (event) => {
        event.preventDefault();

        const menu = await Menu.new();
        const openItem = await MenuItem.new({
            text: 'Open',
            action: async () => {
                console.log('Open clicked');
            }
        });
        const refresh = await MenuItem.new({
            text: '刷新',
            action: async () => {
                console.log('Open clicked');
                window.location.reload();
            }
        });
        menu.append(refresh);
        menu.append(openItem);
        await menu.popup();
    };
    const loadData = async () => {
        const { response_code, response_msg } = JSON.parse(await invoke("get_base_config"));
        console.log(response_code);
        console.log("get_menu_config:" + JSON.stringify(response_msg));
        if (response_code == 0) {
            const newMenulist = response_msg.base_config_list.map((item, index) => {
                console.log(item);
                console.log(index);

                return {
                    connectionType: item.connection_type,
                    iconName: "mysql",
                    showFirstIcon: true,
                    showSecondIcon: true,
                    key: index,
                    id: uuid(),
                    name: item.connection_name,
                    baseConfigId: item.base_config_id,
                };
            })
            console.log("convert to:" + JSON.stringify(newMenulist));
            setMenulist(newMenulist);
        }
    };
    const handleAddPageClick = (item) => {
        console.log(item);
        const itemIndex = pageDataArray.findIndex((existingItem) => existingItem.name === item.name);

        if (itemIndex > -1) {
            pageDataArray[itemIndex] = item;
            console.log("aaaaa");
        } else {
            pageDataArray.push(item);
        }
        setTabValue(item.name);
        setPageDataArray([...pageDataArray]);
    };
    const handleRemoveButton = (index) => {
        pageDataArray.splice(index, 1);
        setPageDataArray([...pageDataArray]);
    };

    const renderComponent = () => {
        return (
            <Tabs value={tabValue} className="w-full h-full" onValueChange={setTabValue}>
                <TabsList className="grid w-full grid-cols-8">
                    {pageDataArray.map((item, index) => {
                        return (
                            <TabsTrigger value={item.name} key={index}>
                                <div className="flex flex-row justify-center items-center gap-1">
                                    <div className="flex flex-row justify-center items-center gap-1">
                                        {item.icon}
                                        <p>    {item.name}</p>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" onClick={() => { handleRemoveButton(index) }} height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-x absolute right-2"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
                                </div>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
                {
                    pageDataArray.map((item, index) => {
                        return (
                            <TabsContent key={item.service} value={item.name}>
                                {item.render}
                            </TabsContent>
                        );
                    })
                }

            </Tabs>
        )
    };
    return (<>
        <div className="max-h-full grid grid-cols-10  h-full overflow-y-auto overscroll-x-none  divide-x divide-foreground/30 "
        >
            <Sidebar menuList={menulist} handleAddPageClick={handleAddPageClick} />
            <div className="col-span-8">{renderComponent()}</div>
        </div>
    </>);
}
