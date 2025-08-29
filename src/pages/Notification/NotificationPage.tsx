import { ContainerOutlined, DesktopOutlined, InboxOutlined } from '@ant-design/icons'
import { ProCard } from '@ant-design/pro-components'
import { Space, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import AllNotifications from './Components/AllNotifications'
import { useSearchParams } from 'react-router-dom'

const NotificationPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'All';

    const [activeTab, setActiveTab] = useState<string>(defaultTab);

    const handleTabChange = (key: string) => {
        setActiveTab(key);
        setSearchParams({ tab: key });
    };

    useEffect(() => {
        const tabFromUrl = searchParams.get('tab') || 'All';
        if (tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [searchParams]);

    return (
        <div style={{ height: '70vsh', display: 'flex', flexDirection: 'column' }}>
        <ProCard
            bordered
            tabs={{
                type: "card",
                activeKey: activeTab,
                onChange: handleTabChange,
                size: "large",
            }}

            style={{
                margin: "0 auto",
                padding: "16px",
                borderRadius: "8px",
                minHeight: "80vh",
                display: "flex",
                overflow: 'hidden',
                flexDirection: "column",
            }}
            
        >
            <ProCard.TabPane
                key="All"
                tab={
                    <Space>
                        <ContainerOutlined style={{ color: "#52c41a" }} />
                        <Typography.Text>All</Typography.Text>
                    </Space>
                }
            >
                <div
                    style={{
                        padding: "0",
                        backgroundColor: "#fafafa",
                        borderRadius: "8px",
                        flex: 1,
                        overflow: "auto",
                        height: "calc(90vh - 200px)",
                    }}
                >
                    <AllNotifications/>
                </div>
            </ProCard.TabPane>

            <ProCard.TabPane
                key="Unread"
                tab={
                    <Space>
                        <InboxOutlined style={{ color: "#faad14" }} />
                        <Typography.Text>Unread</Typography.Text>
                    </Space>
                }
            >
                <div
                    style={{
                        padding: "0",
                        backgroundColor: "#fafafa",
                        borderRadius: "8px",
                    }}
                >
                    <AllNotifications notificationtype="unread" />
                </div>
            </ProCard.TabPane>

            <ProCard.TabPane
                key="System"
                tab={
                    <Space>
                        <DesktopOutlined style={{ color: "#1890ff" }} />
                        <Typography.Text>System</Typography.Text>
                    </Space>
                }
            >
                <div
                    style={{
                        padding: "0",
                        backgroundColor: "#fafafa",
                        borderRadius: "8px",
                    }}
                >
                    <AllNotifications notificationtype="system" />
                </div>
            </ProCard.TabPane>
        </ProCard>
     </div>
    )
}

export default NotificationPage
