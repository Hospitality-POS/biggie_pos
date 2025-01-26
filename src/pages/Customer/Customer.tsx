import React, { useState } from 'react';
import { Row, Col, Typography, Button, Form, Input, Space, Result, message } from 'antd';
import {
    SaveOutlined,
    QrcodeOutlined,
    UserAddOutlined,
    MailOutlined,
    CopyOutlined
} from '@ant-design/icons';

import { logCustomerVisit, addNewCustomer } from "@services/customers";
import { ProCard } from '@ant-design/pro-components';

const CustomerVisitTracker = () => {
    const [form] = Form.useForm();
    const [customerDetails, setCustomerDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [registrationMode, setRegistrationMode] = useState(false);
    const [visitCompleted, setVisitCompleted] = useState(false);
    const [generatedCode, setGeneratedCode] = useState(null);
    const [visitType, setVisitType] = useState(null);

    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;

    const clientName = tenant ? tenant.name : "Relia";

    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get("tenant_id");
    const shopId = params.get("shop_id");

    const handleCustomerRegistration = async (values) => {
        setLoading(true);
        const { email, name, phone } = values;

        const payload = {
            email,
            phone,
            customer_name: name,
            tenant_id: tenantId,
            shop_id: shopId
        };
        const response = await addNewCustomer(payload);
        if (response && response.status === 201) {
            const customerCode = response.data.customer.code;
            setGeneratedCode(customerCode);
            setVisitType('registration');
            setVisitCompleted(true);
        }
        setLoading(false);
    };

    const handleVisitLog = async (values) => {
        setLoading(true);
        const { customerCode } = values;

        const payload = {
            customerCode: customerCode,
            tenant_id: tenantId,
            shop_id: shopId
        };
        const resp = await logCustomerVisit(payload);
        if (resp && resp.status === 200) {
            setVisitType('visit');
            setVisitCompleted(true);
        }
        setLoading(false);
    };

    const copyCodeToClipboard = () => {
        if (generatedCode) {
            navigator.clipboard.writeText(generatedCode).then(() => {
                message.success('Customer code copied to clipboard');
            }).catch(err => {
                message.error('Failed to copy customer code');
            });
        }
    };

    const resetState = () => {
        setCustomerDetails(null);
        setRegistrationMode(false);
        setVisitCompleted(false);
        setGeneratedCode(null);
        setVisitType(null);
        form.resetFields();
    };

    const RetailBackground = () => (
        <svg
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0.08,
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
        >
            <defs>
                <pattern
                    id="retail-grid"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke="white"
                        strokeWidth="0.5"
                    />
                    <path d="M 10 5 L 15 5 L 15 8 L 12.5 10 L 10 8 Z" fill="white" />
                    <path
                        d="M 5 15 C 5 15 6 12 8 12 C 10 12 10 15 10 15"
                        fill="none"
                        stroke="white"
                        strokeWidth="0.5"
                    />
                </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#retail-grid)" />
        </svg>
    );

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundImage: "url(/try.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                padding: "1rem"
            }}
        >
            <ProCard
                boxShadow
                style={{
                    maxWidth: "1000px",
                    width: "100%",
                    padding: 0,
                    borderRadius: "8px",
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Row>
                    <Col
                        xs={0}
                        md={12}
                        style={{
                            background: "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)",
                            padding: "1rem",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: "500px",
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: "8px 0 0 8px"
                        }}
                    >
                        <RetailBackground />
                        <div
                            style={{
                                position: "relative",
                                zIndex: 1,
                                textAlign: "center",
                                background: "rgba(255, 255, 255, 0.1)",
                                padding: "2rem",
                                borderRadius: "16px",
                                backdropFilter: "blur(10px)",
                                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                            }}
                        >
                            <div
                                style={{
                                    padding: "1rem",
                                    marginBottom: "1rem",
                                    display: "inline-block",
                                }}
                            >
                                <img
                                    src="/relia.png"
                                    alt="store-logo"
                                    width="100%"
                                    height="auto"
                                />
                            </div>
                            <h2
                                style={{
                                    color: "white",
                                    fontSize: "28px",
                                    marginBottom: "1rem",
                                    fontWeight: "600",
                                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                }}
                            >
                                Customer Experience
                            </h2>
                            <p
                                style={{
                                    color: "rgba(255, 255, 255, 0.9)",
                                    textAlign: "center",
                                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                    lineHeight: "1.6",
                                    fontSize: "16px",
                                    maxWidth: "280px",
                                    margin: "0 auto",
                                }}
                            >
                                We're committed to providing you with the best shopping experience.
                            </p>
                        </div>
                    </Col>
                    <Col
                        xs={24}
                        md={12}
                        style={{
                            padding: "1rem",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "500px",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: "360px",
                                width: "100%",
                                display: "flex",
                                justifyContent: "center",
                                flexDirection: "column",
                            }}
                        >
                            {visitCompleted ? (
                                <Result
                                    status="success"
                                    title={visitType === 'registration' ? "Registration Successful!" : "Visit Logged Successfully"}
                                    subTitle={visitType === 'registration'
                                        ? "Thank you for registering with us!"
                                        : "Thank you for visiting our shop!"
                                    }
                                    extra={
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            {generatedCode && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: '#f0f0f0',
                                                    padding: '10px',
                                                    borderRadius: '8px'
                                                }}>
                                                    <Typography.Text
                                                        strong
                                                        style={{
                                                            marginRight: '10px',
                                                            fontSize: '16px'
                                                        }}
                                                    >
                                                        {generatedCode}
                                                    </Typography.Text>
                                                    <Button
                                                        icon={<CopyOutlined />}
                                                        onClick={copyCodeToClipboard}
                                                    >
                                                        Copy
                                                    </Button>
                                                </div>
                                            )}
                                            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                                                We look forward to serving you again soon! Please visit us again and tell your friends.
                                            </Typography.Text>
                                            <Button
                                                type="primary"
                                                block
                                                onClick={resetState}
                                            >
                                                Back
                                            </Button>
                                        </Space>
                                    }
                                />
                            ) : registrationMode ? (
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={handleCustomerRegistration}
                                    style={{ width: '100%' }}
                                >
                                    <Form.Item
                                        name="name"
                                        label="Customer Name"
                                        rules={[{ required: true, message: 'Please enter customer name' }]}
                                    >
                                        <Input placeholder="Enter customer name" />
                                    </Form.Item>

                                    <Form.Item
                                        name="phone"
                                        label="Phone Number"
                                        rules={[
                                            { required: true, message: 'Please enter phone number' },
                                            { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit phone number' }
                                        ]}
                                    >
                                        <Input placeholder="Enter 10-digit phone number" />
                                    </Form.Item>

                                    <Form.Item
                                        name="email"
                                        label="Email"
                                        rules={[
                                            { required: true, message: 'Please enter email' },
                                            { type: 'email', message: 'Please enter a valid email' }
                                        ]}
                                    >
                                        <Input
                                            prefix={<MailOutlined />}
                                            placeholder="Enter your email"
                                        />
                                    </Form.Item>

                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            block
                                            disabled={loading}
                                            icon={<SaveOutlined />}
                                            loading={loading}
                                        >
                                            Get Code & Log Visit
                                        </Button>
                                        <Button
                                            block
                                            onClick={() => setRegistrationMode(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </Space>
                                </Form>
                            ) : (
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={handleVisitLog}
                                    style={{ width: '100%' }}
                                >
                                    <Form.Item
                                        name="customerCode"
                                        label="Customer Code"
                                        rules={[{ required: true, message: 'Please enter customer code' }]}
                                    >
                                        <Input placeholder="Enter customer code" />
                                    </Form.Item>

                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            block
                                            disabled={loading}
                                            icon={<QrcodeOutlined />}
                                            loading={loading}
                                        >
                                            Log Visit
                                        </Button>
                                        <Button
                                            type="default"
                                            block
                                            icon={<UserAddOutlined />}
                                            onClick={() => setRegistrationMode(true)}
                                        >
                                            No Code? Get One
                                        </Button>
                                    </Space>
                                </Form>
                            )}
                        </div>
                    </Col>
                </Row>
            </ProCard>
        </div>
    );
};

export default CustomerVisitTracker;