<<<<<<< HEAD
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
=======
import React, { useEffect, useRef, useState } from "react";
import { Button, Space, Spin, Typography, Card, Alert, Form } from "antd";
import {
  MobileOutlined,
  CreditCardOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import ProForm, {
  ModalForm,
  ProFormText,
  ProFormRadio,
} from "@ant-design/pro-form";
import { PhoneInput } from "@components/PhoneNumber/PhoneNumber";
import ShowConfirm from "@utils/ConfirmUtil";
import { makeSubscriptionPayment } from "@services/paymentMethod";
import { getPhoneNumber } from "@components/PhoneNumber/utils/formatPhoneNumberUtil";
interface PaymentModalProps {
  data?: any;
  actionRef: any;
}

const { Text, Title } = Typography;

const PaymentModal: React.FC<PaymentModalProps> = ({ data, actionRef }) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("mpesa");
  const [isComingSoon, setIsComingSoon] = useState(true);

  const [form] = Form.useForm();
  const formRef = useRef();

  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
      });
    }
  }, [open, data, form]);

  const handleStkPush = async (values) => {
    const phoneNumber = getPhoneNumber(values?.phoneNumber);
    const payload = {
      msisdn: phoneNumber,
      amount: data?.amount,
      invoiceId: data?.invoice_code,
    };

    // console.log("payment", payload);
    // console.log("***********************", data);
    // console.log("###############", values);

    const confirmed = await ShowConfirm({
      title: `Are you sure you want to complete this payment`,
      position: true,
    });
    if (confirmed) {
      makeSubscriptionPayment(payload);
      actionRef.current.reset();
      return true;
    }
  };

  const handleCardPayment = async (values) => {
    const payload = {
      phoneNumber: values?.phoneNumber,
      amount: 10,
      invoiceId: "",
    };

    console.log("payment", payload);

    const confirmed = await ShowConfirm({
      title: `Are you sure you want to complete this payment`,
      position: true,
    });
    if (confirmed) {
      makeSubscriptionPayment(payload);
      actionRef.current.reset();
      return true;
    }
  };

  return (
    <ModalForm
      trigger={
        <Button type="primary" icon={<WalletOutlined />}>
          Pay Now
        </Button>
      }
      onOpenChange={handleOpenChange}
      open={open}
      onFinish={
        selectedPaymentMethod === "mpesa" ? handleStkPush : handleCardPayment
      }
      form={form}
      formRef={formRef}
      title={
        <Space>
          <WalletOutlined />
          <Title level={4} style={{ margin: 0 }}>
            Payment Options
          </Title>
        </Space>
      }
      //   size="large"
      autoFocusFirstInput
      submitter={{
        searchConfig: {
          resetText: "Cancel",
          submitText: "Complete Payment",
        },
        render: (props, dom) => (
          <Space
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {dom}
          </Space>
        ),
      }}
      modalProps={{
        destroyOnClose: true,
        centered: true,
        width: 600,
      }}
    >
      <Space
        direction="vertical"
        style={{
          width: "100%",
          textAlign: "center",
        }}
      >
        <ProFormRadio.Group
          name="paymentMethod"
          label="Select Payment Method"
          radioType="radio"
          initialValue={selectedPaymentMethod}
          fieldProps={{
            value: selectedPaymentMethod,
            onChange: (e) => setSelectedPaymentMethod(e.target.value),
          }}
          options={[
            {
              label: "M-PESA",
              value: "mpesa",
              icon: <MobileOutlined />,
            },
            {
              label: "Card Payment",
              value: "card",
              icon: <CreditCardOutlined />,
              disabled: isComingSoon,
            },
          ]}
          style={{
            width: "100%",
            marginBottom: "24px",
          }}
        />

        <Card
          title={
            selectedPaymentMethod === "mpesa" ? (
              <Text strong>M-PESA Payment (STK Push)</Text>
            ) : (
              <Text strong>Card Payment (Coming Soon)</Text>
            )
          }
          style={{
            width: "100%",
            marginBottom: "16px",
            display: selectedPaymentMethod === "mpesa" ? "block" : "none",
          }}
        >
          <PhoneInput label="Phone Number" owner="phoneNumber" />
        </Card>

        {/* {loadingPayment && (
          <Spin
            spinning={loadingPayment}
            size="large"
            tip="Processing payment..."
          >
            <Alert
              message="Payment in Progress"
              description="Please do not close this window or refresh the page."
              type="info"
              showIcon
              style={{ marginTop: "20px" }}
            />
          </Spin>
        )} */}
      </Space>
    </ModalForm>
  );
>>>>>>> 64f9563f3b8d5b13d219dbb7825c121c49673886
};

export default PaymentModal;
