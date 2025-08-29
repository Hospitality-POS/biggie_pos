import { ArrowLeftOutlined, MailOutlined, DeleteOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { getPrimaryColor } from '@utils/getPrimaryColor';
import { Flex, Button, Space, Typography, Tag, Popconfirm } from 'antd';
import moment from 'moment';
import React from 'react'
import { useNotificationMutations } from '../Hooks/NotificationsCustomHook';

interface INotificationDetailViewProps {
    record: any;
    setShowDetails: any;
}

const NotificationDetailView: React.FC<INotificationDetailViewProps> = ({ record, setShowDetails }) => {
    const selectedNotification = record;
    const primaryColor = getPrimaryColor();
    const { deleteNotificationMutation, markAsReadMutation } = useNotificationMutations();

    const handleBackToList = () => {
        setShowDetails(false);
    };

    const handleDelete = () => {
        deleteNotificationMutation.mutate(selectedNotification?._id);
        handleBackToList();
    };

    return (
        <ProCard>
            {/* Header with back button */}
            <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBackToList}
                    type="text"
                >
                    Back to All Notifications
                </Button>
                <Space>
                    {!selectedNotification.read ? (
                        <Button
                            type="default"
                            icon={<MailOutlined />}
                        // onClick={() => handleMarkAsRead(selectedNotification._id)}
                        >
                            Mark as Read
                        </Button>
                    ) : (
                        <Button
                            type="default"
                            icon={<MailOutlined />}
                        // onClick={() => handleMarkAsUnread(selectedNotification._id)}
                        >
                            Mark as Unread
                        </Button>
                    )}

                    <Popconfirm
                        title="Are you sure you want to delete this notification?"
                        onConfirm={() => handleDelete()}
                        okText="Yes"
                        cancelText="No"
                    >
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                    >
                        Delete
                    </Button>
                    </Popconfirm>
                </Space>
            </Flex>

            {/* Notification Details Card */}
            <div style={{
                backgroundColor: 'white',
                border: '1px solid #e8e8e8',
                borderRadius: '8px',
                padding: '0',
                overflow: 'hidden'
            }}>
                {/* Header Section - Gmail style */}
                <div style={{
                    padding: '20px 24px 16px 24px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: '#fafafa'
                }}>
                    <Flex align="flex-start" gap={16}>
                        {/* Read/Unread Indicator */}
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: selectedNotification.read ? '#f5f5f5' : primaryColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                        }}>
                            <MailOutlined style={{
                                color: selectedNotification.read ? '#8c8c8c' : 'white',
                                fontSize: '16px'
                            }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Subject Line */}
                            <Typography.Title
                                level={4}
                                style={{
                                    margin: '0 0 8px 0',
                                    fontWeight: selectedNotification.read ? '400' : '600',
                                    color: selectedNotification.read ? '#5f6368' : '#202124',
                                    lineHeight: '1.3'
                                }}
                            >
                                {selectedNotification.title}
                            </Typography.Title>

                            {/* Sender and Time Info */}
                            <Flex align="center" gap={12} style={{ marginBottom: '12px' }}>
                                <Typography.Text style={{
                                    color: '#5f6368',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}>
                                    System Notification
                                </Typography.Text>
                                <Typography.Text style={{
                                    color: '#5f6368',
                                    fontSize: '14px'
                                }}>
                                    &lt;{selectedNotification.recipient.email}&gt;
                                </Typography.Text>
                                <Typography.Text style={{
                                    color: '#5f6368',
                                    fontSize: '13px',
                                    marginLeft: 'auto'
                                }}>
                                    {moment(selectedNotification.createdAt).format('MMM D, YYYY, h:mm A')}
                                </Typography.Text>
                            </Flex>

                            {/* Priority and Status Tags */}
                            <Flex gap={8} wrap="wrap">
                                <Tag
                                    color={
                                        selectedNotification.priority === "high" ? "red" :
                                            selectedNotification.priority === "medium" ? "orange" : "green"
                                    }
                                    style={{
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        padding: '2px 8px'
                                    }}
                                >
                                    {selectedNotification.priority.charAt(0).toUpperCase() + selectedNotification.priority.slice(1)} Priority
                                </Tag>
                                <Tag
                                    color={selectedNotification.read ? "default" : "processing"}
                                    style={{
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        padding: '2px 8px'
                                    }}
                                >
                                    {selectedNotification.read ? "Read" : "Unread"}
                                </Tag>
                                <Tag
                                    color="default"
                                    style={{
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        padding: '2px 8px'
                                    }}
                                >
                                    {selectedNotification.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Tag>
                            </Flex>
                        </div>
                    </Flex>
                </div>

                {/* Message Body - Gmail style */}
                <div style={{ padding: '24px' }}>
                    <Typography.Paragraph style={{
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: '#202124',
                        margin: '0 0 24px 0',
                        fontFamily: '"Google Sans", Roboto, Arial, sans-serif'
                    }}>
                        {selectedNotification.message}
                    </Typography.Paragraph>

                    {/* Additional Details in a subtle way */}
                    <div style={{
                        padding: '16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e8eaed'
                    }}>
                        <Typography.Text strong style={{
                            color: '#5f6368',
                            fontSize: '13px',
                            display: 'block',
                            marginBottom: '8px'
                        }}>
                            NOTIFICATION DETAILS
                        </Typography.Text>

                        <Space direction="vertical">
                            <Flex justify="space-between">
                                <Typography.Text style={{ color: '#5f6368', fontSize: '13px' }}>
                                    Notification Code:
                                </Typography.Text>
                                <Typography.Text code style={{ fontSize: '13px' }}>
                                    {selectedNotification.code?.toUpperCase()}
                                </Typography.Text>
                            </Flex>

                            {selectedNotification.readAt && (
                                <Flex justify="space-between" gap={8}>
                                    <Typography.Text style={{ color: '#5f6368', fontSize: '13px' }}>
                                        Read at:
                                    </Typography.Text>
                                    <Typography.Text style={{ fontSize: '13px' }}>
                                        {moment(selectedNotification.readAt).format('MMM D, YYYY [at] h:mm A')}
                                    </Typography.Text>
                                </Flex>
                            )}

                            <Flex justify="space-between">
                                <Typography.Text style={{ color: '#5f6368', fontSize: '13px' }}>
                                    Expires:
                                </Typography.Text>
                                <Typography.Text style={{ fontSize: '13px' }}>
                                    {moment(selectedNotification.expiresAt).format('MMM D, YYYY [at] h:mm A')}
                                </Typography.Text>
                            </Flex>
                        </Space>
                    </div>
                </div>
            </div>
        </ProCard>
    );
}

export default NotificationDetailView