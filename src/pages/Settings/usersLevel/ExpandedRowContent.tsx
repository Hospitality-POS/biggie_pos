import React from "react";
import { ProDescriptions } from "@ant-design/pro-components";
import { Typography, List, Card, Tag, Space, Button } from "antd";
import {
  ClockCircleOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
  PrinterFilled,
} from "@ant-design/icons";

interface ClockRecord {
  _id: string;
  clock_in: string;
  clock_out?: string;
}

interface EmployeeRecord {
  pin: string;
  username: string;
  createdAt: string;
  phone: string;
  clockInArray: ClockRecord[];
}

interface ExpandedRowContentProps {
  record: EmployeeRecord;
}

const ExpandedRowContent: React.FC<ExpandedRowContentProps> = ({ record }) => {
  const { pin, username, createdAt, phone, clockInArray } = record;
  const formattedCreatedAt = new Date(createdAt).toLocaleString();

  const formatTimeDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const employeeInfo = [
    {
      title: "Username",
      dataIndex: "username",
      value: username,
    },
    {
      title: "Pin",
      dataIndex: "pin",
      value: pin,
    },
    {
      title: "Phone No.",
      dataIndex: "phone",
      value: phone,
    },
    {
      title: "Date created",
      dataIndex: "createdAt",
      value: formattedCreatedAt,
    },
  ];

  return (
    <div style={{ padding: "16px" }}>
      <ProDescriptions
        size="small"
        tooltip="Employee Information"
        layout="horizontal"
        title="Employee Details"
        dataSource={{ pin, username, createdAt: formattedCreatedAt, phone }}
        columns={employeeInfo}
      />

      <Card
        title={
          <Typography.Title level={5} style={{ margin: 0 }}>
            Clock In/Out History
          </Typography.Title>
        }
        style={{ marginTop: "16px" }}
      >
        <List
          size="small"
          dataSource={clockInArray}
          renderItem={(record: ClockRecord) => {
            const clockIn = formatTimeDisplay(record.clock_in);
            const clockOut = record.clock_out
              ? formatTimeDisplay(record.clock_out)
              : null;

            return (
              <List.Item
                key={record._id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "start",
                }}
              >
                <Space direction="vertical" size="small">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <CalendarOutlined style={{ color: "#1890ff" }} />
                    <span style={{ fontWeight: "500" }}>{clockIn.date}</span>
                  </div>
                  <Space size="large">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <LoginOutlined style={{ color: "#52c41a" }} />
                      <span>In: {clockIn.time}</span>
                    </div>
                    {clockOut ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <LogoutOutlined style={{ color: "#f5222d" }} />
                        <span>Out: {clockOut.time}</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <ClockCircleOutlined style={{ color: "#fa8c16" }} />
                        <Tag color="orange">Currently Working</Tag>
                      </div>
                    )}
                  </Space>
                </Space>
              </List.Item>
            );
          }}
          locale={{ emptyText: "No Clock In or Out recorded" }}
        />
      </Card>

      {/* Print Button */}
      {clockInArray.length > 0 && (
        <Button
          style={{ marginTop: "16px" }}
          type="primary"
          onClick={() => window.print()}
          icon={<PrinterFilled />}
        >
          Print Clock In/Out History
        </Button>
      )}
    </div>
  );
};

export default ExpandedRowContent;
