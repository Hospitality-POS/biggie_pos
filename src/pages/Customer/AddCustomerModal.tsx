import React, { useState } from "react";
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
    PhoneOutlined,
    SaveOutlined,
    UserAddOutlined, // ✅ ADD THIS IMPORT
} from "@ant-design/icons";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
import { addNewCustomer } from "@services/customers";

interface AddCustomerModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
    visible,
    onClose,
    onSuccess,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const { customer_name, email, phoneNumber } = values;
            const phone = getPhoneNumber(phoneNumber);

            const payload = {
                customer_name,
                email,
                phone,
            };

            const response = await addNewCustomer(payload);

            if (response?.status === 201) {
                message.success("Customer added successfully!");
                form.resetFields();
                onClose();
                onSuccess?.();
            }
        } catch (error: any) {
            console.error("Error adding customer:", error);
            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                "Failed to add customer";
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
                    <UserAddOutlined style={{ color: "#1890ff" }} />
                    <span>Add New Customer</span>
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
                    label="Email Address"
                    rules={[
                        { required: true, message: "Please enter email address" },
                        { type: "email", message: "Please enter a valid email" },
                    ]}
                >
                    <Input
                        prefix={<MailOutlined />}
                        placeholder="customer@example.com"
                        type="email"
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
                                Add Customer
                            </Button>
                        </Col>
                    </Row>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddCustomerModal;