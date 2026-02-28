import React, { useRef, useState, useEffect } from "react";
import {
  ProTable,
  ActionType,
  ProFormInstance,
} from "@ant-design/pro-components";
import { fetchAllCustomers } from "@services/customers";
import ExpandedRowContent from "./ExpandableCustomer";
import GiftCardModal from "../../components/MODALS/pro/GiftCardModal";
import {
  AlertOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  MailOutlined,
  EyeOutlined,
  HistoryOutlined,
  BarsOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  Tag,
  Button,
  Modal,
  Space,
  Table,
  App,
  Tabs,
} from "antd";
import { useDispatch } from "react-redux";
import { fetchAllGiftCards } from "@services/customers";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { TabPane } = Tabs;

const AdminCustomersTable = ({ nonCustomerEnabled = false }) => {
  const dispatch = useDispatch();
  const actionRef = useRef();
  const formRef = useRef();
  const [isGiftCardModalVisible, setIsGiftCardModalVisible] = useState(false);
  const [isNewRecipientModalVisible, setIsNewRecipientModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isSendEmailModalVisible, setIsSendEmailModalVisible] = useState(false);
  const [isViewGiftCardsModalVisible, setIsViewGiftCardsModalVisible] = useState(false);
  const [isAllGiftCardsModalVisible, setIsAllGiftCardsModalVisible] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [currentGiftCard, setCurrentGiftCard] = useState(null);
  const [customerGiftCards, setCustomerGiftCards] = useState([]);
  const [allGiftCards, setAllGiftCards] = useState([]);
  const [loadingGiftCards, setLoadingGiftCards] = useState(false);
  const [loadingAllGiftCards, setLoadingAllGiftCards] = useState(false);
  const [clientName, setClientName] = useState("Relia Pos");

  const [activeTabKey, setActiveTabKey] = useState("customers");

  const primaryColor = usePrimaryColor();

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
    setCurrentCustomer(record);
    setIsGiftCardModalVisible(true);
  };

  const showNewRecipientModal = () => {
    setIsNewRecipientModalVisible(true);
  };

  const showGiftCardsHistory = async (record) => {
    setCurrentCustomer(record);
    setIsViewGiftCardsModalVisible(true);
    setLoadingGiftCards(true);

    try {
      const giftCards = await fetchAllGiftCards(record);
      setCustomerGiftCards(giftCards);
    } catch (error) {
      console.error("Failed to fetch gift cards:", error);
      messageApi.error("Failed to load gift cards");
    } finally {
      setLoadingGiftCards(false);
    }
  };

  const showAllGiftCards = async () => {
    setIsAllGiftCardsModalVisible(true);
    setLoadingAllGiftCards(true);

    try {
      const response = await fetchAllGiftCards();
      setAllGiftCards(response);
    } catch (error) {
      console.error("Failed to fetch all gift cards:", error);
      messageApi.error("Failed to load gift cards");
    } finally {
      setLoadingAllGiftCards(false);
    }
  };

  const handleGiftCardCreated = (newGiftCard) => {
    if (newGiftCard.customer_id && currentCustomer) {
      setCustomerGiftCards(prev => [...prev, newGiftCard]);
    }

    if (allGiftCards.length > 0) {
      setAllGiftCards(prev => [...prev, newGiftCard]);
    }
  };

  const giftCardColumns = [
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => `KSh ${amount}`,
    },
    {
      title: "Recipient",
      dataIndex: "customer_name",
      key: "recipient",
      render: (name, record) => record.customer_name || (record.customer_id ? record.customer_id.customer_name : "Unknown"),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Issue Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => date ? new Date(date).toLocaleDateString() : "N/A",
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
              if (record.customer_id && currentCustomer?._id === record.customer_id) {
                // Current customer already set
              } else if (record.customer_id) {
                setCurrentCustomer({ _id: record.customer_id });
              } else {
                setCurrentCustomer(null);
              }
              setIsPreviewModalVisible(true);
            }}
          >
            Preview
          </Button>
          <Button
            icon={<MailOutlined />}
            onClick={() => {
              setCurrentGiftCard(record);
              setIsSendEmailModalVisible(true);
            }}
          >
            Send Email
          </Button>
        </Space>
      ),
    },
  ];

  const columns = [
    {
      title: "Name",
      dataIndex: "customer_name",
      key: "customer_name",
      search: true,
    },
    {
      title: "Email",
      dataIndex: "customer_email",
      key: "customer_email",
      search: true,
    },
    {
      title: "Phone",
      dataIndex: "customer_phone",
      key: "customer_phone",
      search: false,
    },
    {
      title: "Total Spent",
      dataIndex: "total_spent",
      key: "total_spent",
      render: (spent) => `KSh ${spent || 0}`,
      search: false,
    },
    {
      title: "Last Visit",
      dataIndex: "visits",
      key: "last_visit",
      render: (visits) => {
        const lastVisit = getLastVisit(visits);
        return lastVisit === "No visits" ? (
          <Tag icon={<AlertOutlined />} color="warning">
            {lastVisit}
          </Tag>
        ) : (
          <Tag icon={<CheckCircleOutlined />} color="success">
            {new Date(lastVisit).toLocaleDateString()}
          </Tag>
        );
      },
      search: false,
    },
    {
      title: "Actions",
      key: "actions",
      search: false,
      render: (_, record) => (
        <Space wrap>
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
    <App>
      <GiftCardModal
        currentCustomer={currentCustomer}
        isGiftCardModalVisible={isGiftCardModalVisible}
        setIsGiftCardModalVisible={setIsGiftCardModalVisible}
        isNewRecipientModalVisible={isNewRecipientModalVisible}
        setIsNewRecipientModalVisible={setIsNewRecipientModalVisible}
        isPreviewModalVisible={isPreviewModalVisible}
        setIsPreviewModalVisible={setIsPreviewModalVisible}
        isSendEmailModalVisible={isSendEmailModalVisible}
        setIsSendEmailModalVisible={setIsSendEmailModalVisible}
        currentGiftCard={currentGiftCard}
        setCurrentGiftCard={setCurrentGiftCard}
        onGiftCardCreated={handleGiftCardCreated}
        clientName={clientName}
        primaryColor={primaryColor}
      />

      {nonCustomerEnabled && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <Button
              icon={<BarsOutlined />}
              onClick={showAllGiftCards}
            >
              View All Gift Certificates
            </Button>
          </div>
          <div>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={showNewRecipientModal}
              style={{ background: primaryColor, borderColor: primaryColor }}
            >
              Create Gift Card for Non-Customer
            </Button>
          </div>
        </div>
      )}

      <ProTable
        rowKey="_id"
        columns={columns}
        request={async (params) => {
          const data = await fetchAllCustomers(params);
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

      {/* View Customer Gift Cards Modal */}
      <Modal
        title={`Gift Cards for ${currentCustomer?.customer_name || ""}`}
        open={isViewGiftCardsModalVisible}
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
        width={950}
        bodyStyle={{ maxHeight: "70vh", overflow: "auto" }}
      >
        <Table
          columns={giftCardColumns}
          dataSource={customerGiftCards}
          rowKey="_id"
          loading={loadingGiftCards}
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: "No gift cards found for this customer" }}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Modal>

      {/* All Gift Cards Modal */}
      <Modal
        title="All Gift Certificates"
        open={isAllGiftCardsModalVisible}
        onCancel={() => setIsAllGiftCardsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsAllGiftCardsModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="new"
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => {
              setIsAllGiftCardsModalVisible(false);
              showNewRecipientModal();
            }}
          >
            New Non-Customer Gift Card
          </Button>,
        ]}
        width={1000}
        bodyStyle={{ maxHeight: "70vh", overflow: "auto" }}
      >
        <Tabs defaultActiveKey="all" onChange={(key) => setActiveTabKey(key)}>
          <TabPane tab="All Gift Cards" key="all">
            <Table
              columns={giftCardColumns}
              dataSource={allGiftCards}
              rowKey="_id"
              loading={loadingAllGiftCards}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: "No gift cards found" }}
              scroll={{ x: 850 }}
              size="middle"
            />
          </TabPane>
          <TabPane tab="Non-Customer Gift Cards" key="nonCustomers">
            <Table
              columns={giftCardColumns}
              dataSource={allGiftCards.filter(card => !card.customer_id)}
              rowKey="_id"
              loading={loadingAllGiftCards}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: "No non-customer gift cards found" }}
              scroll={{ x: 850 }}
              size="middle"
            />
          </TabPane>
          <TabPane tab="Customer Gift Cards" key="customers">
            <Table
              columns={giftCardColumns}
              dataSource={allGiftCards.filter(card => card.customer_id)}
              rowKey="_id"
              loading={loadingAllGiftCards}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: "No customer gift cards found" }}
              scroll={{ x: 850 }}
              size="middle"
            />
          </TabPane>
        </Tabs>
      </Modal>
    </App>
  );
};

export default AdminCustomersTable;