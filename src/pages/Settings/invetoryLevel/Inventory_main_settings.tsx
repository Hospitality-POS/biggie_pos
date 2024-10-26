import { ProCard } from "@ant-design/pro-components";
import { Space } from "antd";
import { CalendarOutlined, DatabaseOutlined } from "@ant-design/icons";
import InventorySettings from "./InventorySettings";
import DeliverySettings from "./DeliverySettings";
import UomSettings from "./UomSettings";

function InventoryMainSettings() {
  const tabsItems = [
    {
      key: "table0",
      tab: "Unit of Measure",
      label: (
        <Space>
          <DatabaseOutlined />
          Unit of Measure
        </Space>
      ),
      children: <UomSettings />,
    },
    {
      key: "table1",
      tab: "Inventory",
      label: (
        <Space>
          <DatabaseOutlined />
          Inventory
        </Space>
      ),
      children: <InventorySettings />,
    },
    {
      key: "table2",
      tab: "delivery",
      label: (
        <Space>
          <DatabaseOutlined />
          Deliveries
        </Space>
      ),
      children: <DeliverySettings />,
    },
  ];
  return (
    <>
      <ProCard
        title={
          <Space>
            <CalendarOutlined />
            Inventory Main Settings
          </Space>
        }
        tabs={{
          type: "card",
          items: tabsItems,
        }}
      />
    </>
  );
}

export default InventoryMainSettings;
