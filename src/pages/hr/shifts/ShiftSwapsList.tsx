import React, { useState } from "react";
import { Typography, Card, Table, Button, Space, Tag, Select, Modal, Form, message, Drawer, Descriptions } from "antd";
import { PlusOutlined, EyeOutlined, CheckOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShiftSwaps, createShiftSwap, respondToShiftSwap, approveShiftSwap, cancelShiftSwap, getShiftSwapById } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

const ShiftSwapsList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedSwapId, setSelectedSwapId] = useState<string>("");
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: swapsData, isLoading } = useQuery({
    queryKey: ["hr-shift-swaps", { status: statusFilter }],
    queryFn: () => fetchShiftSwaps({ status: statusFilter }),
  });

  const swaps = Array.isArray(swapsData) ? swapsData : swapsData?.swaps || [];

  const { data: swapDetail } = useQuery({
    queryKey: ["hr-shift-swap", selectedSwapId],
    queryFn: () => getShiftSwapById(selectedSwapId),
    enabled: !!selectedSwapId && isDetailDrawerVisible,
  });

  const createMutation = useMutation({
    mutationFn: createShiftSwap,
    onSuccess: () => {
      message.success("Shift swap request created successfully");
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["hr-shift-swaps"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to create shift swap request");
    },
  });

  const columns = [
    {
      title: "Requested By",
      dataIndex: "requested_by_name",
      key: "requested_by_name",
    },
    {
      title: "Requested With",
      dataIndex: "requested_with_name",
      key: "requested_with_name",
    },
    {
      title: "Original Shift Date",
      dataIndex: "original_shift_date",
      key: "original_shift_date",
      render: (date: string) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "Swap Date",
      dataIndex: "swap_date",
      key: "swap_date",
      render: (date: string) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Pending: "orange",
          Approved: "green",
          Rejected: "red",
          Completed: "blue",
          Cancelled: "default",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewSwap(record._id)}>
            View
          </Button>
        </Space>
      ),
    },
  ];

  const handleCreate = (values: any) => {
    createMutation.mutate({
      requested_by: values.requested_by,
      requested_to: values.requested_to,
      swap_date: values.swap_date,
      reason: values.reason,
    });
  };

  const handleViewSwap = (id: string) => {
    setSelectedSwapId(id);
    setIsDetailDrawerVisible(true);
  };

  const handleDetailDrawerClose = () => {
    setIsDetailDrawerVisible(false);
    setSelectedSwapId("");
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            Shift Swaps
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ["hr-shift-swaps"] })}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
              Request Swap
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="Pending">Pending</Option>
            <Option value="Approved">Approved</Option>
            <Option value="Rejected">Rejected</Option>
            <Option value="Completed">Completed</Option>
          </Select>
        </div>

        <Table columns={columns} dataSource={swaps} loading={isLoading} rowKey="_id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title="Request Shift Swap"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="requested_by" label="Requested By (Employee ID)" rules={[{ required: true }]}>
            <input />
          </Form.Item>
          <Form.Item name="requested_with" label="Swap With (Employee ID)" rules={[{ required: true }]}>
            <input />
          </Form.Item>
          <Form.Item name="original_shift_date" label="Original Shift Date" rules={[{ required: true }]}>
            <input type="date" />
          </Form.Item>
          <Form.Item name="swap_date" label="Swap Date" rules={[{ required: true }]}>
            <input type="date" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <input />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Shift Swap Details"
        placement="right"
        width={720}
        open={isDetailDrawerVisible}
        onClose={handleDetailDrawerClose}
      >
        {swapDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Requested By" span={2}>
              {swapDetail.requested_by_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Requested With" span={2}>
              {swapDetail.requested_with_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Swap Date">
              {swapDetail.swap_date ? dayjs(swapDetail.swap_date).format("DD MMM YYYY") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={swapDetail.status === "Approved" ? "green" : swapDetail.status === "Rejected" ? "red" : "default"}>
                {swapDetail.status || "-"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Reason" span={2}>
              {swapDetail.reason || "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default ShiftSwapsList;
