import { ProCard } from "@ant-design/pro-components";
import PaymentsMethodSettings from "./PaymentSettings";
import { Space } from "antd/lib";
import { CalendarOutlined, DollarCircleOutlined } from "@ant-design/icons";
import InventorySettings from "./InventorySettings";
import Inventory from "../Inventory";



function InventoryMainSettings() {
  const tabsItems = [
    {
      key: "table1",
      tab: "Table",
      label: "All Inventory",
      children: <InventorySettings />,
    },
  ];
  return (
    <>
      <ProCard
       style={{ height: "90vh" }}
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
