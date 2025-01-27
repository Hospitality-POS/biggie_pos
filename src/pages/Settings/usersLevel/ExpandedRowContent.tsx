import React from 'react';
import { ProDescriptions } from '@ant-design/pro-components';
import { Typography, List, Card, Tag, Space } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';

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
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const employeeInfo = [
    {
      title: 'Username',
      dataIndex: 'username',
      value: username,
    },
    {
      title: 'Pin',
      dataIndex: 'pin',
      value: pin,
    },
    {
      title: 'Phone No.',
      dataIndex: 'phone',
      value: phone,
    },
    {
      title: 'Date created',
      dataIndex: 'createdAt',
      value: formattedCreatedAt,
    },
  ];

  return (
    <div className="p-4">
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
          <Typography.Title level={5} className="m-0">
            Clock In/Out History
          </Typography.Title>
        }
        className="mt-4"
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
                className="flex flex-col sm:flex-row items-start sm:items-center gap-2"
              >
                <Space direction="vertical" size="small">
                  <div className="flex items-center gap-2">
                    <CalendarOutlined className="text-blue-500" />
                    <span className="font-medium">{clockIn.date}</span>
                  </div>
                  <Space size="large">
                    <div className="flex items-center gap-2">
                      <LoginOutlined className="text-green-500" />
                      <span>In: {clockIn.time}</span>
                    </div>
                    {clockOut ? (
                      <div className="flex items-center gap-2">
                        <LogoutOutlined className="text-red-500" />
                        <span>Out: {clockOut.time}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ClockCircleOutlined className="text-orange-500" />
                        <Tag color="orange">Currently Working</Tag>
                      </div>
                    )}
                  </Space>
                </Space>
              </List.Item>
            );
          }}
          locale={{ emptyText: 'No Clock In or Out recorded' }}
        />
      </Card>
    </div>
  );
};

export default ExpandedRowContent;