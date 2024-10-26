import { ProCard } from "@ant-design/pro-components";
import SupplierTable from "./Supplier";
import { SisternodeOutlined } from "@ant-design/icons";
import { Space } from "antd/lib";

function SupplierMainSettings() {
  const tabsItems = [
    {
      key: "table1",
      tab: "Table",
      label: "All Suppliers",
      children: <SupplierTable />,
    },
  ];
  return (
    <>
      <ProCard
        // style={{ height: "90vh" }}
        title={<Space><SisternodeOutlined />Supplier Main Settings</Space>}
        tabs={{
          type: "card",
          items: tabsItems,
        }}
      />
    </>
  );
}

export default SupplierMainSettings;
