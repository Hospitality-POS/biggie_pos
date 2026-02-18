import React, { useState, useEffect } from "react";
import {
    Modal,
    Form,
    Input,
    Button,
    Space,
    message,
    Row,
    Col,
} from "antd";
import {
    UserOutlined,
    MailOutlined,
    SaveOutlined,
    UserAddOutlined,
    EditOutlined,
    EnvironmentOutlined,
    IdcardOutlined,
} from "@ant-design/icons";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { addNewCustomer, updateCustomer } from "@services/customers";

interface AddCustomerModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    customer?: any; // ✅ For edit mode
    mode?: 'add' | 'edit'; // ✅ Modal mode
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
    visible,
    onClose,
    onSuccess,
    customer,
    mode = 'add',
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // ✅ Pre-fill form when editing
    useEffect(() => {
        if (visible && mode === 'edit' && customer) {
            // ✅ Format phone number as object for PhoneInput component
            // The PhoneInput expects an object with { code, phone, short } structure
            let phoneValue;

            if (customer.phone) {
                const phoneStr = String(customer.phone);
                // Check if phone starts with country code
                if (phoneStr.startsWith('254')) {
                    // Kenyan number with country code
                    phoneValue = {
                        code: 254,
                        phone: phoneStr.substring(3), // Remove country code
                        short: 'KE'
                    };
                } else if (phoneStr.startsWith('+254')) {
                    phoneValue = {
                        code: 254,
                        phone: phoneStr.substring(4),
                        short: 'KE'
                    };
                } else {
                    // Local number without country code
                    phoneValue = {
                        code: 254,
                        phone: phoneStr,
                        short: 'KE'
                    };
                }
            } else {
                phoneValue = undefined;
            }

            form.setFieldsValue({
                customer_name: customer.customer_name,
                email: customer.email || '',
                phoneNumber: phoneValue,
                location: customer.location || '',
                kra_pin: customer.kra_pin || '',
            });
        } else if (visible && mode === 'add') {
            form.resetFields();
        }
    }, [visible, mode, customer, form]);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const { customer_name, email, phoneNumber, location, kra_pin } = values;
            const phone = getPhoneNumber(phoneNumber);

            const payload = {
                customer_name,
                ...(email && { email }),
                phone,
                ...(location && { location }),
                ...(kra_pin && { kra_pin }),
            };

            let response;

            if (mode === 'edit' && customer?._id) {
                // ✅ Update existing customer
                response = await updateCustomer(customer._id, payload);
            } else {
                // ✅ Add new customer
                response = await addNewCustomer(payload);
            }

            if (response?.status === 200 || response?.status === 201) {
                message.success(
                    mode === 'edit'
                        ? "Customer updated successfully!"
                        : "Customer added successfully!"
                );
                form.resetFields();
                onClose();
                onSuccess?.();
            }
        } catch (error: any) {
            console.error(`Error ${mode === 'edit' ? 'updating' : 'adding'} customer:`, error);
            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                `Failed to ${mode === 'edit' ? 'update' : 'add'} customer`;
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (!loading) {
            form.resetFields();
            onClose();
        }
    };

    return (
        <Modal
            title={
                <Space>
                    {mode === 'edit' ? (
                        <>
                            <EditOutlined style={{ color: "#1890ff" }} />
                            <span>Edit Customer</span>
                        </>
                    ) : (
                        <>
                            <UserAddOutlined style={{ color: "#1890ff" }} />
                            <span>Add New Customer </span>
                        </>
                    )}
                </Space>
            }
            open={visible}
            onCancel={handleCancel}
            footer={null}
            width={600}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                size="large"
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="customer_name"
                    label="Customer Name"
                    rules={[
                        { required: true, message: "Please enter customer name" },
                        { min: 2, message: "Name must be at least 2 characters" },
                    ]}
                >
                    <Input
                        prefix={<UserOutlined />}
                        placeholder="Enter customer full name"
                        autoFocus
                    />
                </Form.Item>

                <PhoneInput
                    label="Phone Number"
                    owner="phoneNumber"
                    rules={[
                        { required: true, message: "Please enter phone number" },
                    ]}
                />

                <Form.Item
                    name="email"
                    label="Email Address (Optional)"
                    rules={[
                        { type: "email", message: "Please enter a valid email" },
                    ]}
                >
                    <Input
                        prefix={<MailOutlined />}
                        placeholder="customer@example.com (optional)"
                        type="email"
                    />
                </Form.Item>

                <Form.Item
                    name="location"
                    label="Location (Optional)"
                >
                    <Input
                        prefix={<EnvironmentOutlined />}
                        placeholder="e.g. Nairobi, Westlands (optional)"
                    />
                </Form.Item>

                <Form.Item
                    name="kra_pin"
                    label="KRA PIN (Optional)"
                    rules={[
                        {
                            pattern: /^[A-Z]\d{9}[A-Z]$/,
                            message: "Invalid KRA PIN format. Expected format: A123456789Z",
                        },
                    ]}
                >
                    <Input
                        prefix={<IdcardOutlined />}
                        placeholder="e.g. A123456789Z (optional)"
                        style={{ textTransform: "uppercase" }}
                        onChange={(e) => {
                            form.setFieldsValue({ kra_pin: e.target.value.toUpperCase() });
                        }}
                    />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Button
                                block
                                size="large"
                                onClick={handleCancel}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                        </Col>
                        <Col span={12}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                size="large"
                                icon={<SaveOutlined />}
                                loading={loading}
                            >
                                {mode === 'edit' ? 'Update Customer' : 'Add Customer'}
                            </Button>
                        </Col>
                    </Row>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddCustomerModal;