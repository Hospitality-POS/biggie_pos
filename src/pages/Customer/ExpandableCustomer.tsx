import React from "react";
import { ProDescriptions } from "@ant-design/pro-components";
import { Card, List, Typography, Space, Tag } from "antd";
import { CalendarOutlined, ClockCircleOutlined } from "@ant-design/icons";

interface Visit {
  _id: string;
  createdAt: string;
}

interface CustomerDetails {
  created_by: { username: string };
  visits: Visit[];
}

interface ExpandedRowContentProps {
  record: CustomerDetails;
}

const ExpandedRowContent: React.FC<ExpandedRowContentProps> = ({ record }) => {
  const { created_by, visits } = record;

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

  return (
    <div>
      <ProDescriptions
        size="small"
        title="Customer Information"
        dataSource={record}
        columns={[
          {
            title: "Created By",
            dataIndex: ["created_by", "username"],
            render: (username) => (
              <Tag color="blue" key={username}>
                {username}
              </Tag>
            ),
          },
        ]}
        tooltip="Additional customer details"
        column={1}
        layout="horizontal"
      />
      <Card
        title={
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            Visit History
          </Typography.Title>
        }
        style={{ marginTop: 16 }}
      >
        <List
          dataSource={visits}
          locale={{ emptyText: "No visits recorded" }}
          renderItem={(visit) => {
            const { date, time } = formatTimeDisplay(visit.createdAt);
            return (
              <List.Item key={visit._id}>
                <Space direction="vertical" size="small">
                  <Space>
                    <CalendarOutlined />
                    <span>{date}</span>
                  </Space>
                  <Space>
                    <ClockCircleOutlined />
                    <span>{time}</span>
                  </Space>
                </Space>
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default ExpandedRowContent;
