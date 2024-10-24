import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/sidebar";
import { useState, useEffect } from "react";
import { uuid } from "../lib/utils";
import CryptoPage from "./page/cryptoPage";
import { useTranslation } from "react-i18next";
import { Menu, MenuItem, IconMenuItem } from '@tauri-apps/api/menu';

export default function DashboardPage() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { t, i18n } = useTranslation();
    const [menulist, setMenulist] = useState([]);
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
                    render: <CryptoPage />
                };
            })
            console.log("convert to:" + JSON.stringify(newMenulist));
            setMenulist(newMenulist);
        }
    };
    const handleMenuClick = (index) => {
        setSelectedIndex(index);
    };
    const renderComponent = (menuIndex) => {
        const selectedMenu = menulist.find((item) => item.menuIndex === menuIndex);
        return selectedMenu ? selectedMenu.render : null;
    };
    return (<>
        <div className="max-h-full grid grid-cols-10  h-screen overflow-hidden divide-x divide-foreground/30 py-2 "
        // onContextMenu={handleContextMenu}
        >
            <Sidebar menuList={menulist} onButtonClick={handleMenuClick} />
            <div className="col-span-8">{renderComponent(selectedIndex)}</div>
        </div>
    </>);
}
