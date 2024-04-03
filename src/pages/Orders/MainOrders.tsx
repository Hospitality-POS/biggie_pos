import { ProCard } from "@ant-design/pro-components";
import { FileExclamationTwoTone, PaperClipOutlined } from "@ant-design/icons";
import { Space } from "antd/lib";
import OrdersTable from "./OrdersTable";


function MainOrders() {
  const tabsItems = [
    {
      key: "Orders",
      tab: "order",
      label: (
        <>
          <PaperClipOutlined />
          Orders
        </>
      ),
      children: <OrdersTable />,
    },
  ];
  return (
    <>
      <ProCard
        title={
          <Space>
            <FileExclamationTwoTone />
            List of all Orders
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

export default MainOrders;
