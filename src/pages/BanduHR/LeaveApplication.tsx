import React, { useState } from "react";
import {
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Form,
  DatePicker,
  Select,
  Input,
  message,
  Row,
  Col,
  Upload,
  Empty,
  Popconfirm,
  Segmented,
  Drawer,
} from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UploadOutlined,
  ReloadOutlined,
  StopOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLeaves,
  applyForLeave,
  cancelLeave,
  uploadLeaveDocument,
  fetchLeaveBalance,
  type Leave,
  type CreateLeaveParams,
} from "@services/bandu";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const { Option } = Select;
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
  suffix?: React.ReactNode;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, suffix, icon, color }) => (
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
        {suffix}
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

const LeaveApplication: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [isDocumentModalVisible, setIsDocumentModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [form] = Form.useForm();
  const [documentForm] = Form.useForm();
  const queryClient = useQueryClient();

  // Fetch leaves
  const { data: leavesData, isLoading } = useQuery({
    queryKey: ["bandu-leaves"],
    queryFn: () => fetchLeaves({}),
  });

  const leaves = Array.isArray(leavesData) ? leavesData : leavesData?.leaves || [];

  // Fetch leave balance
  const { data: balanceData } = useQuery({
    queryKey: ["leave-balance"],
    queryFn: () => fetchLeaveBalance("default", { year: new Date().getFullYear() }),
  });

  const balances = balanceData?.balances || [];

  // Apply for leave mutation
  const applyMutation = useMutation({
    mutationFn: (params: CreateLeaveParams) => applyForLeave(params),
    onSuccess: () => {
      message.success("Leave application submitted successfully");
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["bandu-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
    },
  });

  // Cancel leave mutation
  const cancelMutation = useMutation({
    mutationFn: cancelLeave,
    onSuccess: () => {
      message.success("Leave cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["bandu-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: ({ leaveId, file }: { leaveId: string; file: File }) =>
      uploadLeaveDocument(leaveId, file),
    onSuccess: () => {
      message.success("Document uploaded successfully");
      setIsDocumentModalVisible(false);
      documentForm.resetFields();
      if (selectedLeave) {
        queryClient.invalidateQueries({ queryKey: ["leave-documents", selectedLeave._id] });
      }
    },
  });

  const leaveStats = leaves?.reduce(
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
      title: "Leave Type",
      dataIndex: "leave_type",
      key: "leave_type",
      render: (type: string) => (
        <Tag color="blue" style={{ margin: 0 }}>{type}</Tag>
      ),
    },
    {
      title: "Start",
      dataIndex: "start_date",
      key: "start_date",
      render: (date: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(date).format("DD MMM YYYY")}</Text>
      ),
    },
    {
      title: "End",
      dataIndex: "end_date",
      key: "end_date",
      render: (date: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(date).format("DD MMM YYYY")}</Text>
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
      title: "Document",
      dataIndex: "document_required",
      key: "document_required",
      align: "center" as const,
      render: (required: boolean, record: Leave) => (
        <Space size={4}>
          <Tag color={required ? "orange" : "green"} style={{ margin: 0 }}>
            {required ? "Required" : "No"}
          </Tag>
          {required && !record.document_provided && (
            <Button
              type="text"
              size="small"
              icon={<UploadOutlined />}
              onClick={() => {
                setSelectedLeave(record);
                setIsDocumentModalVisible(true);
              }}
            />
          )}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 70,
      render: (_: unknown, record: Leave) =>
        record.status === "Pending" ? (
          <Popconfirm
            title="Cancel this leave request?"
            okText="Cancel Leave"
            okButtonProps={{ danger: true }}
            onConfirm={() => cancelMutation.mutateAsync(record._id)}
          >
            <Button type="text" size="small" danger icon={<StopOutlined />}>
              Cancel
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  const handleApplyLeave = async (values: CreateLeaveParams) => {
    try {
      await applyMutation.mutateAsync(values);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUploadDocument = async (values: any) => {
    if (!selectedLeave || !values.file) return;
    try {
      await uploadDocumentMutation.mutateAsync({
        leaveId: selectedLeave._id,
        file: values.file.file,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

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
            <CalendarOutlined style={{ marginRight: 8, color: C.primary }} />
            Leave Management
          </Title>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {leaveStats.total} request{leaveStats.total !== 1 ? "s" : ""} · {leaveStats.pending} pending
          </Text>
        </div>
        <Space wrap>
          <Segmented
            value={viewMode}
            onChange={(v) => setViewMode(v as "list" | "cards")}
            options={[
              { label: "List", value: "list", icon: <UnorderedListOutlined /> },
              { label: "Cards", value: "cards", icon: <AppstoreOutlined /> },
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ["bandu-leaves"] })}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            Apply for Leave
          </Button>
        </Space>
      </div>

      {/* Leave Balances */}
      {balances.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {balances.map((balance: any) => (
            <Col xs={12} sm={8} md={6} key={balance._id}>
              <StatCard
                title={`${balance.leave_type} Leave`}
                value={balance.remaining}
                suffix={
                  <Text style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>
                    {" "}/ {balance.entitled} days
                  </Text>
                }
                icon={<CalendarOutlined />}
                color="#3b82f6"
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Request stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <StatCard title="Total Requests" value={leaveStats.total} icon={<CalendarOutlined />} color="#3b82f6" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Approved" value={leaveStats.approved} icon={<CheckCircleOutlined />} color="#10b981" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Pending" value={leaveStats.pending} icon={<ClockCircleOutlined />} color="#f59e0b" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="Rejected" value={leaveStats.rejected} icon={<CloseCircleOutlined />} color="#ef4444" />
        </Col>
      </Row>

      {/* Leave list / cards */}
      {viewMode === "list" ? (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <Table
            columns={columns}
            dataSource={leaves}
            loading={isLoading}
            rowKey="_id"
            size="small"
            pagination={{ pageSize: 10 }}
            onRow={(record: Leave) => ({
              onClick: () => {
                setSelectedLeave(record);
                setIsDetailDrawerVisible(true);
              },
              style: { cursor: "pointer" },
            })}
            locale={{
              emptyText: (
                <Empty
                  description="No leave requests yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ padding: "32px 0" }}
                />
              ),
            }}
          />
        </div>
      ) : (
        <Row gutter={[12, 12]}>
          {leaves.length === 0 && !isLoading && (
            <Col span={24}>
              <div style={{ ...cardStyle, padding: "32px 0" }}>
                <Empty description="No leave requests yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            </Col>
          )}
          {leaves.map((leave: Leave) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={leave._id}>
              <div
                style={{ ...cardStyle, padding: 16, cursor: "pointer" }}
                onClick={() => {
                  setSelectedLeave(leave);
                  setIsDetailDrawerVisible(true);
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <Tag color="blue" style={{ margin: 0 }}>{leave.leave_type}</Tag>
                  <Tag color={STATUS_COLORS[leave.status] || "default"} style={{ margin: 0 }}>
                    {leave.status}
                  </Tag>
                </div>
                <Text strong style={{ fontSize: 13, display: "block" }}>
                  {dayjs(leave.start_date).format("DD MMM")} – {dayjs(leave.end_date).format("DD MMM YYYY")}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 8 }}>
                  {leave.days_requested} day{leave.days_requested !== 1 ? "s" : ""}
                  {leave.document_required ? " · document required" : ""}
                </Text>
                {leave.reason && (
                  <Text
                    style={{ fontSize: 12, color: "#94a3b8", display: "block" }}
                    ellipsis
                  >
                    {leave.reason}
                  </Text>
                )}
              </div>
            </Col>
          ))}
        </Row>
      )}

      {/* Leave detail drawer */}
      <Drawer
        title="Leave Request"
        placement="right"
        width={440}
        open={isDetailDrawerVisible}
        onClose={() => {
          setIsDetailDrawerVisible(false);
          setSelectedLeave(null);
        }}
      >
        {selectedLeave && (
          <div>
            {/* Summary header */}
            <div
              style={{
                ...cardStyle,
                padding: "14px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <Tag color="blue" style={{ margin: 0 }}>{selectedLeave.leave_type}</Tag>
                <Text strong style={{ fontSize: 14, display: "block", marginTop: 6 }}>
                  {dayjs(selectedLeave.start_date).format("DD MMM YYYY")} –{" "}
                  {dayjs(selectedLeave.end_date).format("DD MMM YYYY")}
                </Text>
              </div>
              <Tag color={STATUS_COLORS[selectedLeave.status] || "default"}>
                {selectedLeave.status}
              </Tag>
            </div>

            {/* Details */}
            <div style={{ ...cardStyle, padding: "6px 16px", marginBottom: 16 }}>
              {[
                { label: "Days Requested", value: `${selectedLeave.days_requested}` },
                {
                  label: "Document Required",
                  value: selectedLeave.document_required ? "Yes" : "No",
                },
                {
                  label: "Document Provided",
                  value: selectedLeave.document_provided ? "Yes" : "—",
                },
                {
                  label: "Submitted",
                  value:
                    selectedLeave.createdAt || (selectedLeave as any).created_at
                      ? dayjs(
                          (selectedLeave as any).created_at || selectedLeave.createdAt
                        ).format("DD MMM YYYY")
                      : "—",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: 13,
                  }}
                >
                  <Text style={{ color: "#64748b" }}>{row.label}</Text>
                  <Text strong>{row.value}</Text>
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

            {/* Actions */}
            {(selectedLeave.status === "Pending" ||
              (selectedLeave.document_required && !selectedLeave.document_provided)) && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {selectedLeave.document_required && !selectedLeave.document_provided && (
                  <Button
                    icon={<PaperClipOutlined />}
                    block
                    onClick={() => {
                      setIsDetailDrawerVisible(false);
                      setIsDocumentModalVisible(true);
                    }}
                  >
                    Upload Document
                  </Button>
                )}
                {selectedLeave.status === "Pending" && (
                  <Popconfirm
                    title="Cancel this leave request?"
                    okText="Cancel Leave"
                    okButtonProps={{ danger: true }}
                    onConfirm={() =>
                      cancelMutation.mutateAsync(selectedLeave._id).then(() =>
                        setIsDetailDrawerVisible(false)
                      )
                    }
                  >
                    <Button danger block icon={<StopOutlined />}>
                      Cancel Leave
                    </Button>
                  </Popconfirm>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Apply for Leave Modal */}
      <Modal
        title={
          <Space size={8}>
            <div
              style={{
                background: `${C.primary}15`,
                borderRadius: 8,
                padding: "4px 8px",
                color: C.primary,
                fontSize: 16,
                lineHeight: 1,
                display: "inline-flex",
              }}
            >
              <CalendarOutlined />
            </div>
            <span>Apply for Leave</span>
          </Space>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleApplyLeave}>
          <Form.Item label="Leave Type" name="leave_type" rules={[{ required: true, message: "Required" }]}>
            <Select placeholder="Select leave type">
              <Option value="Annual">Annual</Option>
              <Option value="Sick">Sick</Option>
              <Option value="Emergency">Emergency</Option>
              <Option value="Maternity">Maternity</Option>
              <Option value="Paternity">Paternity</Option>
              <Option value="Unpaid">Unpaid</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Start Date" name="start_date" rules={[{ required: true, message: "Required" }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="End Date" name="end_date" rules={[{ required: true, message: "Required" }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Reason" name="reason">
            <TextArea rows={3} placeholder="Enter reason for leave" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={applyMutation.isLoading}>
                Submit Application
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        title="Upload Supporting Document"
        open={isDocumentModalVisible}
        onCancel={() => {
          setIsDocumentModalVisible(false);
          documentForm.resetFields();
        }}
        footer={null}
      >
        <Form form={documentForm} layout="vertical" onFinish={handleUploadDocument}>
          <Form.Item label="File" name="file" rules={[{ required: true }]}>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setIsDocumentModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={uploadDocumentMutation.isLoading}>
                Upload
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeaveApplication;
