import React, { useState, useEffect } from "react";
import { ProTable } from "@ant-design/pro-components";
import { Tag, Rate, Space, Typography, DatePicker, Select, Tooltip } from "antd";
import { UserOutlined, StarFilled } from "@ant-design/icons";
import { fetchAllFeedback } from "@services/customers";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

interface Feedback {
    _id: string;
    customer_id?: {
        customer_name: string;
        email: string;
        phone: string;
    };
    anonymous_customer?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    shop_id?: {
        shop_name: string;
    };
    feedback_type: 'authenticated' | 'anonymous';
    rating: number;
    review?: string;
    customer_display_name: string;
    is_verified: boolean;
    visit_date: string;
    createdAt: string;
    updatedAt: string;
}

const FeedbackTable: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
    const [feedbackType, setFeedbackType] = useState<string>('all');
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);

    const fetchFeedback = async (params?: any) => {
        setLoading(true);
        try {
            const filterParams: any = {};

            if (feedbackType !== 'all') {
                filterParams.feedback_type = feedbackType;
            }

            if (dateRange) {
                filterParams.start_date = dateRange[0];
                filterParams.end_date = dateRange[1];
            }

            const response = await fetchAllFeedback(filterParams);
            setFeedbackData(response.feedback || []);
            return {
                data: response.feedback || [],
                success: true,
                total: response.count || 0,
            };
        } catch (error) {
            console.error("Error fetching feedback:", error);
            return {
                data: [],
                success: false,
                total: 0,
            };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, [feedbackType, dateRange]);

    const columns = [
        {
            title: 'Customer',
            dataIndex: 'customer_display_name',
            key: 'customer_display_name',
            width: 200,
            render: (text: string, record: Feedback) => (
                <Space direction="vertical" size={0}>
                    <Space>
                        <UserOutlined style={{ color: record.feedback_type === 'anonymous' ? '#8c8c8c' : '#1890ff' }} />
                        <Text strong>{text}</Text>
                    </Space>
                    {record.feedback_type === 'authenticated' && record.customer_id?.email && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {record.customer_id.email}
                        </Text>
                    )}
                    {record.feedback_type === 'anonymous' && record.anonymous_customer?.email && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {record.anonymous_customer.email}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'feedback_type',
            key: 'feedback_type',
            width: 120,
            render: (type: string) => (
                <Tag color={type === 'authenticated' ? 'blue' : 'default'}>
                    {type === 'authenticated' ? 'Customer' : 'Anonymous'}
                </Tag>
            ),
        },
        {
            title: 'Rating',
            dataIndex: 'rating',
            key: 'rating',
            width: 150,
            sorter: (a: Feedback, b: Feedback) => a.rating - b.rating,
            render: (rating: number) => (
                <Space>
                    <Rate disabled value={rating} style={{ fontSize: '16px' }} />
                    <Text strong style={{ color: '#faad14' }}>
                        {rating.toFixed(1)}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Review',
            dataIndex: 'review',
            key: 'review',
            ellipsis: {
                showTitle: false,
            },
            render: (review: string) => (
                review ? (
                    <Tooltip title={review} placement="topLeft">
                        <Text style={{ maxWidth: 300 }}>{review}</Text>
                    </Tooltip>
                ) : (
                    <Text type="secondary" italic>No review provided</Text>
                )
            ),
        },
        {
            title: 'Contact',
            key: 'contact',
            width: 150,
            render: (record: Feedback) => {
                const phone = record.feedback_type === 'authenticated'
                    ? record.customer_id?.phone
                    : record.anonymous_customer?.phone;

                return phone ? (
                    <Text copyable>{phone}</Text>
                ) : (
                    <Text type="secondary" italic>N/A</Text>
                );
            },
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            sorter: (a: Feedback, b: Feedback) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            render: (date: string) => (
                <Space direction="vertical" size={0}>
                    <Text>{dayjs(date).format('MMM DD, YYYY')}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(date).format('hh:mm A')}
                    </Text>
                </Space>
            ),
        },
    ];

    // Calculate average rating
    const averageRating = feedbackData.length > 0
        ? (feedbackData.reduce((sum, item) => sum + item.rating, 0) / feedbackData.length).toFixed(1)
        : '0.0';

    return (
        <ProTable<Feedback>
            columns={columns}
            dataSource={feedbackData}
            loading={loading}
            rowKey="_id"
            search={false}
            options={{
                reload: () => fetchFeedback(),
                density: true,
                fullScreen: true,
            }}
            pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} feedback entries`,
            }}
            headerTitle={
                <Space size="large">
                    <Space>
                        <StarFilled style={{ color: '#faad14', fontSize: '20px' }} />
                        <Text strong style={{ fontSize: '16px' }}>
                            Average Rating: {averageRating}
                        </Text>
                    </Space>
                    <Text type="secondary">
                        ({feedbackData.length} total reviews)
                    </Text>
                </Space>
            }
            toolbar={{
                menu: {
                    type: 'inline',
                    items: [
                        {
                            key: 'export',
                            label: 'Export',
                        },
                    ],
                },
                actions: [
                    <Select
                        key="feedbackType"
                        value={feedbackType}
                        onChange={setFeedbackType}
                        style={{ width: 150 }}
                        placeholder="Filter by type"
                    >
                        <Option value="all">All Feedback</Option>
                        <Option value="authenticated">Customers</Option>
                        <Option value="anonymous">Anonymous</Option>
                    </Select>,
                    <RangePicker
                        key="dateRange"
                        onChange={(dates) => {
                            if (dates) {
                                setDateRange([
                                    dates[0]?.format('YYYY-MM-DD') || '',
                                    dates[1]?.format('YYYY-MM-DD') || ''
                                ]);
                            } else {
                                setDateRange(null);
                            }
                        }}
                        format="YYYY-MM-DD"
                    />,
                ],
            }}
        />
    );
};

export default FeedbackTable;