import { ProCard } from "@ant-design/pro-components";
import { HolderOutlined, PrinterFilled } from "@ant-design/icons";
import { Space } from "antd/lib";
import InvoiceTable from "./InvoiceTable";

function Invoices() {
  const tabsItems = [
    {
      key: "Invoices",
      tab: "invoices",
      label: (
        <Space>
        <HolderOutlined/>
          Invoices
        </Space>
      ),
      children: <InvoiceTable />,
    },
  ];
  return (
    <>
      <ProCard
        title={
          <Space>
            <PrinterFilled />
            List of all Invoices Printed
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

export default Invoices;
