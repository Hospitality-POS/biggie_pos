import React, { useState } from "react";
import {
  Card,
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
  Statistic,
  Upload,
} from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLeaves,
  applyForLeave,
  cancelLeave,
  uploadLeaveDocument,
  fetchLeaveDocuments,
  fetchLeaveBalance,
  type Leave,
  type CreateLeaveParams,
} from "@services/bandu";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;
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

const LeaveApplication: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [isDocumentModalVisible, setIsDocumentModalVisible] = useState(false);
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

  // Fetch leave documents
  const { data: documentsData } = useQuery({
    queryKey: ["leave-documents", selectedLeave?._id],
    queryFn: () => (selectedLeave ? fetchLeaveDocuments(selectedLeave._id) : Promise.resolve({ documents: [] })),
    enabled: !!selectedLeave && isDocumentModalVisible,
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
      title: "Document Required",
      dataIndex: "document_required",
      key: "document_required",
      render: (required: boolean, record: Leave) => (
        <Space>
          <Tag color={required ? "orange" : "green"}>{required ? "Yes" : "No"}</Tag>
          {required && !record.document_provided && (
            <Button
              type="link"
              size="small"
              icon={<UploadOutlined />}
              onClick={() => {
                setSelectedLeave(record);
                setIsDocumentModalVisible(true);
              }}
            >
              Upload
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Leave) => (
        <Space>
          {record.status === "Pending" && (
            <Button
              type="link"
              danger
              onClick={() => {
                Modal.confirm({
                  title: "Cancel Leave",
                  content: "Are you sure you want to cancel this leave request?",
                  onOk: async () => {
                    try {
                      await cancelMutation.mutateAsync(record._id);
                    } catch (error) {
                      // Error handled by mutation
                    }
                  },
                });
              }}
            >
              Cancel
            </Button>
          )}
        </Space>
      ),
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
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0, color: C.darkText }}>
          <CalendarOutlined style={{ marginRight: 8, color: C.primary }} />
          Leave Management
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Apply for Leave
        </Button>
      </div>

      {/* Leave Balance Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {balances.map((balance: any) => (
          <Col xs={24} sm={12} md={6} key={balance._id}>
            <Card>
              <Statistic
                title={`${balance.leave_type} Leave`}
                value={balance.remaining}
                suffix={`/ ${balance.entitled}`}
                valueStyle={{ color: C.blue, fontSize: 20 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Leave Request Stats */}
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

      {/* Apply for Leave Modal */}
      <Modal
        title="Apply for Leave"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
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
            <TextArea rows={4} placeholder="Enter reason for leave" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={applyMutation.isLoading}>
                Submit Application
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
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
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={uploadDocumentMutation.isLoading}>
                Upload
              </Button>
              <Button onClick={() => setIsDocumentModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeaveApplication;
