// pages/PaymentCallback.jsx
import React, { useEffect, useState } from 'react';
import { Card, Result, Button, Spin, Typography, Space, Tag } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import pesapalApi from '@services/pesapalApi';

const { Title, Text } = Typography;

const PaymentCallback = () => {
    const [loading, setLoading] = useState(true);
    const [paymentResult, setPaymentResult] = useState(null);

    useEffect(() => {
        const processPaymentResult = async () => {
            try {
                setLoading(true);

                // Get URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const status = urlParams.get('status');
                const ref = urlParams.get('ref');
                const trackingId = urlParams.get('tracking');
                const error = urlParams.get('error');

                if (trackingId) {
                    const tenant = JSON.parse(localStorage.getItem("tenant") || '{}');
                    const shopId = tenant?.shop_id;

                    if (shopId) {
                        try {
                            const paymentStatus = await pesapalApi.verifyPayment(shopId, trackingId);
                            setPaymentResult({
                                status: paymentStatus.isCompleted ? 'success' : 'failed',
                                message: paymentStatus.status,
                                reference: ref,
                                trackingId: trackingId
                            });
                        } catch (verifyError) {
                            setPaymentResult({
                                status: status || 'error',
                                message: error || 'Payment verification failed',
                                reference: ref
                            });
                        }
                    }
                } else {
                    setPaymentResult({
                        status: status || 'error',
                        message: error || getStatusMessage(status),
                        reference: ref
                    });
                }
            } catch (error) {
                setPaymentResult({
                    status: 'error',
                    message: 'Failed to process payment result'
                });
            } finally {
                setLoading(false);
            }
        };

        processPaymentResult();
    }, []);

    const getStatusMessage = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'success':
                return 'Payment completed successfully';
            case 'failed':
                return 'Payment failed';
            case 'cancelled':
                return 'Payment was cancelled';
            case 'pending':
                return 'Payment is being processed';
            default:
                return 'Unknown payment status';
        }
    };

    const getResultConfig = () => {
        if (!paymentResult) return null;

        switch (paymentResult.status.toLowerCase()) {
            case 'success':
            case 'completed':
                return {
                    status: 'success',
                    title: 'Payment Successful!',
                    subTitle: paymentResult.message,
                    icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
                };
            case 'failed':
                return {
                    status: 'error',
                    title: 'Payment Failed',
                    subTitle: paymentResult.message,
                    icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                };
            case 'pending':
                return {
                    status: 'info',
                    title: 'Payment Processing',
                    subTitle: paymentResult.message,
                    icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />
                };
            default:
                return {
                    status: 'warning',
                    title: 'Payment Status Unknown',
                    subTitle: paymentResult.message,
                    icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                };
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#f5f5f5'
            }}>
                <Card style={{ textAlign: 'center', minWidth: '300px' }}>
                    <Spin size="large" />
                    <Title level={4} style={{ marginTop: '16px' }}>
                        Processing Payment...
                    </Title>
                    <Text type="secondary">
                        Please wait while we verify your payment
                    </Text>
                </Card>
            </div>
        );
    }

    const resultConfig = getResultConfig();

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: '#f5f5f5',
            padding: '24px'
        }}>
            <Card style={{ maxWidth: '600px', width: '100%' }}>
                <Result
                    {...resultConfig}
                    extra={[
                        <Space key="details" direction="vertical" style={{ width: '100%' }}>
                            {paymentResult?.reference && (
                                <div>
                                    <Text strong>Reference: </Text>
                                    <Tag>{paymentResult.reference}</Tag>
                                </div>
                            )}
                            {paymentResult?.trackingId && (
                                <div>
                                    <Text strong>Tracking ID: </Text>
                                    <Tag>{paymentResult.trackingId}</Tag>
                                </div>
                            )}
                            <Space style={{ marginTop: '16px' }}>
                                <Button
                                    type="primary"
                                    onClick={() => window.location.href = '/tables'}
                                >
                                    Back to Tables
                                </Button>
                                <Button
                                    onClick={() => window.location.href = '/tables'}
                                >
                                    New Order
                                </Button>
                            </Space>
                        </Space>
                    ]}
                />
            </Card>
        </div>
    );
};

export default PaymentCallback;