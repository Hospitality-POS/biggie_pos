import React, { useState } from "react";
import { Button, Space, Spin, Typography, Card, Alert } from "antd";
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

interface PaymentModalProps {
  open: boolean;
  handleOpenChange: (open: boolean) => void;
  handleStkPush: () => any;
  form: any;
  formRef: any;
  selectedPaymentMethod?: string;
  setSelectedPaymentMethod?: (selectedPaymentMethod: string) => void;
  isComingSoon: boolean;
  loadingPayment: boolean;
}

const { Text, Title } = Typography;

const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  handleOpenChange,
  handleStkPush,
  form,
  formRef,
  selectedPaymentMethod = "mpesa",
  setSelectedPaymentMethod = () => {},
  isComingSoon,
  loadingPayment,
}) => {
  return (
    <ModalForm
      onOpenChange={handleOpenChange}
      open={open}
      onFinish={handleStkPush}
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
      size="large"
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
        width: 500,
        bodyStyle: {
          padding: "24px",
          backgroundColor: "#f5f5f5",
        },
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

        {loadingPayment && (
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
        )}
      </Space>
    </ModalForm>
  );
};

export default PaymentModal;
