import { ProCard } from "@ant-design/pro-components";
import { Space } from "antd/lib";
import { CalendarOutlined, HolderOutlined } from "@ant-design/icons";
import InventorySettings from "./InventorySettings";
import DeliverySettings from "./DeliverySettings";



function InventoryMainSettings() {
  const tabsItems = [
    {
      key: "table1",
      tab: "Inventory",
      label: <Space><HolderOutlined/>Inventory</Space>,
      children: <InventorySettings />,
    },
    {
      key: "table2",
      tab: "delivery",
      label: <Space><HolderOutlined/>Deliveries</Space>,
      children: <DeliverySettings />,
    }
  ];
  return (
    <>
      <ProCard
      //  style={{ height: "90vh" }}
       title={<Space><CalendarOutlined/>Inventory Main Settings</Space>}
        tabs={{
          type: "card",
          items: tabsItems,
        }}
      />
    </>
  );
}

export default InventoryMainSettings;
