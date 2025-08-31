import React, { useState } from "react";
import {
    Card,
    Table,
    Tag,
    Typography,
    Button,
    Space,
    Dropdown,
    Modal,
    message,
    Tabs,
    Badge,
    Row,
    Col,
    Tooltip,
    Drawer,
} from "antd";
import {
    BellOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    EllipsisOutlined,
    ExclamationCircleOutlined,
    FilterOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchMyNotifications,
    fetchSystemNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
} from "@services/notifications";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;

const NotificationsPageOld: React.FC = () => {
    const [activeTab, setActiveTab] = useState("my");
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
    });
    const [filterType, setFilterType] = useState<string | null>(null);
    const [filterPriority, setFilterPriority] = useState<string | null>(null);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const queryClient = useQueryClient();

    // Fetch notifications based on active tab
    const { data: myNotifications, isLoading: myLoading } = useQuery({
        queryKey: [
            "myNotifications",
            pagination,
            { type: filterType, priority: filterPriority },
        ],
        queryFn: () =>
            fetchMyNotifications({
                current: pagination.current,
                pageSize: pagination.pageSize,
                type: filterType,
                priority: filterPriority,
            }),
        enabled: activeTab === "my",
    });

    const { data: systemNotifications, isLoading: systemLoading } = useQuery({
        queryKey: [
            "systemNotifications",
            pagination,
            { type: filterType, priority: filterPriority },
        ],
        queryFn: () =>
            fetchSystemNotifications({
                current: pagination.current,
                pageSize: pagination.pageSize,
                type: filterType,
                priority: filterPriority,
            }),
        enabled: activeTab === "system",
    });

    // Mutations
    const markAsReadMutation = useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => {
            message.success("Notification marked as read");
            queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
            queryClient.invalidateQueries({ queryKey: ["systemNotifications"] });
            queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: markAllNotificationsAsRead,
        onSuccess: () => {
            message.success("All notifications marked as read");
            queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
            queryClient.invalidateQueries({ queryKey: ["systemNotifications"] });
            queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
        },
    });

    const deleteNotificationMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            message.success("Notification deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
            queryClient.invalidateQueries({ queryKey: ["systemNotifications"] });
            queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
        },
    });

    // Get current notification data based on active tab
    const getCurrentNotifications = () => {
        switch (activeTab) {
            case "my":
                return myNotifications;
            case "system":
                return systemNotifications;
            default:
                return myNotifications;
        }
    };

    // Fix loading state logic
    const isLoading = activeTab === "my" ? myLoading : activeTab === "system" ? systemLoading : false;
    const currentData = getCurrentNotifications();

    const handleTabChange = (key: string) => {
        setActiveTab(key);
        setPagination({
            current: 1,
            pageSize: 10,
        });
        setSelectedRowKeys([]);
    };

    const handleTableChange = (pagination: any) => {
        setPagination({
            current: pagination.current,
            pageSize: pagination.pageSize,
        });
    };

    const handleMarkAsRead = (id: string) => {
        markAsReadMutation.mutate(id);
    };

    const handleMarkAllAsRead = () => {
        markAllAsReadMutation.mutate();
    };

    const handleDeleteNotification = (id: string) => {
        confirm({
            title: "Are you sure you want to delete this notification?",
            icon: <ExclamationCircleOutlined />,
            content: "This action cannot be undone.",
            okText: "Yes",
            okType: "danger",
            cancelText: "No",
            onOk() {
                deleteNotificationMutation.mutate(id);
            },
        });
    };

    const handleViewDetails = (notification: any) => {
        setSelectedNotification(notification);
        setDetailsVisible(true);
    };

    const handleCloseDetails = () => {
        setDetailsVisible(false);
    };

    const resetFilters = () => {
        setFilterType(null);
        setFilterPriority(null);
    };

    // Notification type filter menu
    const typeFilterMenu = {
        items: [
            {
                key: "new_appointment_booking",
                label: "New Appointment Booking",
            },
            {
                key: "inventory_out_of_stock",
                label: "Inventory Out of Stock",
            },
            {
                key: "new_appointment",
                label: "New Appointment",
            },
            {
                key: "low_inventory",
                label: "Low Inventory",
            },
            {
                key: "system",
                label: "System",
            },
            {
                key: "clear",
                label: "Clear Filter",
                danger: true,
            },
        ],
        onClick: ({ key }: { key: string }) => {
            if (key === "clear") {
                setFilterType(null);
            } else {
                setFilterType(key);
            }
            setPagination({ ...pagination, current: 1 });
        },
    };

    // Priority filter menu
    const priorityFilterMenu = {
        items: [
            {
                key: "low",
                label: "Low",
            },
            {
                key: "medium",
                label: "Medium",
            },
            {
                key: "high",
                label: "High",
            },
            {
                key: "urgent",
                label: "Urgent",
            },
            {
                key: "clear",
                label: "Clear Filter",
                danger: true,
            },
        ],
        onClick: ({ key }: { key: string }) => {
            if (key === "clear") {
                setFilterPriority(null);
            } else {
                setFilterPriority(key);
            }
            setPagination({ ...pagination, current: 1 });
        },
    };

    // Render the priority tag with appropriate color
    const renderPriorityTag = (priority: string) => {
        let color = "";
        switch (priority) {
            case "low":
                color = "green";
                break;
            case "medium":
                color = "blue";
                break;
            case "high":
                color = "orange";
                break;
            case "urgent":
                color = "red";
                break;
            default:
                color = "default";
        }
        return <Tag color={color}>{priority.toUpperCase()}</Tag>;
    };

    // Render the notification type tag
    const renderTypeTag = (type: string) => {
        let color = "";
        let label = "";
        switch (type) {
            case "new_appointment_booking":
                color = "purple";
                label = "New Appointment Booking";
                break;
            case "inventory_out_of_stock":
                color = "red";
                label = "Out of Stock";
                break;
            case "new_appointment":
                color = "green";
                label = "New Appointment";
                break;
            case "low_inventory":
                color = "orange";
                label = "Low Inventory";
                break;
            case "system":
                color = "blue";
                label = "System";
                break;
            default:
                color = "default";
                label = type.replace(/_/g, " ");
        }
        return <Tag color={color}>{label}</Tag>;
    };

    const columns = [
        {
            title: "Title",
            dataIndex: "title",
            key: "title",
            render: (text: string, record: any) => (
                <Space direction="vertical" size={0}>
                    <Text strong={!record.read}>{text}</Text>
                    {!record.read && <Badge status="processing" color="blue" />}
                </Space>
            ),
        },
        {
            title: "Message",
            dataIndex: "message",
            key: "message",
            render: (text: string, record: any) => (
                <Text strong={!record.read} style={{ maxWidth: 300 }} ellipsis={{ tooltip: text }}>
                    {text}
                </Text>
            ),
        },
        {
            title: "Type",
            dataIndex: "type",
            key: "type",
            render: (type: string) => renderTypeTag(type),
        },
        {
            title: "Priority",
            dataIndex: "priority",
            key: "priority",
            render: (priority: string) => renderPriorityTag(priority),
        },
        {
            title: "Time",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (date: string) => <Text>{dayjs(date).fromNow()}</Text>,
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: any, record: any) => (
                <Space>
                    {!record.read && (
                        <Tooltip title="Mark as Read">
                            <Button
                                icon={<CheckCircleOutlined />}
                                type="text"
                                onClick={() => handleMarkAsRead(record._id)}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title="Delete">
                        <Button
                            icon={<DeleteOutlined />}
                            type="text"
                            danger
                            onClick={() => handleDeleteNotification(record._id)}
                        />
                    </Tooltip>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: "details",
                                    label: "View Details",
                                },
                                {
                                    key: "mark",
                                    label: "Mark as Read",
                                    disabled: record.read,
                                },
                                {
                                    key: "delete",
                                    label: "Delete",
                                    danger: true,
                                },
                            ],
                            onClick: ({ key }) => {
                                if (key === "mark") {
                                    handleMarkAsRead(record._id);
                                } else if (key === "delete") {
                                    handleDeleteNotification(record._id);
                                } else if (key === "details") {
                                    handleViewDetails(record);
                                }
                            },
                        }}
                    >
                        <Button icon={<EllipsisOutlined />} type="text" />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                <Col>
                    <Title level={4}>
                        <BellOutlined /> Notifications
                    </Title>
                </Col>
                <Col>
                    <Space>
                        <Dropdown menu={typeFilterMenu}>
                            <Button icon={<FilterOutlined />}>
                                Type {filterType ? `: ${filterType.replace(/_/g, " ")}` : ""}
                            </Button>
                        </Dropdown>
                        <Dropdown menu={priorityFilterMenu}>
                            <Button icon={<FilterOutlined />}>
                                Priority {filterPriority ? `: ${filterPriority}` : ""}
                            </Button>
                        </Dropdown>
                        {(filterType || filterPriority) && (
                            <Button icon={<ReloadOutlined />} onClick={resetFilters}>
                                Reset Filters
                            </Button>
                        )}
                        <Button
                            type="primary"
                            onClick={handleMarkAllAsRead}
                            disabled={!(currentData?.data || []).some((n: any) => !n.read)}
                        >
                            Mark All as Read
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Tabs activeKey={activeTab} onChange={handleTabChange}>
                <TabPane
                    tab={
                        <Badge
                            count={myNotifications?.unreadCount || 0}
                            size="small"
                            offset={[5, -3]}
                            style={{ backgroundColor: myNotifications?.unreadCount ? "#ff4d4f" : "#52c41a" }}
                        >
                            <span>My Notifications</span>
                        </Badge>
                    }
                    key="my"
                />
                <TabPane
                    tab={
                        <span>System Notifications</span>
                    }
                    key="system"
                />
            </Tabs>

            <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={currentData?.data || []}
                rowKey="_id"
                loading={isLoading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: currentData?.pagination?.total || 0,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} notifications`,
                }}
                onChange={handleTableChange}
                rowClassName={(record) => (!record.read ? "unread-row" : "")}
            />

            <style jsx>{`
        .unread-row {
          background-color: rgba(24, 144, 255, 0.05);
        }
      `}</style>

            {/* Notification Details Drawer */}
            <Drawer
                title="Notification Details"
                placement="right"
                onClose={handleCloseDetails}
                open={detailsVisible}
                width={500}
            >
                {selectedNotification && (
                    <div>
                        <Title level={4}>{selectedNotification.title}</Title>
                        <div style={{ marginBottom: 16 }}>
                            <Space>
                                {renderTypeTag(selectedNotification.type)}
                                {renderPriorityTag(selectedNotification.priority)}
                                <Text type="secondary">
                                    {dayjs(selectedNotification.createdAt).format('MMMM D, YYYY h:mm A')}
                                </Text>
                            </Space>
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <Text>{selectedNotification.message}</Text>
                        </div>
                        {selectedNotification.additionalInfo && (
                            <div style={{ marginBottom: 16 }}>
                                <Title level={5}>Additional Information</Title>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
                                    {JSON.stringify(selectedNotification.additionalInfo, null, 2)}
                                </pre>
                            </div>
                        )}
                        <Space>
                            {!selectedNotification.read && (
                                <Button type="primary" onClick={() => handleMarkAsRead(selectedNotification._id)}>
                                    Mark as Read
                                </Button>
                            )}
                            <Button danger onClick={() => {
                                handleDeleteNotification(selectedNotification._id);
                                handleCloseDetails();
                            }}>
                                Delete
                            </Button>
                        </Space>
                    </div>
                )}
            </Drawer>
        </Card>
    );
};

export default NotificationsPageOld;