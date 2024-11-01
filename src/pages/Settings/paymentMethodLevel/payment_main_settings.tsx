import { ProCard } from "@ant-design/pro-components";
import { Space, Typography, Divider } from "antd";
import { MoneyCollectOutlined } from "@ant-design/icons";
import PaymentsMethodSettings from "./PaymentSettings";

const { Text } = Typography;

function PaymentMainSettings() {
  return (
    <ProCard
      bordered
      title={
        <Typography.Title
          level={4}
          style={{
            display: "flex",
            alignItems: "center",
            margin: 0,
          }}
        >
          <MoneyCollectOutlined style={{ marginRight: 8 }} />
          Payment Method Settings
        </Typography.Title>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "uom",
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="payment"
        tab={
          <Space>
            <MoneyCollectOutlined />
            <Text>Payment Method</Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <PaymentsMethodSettings />
        </div>
      </ProCard.TabPane>

      <Divider style={{ margin: 0 }} />
    </ProCard>
  );
}

export default PaymentMainSettings;
