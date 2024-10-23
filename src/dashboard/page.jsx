import { invoke } from "@tauri-apps/api/core";
import Sidebar from "./components/sidebar";
import { useState, useEffect } from "react";
import Base64TextPage from "./page/base64Page";
import UrlEncodePage from "./page/urlencodePage";
import DigestPage from "./page/digestPage";
import TimestampPage from "./page/timestampPage";
import QrcodePage from "./page/qrcodePage";
import FormatPage from "./page/formatPage";
import ColorPalettePage from "./page/colorPalettePage";
import DiffViewerPage from "./page/diffViewerPage";
import CryptoPage from "./page/cryptoPage";
import { useTranslation } from "react-i18next";
export default function DashboardPage() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { t, i18n } = useTranslation();
    const [menulist, setMenulist] = useState([]);
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { response_code, response_msg } = JSON.parse(await invoke("get_base_config"));
        console.log(response_code);
        console.log("get_menu_config:" + JSON.stringify(response_msg));
        if (response_code == 0) {
            const newMenulist = response_msg.base_config_list.map((item, index) => {
                console.log(item);
                console.log(index);

                return {
                    key: index,
                    id: index.toString(),
                    name: item.connection_name,
                    baseConfigId: item.base_config_id,
                    menuIndex: index,
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
        <div className="max-h-full grid grid-cols-10 relative h-screen overflow-hidden divide-x divide-foreground/30">
            <Sidebar menuList={menulist} onButtonClick={handleMenuClick} />
            <div className="col-span-8">{renderComponent(selectedIndex)}</div>
        </div>
    </>);
}
