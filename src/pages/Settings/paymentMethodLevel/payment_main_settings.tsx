import { ProCard } from "@ant-design/pro-components";
import PaymentsMethodSettings from "./PaymentSettings";


function PaymentMainSettings() {
  const tabsItems = [
    {
      key: "table1",
      tab: "Table",
      label: "Add Payment Method",
      children: <PaymentsMethodSettings />,
    },
  ];
  return (
    <>
      <ProCard
        title="Payment Method Main Settings"
        tabs={{
          type: "card",
          items: tabsItems,
        }}
      />
    </>
  );
}

export default PaymentMainSettings;
