import { ProCard } from "@ant-design/pro-components";
import PaymentsMethodSettings from "./PaymentSettings";
import { Space } from "antd/lib";
import { DollarCircleOutlined } from "@ant-design/icons";


function PaymentMainSettings() {
  const tabsItems = [
    {
      key: "table1",
      tab: "Table",
      label: "All Payment Methods",
      children: <PaymentsMethodSettings />,
    },
  ];
  return (
    <>
      <ProCard
       style={{ height: "90vh" }}
       title={<Space><DollarCircleOutlined/>Payment Method Main Settings</Space>}
        tabs={{
          type: "card",
          items: tabsItems,
        }}
      />
    </>
  );
}

export default PaymentMainSettings;
