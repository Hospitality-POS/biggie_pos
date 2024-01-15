import { ProCard } from "@ant-design/pro-components";
import PaymentsMethodSettings from "./PaymentSettings";
import { Space } from "antd/lib";
import { DollarCircleOutlined } from "@ant-design/icons";
import Inventory from "../Inventory";


function InventoryMainSettings() {
  const tabsItems = [
    {
      key: "table1",
      tab: "Table",
      label: "All Inventory",
      children: <Inventory />,
    },
  ];
  return (
    <>
      <ProCard
       style={{ height: "90vh" }}
       title={<Space><DollarCircleOutlined/>Inventory Main Settings</Space>}
        tabs={{
          type: "card",
          items: tabsItems,
        }}
      />
    </>
  );
}

export default InventoryMainSettings;
