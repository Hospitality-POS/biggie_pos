import { ProCard } from "@ant-design/pro-components";
import { HolderOutlined, OrderedListOutlined } from "@ant-design/icons";
import { Space } from "antd/lib";
import OrdersTable from "./OrdersTable";


function MainOrders() {
  const tabsItems = [
    {
      key: "Orders",
      tab: "order",
      label: (
        <>
          <HolderOutlined />
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
            <OrderedListOutlined />
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
