import { useState } from "react";
import { Typography, Space, Tabs } from "antd";
import { CalendarOutlined, UnorderedListOutlined } from "@ant-design/icons";
import BookingsList from "./BookingsList";
import { ProCard } from "@ant-design/pro-components";
import CalendarView from "./CalendarView";

const SpaReservationSystem = () => {
  const [activeTab, setActiveTab] = useState("calendar");

  const tabItems = [
    {
      key: "calendar",
      icon: <CalendarOutlined />,
      label: "Calendar View",
      children: <CalendarView />,
    },
    {
      key: "list",
      icon: <UnorderedListOutlined />,
      label: "Bookings List",
      children: <BookingsList />,
    },
  ];

  return (
    <div style={{ height: "90vh" }}>
      {/* Tabs Card */}
      <ProCard
        bordered={false}
        bodyStyle={{ padding: "0" }}
        title={
          <Space direction="vertical">
            <Typography.Text strong>Bookings</Typography.Text>
            <Typography.Text type="secondary">
              Appointment Management System
            </Typography.Text>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ height: "calc(100vh - 120px)" }}
          tabBarStyle={{
            padding: "0 24px",
            margin: 0,
            borderBottom: "1px solid #f0f0f0",
          }}
        />
      </ProCard>
    </div>
  );
};

export default SpaReservationSystem;
