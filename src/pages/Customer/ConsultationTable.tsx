import React, { useState, useEffect } from "react";
import { ProTable } from "@ant-design/pro-components";
import { Tag, Space, Typography, DatePicker, Select, Tooltip, Button, Modal, Form, Input } from "antd";
import {
    UserOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined
} from "@ant-design/icons";
import {
    fetchAllConsultations,
    updateConsultationStatus
} from "@services/consultation";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;
const { TextArea } = Input;

interface Consultation {
    _id: string;
    customer_id?: {
        customer_name: string;
        email: string;
        phone: string;
    };
    guest_customer?: {
        name: string;
        email: string;
        phone: string;
    };
    staff_id?: {
        name: string;
        email: string;
    };
    shop_id?: {
        shop_name: string;
    };
    booking_type: 'authenticated' | 'guest';
    service_type: 'facial' | 'massage' | 'wood_therapy' | 'other';
    appointment_date: string;
    start_time: string;
    end_time: string;
    duration: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    special_requests?: string;
    price?: number;
    customer_display_name: string;
    createdAt: string;
    updatedAt: string;
}

const ConsultationTable: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [consultationData, setConsultationData] = useState<Consultation[]>([]);
    const [serviceType, setServiceType] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
    const [form] = Form.useForm();

    const fetchConsultations = async () => {
        setLoading(true);
        try {
            const filterParams: any = {};

            if (serviceType !== 'all') {
                filterParams.service_type = serviceType;
            }

            if (statusFilter !== 'all') {
                filterParams.status = statusFilter;
            }

            if (dateRange) {
                filterParams.start_date = dateRange[0];
                filterParams.end_date = dateRange[1];
            }

            const response = await fetchAllConsultations(filterParams);
            setConsultationData(response.consultations || []);
        } catch (error) {
            console.error("Error fetching consultations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsultations();
    }, [serviceType, statusFilter, dateRange]);

    const handleStatusChange = (consultation: Consultation) => {
        setSelectedConsultation(consultation);
        form.setFieldsValue({
            status: consultation.status,
            notes: ''
        });
        setStatusModalVisible(true);
    };

    const handleStatusUpdate = async () => {
        try {
            const values = await form.validateFields();
            if (selectedConsultation) {
                await updateConsultationStatus(selectedConsultation._id, values);
                setStatusModalVisible(false);
                fetchConsultations();
                form.resetFields();
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'orange',
            confirmed: 'blue',
            completed: 'green',
            cancelled: 'red',
            no_show: 'default'
        };
        return colors[status] || 'default';
    };

    const getServiceTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            facial: 'purple',
            massage: 'cyan',
            wood_therapy: 'magenta',
            other: 'default'
        };
        return colors[type] || 'default';
    };

    const columns = [
        {
            title: 'Customer',
            dataIndex: 'customer_display_name',
            key: 'customer_display_name',
            width: 200,
            render: (text: string, record: Consultation) => (
                <Space direction="vertical" size={0}>
                    <Space>
                        <UserOutlined style={{ color: record.booking_type === 'guest' ? '#8c8c8c' : '#1890ff' }} />
                        <Text strong>{text}</Text>
                    </Space>
                    {record.booking_type === 'authenticated' && record.customer_id?.email && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {record.customer_id.email}
                        </Text>
                    )}
                    {record.booking_type === 'guest' && record.guest_customer?.email && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {record.guest_customer.email}
                        </Text>
                    )}
                    <Tag color={record.booking_type === 'authenticated' ? 'blue' : 'default'} style={{ fontSize: '10px' }}>
                        {record.booking_type === 'authenticated' ? 'Registered' : 'Guest'}
                    </Tag>
                </Space>
            ),
        },
        {
            title: 'Service Type',
            dataIndex: 'service_type',
            key: 'service_type',
            width: 150,
            render: (type: string) => (
                <Tag color={getServiceTypeColor(type)}>
                    {type.replace(/_/g, ' ').toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Appointment',
            key: 'appointment',
            width: 200,
            render: (record: Consultation) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{dayjs(record.appointment_date).format('MMM DD, YYYY')}</Text>
                    <Space>
                        <ClockCircleOutlined />
                        <Text type="secondary">
                            {record.start_time} - {record.end_time}
                        </Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {record.duration} minutes
                    </Text>
                </Space>
            ),
            sorter: (a: Consultation, b: Consultation) =>
                new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime(),
        },
        {
            title: 'Staff',
            dataIndex: 'staff_id',
            key: 'staff_id',
            width: 150,
            render: (staff: any) => (
                staff ? (
                    <Space direction="vertical" size={0}>
                        <Text>{staff.name}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {staff.email}
                        </Text>
                    </Space>
                ) : (
                    <Text type="secondary" italic>Not assigned</Text>
                )
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => (
                <Tag color={getStatusColor(status)} icon={
                    status === 'completed' ? <CheckCircleOutlined /> :
                        status === 'cancelled' ? <CloseCircleOutlined /> :
                            status === 'no_show' ? <ExclamationCircleOutlined /> : null
                }>
                    {status.replace(/_/g, ' ').toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Contact',
            key: 'contact',
            width: 150,
            render: (record: Consultation) => {
                const phone = record.booking_type === 'authenticated'
                    ? record.customer_id?.phone
                    : record.guest_customer?.phone;

                return phone ? (
                    <Text copyable>{phone}</Text>
                ) : (
                    <Text type="secondary" italic>N/A</Text>
                );
            },
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            width: 100,
            render: (price: number) => (
                price ? (
                    <Text strong style={{ color: '#52c41a' }}>
                        KES {price.toLocaleString()}
                    </Text>
                ) : (
                    <Text type="secondary" italic>N/A</Text>
                )
            ),
        },
        {
            title: 'Special Requests',
            dataIndex: 'special_requests',
            key: 'special_requests',
            ellipsis: {
                showTitle: false,
            },
            render: (requests: string) => (
                requests ? (
                    <Tooltip title={requests} placement="topLeft">
                        <Text style={{ maxWidth: 200 }}>{requests}</Text>
                    </Tooltip>
                ) : (
                    <Text type="secondary" italic>None</Text>
                )
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            fixed: 'right' as const,
            render: (record: Consultation) => (
                <Button
                    type="link"
                    size="small"
                    onClick={() => handleStatusChange(record)}
                >
                    Update Status
                </Button>
            ),
        },
    ];

    // Calculate statistics
    const stats = {
        total: consultationData.length,
        pending: consultationData.filter(c => c.status === 'pending').length,
        confirmed: consultationData.filter(c => c.status === 'confirmed').length,
        completed: consultationData.filter(c => c.status === 'completed').length,
        cancelled: consultationData.filter(c => c.status === 'cancelled').length,
    };

    return (
        <>
            <ProTable<Consultation>
                columns={columns}
                dataSource={consultationData}
                loading={loading}
                rowKey="_id"
                search={false}
                scroll={{ x: 1500 }}
                options={{
                    reload: () => fetchConsultations(),
                    density: true,
                    fullScreen: true,
                }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} consultations`,
                }}
                headerTitle={
                    <Space size="large">
                        <Space direction="vertical" size={0}>
                            <Text strong style={{ fontSize: '16px' }}>
                                Consultations Overview
                            </Text>
                            <Space>
                                <Tag color="orange">Pending: {stats.pending}</Tag>
                                <Tag color="blue">Confirmed: {stats.confirmed}</Tag>
                                <Tag color="green">Completed: {stats.completed}</Tag>
                                <Tag color="red">Cancelled: {stats.cancelled}</Tag>
                            </Space>
                        </Space>
                    </Space>
                }
                toolbar={{
                    actions: [
                        <Select
                            key="serviceType"
                            value={serviceType}
                            onChange={setServiceType}
                            style={{ width: 150 }}
                            placeholder="Service Type"
                        >
                            <Option value="all">All Services</Option>
                            <Option value="facial">Facial</Option>
                            <Option value="massage">Massage</Option>
                            <Option value="wood_therapy">Wood Therapy</Option>
                            <Option value="other">Other</Option>
                        </Select>,
                        <Select
                            key="status"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: 150 }}
                            placeholder="Status"
                        >
                            <Option value="all">All Status</Option>
                            <Option value="pending">Pending</Option>
                            <Option value="confirmed">Confirmed</Option>
                            <Option value="completed">Completed</Option>
                            <Option value="cancelled">Cancelled</Option>
                            <Option value="no_show">No Show</Option>
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

            <Modal
                title="Update Consultation Status"
                open={statusModalVisible}
                onOk={handleStatusUpdate}
                onCancel={() => {
                    setStatusModalVisible(false);
                    form.resetFields();
                }}
                okText="Update"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Status"
                        name="status"
                        rules={[{ required: true, message: 'Please select a status' }]}
                    >
                        <Select>
                            <Option value="pending">Pending</Option>
                            <Option value="confirmed">Confirmed</Option>
                            <Option value="completed">Completed</Option>
                            <Option value="cancelled">Cancelled</Option>
                            <Option value="no_show">No Show</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="Notes" name="notes">
                        <TextArea rows={4} placeholder="Add any notes..." />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ConsultationTable;