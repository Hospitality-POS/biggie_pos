import React from "react";
import { Table, Tag, Space, Typography, Badge, Button } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  AuditOutlined,
  HistoryOutlined,
  GiftOutlined,
  FileProtectOutlined,
  TrophyOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { LEAVE_COLORS } from "./constants";

const { Text } = Typography;

export interface OperationsTabProps {
  pendingLeaves: any[];
  recentActivities: any[];
  upcomingBirthdays: any[];
  expiringDocuments: any[];
  anniversaries: any[];
  activeSubTab: string;
  onSubTabChange: (key: string) => void;
  primaryColor: string;
  isMobile: boolean;
}

export const OperationsTab: React.FC<OperationsTabProps> = ({
  pendingLeaves,
  recentActivities,
  upcomingBirthdays,
  expiringDocuments,
  anniversaries,
  activeSubTab,
  onSubTabChange,
  primaryColor,
  isMobile,
}) => {
  const navigate = useNavigate();

  // Column definitions
  const pendingLeaveCols = [
    {
      title: "Employee",
      dataIndex: "employee_name",
      render: (name: string) => (
        <Space size={6}>
          <UserOutlined style={{ color: "#64748b" }} />
          <Text style={{ fontSize: 12, fontWeight: 500 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "leave_type",
      width: 120,
      render: (t: string) => (
        <Tag color={LEAVE_COLORS[t?.toLowerCase()]} style={{ fontSize: 11 }}>
          {t}
        </Tag>
      ),
    },
    {
      title: "Dates",
      key: "dates",
      width: 180,
      render: (_: any, r: any) => (
        <Text style={{ fontSize: 12 }}>
          {dayjs(r.start_date).format("D MMM")} – {dayjs(r.end_date).format("D MMM YYYY")}
        </Text>
      ),
    },
    {
      title: "Days",
      dataIndex: "days_requested",
      width: 70,
      align: "right" as const,
    },
    {
      title: "Starts",
      dataIndex: "start_date",
      width: 110,
      render: (d: string) => {
        const days = dayjs(d).startOf("day").diff(dayjs().startOf("day"), "day");
        return (
          <Tag color={days < 0 ? "red" : days <= 3 ? "orange" : "default"} icon={<ClockCircleOutlined />} style={{ fontSize: 11 }}>
            {days < 0 ? "Started" : days === 0 ? "Today" : `in ${days}d`}
          </Tag>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 90,
      render: () => (
        <Button
          size="small"
          type="link"
          icon={<ExportOutlined />}
          onClick={() => navigate("/admin/bandu-hr/leave-approvals")}
          style={{ padding: 0, fontSize: 12 }}
        >
          Review
        </Button>
      ),
    },
  ];

  const activityCols = [
    {
      title: "Type",
      dataIndex: "type",
      width: 130,
      render: (type: string) => (
        <Tag color="blue" style={{ fontSize: 11 }}>
          {type}
        </Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Employee",
      dataIndex: "employee_name",
      width: 170,
      render: (name: string) => (
        <Space size={6}>
          <UserOutlined style={{ color: "#64748b" }} />
          <Text style={{ fontSize: 12 }}>{name || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Time",
      dataIndex: "timestamp",
      width: 140,
      render: (d: string) => dayjs(d).format("DD MMM HH:mm"),
    },
  ];

  const birthdayCols = [
    {
      title: "Employee",
      dataIndex: "employee_name",
      render: (name: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Space>
            <UserOutlined style={{ color: primaryColor }} />
            <Text style={{ fontSize: 12, fontWeight: 500 }}>{name}</Text>
          </Space>
          <Text style={{ fontSize: 11, color: "#64748b" }}>{record.employee_number}</Text>
        </Space>
      ),
    },
    {
      title: "Job Title",
      dataIndex: "job_title",
      width: 180,
      render: (title: string) => <Text style={{ fontSize: 12 }}>{title || "—"}</Text>,
    },
    {
      title: "Birthday",
      dataIndex: "birthday",
      width: 130,
      render: (d: string) => dayjs(d).format("DD MMMM"),
    },
    {
      title: "Days Until",
      dataIndex: "days_until",
      width: 110,
      render: (days: number) => (
        <Tag
          color={days === 0 ? "red" : days <= 7 ? "orange" : "green"}
          style={{ fontSize: 11 }}
        >
          {days === 0 ? "🎉 Today!" : `${days} days`}
        </Tag>
      ),
    },
  ];

  const documentCols = [
    {
      title: "Employee",
      dataIndex: "fullname",
      render: (name: string) => (
        <Space size={6}>
          <UserOutlined style={{ color: "#64748b" }} />
          <Text style={{ fontSize: 12, fontWeight: 500 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Document",
      dataIndex: "document_name",
      render: (name: string) => <Text style={{ fontSize: 12 }}>{name}</Text>,
    },
    {
      title: "Expires",
      dataIndex: "expiration_date",
      width: 140,
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Days Until",
      dataIndex: "days_until",
      width: 110,
      render: (days: number) => (
        <Tag color={days <= 30 ? "red" : days <= 60 ? "orange" : "green"} style={{ fontSize: 11 }}>
          {days < 0 ? `Expired ${-days}d ago` : days === 0 ? "Today" : `${days} days`}
        </Tag>
      ),
    },
  ];

  const anniversaryCols = [
    {
      title: "Employee",
      dataIndex: "employee_name",
      render: (name: string) => (
        <Space size={6}>
          <UserOutlined style={{ color: primaryColor }} />
          <Text style={{ fontSize: 12, fontWeight: 500 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Job Title",
      dataIndex: "job_title",
      width: 180,
      render: (t: string) => <Text style={{ fontSize: 12 }}>{t || "—"}</Text>,
    },
    {
      title: "Milestone",
      dataIndex: "years",
      width: 110,
      render: (y: number) => (
        <Tag color="purple" style={{ fontSize: 11 }}>
          {y} year{y === 1 ? "" : "s"}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "days_until",
      width: 120,
      render: (days: number) => (
        <Tag color={days === 0 ? "red" : days <= 7 ? "orange" : "green"} style={{ fontSize: 11 }}>
          {days === 0 ? "Today" : `in ${days} days`}
        </Tag>
      ),
    },
  ];

  return (
    <ProCard
      bordered
      size="small"
      style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}
      bodyStyle={{ padding: "0 12px 12px", width: "100%", maxWidth: "100%" }}
      tabs={{
        type: "line",
        activeKey: activeSubTab,
        onChange: onSubTabChange,
        size: isMobile ? "small" : "middle",
        items: [
          {
            key: "pending-leave",
            label: (
              <Space size={6}>
                <AuditOutlined />
                <span>{isMobile ? "Approvals" : "Leave Awaiting Approval"}</span>
                {pendingLeaves.length > 0 && (
                  <Badge count={pendingLeaves.length} style={{ backgroundColor: "#f59e0b" }} />
                )}
              </Space>
            ),
            children: (
              <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                <Table
                  columns={pendingLeaveCols}
                  dataSource={pendingLeaves}
                  rowKey="leave_id"
                  pagination={{ pageSize: 8, size: "small" }}
                  size="small"
                  scroll={{ x: 620 }}
                  locale={{ emptyText: "No leave requests waiting for approval" }}
                />
              </div>
            ),
          },
          {
            key: "activities",
            label: (
              <Space size={6}>
                <HistoryOutlined />
                <span>{isMobile ? "Activities" : "Recent Activities"}</span>
                {recentActivities.length > 0 && (
                  <Badge count={recentActivities.length} style={{ backgroundColor: "#3b82f6" }} />
                )}
              </Space>
            ),
            children: (
              <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                <Table
                  columns={activityCols}
                  dataSource={recentActivities}
                  rowKey={(record) => `${record.type}-${record.timestamp}-${record.description}`}
                  pagination={{ pageSize: 8, size: "small" }}
                  size="small"
                  scroll={{ x: 500 }}
                  locale={{ emptyText: "No recent HR activities" }}
                />
              </div>
            ),
          },
          {
            key: "birthdays",
            label: (
              <Space size={6}>
                <GiftOutlined />
                <span>{isMobile ? "Birthdays" : "Upcoming Birthdays"}</span>
                {upcomingBirthdays.length > 0 && (
                  <Badge count={upcomingBirthdays.length} style={{ backgroundColor: "#10b981" }} />
                )}
              </Space>
            ),
            children: upcomingBirthdays.length > 0 ? (
              <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                <Table
                  columns={birthdayCols}
                  dataSource={upcomingBirthdays}
                  rowKey="employee_id"
                  pagination={{ pageSize: 8, size: "small" }}
                  size="small"
                  scroll={{ x: 500 }}
                />
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                No upcoming birthdays this month
              </div>
            ),
          },
          {
            key: "documents",
            label: (
              <Space size={6}>
                <FileProtectOutlined />
                <span>{isMobile ? "Documents" : "Expiring Documents"}</span>
                {expiringDocuments.length > 0 && (
                  <Badge count={expiringDocuments.length} style={{ backgroundColor: "#f59e0b" }} />
                )}
              </Space>
            ),
            children: expiringDocuments.length > 0 ? (
              <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                <Table
                  columns={documentCols}
                  dataSource={expiringDocuments}
                  rowKey={(record) => `${record.employee_id}-${record.document_name}`}
                  pagination={{ pageSize: 8, size: "small" }}
                  size="small"
                  scroll={{ x: 500 }}
                />
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                No documents expiring soon
              </div>
            ),
          },
          {
            key: "anniversaries",
            label: (
              <Space size={6}>
                <TrophyOutlined />
                <span>{isMobile ? "Anniversaries" : "Work Anniversaries"}</span>
                {anniversaries.length > 0 && (
                  <Badge count={anniversaries.length} style={{ backgroundColor: "#8b5cf6" }} />
                )}
              </Space>
            ),
            children: (
              <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                <Table
                  columns={anniversaryCols}
                  dataSource={anniversaries}
                  rowKey="employee_id"
                  pagination={{ pageSize: 8, size: "small" }}
                  size="small"
                  scroll={{ x: 500 }}
                  locale={{ emptyText: "No work anniversaries in the next 30 days" }}
                />
              </div>
            ),
          },
        ],
      }}
    />
  );
};
