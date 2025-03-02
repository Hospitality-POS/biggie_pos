// Fix 1: Import redux-thunk properly to handle async actions
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
  HistoryOutlined,
  FilePdfOutlined
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
  Popconfirm,
  App // Fix 2: Import App component for message context
} from "antd";
import { useDispatch } from "react-redux";
import { createGiftCard, sendGiftCard, fetchAllGiftCards } from "@services/customers";

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;




const issueGiftCard = (customerId, amount, message, dispatch) => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  const safeMessage = message || "";

  return {
    card_no: `GC-${Math.floor(Math.random() * 10000)}`,
    code: code,
    amount,
    message: safeMessage,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    customer_id: customerId,
    status: true,
  };
};

const AdminCustomersTable = () => {
  const dispatch = useDispatch();
  const actionRef = useRef();
  const formRef = useRef();
  const giftCardRef = useRef(null);
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
  const [savingPDF, setSavingPDF] = useState(false);
  // Fix 3: Add messageApi reference
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const name = tenant ? tenant.name : "Relia Pos";
    setClientName(name);
  }, []);

  const getLastVisit = (visits) => {
    if (!visits?.length) return "No visits";
    const latestVisit = visits.reduce((prev, curr) =>
      new Date(curr.createdAt) > new Date(prev.createdAt) ? curr : prev
    );
    return latestVisit.createdAt;
  };



  const showGiftCardModal = (record) => {
    console.log('nice', record);
    setCurrentCustomer(record);
    const defaultMessage = `Welcome to ${clientName}! We're delighted to have you as our valued customer.`;
    giftCardForm.resetFields();
    giftCardForm.setFieldsValue({
      message: defaultMessage
    });
    setIsGiftCardModalVisible(true);
  };

  const showGiftCardsHistory = async (record) => {

    setCurrentCustomer(record);
    setIsViewGiftCardsModalVisible(true);
    setLoadingGiftCards(true);

    try {
      // Use the service directly without Redux, matching your existing pattern

      const giftCards = await fetchAllGiftCards(record);
      console.log('my record', giftCards);
      setCustomerGiftCards(giftCards);
    } catch (error) {
      console.error("Failed to fetch gift cards:", error);
      messageApi.error("Failed to load gift cards");
    } finally {
      setLoadingGiftCards(false);
    }
  };

  // Fix 4: Modified to handle async Redux action properly
  const handleGiftCardSubmit = async () => {
    try {
      const values = await giftCardForm.validateFields();

      const defaultMessage = `Welcome to ${clientName}! We're delighted to have you as our valued customer.`;
      const cardMessage = (values.message === undefined || values.message === null)
        ? defaultMessage
        : values.message;

      const giftCard = issueGiftCard(
        currentCustomer._id,
        values.amount,
        cardMessage,
        dispatch
      );

      setCurrentGiftCard(giftCard);
      setIsGiftCardModalVisible(false);
      setIsPreviewModalVisible(true);

      // Fix: Convert async action to use await
      try {
        // Handle createGiftCard as a promise
        await dispatch(createGiftCard(giftCard) as AnyAction).unwrap();
      } catch (error) {
        console.error("Error creating gift card:", error);
        messageApi.error("Failed to create gift card");
      }
    } catch (error) {
      console.error("Gift card form validation failed:", error);
    }
  };

  // Fix 5: Modified to handle async Redux action properly
  const handleSendEmail = async () => {
    try {
      // Get the values directly from the form without validation
      const values = emailForm.getFieldsValue();

      const storedTenant = localStorage.getItem("tenant");
      const tenant = storedTenant ? JSON.parse(storedTenant) : null;

      const payload = {
        email: values.email,
        giftCard: currentGiftCard,
        customerName: currentCustomer.customer_name,
        tenant: tenant
      };

      try {
        // Handle sendGiftCard as a promise
        await dispatch(sendGiftCard(payload)).unwrap();
        messageApi.success("Gift card sent successfully!");

        setIsSendEmailModalVisible(false);
        setIsPreviewModalVisible(false);

        setCustomerGiftCards(prev => [...prev, currentGiftCard]);

        // Reset form fields if needed
        emailForm.resetFields();
      } catch (error) {
        console.error("Error sending gift card:", error);
        messageApi.error("Failed to send gift card");
      }
    } catch (error) {
      console.error("Email form validation failed:", error);
    }
  }

  const copyGiftCardCode = (code) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        messageApi.success("Gift card code copied to clipboard");
      })
      .catch(() => {
        messageApi.error("Failed to copy code");
      });
  };

  const saveGiftCardAsPDF = () => {
    if (!giftCardRef.current) return;

    setSavingPDF(true);
    try {
      const originalContent = document.body.innerHTML;
      const originalBodyStyle = document.body.style.cssText;

      const giftCardHTML = giftCardRef.current.outerHTML;

      document.body.innerHTML = `
                <style>
                    @media print {
                        body { margin: 0; padding: 40px; }
                        @page { size: A4; margin: 0; }
                    }
                </style>
                <div style="display: flex; justify-content: center; padding: 20px;">
                    ${giftCardHTML}
                </div>
            `;

      window.print();

      setTimeout(() => {
        document.body.innerHTML = originalContent;
        document.body.style.cssText = originalBodyStyle;
        setSavingPDF(false);
        messageApi.success('Print dialog opened. Save as PDF in your browser print options.');
      }, 500);
    } catch (error) {
      console.error('Error printing gift card:', error);
      messageApi.error('Failed to print gift card');
      setSavingPDF(false);
    }
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
      render: (amount) => `ksh ${amount}`,
    },
    {
      title: "Issue Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Expiry Date",
      dataIndex: "expiry_date",
      key: "expiry_date",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = 'red';
        let displayText = 'Inactive';

        if (status === true) {
          color = 'green';
          displayText = 'Active';
        } else if (status === false) {
          color = 'red';
          displayText = 'Inactive';
        }

        return (
          <Tag color={color}>
            {displayText}
          </Tag>
        );
      },
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
    // Fix 6: Wrap component in App component to provide message context
    <App>
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

      <Modal
        title={`Issue Gift Card for ${currentCustomer?.customer_name || ""}`}
        open={isGiftCardModalVisible} // Fix 7: Change visible to open (newer Ant Design version)
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
              prefix="ksh"
              style={{ width: "100%" }}
              placeholder="Enter amount"
            />
          </Form.Item>
          <Form.Item
            name="message"
            label="Personalized Message"
            initialValue={`Welcome to ${clientName}! We're delighted to have you as our valued customer.`}
          >
            <Input.TextArea
              rows={4}
              placeholder="Add a personalized message for the gift card"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Gift Card Preview"
        open={isPreviewModalVisible} // Fix 8: Change visible to open
        footer={[
          <Button key="back" onClick={() => setIsPreviewModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<FilePdfOutlined />}
            loading={savingPDF}
            onClick={saveGiftCardAsPDF}
          >
            Print/Save PDF
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
          <Card
            ref={giftCardRef}
            bordered
            style={{
              background: "linear-gradient(135deg, #6C1C2C 0%, #6C1C2C 100%)",
              color: "white",
              borderRadius: "8px"
            }}
          >
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
                  Card #: {currentGiftCard.id || currentGiftCard.card_no}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.8)" }}>
                  Expires: {new Date(currentGiftCard.expiryDate || currentGiftCard.expiry_date).toLocaleDateString()}
                </Text>
              </div>
            </div>
          </Card>
        )}
      </Modal>

      <Modal
        title="Share Gift Card"
        open={isSendEmailModalVisible} // Fix 9: Change visible to open
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
                  prefix="ksh"
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
                  value={currentGiftCard.message || `Welcome to ${clientName}! We're delighted to have you as our valued customer.`}
                  onChange={(e) => {
                    setCurrentGiftCard(prev => ({
                      ...prev,
                      message: e.target.value || `Welcome to ${clientName}! We're delighted to have you as our valued customer.`
                    }));
                  }}
                />
              </Form.Item>
            </>
          )}

          <Paragraph type="secondary">
            The gift card will be sent to this email address along with instructions on how to redeem it.
          </Paragraph>
        </Form>
      </Modal>

      <Modal
        title={`Gift Cards for ${currentCustomer?.customer_name || ""}`}
        open={isViewGiftCardsModalVisible} // Fix 10: Change visible to open
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
    </App>
  );
};

export default AdminCustomersTable;