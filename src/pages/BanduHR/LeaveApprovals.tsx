import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Input,
  Row,
  Col,
  Statistic,
  message,
  Drawer,
  Descriptions,
  Tabs,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchLeaves,
  type Leave,
} from "@services/bandu";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
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

  const columns = [
    {
      title: "Employee",
      dataIndex: ["requested_by", "fullname"],
      key: "fullname",
      render: (fullname: string, record: Leave) => (
        <Space>
          {record.requested_by?.thumbnail && (
            <img
              src={record.requested_by.thumbnail}
              alt=""
              style={{ width: 32, height: 32, borderRadius: "50%" }}
            />
          )}
          <Text strong>{fullname || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Department",
      dataIndex: ["department_id", "name"],
      key: "department",
      render: (name: string) => <Text>{name || "—"}</Text>,
    },
    {
      title: "Leave Type",
      dataIndex: "leave_type",
      key: "leave_type",
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      render: (date: string) => <Text>{dayjs(date).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      render: (date: string) => <Text>{dayjs(date).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "Days",
      dataIndex: "days_requested",
      key: "days_requested",
      render: (days: number) => <Text>{days}</Text>,
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (reason: string) => <Text ellipsis={{ tooltip: reason }}>{reason || "—"}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Approved: "green",
          Pending: "orange",
          Rejected: "red",
          Cancelled: "default",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Leave) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedLeave(record);
              setIsDrawerVisible(true);
            }}
          >
            View
          </Button>
          {record.status === "Pending" && (
            <>
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setSelectedLeave(record);
                  setIsApproveModalVisible(true);
                }}
              >
                Approve
              </Button>
              <Button
                type="link"
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
    {
      key: "Pending",
      label: `Pending (${leaveStats.pending})`,
    },
    {
      key: "Approved",
      label: `Approved (${leaveStats.approved})`,
    },
    {
      key: "Rejected",
      label: `Rejected (${leaveStats.rejected})`,
    },
    {
      key: "All",
      label: `All (${leaveStats.total})`,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0, color: C.darkText }}>
          <CalendarOutlined style={{ marginRight: 8, color: C.primary }} />
          Leave Approvals
        </Title>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 24 }}
      />

      {/* Leave Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Requests"
              value={leaveStats.total}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: C.blue, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Pending"
              value={leaveStats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: C.orange, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Approved"
              value={leaveStats.approved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: C.green, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Rejected"
              value={leaveStats.rejected}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: C.red, fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={leaves}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Leave Detail Drawer */}
      <Drawer
        title="Leave Request Details"
        placement="right"
        width={600}
        open={isDrawerVisible}
        onClose={() => {
          setIsDrawerVisible(false);
          setSelectedLeave(null);
        }}
      >
        {selectedLeave && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Employee" span={2}>
                {selectedLeave.requested_by?.fullname}
              </Descriptions.Item>
              <Descriptions.Item label="Department" span={2}>
                {selectedLeave.department_id?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Leave Type">
                {selectedLeave.leave_type}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    selectedLeave.status === "Approved"
                      ? "green"
                      : selectedLeave.status === "Pending"
                      ? "orange"
                      : "red"
                  }
                >
                  {selectedLeave.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">
                {dayjs(selectedLeave.start_date).format("DD MMM YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {dayjs(selectedLeave.end_date).format("DD MMM YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="Days Requested" span={2}>
                {selectedLeave.days_requested}
              </Descriptions.Item>
              <Descriptions.Item label="Reason" span={2}>
                {selectedLeave.reason || "—"}
              </Descriptions.Item>
              {selectedLeave.approved_by && (
                <>
                  <Descriptions.Item label="Approved By">
                    {selectedLeave.approved_by.fullname}
                  </Descriptions.Item>
                  <Descriptions.Item label="Approved At">
                    {dayjs(selectedLeave.approved_at).format("DD MMM YYYY HH:mm")}
                  </Descriptions.Item>
                </>
              )}
              {selectedLeave.rejection_reason && (
                <Descriptions.Item label="Rejection Reason" span={2}>
                  <Text type="danger">{selectedLeave.rejection_reason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedLeave.attachments && selectedLeave.attachments.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Title level={5}>Attachments</Title>
                {selectedLeave.attachments.map((attachment, index) => (
                  <Card key={index} size="small" style={{ marginBottom: 8 }}>
                    <Space>
                      <Text>{attachment.file_name}</Text>
                      <Button type="link" size="small">
                        Download
                      </Button>
                    </Space>
                  </Card>
                ))}
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
        onCancel={() => {
          setIsRejectModalVisible(false);
          setRejectionReason("");
          setSelectedLeave(null);
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Are you sure you want to reject this leave request?</Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text>Rejection Reason (Optional):</Text>
        </div>
        <TextArea
          rows={4}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Enter reason for rejection"
        />
      </Modal>

      {/* Approve Modal */}
      <Modal
        title="Approve Leave Request"
        open={isApproveModalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setIsApproveModalVisible(false);
          setSelectedLeave(null);
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Are you sure you want to approve this leave request for {selectedLeave?.requested_by?.fullname}?</Text>
        </div>
      </Modal>
    </div>
  );
};

export default LeaveApprovals;
