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
import moment from "moment";
import ShowConfirm from '@utils/ConfirmUtil';
import { makeSubscriptionPayment } from '@services/paymentMethod';

import PaymentModal from '../MODALS/ PaymentModal';
import ChangeSubscriptionModal from '../MODALS/ChangeSubscription';
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
  let tenant = localStorage.getItem("tenant");
  tenant = JSON.parse(tenant);
  console.log('tenant', tenant);
  tenant.next_billing_date = moment(tenant.next_billing_date).format("MMMM Do YYYY, h:mm a");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(tenant.subscription_id._id);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [isComingSoon] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && data) {
      form.setFieldsValue({
        ...data,
      });
    }
  }, [open, data, form]);






  const handleOpenChange = (newOpen) => {
    console.log('nice', selectedInvoiceId);
    setOpen(newOpen);
    if (!newOpen) {
      form.resetFields();
    }
  };

  const handleStkPush = async (values: Partial<Payment>) => {
    console.log()
    setLoadingPayment(true);
    const payload = {
      msisdn: values?.phoneNumber,
      amount: 10,
      invoiceId: selectedInvoiceId
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



  const columns = [
    {
      title: 'Description',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      hideInSearch: true,
      valueType: "dateTime",
      sorter: (a, b) =>
        new Date(a.createdAt as string) - new Date(b.createdAt as string),
      render: (text) => {
        return new Date(text).toLocaleDateString('en-US');
      }
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      hideInSearch: true,
      valueType: "dateTime",
      sorter: (a, b) =>
        new Date(a.due_date as string) - new Date(b.due_date as string),
      render: (text) => {
        return new Date(text).toLocaleDateString('en-US');
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `KES ${amount}`,
    },
    {
      title: 'Status',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => (
        <Badge
          status={status === 'Paid' ? 'success' : 'warning'}
          text={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        record.payment_status === 'Unpaid' && (
          <Button type="primary" size="small" onClick={() => {
            setSelectedInvoiceId(record._id);
            handleOpenChange(record._id);
          }}>
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
              disabled={tenant.invoices && tenant.invoices.length}
              icon={<SwapOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              Change Plan
            </Button>
          </div>
          <Alert
            message={
              <Space direction="vertical">
                <Text strong>{tenant.subscription_id.name} Package</Text>
                <Space split={<Divider type="vertical" />}>
                  <Text>
                    Kes {tenant.subscription_cycle === 'Yearly' ? tenant.subscription_id.price[0]['Yearly'] : tenant.subscription_id.price[0]['Monthly']} / {tenant.subscription_cycle}
                  </Text>
                  <Text>
                    <CalendarOutlined /> Next billing: {tenant.next_billing_date}
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
          dataSource={tenant.invoices}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* Change Plan Modal */}
      <ChangeSubscriptionModal
        isModalVisible={isModalVisible}
        tenant={tenant}
        setIsModalVisible={setIsModalVisible}
      />

      {/* Payment Method Modal */}
      <PaymentModal
        open={open}
        handleOpenChange={handleOpenChange}
        handleStkPush={handleStkPush}
        form={form}
        formRef={formRef}
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        isComingSoon={isComingSoon}
        loadingPayment={loadingPayment}
      />
    </div>
  );
};

export default PaymentSubscriptionPage;
