import React, { useState } from "react";
import { Typography, Card, Table, Button, Space, Tag, DatePicker, Select, Modal, Form, message, Drawer, Descriptions } from "antd";
import { PlusOutlined, EyeOutlined, CalendarOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShiftSchedules, createShiftSchedule, publishShiftSchedule, getShiftScheduleById } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

const ShiftSchedulesList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ["hr-shift-schedules", { status: statusFilter }],
    queryFn: () => fetchShiftSchedules({ status: statusFilter }),
  });

  const schedules = Array.isArray(schedulesData) ? schedulesData : schedulesData?.schedules || [];

  const { data: scheduleDetail } = useQuery({
    queryKey: ["hr-shift-schedule", selectedScheduleId],
    queryFn: () => getShiftScheduleById(selectedScheduleId),
    enabled: !!selectedScheduleId && isDetailDrawerVisible,
  });

  const createMutation = useMutation({
    mutationFn: createShiftSchedule,
    onSuccess: () => {
      message.success("Shift schedule created successfully");
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["hr-shift-schedules"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to create shift schedule");
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishShiftSchedule,
    onSuccess: () => {
      message.success("Shift schedule published successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-shift-schedules"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to publish shift schedule");
    },
  });

  const columns = [
    {
      title: "Schedule Name",
      dataIndex: "schedule_name",
      key: "schedule_name",
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      render: (date: string) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      render: (date: string) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "Total Shifts",
      dataIndex: "total_shifts",
      key: "total_shifts",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          Draft: "default",
          Published: "green",
          Archived: "red",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewSchedule(record._id)}>
            View
          </Button>
          {record.status === "Draft" && (
            <Button
              type="link"
              icon={<CalendarOutlined />}
              onClick={() => publishMutation.mutate(record._id)}
              loading={publishMutation.isPending}
            >
              Publish
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleCreate = (values: any) => {
    createMutation.mutate({
      schedule_name: values.schedule_name,
      start_date: values.start_date,
      end_date: values.end_date,
    });
  };

  const handleViewSchedule = (id: string) => {
    setSelectedScheduleId(id);
    setIsDetailDrawerVisible(true);
  };

  const handleDetailDrawerClose = () => {
    setIsDetailDrawerVisible(false);
    setSelectedScheduleId("");
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            Shift Schedules
          </Title>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ["hr-shift-schedules"] })}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
              Create Schedule
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
            <Option value="Draft">Draft</Option>
            <Option value="Published">Published</Option>
            <Option value="Archived">Archived</Option>
          </Select>
        </div>

        <Table columns={columns} dataSource={schedules} loading={isLoading} rowKey="_id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title="Create Shift Schedule"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="schedule_name" label="Schedule Name" rules={[{ required: true }]}>
            <input />
          </Form.Item>
          <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="end_date" label="End Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Shift Schedule Details"
        placement="right"
        width={720}
        open={isDetailDrawerVisible}
        onClose={handleDetailDrawerClose}
      >
        {scheduleDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Schedule Name" span={2}>
              {scheduleDetail.schedule_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Start Date">
              {scheduleDetail.schedule_start ? dayjs(scheduleDetail.schedule_start).format("DD MMM YYYY") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="End Date">
              {scheduleDetail.schedule_end ? dayjs(scheduleDetail.schedule_end).format("DD MMM YYYY") : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Schedule Type">
              {scheduleDetail.schedule_type || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={scheduleDetail.status === "Published" ? "green" : "default"}>
                {scheduleDetail.status || "-"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Assignments" span={2}>
              {scheduleDetail.assignments?.length || 0}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default ShiftSchedulesList;
