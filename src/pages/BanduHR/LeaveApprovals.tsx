import React, { useState } from "react";
import {
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Input,
  Row,
  Col,
  message,
  Drawer,
  Tabs,
  Empty,
  Avatar,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLeaves, type Leave } from "@services/bandu";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const { TextArea } = Input;

const C = THEME_C;

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}15`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>{title}</Text>
      <Text strong style={{ fontSize: 18, color, lineHeight: 1.2 }}>
        {value}
      </Text>
    </div>
  </div>
);

const STATUS_COLORS: Record<string, string> = {
  Approved: "green",
  Pending: "orange",
  Rejected: "red",
  Cancelled: "default",
};

const LeaveApprovals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("Pending");
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [isApproveModalVisible, setIsApproveModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const queryClient = useQueryClient();

  // Fetch all leaves
  const { data: leavesData, isLoading } = useQuery({
    queryKey: ["bandu-leaves-admin"],
    queryFn: () => fetchLeaves({}),
  });

  const allLeaves = Array.isArray(leavesData) ? leavesData : leavesData?.leaves || [];

  // Filter leaves based on active tab
  const leaves = allLeaves.filter((leave: Leave) => {
    if (activeTab === "All") return true;
    return leave.status === activeTab;
  });

  const leaveStats = allLeaves?.reduce(
    (acc: { total: number; approved: number; pending: number; rejected: number }, leave: Leave) => {
      acc.total += 1;
      if (leave.status === "Approved") acc.approved += 1;
      if (leave.status === "Pending") acc.pending += 1;
      if (leave.status === "Rejected") acc.rejected += 1;
      return acc;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0 }
  );

  const openLeave = (record: Leave) => {
    setSelectedLeave(record);
    setIsDrawerVisible(true);
  };

  const columns = [
    {
      title: "Employee",
      dataIndex: ["requested_by", "fullname"],
      key: "fullname",
      render: (_: unknown, record: Leave) => (
        <Space size={8}>
          <Avatar
            size={28}
            src={record.requested_by?.thumbnail}
            style={{ background: `${C.primary}15`, color: C.primary }}
          >
            {(record.requested_by?.fullname || "?").charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text style={{ fontSize: 13, fontWeight: 500, display: "block" }}>
              {record.requested_by?.fullname || "—"}
            </Text>
            <Text style={{ fontSize: 11, color: "#94a3b8" }}>
              {record.department_id?.name || "—"}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Leave Type",
      dataIndex: "leave_type",
      key: "leave_type",
      render: (type: string) => (
        <Tag color="blue" style={{ margin: 0 }}>{type}</Tag>
      ),
    },
    {
      title: "Period",
      key: "period",
      render: (_: unknown, record: Leave) => (
        <Text style={{ fontSize: 12 }}>
          {dayjs(record.start_date).format("DD MMM")} – {dayjs(record.end_date).format("DD MMM YYYY")}
        </Text>
      ),
    },
    {
      title: "Days",
      dataIndex: "days_requested",
      key: "days_requested",
      align: "center" as const,
      render: (days: number) => <Text style={{ fontSize: 12 }}>{days}</Text>,
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (reason: string) => (
        <Text style={{ fontSize: 12, color: "#64748b" }}>{reason || "—"}</Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || "default"} style={{ margin: 0 }}>{status}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 210,
      render: (_: unknown, record: Leave) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openLeave(record)}>
            View
          </Button>
          {record.status === "Pending" && (
            <>
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: "#10b981" }}
                onClick={() => {
                  setSelectedLeave(record);
                  setIsApproveModalVisible(true);
                }}
              >
                Approve
              </Button>
              <Button
                type="text"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setSelectedLeave(record);
                  setIsRejectModalVisible(true);
                }}
              >
                Reject
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const handleReject = async () => {
    if (!selectedLeave) return;
    // TODO: Call rejectLeave API with rejection_reason
    message.success("Leave rejected");
    setIsRejectModalVisible(false);
    setRejectionReason("");
    setSelectedLeave(null);
    queryClient.invalidateQueries({ queryKey: ["bandu-leaves-admin"] });
  };

  const handleApprove = async () => {
    if (!selectedLeave) return;
    // TODO: Call approveLeave API
    message.success("Leave approved successfully");
    setIsApproveModalVisible(false);
    setSelectedLeave(null);
    queryClient.invalidateQueries({ queryKey: ["bandu-leaves-admin"] });
  };

  const tabItems = [
    { key: "Pending", label: `Pending (${leaveStats.pending})` },
    { key: "Approved", label: `Approved (${leaveStats.approved})` },
    { key: "Rejected", label: `Rejected (${leaveStats.rejected})` },
    { key: "All", label: `All (${leaveStats.total})` },
  ];

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: C.darkText }}>
            <CheckCircleOutlined style={{ marginRight: 8, color: C.primary }} />
            Leave Approvals
          </Title>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {leaveStats.pending} pending review · {leaveStats.total} total
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => queryClient.invalidateQueries({ queryKey: ["bandu-leaves-admin"] })}
          loading={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <StatCard title="Total Requests" value={leaveStats.total} icon={<CalendarOutlined />} color="#3b82f6" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Pending" value={leaveStats.pending} icon={<ClockCircleOutlined />} color="#f59e0b" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Approved" value={leaveStats.approved} icon={<CheckCircleOutlined />} color="#10b981" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Rejected" value={leaveStats.rejected} icon={<CloseCircleOutlined />} color="#ef4444" />
        </Col>
      </Row>

      {/* Tabs + Table */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ padding: "4px 16px 0" }}
        />
        <Table
          columns={columns}
          dataSource={leaves}
          loading={isLoading}
          rowKey="_id"
          size="small"
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                description={`No ${activeTab === "All" ? "" : activeTab.toLowerCase()} leave requests`}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: "32px 0" }}
              />
            ),
          }}
        />
      </div>

      {/* Leave Detail Drawer */}
      <Drawer
        title="Leave Request Details"
        placement="right"
        width={520}
        open={isDrawerVisible}
        onClose={() => {
          setIsDrawerVisible(false);
          setSelectedLeave(null);
        }}
      >
        {selectedLeave && (
          <div>
            {/* Employee summary */}
            <div
              style={{
                ...cardStyle,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <Avatar
                size={44}
                src={selectedLeave.requested_by?.thumbnail}
                style={{ background: `${C.primary}15`, color: C.primary, fontSize: 17 }}
              >
                {(selectedLeave.requested_by?.fullname || "?").charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: 15, display: "block" }}>
                  {selectedLeave.requested_by?.fullname || "—"}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {selectedLeave.department_id?.name || "—"}
                </Text>
              </div>
              <Tag color={STATUS_COLORS[selectedLeave.status] || "default"}>
                {selectedLeave.status}
              </Tag>
            </div>

            {/* Details */}
            <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 16 }}>
              {[
                { label: "Leave Type", value: <Tag color="blue" style={{ margin: 0 }}>{selectedLeave.leave_type}</Tag> },
                {
                  label: "Period",
                  value: `${dayjs(selectedLeave.start_date).format("DD MMM YYYY")} – ${dayjs(selectedLeave.end_date).format("DD MMM YYYY")}`,
                },
                { label: "Days Requested", value: `${selectedLeave.days_requested}` },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: 13,
                  }}
                >
                  <Text style={{ color: "#64748b" }}>{row.label}</Text>
                  {typeof row.value === "string" ? <Text strong>{row.value}</Text> : row.value}
                </div>
              ))}
            </div>

            {selectedLeave.reason && (
              <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 16 }}>
                <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>
                  REASON
                </Text>
                <Text style={{ fontSize: 13 }}>{selectedLeave.reason}</Text>
              </div>
            )}

            {selectedLeave.approved_by && (
              <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 16 }}>
                <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>
                  APPROVAL
                </Text>
                <Text style={{ fontSize: 13 }}>
                  {selectedLeave.approved_by.fullname} ·{" "}
                  {dayjs(selectedLeave.approved_at).format("DD MMM YYYY HH:mm")}
                </Text>
              </div>
            )}

            {selectedLeave.rejection_reason && (
              <div
                style={{
                  ...cardStyle,
                  padding: "14px 16px",
                  marginBottom: 16,
                  borderColor: "#fecaca",
                  background: "#fef2f2",
                }}
              >
                <Text style={{ fontSize: 11, color: "#ef4444", display: "block", marginBottom: 4 }}>
                  REJECTION REASON
                </Text>
                <Text style={{ fontSize: 13, color: "#991b1b" }}>{selectedLeave.rejection_reason}</Text>
              </div>
            )}

            {selectedLeave.attachments && selectedLeave.attachments.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 8 }}>
                  ATTACHMENTS
                </Text>
                {selectedLeave.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    style={{ ...cardStyle, padding: "8px 12px", marginBottom: 8 }}
                  >
                    <Space>
                      <Text style={{ fontSize: 12 }}>{attachment.file_name}</Text>
                      <Button type="link" size="small">
                        Download
                      </Button>
                    </Space>
                  </div>
                ))}
              </div>
            )}

            {selectedLeave.status === "Pending" && (
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <Button
                  type="primary"
                  block
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    setIsDrawerVisible(false);
                    setIsApproveModalVisible(true);
                  }}
                >
                  Approve
                </Button>
                <Button
                  danger
                  block
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    setIsDrawerVisible(false);
                    setIsRejectModalVisible(true);
                  }}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Reject Modal */}
      <Modal
        title="Reject Leave Request"
        open={isRejectModalVisible}
        onOk={handleReject}
        okText="Reject"
        okButtonProps={{ danger: true }}
        onCancel={() => {
          setIsRejectModalVisible(false);
          setRejectionReason("");
          setSelectedLeave(null);
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <Text>
            Reject leave for <Text strong>{selectedLeave?.requested_by?.fullname}</Text>?
          </Text>
        </div>
        <TextArea
          rows={3}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Rejection reason (optional)"
        />
      </Modal>

      {/* Approve Modal */}
      <Modal
        title="Approve Leave Request"
        open={isApproveModalVisible}
        onOk={handleApprove}
        okText="Approve"
        onCancel={() => {
          setIsApproveModalVisible(false);
          setSelectedLeave(null);
        }}
      >
        <Text>
          Approve leave for <Text strong>{selectedLeave?.requested_by?.fullname}</Text>{" "}
          ({selectedLeave?.days_requested} day{selectedLeave?.days_requested !== 1 ? "s" : ""})?
        </Text>
      </Modal>
    </div>
  );
};

export default LeaveApprovals;
