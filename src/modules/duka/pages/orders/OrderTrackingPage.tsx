import React from "react";
import { Button, Empty, Spin, Typography } from "antd";
import { FieldTimeOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import OrderTrackingPanel from "./components/OrderTrackingPanel";
import { getOrderTrackingSettings } from "@services/orderTracking";
import { THEME_C } from "@utils/getPrimaryColor";
import { useIsCompact } from "@hooks/useIsCompact";

const { Text } = Typography;
const C = THEME_C;

// /order-tracking — its own page in the nav, next to Orders. Kitchen and bar
// staff keep the live board open here and tap Ready; managers read the stage
// times.
const OrderTrackingPage: React.FC = () => {
  const isCompact = useIsCompact();
  const navigate = useNavigate();
  const shopId = localStorage.getItem("shopId") || "";
  const prefix = window.location.pathname.startsWith("/admin") ? "/admin" : "";

  const { data, isLoading } = useQuery({
    queryKey: ["orderTrackingSettings", shopId],
    queryFn: () => getOrderTrackingSettings(shopId),
    enabled: !!shopId,
    staleTime: 60_000,
  });

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: isCompact ? "12px" : "14px 18px",
          background: C.bg, borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            background: "#ecfeff", borderRadius: 8, padding: "5px 7px",
            color: "#0891b2", fontSize: 16, lineHeight: 1,
          }}
        >
          <FieldTimeOutlined />
        </div>
        <div>
          <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Order Tracking</Text>
          <Text style={{ fontSize: 12, color: C.subText }}>
            Kitchen and bar tap Ready · see where orders wait
          </Text>
        </div>
      </div>

      <div style={{ padding: isCompact ? "10px" : "16px 18px" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}><Spin /></div>
        ) : data?.enabled ? (
          <OrderTrackingPanel />
        ) : (
          <Empty
            description="Order tracking is off for this shop. Turn it on in System Setup → Privacy."
          >
            <Button type="primary" onClick={() => navigate(`${prefix}/system-setup`)}>
              Open System Setup
            </Button>
          </Empty>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
