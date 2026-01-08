import React, { useState } from 'react';
import {
    Modal,
    Form,
    Button,
    Space,
    Typography,
    Descriptions,
    message,
    Select,
    InputNumber,
    Divider,
    Tag,
    Avatar,
} from 'antd';
import {
    UserOutlined,
    CreditCardOutlined,
    DollarOutlined,
    CheckCircleOutlined,
    PhoneOutlined,
    MailOutlined,
} from '@ant-design/icons';
import { Package, purchaseSubscription } from '@services/subscription';
import { fetchAllCustomers } from '@services/customers';
import { useQuery } from '@tanstack/react-query';

const { Text, Title } = Typography;
const { Option } = Select;

interface PurchasePackageModalProps {
    visible: boolean;
    package: Package | null;
    onClose: () => void;
    onSuccess: () => void;
}

const PurchasePackageModal: React.FC<PurchasePackageModalProps> = ({
    visible,
    package: pkg,
    onClose,
    onSuccess,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: customersData, isLoading: customersLoading } = useQuery({
        queryKey: ['customers-for-package'],
        queryFn: () => fetchAllCustomers({}),
        enabled: visible,
    });

    const customers = customersData || [];

    const filteredCustomers = customers.filter(customer =>
        customer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (values: any) => {
        if (!pkg) return;

        setLoading(true);
        try {
            await purchaseSubscription({
                customer_id: values.customer_id,
                package_id: pkg._id,
                payment_method_id: values.payment_method_id,
                payment_amount: values.payment_amount || pkg.price,
            });

            message.success('Package purchased successfully!');
            form.resetFields();
            setSearchTerm('');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error purchasing package:', error);
            message.error(error.message || 'Failed to purchase package');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (!loading) {
            form.resetFields();
            setSearchTerm('');
            onClose();
        }
    };

    if (!pkg) return null;

    return (
        <Modal
            title={
                <Space>
                    <CreditCardOutlined style={{ color: '#6C1C2C', fontSize: '20px' }} />
                    <span style={{ fontSize: '18px', fontWeight: 600 }}>Purchase Package</span>
                </Space>
            }
            open={visible}
            onCancel={handleCancel}
            footer={null}
            width={750}
            destroyOnClose
            centered
        >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                    <Title level={5} style={{ marginBottom: 16, marginTop: 8 }}>Package Details</Title>
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="Package Name" span={2}>
                            <Text strong style={{ fontSize: '15px' }}>{pkg.name}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Code">
                            <Text copyable>{pkg.code}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Price">
                            <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                                KES {pkg.price.toLocaleString()}
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Total Visits">
                            <Tag color="blue" icon={<CheckCircleOutlined />}>
                                {pkg.total_visits} visits
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Price per Visit">
                            <Text strong>
                                KES {(pkg.price / pkg.total_visits).toFixed(0)}
                            </Text>
                        </Descriptions.Item>
                        {pkg.validity_days && (
                            <Descriptions.Item label="Validity" span={2}>
                                <Text>{pkg.validity_days} days from purchase</Text>
                            </Descriptions.Item>
                        )}
                        {pkg.desc && (
                            <Descriptions.Item label="Description" span={2}>
                                {pkg.desc}
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{
                        payment_amount: pkg.price,
                    }}
                >
                    <Form.Item
                        name="customer_id"
                        label={<Text strong style={{ fontSize: '14px' }}>Select Customer</Text>}
                        rules={[
                            { required: true, message: 'Please select a customer' },
                        ]}
                        style={{ marginBottom: 20 }}
                    >
                        <Select
                            showSearch
                            placeholder="Search by name, phone, or email..."
                            loading={customersLoading}
                            filterOption={false}
                            onSearch={setSearchTerm}
                            notFoundContent={
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <UserOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '8px' }} />
                                    <div style={{ color: '#999' }}>
                                        {searchTerm ? 'No customers found' : 'Start typing to search customers'}
                                    </div>
                                </div>
                            }
                            size="large"
                            style={{ width: '100%' }}
                            dropdownStyle={{ padding: '8px' }}
                        >
                            {filteredCustomers.map((customer) => (
                                <Option
                                    key={customer._id}
                                    value={customer._id}
                                    label={
                                        <Space>
                                            <Avatar
                                                size="small"
                                                icon={<UserOutlined />}
                                                style={{ backgroundColor: '#6C1C2C' }}
                                            />
                                            <span>{customer.customer_name}</span>
                                        </Space>
                                    }
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '8px 4px',
                                        gap: '12px'
                                    }}>
                                        <Avatar
                                            icon={<UserOutlined />}
                                            style={{
                                                backgroundColor: '#6C1C2C',
                                                flexShrink: 0
                                            }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: 600,
                                                fontSize: '14px',
                                                color: '#262626',
                                                marginBottom: '4px'
                                            }}>
                                                {customer.customer_name}
                                            </div>
                                            <Space size={12} style={{ fontSize: '12px', color: '#8c8c8c' }} wrap>
                                                {customer.phone && (
                                                    <span>
                                                        <PhoneOutlined style={{ marginRight: '4px' }} />
                                                        {customer.phone}
                                                    </span>
                                                )}
                                                {customer.email && (
                                                    <span>
                                                        <MailOutlined style={{ marginRight: '4px' }} />
                                                        {customer.email}
                                                    </span>
                                                )}
                                            </Space>
                                        </div>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="payment_method_id"
                        label={<Text strong style={{ fontSize: '14px' }}>Payment Method</Text>}
                        rules={[
                            { required: true, message: 'Please select payment method' },
                        ]}
                        style={{ marginBottom: 20 }}
                    >
                        <Select
                            placeholder="Select payment method"
                            size="large"
                            style={{ width: '100%' }}
                        >
                            <Option value="cash">
                                <Space>
                                    <DollarOutlined />
                                    <span>Cash</span>
                                </Space>
                            </Option>
                            <Option value="mpesa">
                                <Space>
                                    <PhoneOutlined />
                                    <span>M-Pesa</span>
                                </Space>
                            </Option>
                            <Option value="card">
                                <Space>
                                    <CreditCardOutlined />
                                    <span>Card</span>
                                </Space>
                            </Option>
                            <Option value="bank_transfer">
                                <Space>
                                    <CreditCardOutlined />
                                    <span>Bank Transfer</span>
                                </Space>
                            </Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="payment_amount"
                        label={<Text strong style={{ fontSize: '14px' }}>Payment Amount</Text>}
                        rules={[
                            { required: true, message: 'Please enter payment amount' },
                        ]}
                        style={{ marginBottom: 32 }}
                    >
                        <InputNumber
                            prefix={<DollarOutlined style={{ color: '#8c8c8c' }} />}
                            placeholder="Enter amount"
                            min={0}
                            max={pkg.price}
                            style={{ width: '100%' }}
                            size="large"
                            formatter={(value) =>
                                `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                            }
                            parser={(value) =>
                                value?.replace(/KES\s?|(,*)/g, '') as any
                            }
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button
                                size="large"
                                onClick={handleCancel}
                                disabled={loading}
                                style={{ minWidth: '100px' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                icon={<CheckCircleOutlined />}
                                loading={loading}
                                style={{
                                    backgroundColor: '#6C1C2C',
                                    borderColor: '#6C1C2C',
                                    minWidth: '180px'
                                }}
                            >
                                Complete Purchase
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Space>
        </Modal>
    );
};

export default PurchasePackageModal;