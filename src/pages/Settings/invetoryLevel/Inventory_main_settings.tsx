import { ProCard } from "@ant-design/pro-components";
import { Typography } from "antd";
import {
  CalendarOutlined,
  DatabaseOutlined,
  ShopOutlined,
  TruckOutlined,
  FileTextOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import InventorySettings from "./InventorySettings";
import DeliverySettings from "./DeliverySettings";
import UomSettings from "./UomSettings";
import PurchaseOrderSettings from "./purchaseOrders/PurchaseOrderSettings";
import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import MaterialTransferSettings from "./MaterialTransferSettings";

const { Title } = Typography;

function InventoryMainSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "uom"; // Default to 'uom' if no tab param

  // Handle tab change
  const handleTabChange = (key: string) => {
    // Update URL search params without page reload
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", key);
    setSearchParams(newSearchParams);
  };

  const tabItems = useMemo(
    () => [
      {
        key: "uom",
        label: (
          <span>
            <DatabaseOutlined />
            <span>Units of Measure</span>
          </span>
        ),
        children: <UomSettings />,
      },
      {
        key: "inventory",
        label: (
          <span>
            <ShopOutlined style={{ color: "#52c41a" }} />
            <span>Inventory</span>
          </span>
        ),
        children: <InventorySettings />,
      },
      {
        key: "purchase-orders",
        label: (
          <span>
            <FileTextOutlined style={{ color: "#722ed1" }} />
            <span>Purchase Orders</span>
          </span>
        ),
        children: <PurchaseOrderSettings />,
      },
      {
        key: "delivery",
        label: (
          <span>
            <TruckOutlined style={{ color: "#1890ff" }} />
            <span>Delivery</span>
          </span>
        ),
        children: <DeliverySettings />,
      },
      {
        key: "material-transfers",
        label: (
          <span>
            <SwapOutlined style={{ color: "#fa8c16" }} />
            <span>Material Transfers</span>
          </span>
        ),
        children: <MaterialTransferSettings />,
      },
    ],
    []
  );

  return (
    <ProCard
      bordered
      title={
        <Title
          level={4}
          style={{ display: "flex", alignItems: "center", margin: 0 }}
        >
          <CalendarOutlined style={{ marginRight: 8 }} />
          Inventory Management
        </Title>
      }
      tabs={{
        type: "card",
        activeKey: activeTab,
        onChange: handleTabChange,
        size: "large",
        items: tabItems,
      }}
    />
  );
}

export default InventoryMainSettings;