import React, { useEffect, useRef, useState } from 'react';
import {
  Typography,
  Card,
  Button,
  Space,
  Modal,
  Alert,
  Divider,
  Table,
  Radio,
  Badge,
  message,
  Input,
  Spin,
  Form
} from 'antd';
import {
  CreditCardOutlined,
  MobileOutlined,
  CalendarOutlined,
  TagOutlined,
  DollarOutlined,
  SwapOutlined,
  FileTextOutlined
} from '@ant-design/icons';

import ProForm, { ModalForm, ProFormText } from "@ant-design/pro-form";
import ShowConfirm from '@utils/ConfirmUtil';
import { makeSubscriptionPayment } from '@services/paymentMethod';

const { Title, Text } = Typography;

interface MakePaymentrModalProps {
  actionRef: any;
  edit?: boolean;
  data?: any;
}


interface Payment {
  phoneNumber: string;
  amount: string;
}
const PaymentSubscriptionPage: React.FC<MakePaymentrModalProps> = ({ actionRef, edit, data }) => {

  const [form] = Form.useForm();

  const formRef = useRef();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Basic');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isComingSoon] = useState(true);
  // const [cardDetails, setCardDetails] = useState({
  //   cardNumber: '',
  //   expiryDate: '',
  //   cvv: ''
  // });
  const [loadingPayment, setLoadingPayment] = useState(false);


  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
      });

    }
  }, [open, data, form]);

  const handleOpenChange = (newOpen: boolean) => {
    console.log('new', newOpen);
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };


  // Mock current subscription
  const currentSubscription = {
    package: 'Basic',
    type: 'monthly',
    nextBilling: '2024-01-03',
    amount: 999,
    status: 'active'
  };

  // Mock invoices
  const invoices = [
    {
      id: '1',
      date: '2023-12-01',
      amount: 999,
      status: 'unpaid',
      dueDate: '2023-12-15',
      description: 'Basic Plan - December 2023'
    },
    {
      id: '2',
      date: '2023-11-01',
      amount: 999,
      status: 'paid',
      dueDate: '2023-11-15',
      description: 'Basic Plan - November 2023'
    }
  ];

  const handleStkPush = async (values: Partial<Payment>) => {

    setLoadingPayment(true);

    const payload = {
      msisdn: values?.phoneNumber,
      amount: 10
    };

    console.log('payment', payload);

    const confirmed = await ShowConfirm({
      title: `Are you sure you want to complete this payment`,
      position: true,
    });
    if (confirmed) {
      makeSubscriptionPayment(payload);
      actionRef.current.reset();
      return true;
    }
    setLoadingPayment(false);
  };



  // const handleCardPayment = () => {
  //   console.log('Initiating card payment for invoice:', selectedInvoiceId);

  //   setLoadingPayment(true);

  //   // Simulate a timeout for the payment
  //   setTimeout(() => {
  //     setLoadingPayment(false);
  //     setPaymentModalVisible(false);
  //     message.success('Card payment successful!');
  //   }, 3000); // 3 seconds timeout
  // };

  const handlePayInvoice = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    // setPaymentModalVisible(true);
  };

  const columns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `KES ${amount}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge
          status={status === 'paid' ? 'success' : 'warning'}
          text={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        record.status === 'unpaid' && (
          <Button type="primary" size="small" onClick={() => handleOpenChange(record.id,)}>
            Pay Now
          </Button>
        )
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Current Subscription */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4}>
              <Space>
                <TagOutlined />
                Current Subscription
              </Space>
            </Title>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              Change Plan
            </Button>
          </div>
          <Alert
            message={
              <Space direction="vertical">
                <Text strong>{currentSubscription.package} Package</Text>
                <Space split={<Divider type="vertical" />}>
                  <Text>
                    <DollarOutlined /> KES {currentSubscription.amount} / {currentSubscription.type}
                  </Text>
                  <Text>
                    <CalendarOutlined /> Next billing: {currentSubscription.nextBilling}
                  </Text>
                </Space>
              </Space>
            }
            type="info"
            showIcon
          />
        </Space>
      </Card>

      {/* Invoices Section */}
      <Card>
        <Title level={4}>
          <Space>
            <FileTextOutlined />
            Invoices
          </Space>
        </Title>
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* Change Plan Modal */}
      <Modal
        title="Change Subscription Plan"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%', padding: '20px 0' }}>
          <Radio.Group
            style={{ width: '100%' }}
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
          >
            <Space direction="horizontal" style={{ width: '100%' }}>
              {[
                { name: 'Basic', price: 999 },
                { name: 'Pro', price: 1999 },
                { name: 'Enterprise', price: 4999 }
              ].map((plan) => (
                <Radio key={plan.name} value={plan.name} style={{ width: '100%' }}>
                  <Card style={{ width: '100%', marginTop: '8px' }}>
                    <Space>
                      <div>
                        <Text strong>{plan.name}</Text>
                        <br />
                        <Text type="secondary">KES {plan.price} / month</Text>
                      </div>
                    </Space>
                  </Card>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
          <Button type="primary" block style={{ marginTop: '20px' }}>
            Confirm Change
          </Button>
        </Space>
      </Modal>

      {/* Payment Method Modal */}
      <ModalForm
        onOpenChange={handleOpenChange}
        open={open}
        onFinish={handleStkPush}
        form={form}
        formRef={formRef}
        submitter={{
          searchConfig: {
            resetText: "Cancel",
            submitText: "Complete Payment",
          },
        }}
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
          >
            {isComingSoon ? 'Coming Soon' : 'Pay with Card'}
          </Button>
          {selectedPaymentMethod === 'mpesa' && (

            <ProForm.Group
              style={{ width: "100%" }} // Ensure the group spans the modal's width
            >
              <ProFormText
                width="lg" // Set the input to take up the full width
                name="phoneNumber"
                label="Phone Number"
                rules={[{ required: true, message: "Phone Number is required" }]}
                placeholder="Phone Number (254...)"
              />
            </ProForm.Group>

          )}

          {/* {selectedPaymentMethod === 'card' && (
            <div style={{ marginTop: '16px' }}>
              <Input
                placeholder="Card Number"
                value={cardDetails.cardNumber}
                onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                style={{ marginBottom: '8px' }}
              />
              <Space>
                <Input
                  placeholder="Expiry Date"
                  value={cardDetails.expiryDate}
                  onChange={(e) => setCardDetails({ ...cardDetails, expiryDate: e.target.value })}
                  style={{ marginBottom: '8px' }}
                />
                <Input
                  placeholder="CVV"
                  value={cardDetails.cvv}
                  onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                  style={{ marginBottom: '8px' }}
                />
              </Space>
              <Button
                type="primary"
                size="large"
                block
                onClick={handleCardPayment}
                style={{ marginTop: '16px' }}
              >
                Confirm Card Payment
              </Button>
            </div>
          )} */}

          {loadingPayment && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <Spin />
            </div>
          )}
        </Space>
      </ModalForm>
    </div>
  );
};

export default PaymentSubscriptionPage;
