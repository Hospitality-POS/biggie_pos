import React, { useState } from 'react';
import { Row, Col, Typography, Button, Form, Input, Space, Card, Result } from 'antd';
import {
    SaveOutlined,
    QrcodeOutlined,
    UserAddOutlined,
    MailOutlined
} from '@ant-design/icons';

import { logCustomerVisit, addNewCustomer } from "@services/customers";
import { useNavigate } from 'react-router-dom';
import { ProCard } from '@ant-design/pro-components';

const { Title } = Typography;

const CustomerVisitTracker = () => {
    const [form] = Form.useForm();
    const [customerDetails, setCustomerDetails] = useState(null);
    const [registrationMode, setRegistrationMode] = useState(false);
    const [visitCompleted, setVisitCompleted] = useState(false);

    const handleCustomerRegistration = async (values) => {
        const { email, name, phone } = values;

        const payload = {
            email,
            phone,
            customer_name: name,
        };
        const response = await addNewCustomer(payload);
        if (response && response.status === 201) {
            setVisitCompleted(true);
        }
    };

    const handleVisitLog = async (values) => {
        const { customerCode } = values;

        const payload = {
            customerCode: customerCode,
        };
        const resp = await logCustomerVisit(payload);
        if (resp && resp.status === 200) {
            setVisitCompleted(true);
        }
    };

    const resetState = () => {
        setCustomerDetails(null);
        setRegistrationMode(false);
        setVisitCompleted(false);
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
                        xs={24}
                        md={12}
                        style={{
                            background: "linear-gradient(135deg, #2c3e50 0%, #6c1c2c 100%)",
                            padding: "2rem",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: "500px",
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: "8px 0 0 8px",
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
                                    padding: "1.5rem",
                                    marginBottom: "1.5rem",
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
                            padding: "2rem",
                            display: "flex",
                            justifyContent: "center", // Center content horizontally
                            alignItems: "center",      // Center content vertically
                            minHeight: "500px",        // Ensures the column takes full height
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
                                    title="Thank You for Visiting!"
                                    subTitle="We hope you enjoyed your experience. Come again next time!"
                                    extra={
                                        <Button type="primary" onClick={resetState}>
                                            Log Another Visit
                                        </Button>
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

                                    <Space>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            icon={<SaveOutlined />}
                                        >
                                            Register
                                        </Button>
                                        <Button onClick={() => setRegistrationMode(false)}>
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

                                    <Space>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            icon={<QrcodeOutlined />}
                                        >
                                            Log Visit
                                        </Button>
                                        <Button
                                            type="default"
                                            icon={<UserAddOutlined />}
                                            onClick={() => setRegistrationMode(true)}
                                        >
                                            No Code? Register
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
