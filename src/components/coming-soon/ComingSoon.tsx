import React, { useState } from 'react';
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
  Spin
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

const { Title, Text } = Typography;

const PaymentSubscriptionPage = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Basic');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  const [loadingPayment, setLoadingPayment] = useState(false);

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

  const handleStkPush = () => {
    console.log('Initiating STK push payment for invoice:', selectedInvoiceId);
    setLoadingPayment(true);

    // Simulate a timeout for the payment
    setTimeout(() => {
      setLoadingPayment(false);
      setPaymentModalVisible(false);
      message.success('M-PESA payment successful!');
    }, 3000); // 3 seconds timeout
  };

  const handleCardPayment = () => {
    console.log('Initiating card payment for invoice:', selectedInvoiceId);

    setLoadingPayment(true);

    // Simulate a timeout for the payment
    setTimeout(() => {
      setLoadingPayment(false);
      setPaymentModalVisible(false);
      message.success('Card payment successful!');
    }, 3000); // 3 seconds timeout
  };

  const handlePayInvoice = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setPaymentModalVisible(true);
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
          <Button type="primary" size="small" onClick={() => handlePayInvoice(record.id)}>
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
      <Modal
        title="Select Payment Method"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
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
            onClick={() => setSelectedPaymentMethod('card')}
          >
            Pay with Card
          </Button>

          {selectedPaymentMethod === 'mpesa' && (
            <div style={{ marginTop: '16px' }}>
              <Input
                placeholder="Phone Number (254...)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{ marginBottom: '8px' }}
              />
              <Text style={{ display: 'block', marginTop: '8px' }}>
                Amount: KES {currentSubscription.amount}
              </Text>
              <Button
                type="primary"
                size="large"
                block
                onClick={handleStkPush}
                style={{ marginTop: '16px' }}
              >
                Confirm M-PESA Payment
              </Button>
            </div>
          )}

          {selectedPaymentMethod === 'card' && (
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
          )}

          {loadingPayment && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <Spin />
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default PaymentSubscriptionPage;
