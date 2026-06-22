import React, { useState } from "react";
import { Typography, Card, Button, Space, Tabs } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import RestaurantShiftSchedule from "@pages/EmployeeShift/RestaurantShiftSchedule";
import ShiftSchedulesListView from "./ShiftSchedulesListView";

const { Title } = Typography;

const ShiftSchedulesList: React.FC = () => {
  const [activeTab, setActiveTab] = useState("timeline");

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            Shift Management
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </Space>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "timeline",
              label: "Timeline View",
              children: <RestaurantShiftSchedule />,
            },
            {
              key: "schedules",
              label: "Shift Schedules",
              children: <ShiftSchedulesListView />,
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default ShiftSchedulesList;
