import React, { useState, useEffect } from "react";
import {
  Typography,
  Space,
  Row,
  Col,
  Button,
  Table,
  Badge,
  Modal,
  Radio,
  Card,
  Tag,
  message,
  Alert,
  Divider
} from "antd";
import {
  CreditCardOutlined,
  CheckCircleOutlined,
  StarOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  PayCircleOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

const BillingDashboard: React.FC = () => {
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [planUpdateModalVisible, setPlanUpdateModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");
  const [currentSubscription, setCurrentSubscription] = useState("basic");
  const [selectedNewPlan, setSelectedNewPlan] = useState("");

  // Mock data
  const [activeInvoice] = useState(null); // Set to invoice object when there's a pending payment

  const shops = [
    { name: "Main Store", location: "Nairobi CBD" },
    { name: "Branch Store", location: "Westlands" }
  ];

  // Sample invoice data - one invoice covers all shops
  const [pastInvoices] = useState([
    {
      id: "INV-2025-001",
      amount: 6000, // Basic plan: 3000 × 2 shops
      currency: "KES",
      date: "2025-06-14",
      status: "paid",
      plan: "Basic",
      period: "June 2025"
    },
    {
      id: "INV-2025-002",
      amount: 9000, // Pro plan: 4500 × 2 shops
      currency: "KES",
      date: "2025-05-14",
      status: "paid",
      plan: "Pro",
      period: "May 2025"
    },
    {
      id: "INV-2025-003",
      amount: 6000,
      currency: "KES",
      date: "2025-04-14",
      status: "paid",
      plan: "Basic",
      period: "April 2025"
    },
    {
      id: "INV-2025-004",
      amount: 9000,
      currency: "KES",
      date: "2025-03-14",
      status: "paid",
      plan: "Pro",
      period: "March 2025"
    },
    {
      id: "INV-2025-005",
      amount: 6000,
      currency: "KES",
      date: "2025-02-14",
      status: "paid",
      plan: "Basic",
      period: "February 2025"
    }
  ]);

  // Sample payment data - one payment covers the full invoice
  const [payments] = useState([
    {
      id: "PAY-2025-001",
      amount: 6000,
      currency: "KES",
      date: "2025-06-14",
      method: "M-Pesa",
      reference: "NLJ7RT61SV",
      status: "completed",
      invoice: "INV-2025-001"
    },
    {
      id: "PAY-2025-002",
      amount: 9000,
      currency: "KES",
      date: "2025-05-14",
      method: "Visa Card",
      reference: "4***1234",
      status: "completed",
      invoice: "INV-2025-002"
    },
    {
      id: "PAY-2025-003",
      amount: 6000,
      currency: "KES",
      date: "2025-04-14",
      method: "M-Pesa",
      reference: "PLM8QT92WX",
      status: "completed",
      invoice: "INV-2025-003"
    },
    {
      id: "PAY-2025-004",
      amount: 9000,
      currency: "KES",
      date: "2025-03-14",
      method: "Mastercard",
      reference: "5***9876",
      status: "completed",
      invoice: "INV-2025-004"
    },
    {
      id: "PAY-2025-005",
      amount: 6000,
      currency: "KES",
      date: "2025-02-14",
      method: "M-Pesa",
      reference: "KLM3RT45YU",
      status: "completed",
      invoice: "INV-2025-005"
    }
  ]);

  const subscriptionPlans = {
    basic: {
      name: "Basic",
      price: 3000,
      icon: <StarOutlined />,
      color: "#52c41a",
      features: ["Basic POS", "Up to 100 products", "Single location", "Basic reports"]
    },
    pro: {
      name: "Pro",
      price: 4500,
      icon: <RocketOutlined />,
      color: "#1890ff",
      features: ["Advanced POS", "Up to 1000 products", "Multiple locations", "Advanced reports", "Inventory management"]
    },
    premium: {
      name: "Premium",
      price: 6000,
      icon: <ThunderboltOutlined />,
      color: "#722ed1",
      features: ["Enterprise POS", "Unlimited products", "Unlimited locations", "Custom reports", "Advanced analytics", "Priority support"]
    }
  };

  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.color_scheme.primary) {
      setPrimaryColor(tenant.color_scheme.primary);
    }
  }, []);

  const handlePayment = () => {
    message.loading("Processing payment...", 2);
    setTimeout(() => {
      message.success("Payment processed successfully!");
      setPaymentModalVisible(false);
    }, 2000);
  };

  const handlePlanUpdate = () => {
    message.loading("Updating subscription plan...", 2);
    setTimeout(() => {
      message.success(`Successfully switched to ${subscriptionPlans[selectedNewPlan].name} plan!`);
      setCurrentSubscription(selectedNewPlan);
      setPlanUpdateModalVisible(false);
      setSelectedNewPlan("");
    }, 2000);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "warning", text: "Pending" },
      paid: { color: "success", text: "Paid" },
      completed: { color: "success", text: "Completed" },
      overdue: { color: "error", text: "Overdue" }
    };
    return <Badge status={statusConfig[status]?.color} text={statusConfig[status]?.text} />;
  };

  const totalMonthlyAmount = subscriptionPlans[currentSubscription].price * shops.length;

  const invoiceColumns = [
    {
      title: "Invoice ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Text code>{id}</Text>
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: any) => (
        <Text strong>{record.currency} {amount.toLocaleString()}</Text>
      )
    },
    {
      title: "Plan",
      dataIndex: "plan",
      key: "plan",
      render: (plan: string) => (
        <Tag color={subscriptionPlans[plan.toLowerCase()]?.color}>
          {subscriptionPlans[plan.toLowerCase()]?.icon} {plan}
        </Tag>
      )
    },
    {
      title: "Period",
      dataIndex: "period",
      key: "period"
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusBadge(status)
    }
  ];

  const paymentColumns = [
    {
      title: "Payment ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Text code>{id}</Text>
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: any) => (
        <Text strong>{record.currency} {amount.toLocaleString()}</Text>
      )
    },
    {
      title: "Method",
      dataIndex: "method",
      key: "method",
      render: (method: string) => (
        <Tag icon={method === "M-Pesa" ? <MobileOutlined /> : <CreditCardOutlined />} color="blue">
          {method}
        </Tag>
      )
    },
    {
      title: "Reference",
      dataIndex: "reference",
      key: "reference",
      render: (ref: string) => <Text code>{ref}</Text>
    },
    {
      title: "Invoice",
      dataIndex: "invoice",
      key: "invoice",
      render: (invoice: string) => <Text code>{invoice}</Text>
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => new Date(date).toLocaleDateString()
    }
  ];

  return (
    <div style={{ padding: "24px", background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Header */}
      <Card style={{ marginBottom: "24px", borderRadius: "8px" }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ margin: 0 }}>Billing Dashboard</Title>
            <Text type="secondary">Manage your POS subscription for {shops.length} shops</Text>
          </Col>
          <Col>
            <Space>
              {activeInvoice ? (
                <>
                  <PayCircleOutlined style={{ color: "#fa8c16", fontSize: "20px" }} />
                  <Text strong style={{ color: "#fa8c16" }}>Payment Due</Text>
                </>
              ) : (
                <>
                  <CheckCircleOutlined style={{ color: "#52c41a", fontSize: "20px" }} />
                  <Text strong style={{ color: "#52c41a" }}>Account Current</Text>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Active Invoice or Current Plan */}
      {activeInvoice ? (
        <Card style={{ marginBottom: "24px", borderRadius: "8px", border: "2px solid #fa8c16" }}>
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={16}>
              <Space direction="vertical" size="middle">
                <Space>
                  <PayCircleOutlined style={{ color: "#fa8c16", fontSize: "24px" }} />
                  <div>
                    <Title level={4} style={{ margin: 0, color: "#fa8c16" }}>
                      Outstanding Invoice
                    </Title>
                    <Text type="secondary">Payment required for continued service</Text>
                  </div>
                </Space>

                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text type="secondary">Invoice ID</Text>
                    <br />
                    <Text code strong>{activeInvoice.id}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Due Date</Text>
                    <br />
                    <Text strong>{new Date(activeInvoice.dueDate).toLocaleDateString()}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Amount</Text>
                    <br />
                    <Text strong style={{ fontSize: "18px", color: "#fa8c16" }}>
                      KES {activeInvoice.amount.toLocaleString()}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Plan</Text>
                    <br />
                    <Tag color={subscriptionPlans[activeInvoice.plan.toLowerCase()]?.color}>
                      {subscriptionPlans[activeInvoice.plan.toLowerCase()]?.icon} {activeInvoice.plan}
                    </Tag>
                  </Col>
                </Row>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Button
                type="primary"
                size="large"
                block
                style={{ backgroundColor: "#fa8c16", height: "48px" }}
                onClick={() => setPaymentModalVisible(true)}
              >
                Pay Now
              </Button>
            </Col>
          </Row>
        </Card>
      ) : (
        <Card style={{ marginBottom: "24px", borderRadius: "8px" }}>
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={12}>
              <Space direction="vertical" size="middle">
                <Space>
                  <div style={{
                    background: subscriptionPlans[currentSubscription].color,
                    borderRadius: "50%",
                    padding: "12px",
                    color: "white",
                    fontSize: "24px"
                  }}>
                    {subscriptionPlans[currentSubscription].icon}
                  </div>
                  <div>
                    <Text type="secondary">Current Plan</Text>
                    <br />
                    <Title level={3} style={{ margin: 0 }}>
                      {subscriptionPlans[currentSubscription].name}
                    </Title>
                    <Text strong style={{ fontSize: "18px", color: subscriptionPlans[currentSubscription].color }}>
                      KES {totalMonthlyAmount.toLocaleString()}/month total
                    </Text>
                    <br />
                    <Text type="secondary">
                      KES {subscriptionPlans[currentSubscription].price.toLocaleString()} × {shops.length} shops
                    </Text>
                  </div>
                </Space>

                <div>
                  <Text strong style={{ marginBottom: "8px", display: "block" }}>Active Shops:</Text>
                  {shops.map((shop, index) => (
                    <div key={index} style={{ marginBottom: "4px" }}>
                      <ShopOutlined style={{ color: primaryColor, marginRight: "8px" }} />
                      <Text>{shop.name} - {shop.location}</Text>
                    </div>
                  ))}
                </div>
              </Space>
            </Col>

            <Col xs={24} md={12}>
              <Alert
                message="Account Up to Date"
                description="Next billing: August 14, 2025. No outstanding payments."
                type="success"
                showIcon
                style={{ marginBottom: "16px" }}
              />
              <Button
                type="primary"
                size="large"
                block
                style={{ backgroundColor: primaryColor }}
                onClick={() => setPlanUpdateModalVisible(true)}
              >
                Change Plan
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* Transaction Tables */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Payment History" style={{ borderRadius: "8px" }}>
            <Table
              columns={paymentColumns}
              dataSource={payments}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Invoice History" style={{ borderRadius: "8px" }}>
            <Table
              columns={invoiceColumns}
              dataSource={pastInvoices}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Payment Modal */}
      <Modal
        title="Complete Payment"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={500}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card style={{ background: "#f9f9f9" }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary">Invoice</Text>
                <br />
                <Text code strong>{activeInvoice?.id}</Text>
              </Col>
              <Col>
                <Text type="secondary">Total Amount</Text>
                <br />
                <Title level={4} style={{ margin: 0, color: primaryColor }}>
                  KES {activeInvoice?.amount.toLocaleString()}
                </Title>
              </Col>
            </Row>
          </Card>

          <Alert
            message="Payment for All Shops"
            description={`This payment covers subscription for all ${shops.length} shops: ${shops.map(s => s.name).join(", ")}`}
            type="info"
            showIcon
          />

          <div>
            <Text strong>Choose Payment Method</Text>
            <Radio.Group
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              style={{ width: "100%", marginTop: "16px" }}
            >
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Radio value="card">
                  <Card hoverable>
                    <Space>
                      <CreditCardOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
                      <div>
                        <Text strong>Credit/Debit Card</Text>
                        <br />
                        <Text type="secondary">Visa, Mastercard</Text>
                      </div>
                    </Space>
                  </Card>
                </Radio>
                <Radio value="mpesa">
                  <Card hoverable>
                    <Space>
                      <MobileOutlined style={{ fontSize: "24px", color: "#52c41a" }} />
                      <div>
                        <Text strong>M-Pesa</Text>
                        <br />
                        <Text type="secondary">Mobile money payment</Text>
                      </div>
                    </Space>
                  </Card>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          <Card style={{ background: "#e6f7ff", border: "1px solid #91d5ff" }}>
            <Space>
              <SafetyCertificateOutlined style={{ color: "#1890ff" }} />
              <div>
                <Text strong style={{ color: "#1890ff" }}>Secured by PayStack</Text>
                <br />
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  Your payment information is encrypted and secure
                </Text>
              </div>
            </Space>
          </Card>

          <Button
            type="primary"
            size="large"
            block
            style={{ backgroundColor: "#52c41a", height: "48px" }}
            onClick={handlePayment}
          >
            Pay KES {activeInvoice?.amount.toLocaleString()}
          </Button>
        </Space>
      </Modal>

      {/* Plan Update Modal */}
      <Modal
        title="Change Subscription Plan"
        open={planUpdateModalVisible}
        onCancel={() => {
          setPlanUpdateModalVisible(false);
          setSelectedNewPlan("");
        }}
        footer={null}
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Card style={{ background: "#f0f5ff" }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  {subscriptionPlans[currentSubscription].icon}
                  <div>
                    <Text type="secondary">Current Plan</Text>
                    <br />
                    <Text strong style={{ color: subscriptionPlans[currentSubscription].color }}>
                      {subscriptionPlans[currentSubscription].name}
                    </Text>
                  </div>
                </Space>
              </Col>
              <Col>
                <Text strong>KES {totalMonthlyAmount.toLocaleString()}/month</Text>
                <br />
                <Text type="secondary">{shops.length} shops</Text>
              </Col>
            </Row>
          </Card>

          <Alert
            message="Plan Change for All Shops"
            description={`Changing your plan will apply to all ${shops.length} shops. Your next bill will reflect the new pricing.`}
            type="info"
            showIcon
          />

          <div>
            <Text strong>Select New Plan</Text>
            <Radio.Group
              value={selectedNewPlan}
              onChange={(e) => setSelectedNewPlan(e.target.value)}
              style={{ width: "100%", marginTop: "16px" }}
            >
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {Object.entries(subscriptionPlans).map(([key, plan]) => (
                  <Radio key={key} value={key} disabled={key === currentSubscription}>
                    <Card
                      hoverable={key !== currentSubscription}
                      style={{
                        width: "100%",
                        opacity: key === currentSubscription ? 0.5 : 1,
                        border: selectedNewPlan === key ? `2px solid ${plan.color}` : '1px solid #f0f0f0'
                      }}
                    >
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Space>
                            <div style={{ fontSize: "24px", color: plan.color }}>
                              {plan.icon}
                            </div>
                            <div>
                              <Space>
                                <Text strong style={{ color: plan.color }}>{plan.name}</Text>
                                {key === currentSubscription && <Tag color="blue">Current</Tag>}
                              </Space>
                              <br />
                              <Text>KES {(plan.price * shops.length).toLocaleString()}/month total</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: "12px" }}>
                                KES {plan.price.toLocaleString()} × {shops.length} shops
                              </Text>
                            </div>
                          </Space>
                        </Col>
                        <Col>
                          {key !== currentSubscription && (
                            <div style={{ textAlign: "right" }}>
                              <Text strong style={{
                                color: plan.price > subscriptionPlans[currentSubscription].price ? "#52c41a" : "#fa541c"
                              }}>
                                {plan.price > subscriptionPlans[currentSubscription].price ?
                                  `+KES ${((plan.price - subscriptionPlans[currentSubscription].price) * shops.length).toLocaleString()}` :
                                  `-KES ${((subscriptionPlans[currentSubscription].price - plan.price) * shops.length).toLocaleString()}`
                                }
                              </Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: "12px" }}>
                                {plan.price > subscriptionPlans[currentSubscription].price ? "upgrade" : "downgrade"}
                              </Text>
                            </div>
                          )}
                        </Col>
                      </Row>
                    </Card>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>

          <Button
            type="primary"
            size="large"
            block
            style={{
              backgroundColor: selectedNewPlan ? subscriptionPlans[selectedNewPlan]?.color : "#d9d9d9",
              height: "48px"
            }}
            onClick={handlePlanUpdate}
            disabled={!selectedNewPlan}
          >
            {selectedNewPlan && subscriptionPlans[selectedNewPlan].price > subscriptionPlans[currentSubscription].price ?
              `Upgrade to ${subscriptionPlans[selectedNewPlan]?.name}` :
              selectedNewPlan ? `Switch to ${subscriptionPlans[selectedNewPlan]?.name}` :
                "Select a plan"
            }
          </Button>
        </Space>
      </Modal>
    </div>
  );
};

export default BillingDashboard;