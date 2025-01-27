import React from 'react';
import { ProDescriptions } from '@ant-design/pro-components';
import { Typography, List, Card, Tag, Space } from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';

interface Visit {
    _id: string;
    createdAt: string;
}

interface CustomerDetailsInterface {
    created_by: {
        username: string;
    };
    visits: Visit[];
}

interface ExpandedRowContentProps {
    record: CustomerDetailsInterface;
}

const ExpandedRowContent: React.FC<ExpandedRowContentProps> = ({ record }) => {
    const { created_by, visits } = record;

    const formatTimeDisplay = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            time: date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    };

    const customerInfo = [
        {
            title: "Created by",
            dataIndex: ["created_by", "username"],
            value: created_by?.username,
        },
    ];

    return (
        <div className="p-4">
            <ProDescriptions
                size="small"
                tooltip="Contains more information about the customer"
                layout="horizontal"
                title="Customer Information"
                dataSource={{
                    created_by,
                }}
                columns={customerInfo}
            />

            <Card
                title={
                    <Typography.Title level={5} className="m-0">
                        Visit History
                    </Typography.Title>
                }
                className="mt-4"
            >
                <List
                    size="small"
                    dataSource={visits}
                    renderItem={(visit: Visit) => {
                        const { date, time } = formatTimeDisplay(visit.createdAt);

                        return (
                            <List.Item
                                key={visit._id}
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-2"
                            >
                                <Space direction="vertical" size="small">
                                    <div className="flex items-center gap-2">
                                        <CalendarOutlined className="text-blue-500" />
                                        <span className="font-medium">{date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ClockCircleOutlined className="text-green-500" />
                                        <span>Time: {time}</span>
                                    </div>
                                </Space>
                            </List.Item>
                        );
                    }}
                    locale={{ emptyText: 'No visits recorded' }}
                />
            </Card>
        </div>
    );
};

export default ExpandedRowContent;