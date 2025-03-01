import React, { useRef, useState, useEffect } from "react";
import {
  ProTable,
  ActionType,
  ProFormInstance,
} from "@ant-design/pro-components";
import { fetchAdminAllCustomers } from "@services/customers";
import ExpandedRowContent from "./ExpandableCustomer";
import parsePhoneNumberFromString, {
  formatIncompletePhoneNumber,
} from "libphonenumber-js";
import {
  AlertOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  MailOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import {
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  message,
  Card,
  Typography,
  Divider,
  Tabs,
  Table,
  Tooltip,
  Popconfirm
} from "antd";

// Mock function for fetching customer gift cards - replace with actual implementation
const fetchCustomerGiftCards = (customerId) => {
  // This would connect to your backend service
  return Promise.resolve([]);
};

// Mock function for issuing gift cards - replace with actual implementation
const issueGiftCard = (customerId, amount, message) => {
  // Generate a unique code for the gift card
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding similar looking characters
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  // This would connect to your backend service
  return {
    id: `GC-${Math.floor(Math.random() * 10000)}`,
    code: code,
    amount,
    message,
    issueDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiry
    customerId,
    status: 'Active'
  };
};

// Mock function for sending email - replace with actual implementation
const sendGiftCardEmail = (email, giftCard, customerName) => {
  // This would connect to your email service
  console.log(`Sending gift card ${giftCard.id} to ${email}`);
  return Promise.resolve({ success: true });
};

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const AdminCustomersTable: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();
  const [isGiftCardModalVisible, setIsGiftCardModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isSendEmailModalVisible, setIsSendEmailModalVisible] = useState(false);
  const [isViewGiftCardsModalVisible, setIsViewGiftCardsModalVisible] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [giftCardForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [currentGiftCard, setCurrentGiftCard] = useState(null);
  const [customerGiftCards, setCustomerGiftCards] = useState([]);
  const [loadingGiftCards, setLoadingGiftCards] = useState(false);
  const [clientName, setClientName] = useState("Relia Pos");

  useEffect(() => {
    // Get client name from localStorage
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const name = tenant ? tenant.name : "Relia Pos";
    setClientName(name);
  }, []);

  const getLastVisit = (visits: { createdAt: string }[]): string => {
    if (!visits?.length) return "No visits";
    const latestVisit = visits.reduce((prev, curr) =>
      new Date(curr.createdAt) > new Date(prev.createdAt) ? curr : prev
    );
    return latestVisit.createdAt;
  };

  const showGiftCardModal = (record) => {
    setCurrentCustomer(record);
    giftCardForm.resetFields();
    setIsGiftCardModalVisible(true);
  };

  const showGiftCardsHistory = async (record) => {
    setCurrentCustomer(record);
    setIsViewGiftCardsModalVisible(true);
    setLoadingGiftCards(true);

    try {
      const giftCards = await fetchCustomerGiftCards(record._id);
      setCustomerGiftCards(giftCards);
    } catch (error) {
      console.error("Failed to fetch gift cards:", error);
      message.error("Failed to load gift cards");
    } finally {
      setLoadingGiftCards(false);
    }
  };

  const handleGiftCardSubmit = async () => {
    try {
      const values = await giftCardForm.validateFields();
      const giftCard = issueGiftCard(
        currentCustomer._id,
        values.amount,
        values.message
      );
      console.log('oooo my', giftCard);
      setCurrentGiftCard(giftCard);
      setIsGiftCardModalVisible(false);
      setIsPreviewModalVisible(true);
    } catch (error) {
      console.error("Gift card form validation failed:", error);
    }
  };

  const handleSendEmail = async () => {
    try {
      const values = await emailForm.validateFields();
      await sendGiftCardEmail(values.email, currentGiftCard, currentCustomer.customer_name);
      message.success("Gift card sent successfully!");
      setIsSendEmailModalVisible(false);

      // Add the new gift card to the customer's gift cards list
      setCustomerGiftCards(prev => [...prev, currentGiftCard]);
    } catch (error) {
      console.error("Email form validation failed:", error);
      message.error("Failed to send gift card email");
    }
  };

  const copyGiftCardCode = (code) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        message.success("Gift card code copied to clipboard");
      })
      .catch(() => {
        message.error("Failed to copy code");
      });
  };

  const giftCardColumns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (text) => (
        <Space>
          <Text copyable={false}>{text}</Text>
          <Tooltip title="Copy Code">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => copyGiftCardCode(text)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => `$${amount}`,
    },
    {
      title: "Issue Date",
      dataIndex: "issueDate",
      key: "issueDate",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Expiry Date",
      dataIndex: "expiryDate",
      key: "expiryDate",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : status === 'Redeemed' ? 'blue' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => {
              setCurrentGiftCard(record);
              setIsPreviewModalVisible(true);
            }}
          >
            Preview
          </Button>
          <Button
            icon={<MailOutlined />}
            onClick={() => {
              setCurrentGiftCard(record);
              emailForm.setFieldsValue({ email: currentCustomer?.email || "" });
              setIsSendEmailModalVisible(true);
            }}
          >
            Share
          </Button>
        </Space>
      ),
    },
  ];

  const columns = [
    {
      title: "Code",
      dataIndex: "code",
      copyable: true,
      fieldProps: { placeholder: "Enter Customer Code" },
    },
    {
      title: "Name",
      dataIndex: "customer_name",
      fieldProps: { placeholder: "Enter Customer Name" },
    },
    {
      title: "Email",
      dataIndex: "email",
      copyable: true,
      fieldProps: { placeholder: "Enter Customer Email" },
    },
    {
      title: "Phone",
      dataIndex: "phone",
      copyable: true,
      search: false,
      render: (phone) => <span>{phone}</span>,
    },
    {
      title: "Status",
      dataIndex: "lastVisit",
      hideInSearch: true,
      valueType: "text",
      render: (_, record) => {
        const lastVisitDate = record?.visits?.[0]?.createdAt
          ? new Date(record.visits[0].createdAt)
          : null;
        const currentDate = new Date();
        const hasExceeded14Days = lastVisitDate
          ? (currentDate - lastVisitDate) / (1000 * 60 * 60 * 24) > 14
          : false;

        return (
          <>
            {lastVisitDate ? (
              hasExceeded14Days ? (
                <Tag color="red" icon={<AlertOutlined />}>
                  Overdue
                </Tag>
              ) : (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Recent
                </Tag>
              )
            ) : (
              <Tag color="gray" icon={<AlertOutlined />}>
                No Visits
              </Tag>
            )}
          </>
        );
      },
    },
    {
      title: "Last Visit",
      key: "lastVisit",
      search: false,
      render: (_, record) => {
        const lastVisit = getLastVisit(record.visits || []);
        return lastVisit !== "No visits"
          ? new Date(lastVisit).toLocaleString()
          : "No visits";
      },
    },
    {
      title: "Actions",
      key: "actions",
      search: false,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<GiftOutlined />}
            onClick={() => showGiftCardModal(record)}
          >
            Issue Gift Card
          </Button>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => showGiftCardsHistory(record)}
          >
            View Gift Cards
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable
        rowKey="_id"
        columns={columns}
        request={async (params) => {
          const data = await fetchAdminAllCustomers(params);
          return { data, success: true, total: data.length };
        }}
        actionRef={actionRef}
        formRef={formRef}
        cardBordered
        pagination={{
          pageSize: 5,
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: (total, range) =>
            `Showing ${range[0]}-${range[1]} of ${total} total clients`,
        }}
        search={{
          searchText: "Search Customers",
          resetText: "Reset",
          labelWidth: "auto",
        }}
        headerTitle="List of All Customers"
        tableAlertRender={({ selectedRowKeys }) => (
          <p>You have selected {selectedRowKeys.length} items</p>
        )}
        expandable={{
          expandedRowRender: (record) => <ExpandedRowContent record={record} />,
        }}
        options={{ fullScreen: true }}
        scroll={{ x: "100%" }}
        rowSelection={{ alwaysShowAlert: false }}
      />

      {/* Gift Card Creation Modal */}
      <Modal
        title={`Issue Gift Card for ${currentCustomer?.customer_name || ""}`}
        visible={isGiftCardModalVisible}
        onOk={handleGiftCardSubmit}
        onCancel={() => setIsGiftCardModalVisible(false)}
      >
        <Form form={giftCardForm} layout="vertical">
          <Form.Item
            name="amount"
            label="Gift Card Amount"
            rules={[{ required: true, message: "Please enter the gift card amount" }]}
          >
            <InputNumber
              min={1}
              prefix="kshs"
              style={{ width: "100%" }}
              placeholder="Enter amount"
            />
          </Form.Item>
          <Form.Item
            name="message"
            label="Personalized Message"
          >
            <Input.TextArea
              rows={4}
              placeholder="Add a personalized message for the gift card"
              defaultValue={`Welcome to ${clientName}! We're delighted to have you as our valued customer.`}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Gift Card Preview Modal */}
      <Modal
        title="Gift Card Preview"
        visible={isPreviewModalVisible}
        footer={[
          <Button key="back" onClick={() => setIsPreviewModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<MailOutlined />}
            onClick={() => {
              setIsPreviewModalVisible(false);
              emailForm.setFieldsValue({ email: currentCustomer?.email || "" });
              setIsSendEmailModalVisible(true);
            }}
          >
            Share via Email
          </Button>,
        ]}
        onCancel={() => setIsPreviewModalVisible(false)}
        width={500}
      >
        {currentGiftCard && (
          <Card bordered style={{
            background: "linear-gradient(135deg, #6C1C2C 0%, #6C1C2C 100%)",
            color: "white",
            borderRadius: "8px"
          }}>
            <div style={{ padding: "16px", textAlign: "center" }}>
              <GiftOutlined style={{ fontSize: "32px", marginBottom: "16px" }} />
              <Title level={3} style={{ color: "white", margin: "8px 0" }}>
                {clientName} Gift Card
              </Title>
              <Divider style={{ background: "rgba(255,255,255,0.2)", margin: "12px 0" }} />
              <Title level={4} style={{ color: "white" }}>
                ksh {currentGiftCard.amount}
              </Title>
              <Paragraph style={{ color: "rgba(255,255,255,0.8)" }}>
                {currentGiftCard.message || `Welcome to ${clientName}! We're delighted to have you as our valued customer.`}
              </Paragraph>
              <Divider style={{ background: "rgba(255,255,255,0.2)", margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", flexDirection: "column", gap: "8px" }}>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>
                  Code: {currentGiftCard.code}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>
                  Card #: {currentGiftCard.id}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>
                  Expires: {new Date(currentGiftCard.expiryDate).toLocaleDateString()}
                </Text>
              </div>
            </div>
          </Card>
        )}
      </Modal>

      {/* Email Sending Modal */}
      <Modal
        title="Share Gift Card"
        visible={isSendEmailModalVisible}
        onOk={handleSendEmail}
        onCancel={() => setIsSendEmailModalVisible(false)}
      >
        <Form form={emailForm} layout="vertical">
          <Form.Item
            name="email"
            label="Recipient Email"
            rules={[
              { required: true, message: "Please enter the recipient's email" },
              { type: "email", message: "Please enter a valid email" }
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          {currentGiftCard && (
            <>
              <Form.Item label="Gift Card Amount">
                <InputNumber
                  min={1}
                  value={currentGiftCard.amount}
                  onChange={(value) => {
                    setCurrentGiftCard(prev => ({
                      ...prev,
                      amount: value
                    }));
                  }}
                  prefix="kshs"
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item label="Gift Card Code">
                <Input
                  value={currentGiftCard.code}
                  readOnly
                  addonAfter={
                    <Tooltip title="Copy Code">
                      <CopyOutlined
                        onClick={() => copyGiftCardCode(currentGiftCard.code)}
                        style={{ cursor: 'pointer' }}
                      />
                    </Tooltip>
                  }
                />
              </Form.Item>

              <Form.Item label="Message">
                <Input.TextArea
                  rows={3}
                  value={currentGiftCard.message}
                  onChange={(e) => {
                    setCurrentGiftCard(prev => ({
                      ...prev,
                      message: e.target.value
                    }));
                  }}
                  placeholder={`Welcome to ${clientName}! We're delighted to have you as our valued customer.`}
                />
              </Form.Item>
            </>
          )}

          <Paragraph type="secondary">
            The gift card will be sent to this email address along with instructions on how to redeem it.
          </Paragraph>
        </Form>
      </Modal>

      {/* View Customer Gift Cards Modal */}
      <Modal
        title={`Gift Cards for ${currentCustomer?.customer_name || ""}`}
        visible={isViewGiftCardsModalVisible}
        onCancel={() => setIsViewGiftCardsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewGiftCardsModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="new"
            type="primary"
            icon={<GiftOutlined />}
            onClick={() => {
              setIsViewGiftCardsModalVisible(false);
              showGiftCardModal(currentCustomer);
            }}
          >
            Issue New Gift Card
          </Button>,
        ]}
        width={800}
      >
        <Table
          columns={giftCardColumns}
          dataSource={customerGiftCards}
          rowKey="id"
          loading={loadingGiftCards}
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: "No gift cards found for this customer" }}
        />
      </Modal>
    </>
  );
};

export default AdminCustomersTable;