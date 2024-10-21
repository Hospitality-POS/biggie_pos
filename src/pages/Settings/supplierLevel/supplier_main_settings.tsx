import { ProCard } from "@ant-design/pro-components";
import SupplierTable from "./Supplier";
import { SisternodeOutlined } from "@ant-design/icons";
import { Space } from "antd/lib";
import EmployeeShiftSchedule from "./Employee";

function SupplierMainSettings() {
  const tabsItems = [
    {
      key: "table1",
      tab: "Table",
      label: "All Suppliers",
      children: <SupplierTable />,
    },
    {
      key: "table2",
      tab: "Table 2",
      label: "Employee ",
      children: <EmployeeShiftSchedule />,
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
