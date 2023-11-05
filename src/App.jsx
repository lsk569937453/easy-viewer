import { useState, useEffect } from "react";
import React from 'react';
import { BankOutlined, BarChartOutlined, UserOutlined } from '@ant-design/icons';

import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { Layout, Menu, theme, Row, Col, Card, Space } from 'antd';
const { Header, Footer, Sider, Content } = Layout;

import { FirstPage } from "./zookeeper.jsx";
const headerStyle = {
  textAlign: 'center',
  color: '#fff',
  height: 64,
  paddingInline: 50,
  lineHeight: '64px',
  backgroundColor: '#7dbcea',
};
const contentStyle = {
  textAlign: 'center',
  minHeight: 120,
  lineHeight: '120px',
  color: '#fff',
  backgroundColor: '#108ee9',
};
function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [selectedMenuItem, setSelectedMenuItem] = useState('0');

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }
  const menuItems = () => {
    return [{
      key: "0",
      icon: React.createElement(BankOutlined),
      label: `总览`,
    }, {
      key: "1",
      icon: React.createElement(BarChartOutlined),
      label: `统计`,
    }, {
      key: "2",
      icon: React.createElement(UserOutlined),
      label: `我的`,
    }
    ];
  }
  const componentsSwitch = (key) => {
    switch (key) {
      case '0':
        return (<FirstPage />);
      case '1':
        return (<SecondPage />);
      case '2':
        return (<MyPage />);
      case '3':
        return (<h3>item3</h3>);
      default:
        break;
    }
  };

  const onKeyChange = (key) => {
    setSelectedMenuItem(key);
  };
  return (
    <>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider> <Menu

          theme="dark"
          defaultSelectedKeys={['0']}
          items={menuItems()}
          onClick={(e) => onKeyChange(e.key)}
        />
          {componentsSwitch(selectedMenuItem)}</Sider>
        <Layout>
          <Header style={headerStyle}>Header</Header>
          <Content style={contentStyle}>Content</Content>
        </Layout>

      </Layout>

    </>
  );
}

export default App;
