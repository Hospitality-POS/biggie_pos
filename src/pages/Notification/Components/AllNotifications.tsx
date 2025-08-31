import { CheckOutlined, DeleteOutlined, FilterOutlined, MailOutlined } from '@ant-design/icons';
import { ActionType, ProList } from '@ant-design/pro-components';
import { fetchMyNotifications } from '@services/notifications';
import { Badge, Button, Flex, message, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import moment from 'moment';
import React, { useRef, useState } from 'react';
import NotificationDetailView from './NotificationDetailView';
import { useNotificationMutations } from '../Hooks/NotificationsCustomHook';

import { usePrimaryColor } from "@context/PrimaryColorContext";

interface AllNotificationsProps {
    notificationtype?: string;
}

const AllNotifications: React.FC<AllNotificationsProps> = ({ notificationtype }) => {
    const [showDetails, setShowDetails] = React.useState(false);
    const [selectedNotification, setSelectedNotification] = React.useState<any>(null);
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

    const actionRef = useRef<ActionType>();

    const primaryColor = usePrimaryColor();

    const { deleteNotificationMutation, markAsReadMutation } =
        useNotificationMutations(actionRef);

    const handleViewDetails = (notification: any) => {
        setShowDetails(true);
        setSelectedNotification(notification);
        // markAsReadMutation.mutate(notification._id);
    };

    const handleBulkSelectedMarkAsRead = () => {
        if (selectedKeys.length === 0) {
            message.warning('Please select notifications to mark as read');
            return;
        }
        selectedKeys.forEach((id) => markAsReadMutation.mutate(id as string));
        message.success('Selected notifications marked as read');
        actionRef.current?.reload();
        setSelectedKeys([]);
    };

    if (showDetails) {
        return <NotificationDetailView record={selectedNotification} setShowDetails={setShowDetails} />
    }
    return (
        <ProList
            rowKey="_id"
            headerTitle={`All ${notificationtype ? `${notificationtype?.replace(/_/g, " ")} notifications` : "Notifications"}`}
            showActions="hover"
            showExtra="hover"
            actionRef={actionRef}
            metas={{
                title: {
                    search: false,
                    dataIndex: 'title',
                    render: (text) => (
                        <span style={{ fontWeight: 'bold' }}>{text}</span>
                    ),
                },
                description: {
                    search: false,
                    dataIndex: 'message',
                    render: (text) => <Typography.Paragraph ellipsis={{ rows: 1, expandable: false }} style={{ marginBottom: 0 }}>{text}</Typography.Paragraph>,
                },
                subTitle: {
                    title: <span style={{ color: primaryColor }}><FilterOutlined /> Priority</span>,
                    dataIndex: 'priority',
                    render: (_, record) => (
                        <Tag color={record.priority === "high" ? "red" : record.priority === "medium" ? "orange" : "green"}>
                            {record.priority.charAt(0).toUpperCase() + record.priority.slice(1)}
                        </Tag>
                    ),
                    valueType: "select",
                    valueEnum: {
                        High: "High",
                        Medium: "Medium",
                        Low: "Low",
                    },
                },
                id: {
                    search: false,
                    dataIndex: '_id',
                },

                avatar: {
                    search: notificationtype !== "unread",
                    title: <span style={{ color: primaryColor }}><MailOutlined /> Status</span>,
                    dataIndex: 'read',
                    render: (_, record) => (
                        <span
                            style={{
                                width: 12,
                                height: '100%',
                                backgroundColor: 'black',
                                border: `${record.read ? 'none' : `2px solid ${primaryColor}`}`,
                                borderRadius: 2,

                            }}
                        />
                    ),
                    valueType: "select",
                    valueEnum: {
                        "": "All",
                        false: "Unread",
                        true: "Read",
                    },
                },
                extra: {
                    search: false,
                    render: (_, record) => (
                        <Flex>
                            <Tooltip title="View Notification" key="view-tooltip">
                                <Button
                                    type="text"
                                    icon={<MailOutlined />}
                                    onClick={() => handleViewDetails(record)}
                                />
                            </Tooltip>

                            {!record.read && <Tooltip title="Mark as Read" key="mark-as-read-tooltip">
                                <Button
                                    type="text"
                                    icon={<Badge dot key="badge" color={primaryColor} style={{ marginTop: 4 }}><MailOutlined /> </Badge>}
                                    onClick={() => markAsReadMutation.mutate(record._id)}
                                />

                            </Tooltip>}

                            <Popconfirm
                                title="Are you sure you want to delete this notification?"
                                onConfirm={() => deleteNotificationMutation.mutate(record._id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    danger
                                    type="text"
                                    icon={<DeleteOutlined />}
                                />
                            </Popconfirm>

                        </Flex>
                    ),
                },
                actions: {
                    search: false,
                    render: (_, record) => [
                        record?.createdAt ? moment(record.createdAt).format('MMM D') : 'No Date',
                    ],
                },
            }}
            search={{
                filterType: 'light',
            }}
            bordered
            size="large"
            request={async (params) => {
                const data = await fetchMyNotifications({
                    current: params.current,
                    pageSize: params.pageSize,
                    priority: params.priority?.toLowerCase(),
                    read: notificationtype === "unread" ? false : params.read,
                    type: notificationtype === "system" ? "system" : "",
                });

                const allNotifications = data?.data || [];
                return {
                    data: allNotifications,
                    success: true,
                    total: data?.pagination?.total || allNotifications.length,
                };
            }
            }
            rowSelection={{
                selectedRowKeys: selectedKeys,
                onChange: (keys) => setSelectedKeys(keys),
            }}
            tableAlertRender={({ selectedRowKeys }) =>
                `Selected ${selectedRowKeys.length} item${selectedRowKeys.length > 1 ? '(s)' : ''}`
            }
            tableAlertOptionRender={({ onCleanSelected }) =>
                <Space>

                    <Button
                        key="mark-read"
                        icon={<CheckOutlined />}
                        type="link"
                        onClick={handleBulkSelectedMarkAsRead}
                    >
                        Mark as Read
                    </Button>

                    <Button key="clear" type="link" onClick={onCleanSelected}>
                        Clear
                    </Button>
                </Space>

            }
            scroll={{ x: "inherit" }}
            options={{
                fullScreen: true,
                setting: false,
            }}
            pagination={{
                pageSize: 10,
                responsive: true,
                showTotal: (total, range) => (
                    <div>{`Showing ${range[0]}-${range[1]} of ${total} total notifications`}</div>
                ),
            }}

        />
    );
};

export default AllNotifications;
