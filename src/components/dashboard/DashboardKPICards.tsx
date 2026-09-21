import React from "react";
import { Row, Col, Typography, Space, Skeleton, Tooltip } from "antd";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MedicineBoxOutlined,
  HomeOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { fmtK } from "@utils/formatters";

const { Text } = Typography;

interface KPICardsProps {
  revenue: number;
  totalOrders: number;
  avgOrderValue?: number;
  growthRate?: number | null;
  activeOrders?: number;
  activeShifts?: number;
  activeShops?: number;
  loading?: boolean;
  hospital?: boolean;
  hotel?: boolean;
  isAdmin?: boolean;
  isMobile?: boolean;
  onOrdersClick?: () => void;
  onShopsClick?: () => void;
  onShiftsClick?: () => void;
}

const useIsMobileHook = () => {
  const [mobile, setMobile] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  React.useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
};

const DashboardKPICards: React.FC<KPICardsProps> = ({
  revenue = 0,
  totalOrders = 0,
  avgOrderValue = 0,
  growthRate,
  activeOrders = 0,
  activeShifts = 0,
  activeShops = 0,
  loading = false,
  hospital = false,
  hotel = false,
  isAdmin = false,
  isMobile: isMobileProp,
  onOrdersClick,
  onShopsClick,
  onShiftsClick,
}) => {
  const detectedMobile = useIsMobileHook();
  const isMobile = isMobileProp !== undefined ? isMobileProp : detectedMobile;
  const calculatedAOV = avgOrderValue || (totalOrders > 0 ? Math.round(revenue / totalOrders) : 0);

  const cards = [
    {
      title: "Total Revenue",
      value: `Ksh ${fmtK(revenue)}`,
      icon: <DollarOutlined />,
      color: "#10b981",
      bgColor: "#f0fdf4",
      borderColor: "#bbf7d0",
      subtext: growthRate !== null && growthRate !== undefined ? (
        <Space size={4}>
          {growthRate >= 0 ? (
            <ArrowUpOutlined style={{ color: "#10b981", fontSize: 11 }} />
          ) : (
            <ArrowDownOutlined style={{ color: "#ef4444", fontSize: 11 }} />
          )}
          <Text style={{ fontSize: 11, color: growthRate >= 0 ? "#10b981" : "#ef4444", fontWeight: 500 }}>
            {Math.abs(growthRate).toFixed(1)}% vs last period
          </Text>
        </Space>
      ) : (
        <Text style={{ fontSize: 11, color: "#64748b" }}>Gross sales recorded</Text>
      ),
    },
    {
      title: hospital ? "Patient Visits" : hotel ? "Total Bookings" : "Total Orders",
      value: totalOrders.toLocaleString(),
      icon: hospital ? <MedicineBoxOutlined /> : hotel ? <HomeOutlined /> : <ShoppingCartOutlined />,
      color: "#3b82f6",
      bgColor: "#eff6ff",
      borderColor: "#bfdbfe",
      onClick: onOrdersClick,
      subtext: (
        <Text style={{ fontSize: 11, color: "#64748b" }}>
          {totalOrders > 0 ? "Completed transactions" : "No orders yet"}
        </Text>
      ),
    },
    {
      title: hospital ? "Average Bill" : hotel ? "Avg Booking Value" : "Avg Order Value (AOV)",
      value: `Ksh ${fmtK(calculatedAOV)}`,
      icon: <RiseOutlined />,
      color: "#f59e0b",
      bgColor: "#fffbeb",
      borderColor: "#fde68a",
      subtext: (
        <Text style={{ fontSize: 11, color: "#64748b" }}>
          Average customer spend
        </Text>
      ),
    },
    {
      title: isAdmin ? "Active Network" : "Active Operations",
      value: isAdmin ? `${activeShops} Shops` : `${activeOrders} Active`,
      icon: isAdmin ? <ShopOutlined /> : <TeamOutlined />,
      color: "#8b5cf6",
      bgColor: "#f5f3ff",
      borderColor: "#ddd6fe",
      onClick: isAdmin ? onShopsClick : onShiftsClick,
      subtext: (
        <Space size={8}>
          <span style={{ fontSize: 11, color: "#64748b" }}>
            {activeShifts} Staff Shifts
          </span>
          {!isAdmin && activeOrders > 0 && (
            <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600 }}>
              • {activeOrders} pending
            </span>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
      {cards.map((card, i) => (
        <Col xs={12} sm={12} lg={6} key={i}>
          <div
            onClick={card.onClick}
            style={{
              background: card.bgColor,
              borderRadius: isMobile ? 10 : 12,
              padding: isMobile ? "10px 10px" : "16px 18px",
              border: `1px solid ${card.borderColor}`,
              cursor: card.onClick ? "pointer" : "default",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              position: "relative",
              overflow: "hidden",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
            onMouseEnter={(e) => {
              if (card.onClick) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
              }
            }}
            onMouseLeave={(e) => {
              if (card.onClick) {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            {loading ? (
              <Skeleton active paragraph={false} />
            ) : (
              <Space direction="vertical" size={isMobile ? 2 : 3} style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                  <Text
                    style={{
                      fontSize: isMobile ? 11 : 12,
                      color: "#475569",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {card.title}
                  </Text>
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: isMobile ? 6 : 8,
                      padding: isMobile ? "3px 5px" : "4px 6px",
                      color: card.color,
                      fontSize: isMobile ? 12 : 14,
                      lineHeight: 1,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: isMobile ? 17 : 22,
                    fontWeight: 700,
                    color: "#0f172a",
                    letterSpacing: -0.3,
                    marginTop: 2,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={typeof card.value === "string" ? card.value : undefined}
                >
                  {card.value}
                </div>

                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {card.subtext}
                </div>
              </Space>
            )}
          </div>
        </Col>
      ))}
    </Row>
  );
};

export default DashboardKPICards;
