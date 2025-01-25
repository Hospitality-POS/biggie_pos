import React, { useState } from 'react';
import { Row, Col, Typography, Button, Form, Input, Space, Result } from 'antd';
import {
    ClockCircleOutlined,
    UserOutlined
} from '@ant-design/icons';

import { staffClockInOut } from "@services/customers";
import { ProCard } from '@ant-design/pro-components';

const StaffClockTracker = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [clockStatus, setClockStatus] = useState(null);

    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;

    const clientName = tenant ? tenant.name : "Relia";

    const params = new URLSearchParams(window.location.search);
    const tenantId = params.get("tenant_id");
    const shopId = params.get("shop_id");


    const handleStaffClockInOut = async (values) => {
        setLoading(true);
        try {
            const { staffPin } = values;

            const payload = {
                pin: staffPin,
                tenant_id: tenantId,
                shop_id: shopId
            };

            const response = await staffClockInOut(payload);


            console.log('clock in status', response.status);
            const isClockIn = response && (response.status === 200 ? true : (response.status === 201 ? false : undefined));


            setClockStatus({
                isClockIn,
                timestamp: new Date().toLocaleString(),
                staffName: response.data.staffClockRecord.staff_id.username
            });

        } catch (error) {
            console.error("Clock in/out failed", error);
        } finally {
            setLoading(false);
        }
    };


    const resetState = () => {
        setClockStatus(null);
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
                        xs={24}
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
                            borderRadius: {
                                xs: "8px",
                                md: "8px 0 0 8px"
                            }
                        }}
                    >
                        <RetailBackground />
                        <div
                            style={{
                                position: "relative",
                                zIndex: 1,
                                textAlign: "center",
                                background: "rgba(255, 255, 255, 0.1)",
                                padding: {
                                    xs: "1rem",
                                    md: "2rem"
                                },
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
                                    fontSize: {
                                        xs: "22px",
                                        md: "28px"
                                    },
                                    marginBottom: "1rem",
                                    fontWeight: "600",
                                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                }}
                            >
                                Staff Clock In/Out
                            </h2>
                            <p
                                style={{
                                    color: "rgba(255, 255, 255, 0.9)",
                                    textAlign: "center",
                                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                    lineHeight: "1.6",
                                    fontSize: {
                                        xs: "14px",
                                        md: "16px"
                                    },
                                    maxWidth: "280px",
                                    margin: "0 auto",
                                }}
                            >
                                Use your 4-digit PIN to clock in and out.
                            </p>
                        </div>
                    </Col>
                    <Col
                        xs={24}
                        md={12}
                        style={{
                            padding: {
                                xs: "1rem",
                                md: "2rem"
                            },
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
                            {clockStatus ? (
                                <Result
                                    status="success"
                                    title={`${clockStatus.isClockIn ? 'Clocked In' : 'Clocked Out'} Successfully`}
                                    subTitle={`${clockStatus.staffName} - ${clockStatus.timestamp}`}
                                    extra={
                                        <Button type="primary" onClick={resetState}>
                                            Clock {clockStatus.isClockIn ? 'Out' : 'In'}
                                        </Button>
                                    }
                                />
                            ) : (
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={handleStaffClockInOut}
                                    style={{ width: '100%' }}
                                >
                                    <Form.Item
                                        name="staffPin"
                                        label="Staff PIN"
                                        rules={[
                                            { required: true, message: 'Please enter your 4-digit PIN' },
                                            { pattern: /^\d{4}$/, message: 'PIN must be exactly 4 digits' }
                                        ]}
                                    >
                                        <Input
                                            prefix={<UserOutlined />}
                                            placeholder="Enter 4-digit PIN"
                                            maxLength={4}
                                        />
                                    </Form.Item>

                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        block
                                        icon={<ClockCircleOutlined />}
                                        loading={loading}
                                    >
                                        Clock In/Out
                                    </Button>
                                </Form>
                            )}
                        </div>
                    </Col>
                </Row>
            </ProCard>
        </div>
    );
};

export default StaffClockTracker;