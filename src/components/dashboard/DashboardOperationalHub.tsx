import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  Tabs,
  Table,
  Badge,
  Typography,
  Space,
  Button,
  Tag,
  Progress,
  Row,
  Col,
  Empty,
  Skeleton,
} from "antd";
import {
  ShoppingCartOutlined,
  WarningOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fmtK } from "@utils/formatters";

const { Text } = Typography;

interface OperationalHubProps {
  orders: any[];
  totalOrdersCount?: number;
  lowStockItems: any[];
  purchaseOrderStats?: {
    totalPurchaseOrders: number;
    totalPOValue: number;
    pendingPOs: number;
    approvedPOs: number;
    deliveredPOs: number;
    avgPOValue: number;
    recentPurchaseOrders: any[];
  };
  loading?: boolean;
  isMobile?: boolean;
  hospital?: boolean;
  hotel?: boolean;
}

const useIsMobileHook = () => {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  React.useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
};

const DashboardOperationalHub: React.FC<OperationalHubProps> = ({
  orders = [],
  totalOrdersCount = 0,
  lowStockItems = [],
  purchaseOrderStats,
  loading = false,
  isMobile: isMobileProp,
  hospital = false,
  hotel = false,
}) => {
  const detectedMobile = useIsMobileHook();
  const isMobile = isMobileProp !== undefined ? isMobileProp : detectedMobile;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");

  const poStats = purchaseOrderStats || {
    totalPurchaseOrders: 0,
    totalPOValue: 0,
    pendingPOs: 0,
    approvedPOs: 0,
    deliveredPOs: 0,
    avgPOValue: 0,
    recentPurchaseOrders: [],
  };

  const deliveryRate = poStats.totalPurchaseOrders > 0
    ? Math.round((poStats.deliveredPOs / poStats.totalPurchaseOrders) * 100)
    : 0;

  // ── Tab 1: Orders Columns ──────────────────────────────────────────────────
  const orderColumns = isMobile
    ? [
        {
          title: "Order No",
          dataIndex: "order_no",
          key: "order_no",
          width: 100,
          render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
          title: "Amount",
          dataIndex: "order_amount",
          key: "order_amount",
          render: (amount: number) => (
            <Text strong style={{ color: "#10b981", fontSize: 12 }}>
              Ksh {Number(amount || 0).toLocaleString()}
            </Text>
          ),
        },
        {
          title: hospital ? "Ward/Bed" : hotel ? "Room" : "Table",
          dataIndex: "table",
          key: "table",
          width: 80,
          render: (t: string) => <span style={{ fontSize: 11, color: "#64748b" }}>{t || "-"}</span>,
        },
      ]
    : [
        {
          title: "Order No",
          dataIndex: "order_no",
          key: "order_no",
          width: 130,
          render: (v: string) => (
            <Text strong style={{ fontSize: 12, color: "#0f172a" }}>
              {v}
            </Text>
          ),
        },
        {
          title: hospital ? "Ward / Bed" : hotel ? "Room" : "Table / Destination",
          dataIndex: "table",
          key: "table",
          width: 120,
          render: (t: string) => (
            <Tag color="default" style={{ borderRadius: 4, fontSize: 11 }}>
              {t || "Walk-in"}
            </Tag>
          ),
        },
        {
          title: "Served By",
          dataIndex: "servedBy",
          key: "servedBy",
          ellipsis: true,
          render: (s: string) => (
            <Space size={4}>
              <UserOutlined style={{ color: "#94a3b8", fontSize: 11 }} />
              <span style={{ fontSize: 12, color: "#475569" }}>{s || "Staff"}</span>
            </Space>
          ),
        },
        {
          title: "Amount",
          dataIndex: "order_amount",
          key: "order_amount",
          width: 130,
          align: "right" as const,
          render: (amount: number) => (
            <Text strong style={{ color: "#10b981", fontSize: 13 }}>
              Ksh {Number(amount || 0).toLocaleString()}
            </Text>
          ),
        },
      ];

  // ── Tab 2: Stock Columns ───────────────────────────────────────────────────
  const stockColumns = isMobile
    ? [
        {
          title: "Item",
          dataIndex: "name",
          key: "name",
          ellipsis: true,
          render: (name: string) => <Text style={{ fontSize: 12 }}>{name}</Text>,
        },
        {
          title: "Qty",
          dataIndex: "quantity",
          key: "quantity",
          width: 60,
          render: (qty: number) => (
            <Text strong style={{ color: qty <= 0 ? "#ef4444" : "#f59e0b", fontSize: 12 }}>
              {qty}
            </Text>
          ),
        },
        {
          title: "Status",
          key: "status",
          width: 80,
          render: (_: any, record: any) => (
            <Badge
              status={record.quantity <= 0 ? "error" : "warning"}
              text={<span style={{ fontSize: 11 }}>{record.quantity <= 0 ? "Out" : "Low"}</span>}
            />
          ),
        },
      ]
    : [
        {
          title: "Item Name",
          dataIndex: "name",
          key: "name",
          ellipsis: true,
          render: (name: string) => (
            <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
              {name}
            </Text>
          ),
        },
        {
          title: "Shop / Branch",
          dataIndex: "shop_name",
          key: "shop_name",
          width: 140,
          ellipsis: true,
          render: (shop: string) => (
            <span style={{ fontSize: 12, color: "#64748b" }}>{shop || "Main"}</span>
          ),
        },
        {
          title: "Current Stock",
          dataIndex: "quantity",
          key: "quantity",
          width: 110,
          render: (qty: number) => (
            <Text strong style={{ color: qty <= 0 ? "#ef4444" : "#f59e0b", fontSize: 13 }}>
              {qty} {qty <= 0 ? "units" : "left"}
            </Text>
          ),
        },
        {
          title: "Min Viable",
          dataIndex: "min_viable_quantity",
          key: "min_viable_quantity",
          width: 100,
          render: (min: number) => (
            <span style={{ fontSize: 12, color: "#64748b" }}>{min || 0}</span>
          ),
        },
        {
          title: "Stock Health",
          key: "status",
          width: 130,
          render: (_: any, record: any) => {
            const isOut = record.quantity <= 0;
            return (
              <Tag
                color={isOut ? "error" : "warning"}
                style={{ borderRadius: 4, fontSize: 11, border: "none" }}
              >
                {isOut ? "OUT OF STOCK" : "LOW STOCK"}
              </Tag>
            );
          },
        },
      ];

  // ── Tab 3: PO Columns ──────────────────────────────────────────────────────
  const poColumns = isMobile
    ? [
        { title: "PO #", dataIndex: "po_number", key: "po_number", width: 90 },
        {
          title: "Status",
          dataIndex: "status",
          key: "status",
          render: (status: string) => (
            <Badge
              color={
                status === "fully_delivered" ? "#10b981" : status === "approved" ? "#3b82f6" : "#f59e0b"
              }
              text={<span style={{ fontSize: 11 }}>{status?.replace(/_/g, " ")}</span>}
            />
          ),
        },
        {
          title: "Amount",
          dataIndex: "total_amount",
          key: "total_amount",
          render: (v: number) => <Text strong style={{ fontSize: 12 }}>Ksh {fmtK(v || 0)}</Text>,
        },
      ]
    : [
        {
          title: "PO Number",
          dataIndex: "po_number",
          key: "po_number",
          width: 130,
          render: (po: string) => <Text code style={{ fontSize: 11 }}>{po}</Text>,
        },
        {
          title: "Supplier",
          dataIndex: "supplier_name",
          key: "supplier_name",
          ellipsis: true,
          render: (s: string) => <span style={{ fontSize: 12 }}>{s || "Supplier"}</span>,
        },
        {
          title: "Status",
          dataIndex: "status",
          key: "status",
          width: 130,
          render: (status: string) => {
            const color =
              status === "fully_delivered"
                ? "success"
                : status === "approved"
                ? "processing"
                : status === "cancelled"
                ? "error"
                : "warning";
            return (
              <Tag color={color} style={{ borderRadius: 4, fontSize: 11 }}>
                {status?.replace(/_/g, " ").toUpperCase()}
              </Tag>
            );
          },
        },
        {
          title: "Total Amount",
          dataIndex: "total_amount",
          key: "total_amount",
          width: 130,
          align: "right" as const,
          render: (amount: number) => (
            <Text strong style={{ color: "#3b82f6", fontSize: 12 }}>
              Ksh {Number(amount || 0).toLocaleString()}
            </Text>
          ),
        },
      ];

  const tabItems = [
    {
      key: "orders",
      label: (
        <Space size={isMobile ? 4 : 6}>
          <ShoppingCartOutlined />
          <span>{isMobile ? "Orders" : "Recent Orders"}</span>
          {orders.length > 0 && (
            <Badge
              count={orders.length}
              style={{ backgroundColor: "#3b82f6", fontSize: 10 }}
            />
          )}
        </Space>
      ),
      children: (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <Button
              type="link"
              size="small"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate("/orders")}
              style={{ fontSize: 12, paddingRight: 0 }}
            >
              View All Orders ({totalOrdersCount || orders.length})
            </Button>
          </div>
          <Table
            columns={orderColumns}
            dataSource={orders}
            pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
            size="small"
            scroll={isMobile ? { x: 360 } : undefined}
            rowKey={(r) => r.order_id || r._id || r.order_no || Math.random().toString()}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No recent orders in this period"
                  style={{ padding: "24px 0" }}
                />
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: "stock",
      label: (
        <Space size={isMobile ? 4 : 6}>
          <WarningOutlined style={{ color: lowStockItems.length > 0 ? "#ef4444" : undefined }} />
          <span>{isMobile ? "Inventory" : "Inventory Watchlist"}</span>
          {lowStockItems.length > 0 && (
            <Badge
              count={lowStockItems.length}
              style={{ backgroundColor: "#ef4444", fontSize: 10 }}
            />
          )}
        </Space>
      ),
      children: (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <Button
              type="link"
              size="small"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate("/inventory")}
              style={{ fontSize: 12, paddingRight: 0 }}
            >
              Open Inventory Management
            </Button>
          </div>
          <Table
            columns={stockColumns}
            dataSource={lowStockItems}
            pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
            size="small"
            scroll={isMobile ? { x: 360 } : undefined}
            rowKey={(r) => r._id || r.item_id || Math.random().toString()}
            locale={{
              emptyText: (
                <Empty
                  image={<CheckCircleOutlined style={{ fontSize: 32, color: "#10b981" }} />}
                  description="All items are well stocked"
                  style={{ padding: "24px 0" }}
                />
              ),
            }}
          />
        </div>
      ),
    },
    {
      key: "pos",
      label: (
        <Space size={isMobile ? 4 : 6}>
          <FileTextOutlined />
          <span>{isMobile ? "POs" : "Purchase Orders"}</span>
          {poStats.totalPurchaseOrders > 0 && (
            <Badge
              count={poStats.totalPurchaseOrders}
              style={{ backgroundColor: "#8b5cf6", fontSize: 10 }}
            />
          )}
        </Space>
      ),
      children: (
        <div>
          {poStats.totalPurchaseOrders > 0 && (
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col xs={12} sm={6}>
                <div style={{ background: "#f8fafc", padding: isMobile ? "6px 8px" : "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>Total PO Value</Text>
                  <Text strong style={{ fontSize: isMobile ? 13 : 14, color: "#10b981" }}>
                    Ksh {fmtK(poStats.totalPOValue)}
                  </Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ background: "#f8fafc", padding: isMobile ? "6px 8px" : "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>Pending Approval</Text>
                  <Text strong style={{ fontSize: isMobile ? 13 : 14, color: "#f59e0b" }}>
                    {poStats.pendingPOs} POs
                  </Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ background: "#f8fafc", padding: isMobile ? "6px 8px" : "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: "#64748b" }}>Fulfillment Rate</Text>
                    <Text strong style={{ fontSize: 11, color: "#3b82f6" }}>{deliveryRate}% Delivered</Text>
                  </div>
                  <Progress percent={deliveryRate} size="small" strokeColor="#3b82f6" showInfo={false} />
                </div>
              </Col>
            </Row>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <Button
              type="link"
              size="small"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate("/purchase-orders")}
              style={{ fontSize: 12, paddingRight: 0 }}
            >
              View All Purchase Orders ({poStats.totalPurchaseOrders})
            </Button>
          </div>
          <Table
            columns={poColumns}
            dataSource={poStats.recentPurchaseOrders || []}
            pagination={{ pageSize: 5, hideOnSinglePage: true, showSizeChanger: false }}
            size="small"
            scroll={isMobile ? { x: 360 } : undefined}
            rowKey={(r) => r._id || r.po_number || Math.random().toString()}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No purchase orders created in this period"
                  style={{ padding: "24px 0" }}
                />
              ),
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <ProCard
      bordered
      headerBordered
      size="small"
      style={{
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      title={
        <Space size={8}>
          <div
            style={{
              background: "#eff6ff",
              borderRadius: 8,
              padding: isMobile ? "3px 6px" : "4px 8px",
              color: "#3b82f6",
              display: "inline-flex",
              fontSize: isMobile ? 12 : 14,
            }}
          >
            <ShopOutlined />
          </div>
          <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
            Operations & Fulfillment Hub
          </Text>
        </Space>
      }
      bodyStyle={{ padding: isMobile ? "6px 8px 12px" : "8px 16px 16px" }}
    >
      {loading ? (
        <div style={{ padding: 20 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size={isMobile ? "small" : "middle"}
        />
      )}
    </ProCard>
  );
};

export default DashboardOperationalHub;
