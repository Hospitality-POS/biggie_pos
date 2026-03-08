import React, { useEffect, useState } from "react";
import { Space, Typography } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
    ContainerOutlined,
    DesktopOutlined,
    InboxOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import AllNotifications from "./Components/AllNotifications";

const { Text } = Typography;

// ── Palette (tab icon colours) ────────────────────────────────────────────────
const C = {
    green: "#10b981",
    orange: "#f59e0b",
    blue: "#3b82f6",
    border: "#e2e8f0",
};

const NotificationPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const defaultTab = searchParams.get("tab") || "All";
    const [activeTab, setActiveTab] = useState<string>(defaultTab);

    const handleTabChange = (key: string) => {
        setActiveTab(key);
        setSearchParams({ tab: key });
    };

    useEffect(() => {
        const t = searchParams.get("tab") || "All";
        if (t !== activeTab) setActiveTab(t);
    }, [searchParams]);

    return (
        <ProCard
            bordered
            style={{ borderRadius: 12, minHeight: "80vh" }}
            tabs={{
                type: "card",
                size: "small",
                activeKey: activeTab,
                onChange: handleTabChange,
                items: [
                    {
                        key: "All",
                        label: (
                            <Space size={6}>
                                <ContainerOutlined style={{ color: C.green }} />
                                <Text>All</Text>
                            </Space>
                        ),
                        children: (
                            <div style={{ padding: "16px 0 0" }}>
                                <AllNotifications />
                            </div>
                        ),
                    },
                    {
                        key: "Unread",
                        label: (
                            <Space size={6}>
                                <InboxOutlined style={{ color: C.orange }} />
                                <Text>Unread</Text>
                            </Space>
                        ),
                        children: (
                            <div style={{ padding: "16px 0 0" }}>
                                <AllNotifications notificationtype="unread" />
                            </div>
                        ),
                    },
                    {
                        key: "System",
                        label: (
                            <Space size={6}>
                                <DesktopOutlined style={{ color: C.blue }} />
                                <Text>System</Text>
                            </Space>
                        ),
                        children: (
                            <div style={{ padding: "16px 0 0" }}>
                                <AllNotifications notificationtype="system" />
                            </div>
                        ),
                    },
                ],
            }}
        />
    );
};

export default NotificationPage;