
import React from "react";
import { ProCard } from "@ant-design/pro-components";
import { OrderedListOutlined, ShoppingCartOutlined, CalendarOutlined } from "@ant-design/icons";
import { Space, Typography, DatePicker, Button, Radio } from "antd";
import OrdersTable from "./OrdersTable";

const { Title } = Typography;
const { RangePicker } = DatePicker;

function MainOrders() {
  const [dateFilterType, setDateFilterType] = React.useState("all");
  const [dateRange, setDateRange] = React.useState(null);

  // Function to handle preset date filters
  const handleDateFilterChange = (e) => {
    const filterType = e.target.value;
    setDateFilterType(filterType);

    const today = new Date();
    let startDate = null;
    let endDate = null;

    switch (filterType) {
      case "today":
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today.setHours(23, 59, 59, 999));
        break;
      case "yesterday":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "currentWeek":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
        endDate.setHours(23, 59, 59, 999);
        break;
      case "lastWeek":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() - 7); // Last week's Sunday
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setDate(startDate.getDate() + 6); // Last week's Saturday
        endDate.setHours(23, 59, 59, 999);
        break;
      case "currentMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "custom":
        // Don't set dates here, let the user pick from the RangePicker
        break;
      default:
        // "all" - no date filtering
        startDate = null;
        endDate = null;
    }

    setDateRange(startDate && endDate ? [startDate, endDate] : null);
  };

  // Function to handle custom date range selection
  const handleCustomDateChange = (dates) => {
    if (dates) {
      setDateFilterType("custom");
      setDateRange(dates);
    } else {
      setDateFilterType("all");
      setDateRange(null);
    }
  };

  // Filter parameters to pass to OrdersTable
  const filterParams = dateRange ? {
    start_date: dateRange[0].toISOString(),
    end_date: dateRange[1].toISOString()
  } : {};

  return (
    <ProCard
      bordered
      title={
        <Space>
          <OrderedListOutlined style={{ fontSize: "18px", color: "#6c1c2c" }} />
          <Title level={4} style={{ margin: 0 }}>
            List of All Orders
          </Title>
        </Space>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "orders",
        size: "large",
      }}
      extra={
        <Space size="middle" align="center">
          <Radio.Group
            value={dateFilterType}
            onChange={handleDateFilterChange}
            buttonStyle="solid"
            optionType="button"
          >
            <Radio.Button value="all">All Time</Radio.Button>
            <Radio.Button value="today">Today</Radio.Button>
            <Radio.Button value="yesterday">Yesterday</Radio.Button>
            <Radio.Button value="currentWeek">Current Week</Radio.Button>
            <Radio.Button value="lastWeek">Last Week</Radio.Button>
            <Radio.Button value="currentMonth">Current Month</Radio.Button>
            <Radio.Button value="custom">Custom</Radio.Button>
          </Radio.Group>

          {dateFilterType === "custom" && (
            <RangePicker
              value={dateRange}
              onChange={handleCustomDateChange}
              format="YYYY-MM-DD"
            />
          )}
        </Space>
      }
    >
      <ProCard.TabPane
        key="orders"
        tab={
          <Space>
            <ShoppingCartOutlined
              style={{ color: "#1890ff", fontSize: "18px" }}
            />
            <Typography.Text>Orders</Typography.Text>
          </Space>
        }
      >
        <OrdersTable filterParams={filterParams} />
      </ProCard.TabPane>
    </ProCard>
  );
}

export default MainOrders;