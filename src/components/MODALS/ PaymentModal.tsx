import React from 'react';
import { Button, Space, Spin, Typography } from 'antd';
import { MobileOutlined, CreditCardOutlined } from '@ant-design/icons';
import ProForm, { ModalForm, ProFormText } from "@ant-design/pro-form";

const { Text } = Typography;

const PaymentModal = ({
    open,
    handleOpenChange,
    handleStkPush,
    form,
    formRef,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isComingSoon,
    loadingPayment,
}) => {
    return (
        <ModalForm
            onOpenChange={handleOpenChange}
            visible={open}
            onFinish={handleStkPush}
            form={form}
            formRef={formRef}
            title="Select Payment Method"
            submitter={{
                searchConfig: {
                    resetText: "Cancel",
                    submitText: "Complete Payment",
                },
                render: (props, dom) => (
                    <Space style={{ justifyContent: 'space-between' }}>
                        {dom}
                    </Space>
                ),
            }}
            style={{ maxWidth: '600px', margin: '0 auto' }} // Center the modal
        >
            <Space direction="vertical" style={{ width: '100%', padding: '20px 0' }}>
                <Button
                    type="primary"
                    icon={<MobileOutlined />}
                    size="large"
                    block
                    onClick={() => setSelectedPaymentMethod('mpesa')}
                    style={{ marginBottom: '16px' }}
                >
                    Pay with M-PESA (STK Push)
                </Button>

                <Button
                    icon={<CreditCardOutlined />}
                    size="large"
                    block
                    disabled={isComingSoon}
                    style={{ marginBottom: '16px' }}
                >
                    {isComingSoon ? 'Coming Soon' : 'Pay with Card'}
                </Button>

                {selectedPaymentMethod === 'mpesa' && (
                    <ProForm.Group style={{ width: "100%" }}>
                        <ProFormText
                            width="lg"
                            name="phoneNumber"
                            label="Phone Number"
                            rules={[{ required: true, message: "Phone Number is required" }]}
                            placeholder="Phone Number (254...)"
                            style={{ marginBottom: '16px' }} // Add margin for spacing
                        />
                    </ProForm.Group>
                )}

                {loadingPayment && (
                    <Spin spinning={loadingPayment} size="large" style={{ marginTop: '20px' }}>
                        <Text>Processing payment...</Text>
                    </Spin>
                )}
            </Space>
        </ModalForm>
    );
};

export default PaymentModal;
