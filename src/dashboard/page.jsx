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
    const constMenulist = () => {
        return [
            {
                label: "转换工具",
                menuIndex: 0,
                sourceIndex: 0,
                render: <Base64TextPage />
            },
            {
                label: "格式化",
                menuIndex: 1,
                sourceIndex: 1,
                render: <FormatPage />
            }, {
                label: "UrlEncode/UrlDecode",
                menuIndex: 2,
                sourceIndex: 2,
                render: <UrlEncodePage />
            },
            {
                label: "摘要算法(MD5,SHA)",
                menuIndex: 3,
                sourceIndex: 3,
                render: <DigestPage />
            },
            {
                label: " 时间戳",
                menuIndex: 4,
                sourceIndex: 4,
                render: <TimestampPage />
            },
            {
                label: "二维码",
                menuIndex: 5,
                sourceIndex: 5,
                render: <QrcodePage />
            },
            {
                label: "调色器",
                menuIndex: 6,
                sourceIndex: 6,
                render: <ColorPalettePage />
            }, {
                label: "文本对比",
                menuIndex: 7,
                sourceIndex: 7,
                render: <DiffViewerPage />
            },
            {
                label: "加密算法",
                menuIndex: 8,
                sourceIndex: 8,
                render: <CryptoPage />
            }
        ];
    };
    const loadData = async () => {
        const { response_code, response_msg } = JSON.parse(await invoke("get_base_config"));
        console.log(response_code);
        console.log("get_menu_config:" + JSON.stringify(response_msg));
        if (response_code == 0) {
            const newMenulist = response_msg.map((index, item) => {
                return {
                    label: "111",
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
