import { useState } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Card,
  Modal,
  Form,
  message,
  Drawer,
  Descriptions,
  Row,
  Col,
  Statistic,
  Calendar,
  Steps,
  Dropdown,
  MenuProps,
  Spin,
} from "antd";
import { fetchAllUsersByShopId } from "src/services/users";
import { fetchAllSuppliers } from "src/services/supplier";
import {
  PlusOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  StopOutlined,
  CalendarOutlined,
  ReloadOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as assetsApi from "src/services/accounting/assetsApi";

const { RangePicker } = DatePicker;
const { Option } = Select;

const AssetMaintenancePage = () => {
  const [filters, setFilters] = useState({
    status: "",
    maintenance_type: "",
    asset_id: "",
    search: "",
    from: "",
    to: "",
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"create" | "start" | "complete" | "cancel">("create");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ["asset-maintenance", filters, pagination],
    queryFn: () => assetsApi.getMaintenanceRecords({ ...filters, ...pagination }),
  });

  // Calculate stats from maintenance data
  const maintenanceRecords = maintenanceData?.maintenance || [];
  const scheduledCount = maintenanceRecords.filter((m: any) => m.status === "Scheduled").length;
  const inProgressCount = maintenanceRecords.filter((m: any) => m.status === "In_Progress").length;
  const completedCount = maintenanceRecords.filter((m: any) => m.status === "Completed").length;

  const { data: scheduleData } = useQuery({
    queryKey: ["maintenance-schedule", filters],
    queryFn: () => assetsApi.getMaintenanceSchedule(filters),
  });

  const { data: assetsData } = useQuery({
    queryKey: ["assets"],
    queryFn: () => assetsApi.getAssets({ limit: 1000 }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: fetchAllUsersByShopId,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetchAllSuppliers({}),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => assetsApi.createMaintenance(data),
    onSuccess: () => {
      message.success("Maintenance record created successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => assetsApi.startMaintenance(id),
    onSuccess: () => {
      message.success("Maintenance started successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.completeMaintenance(id, data),
    onSuccess: () => {
      message.success("Maintenance completed successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.cancelMaintenance(id, data),
    onSuccess: () => {
      message.success("Maintenance cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (modalType === "create") {
        createMutation.mutate(values);
      } else if (modalType === "complete") {
        completeMutation.mutate({ id: selectedMaintenance._id, data: values });
      } else if (modalType === "cancel") {
        cancelMutation.mutate({ id: selectedMaintenance._id, data: values });
      }
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const next = async () => {
    try {
      const stepFields = {
        0: ["asset_id", "maintenance_type", "scheduled_date"],
        1: ["performed_by_type"],
        2: ["cost", "currency", "description"],
      };
      
      await form.validateFields(stepFields[currentStep as keyof typeof stepFields]);
      
      // Conditional validation for step 1
      if (currentStep === 1) {
        const performedByType = form.getFieldValue("performed_by_type");
        if (performedByType === "Internal") {
          await form.validateFields(["performed_by_user"]);
        } else if (performedByType === "External") {
          await form.validateFields(["vendor_id"]);
        }
      }
      
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const prev = () => {
    setCurrentStep(currentStep - 1);
  };

  const openModal = (type: typeof modalType, maintenance?: any) => {
    setModalType(type);
    setSelectedMaintenance(maintenance);
    setCurrentStep(0);
    setModalVisible(true);
  };

  const viewMaintenance = (maintenance: any) => {
    setSelectedMaintenance(maintenance);
    setDrawerVisible(true);
  };

  const handleStart = (maintenance: any) => {
    startMutation.mutate(maintenance._id);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      Scheduled: "blue",
      In_Progress: "orange",
      Completed: "green",
      Cancelled: "red",
    };
    return colors[status] || "default";
  };

  const columns = [
    {
      title: "Maintenance No",
      dataIndex: "maintenance_no",
      key: "maintenance_no",
      width: 150,
    },
    {
      title: "Asset",
      key: "asset",
      width: 150,
      render: (_: any, record: any) => {
        if (record.asset_id) {
          return `${record.asset_id.asset_no || 'N/A'} - ${record.asset_id.asset_name || 'N/A'}`;
        }
        return 'N/A';
      },
    },
    {
      title: "Type",
      dataIndex: "maintenance_type",
      key: "maintenance_type",
      width: 120,
    },
    {
      title: "Scheduled Date",
      dataIndex: "scheduled_date",
      key: "scheduled_date",
      width: 120,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD"),
    },
    {
      title: "Completed Date",
      dataIndex: "completed_date",
      key: "completed_date",
      width: 120,
      render: (date: string | null) => date ? dayjs(date).format("YYYY-MM-DD") : "-",
    },
    {
      title: "Cost",
      dataIndex: "cost",
      key: "cost",
      width: 100,
      render: (cost: number, record: any) => `${record.currency} ${cost?.toLocaleString() || 0}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: any, record: any) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'view',
            label: 'View',
            icon: <EyeOutlined />,
            onClick: () => viewMaintenance(record),
          },
        ];

        if (record.status === "Scheduled") {
          menuItems.push({
            key: 'start',
            label: 'Start',
            icon: <PlayCircleOutlined />,
            onClick: () => handleStart(record),
          });
        }

        if (record.status === "In_Progress") {
          menuItems.push({
            key: 'complete',
            label: 'Complete',
            icon: <CheckOutlined />,
            onClick: () => openModal("complete", record),
          });
        }

        if (record.status !== "Completed" && record.status !== "Cancelled") {
          menuItems.push({
            key: 'cancel',
            label: 'Cancel',
            icon: <StopOutlined />,
            onClick: () => openModal("cancel", record),
          });
        }

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  const calendarData = Array.isArray(scheduleData) ? scheduleData.map((item: any) => ({
    type: item.status === "Completed" ? "success" : item.status === "In_Progress" ? "warning" : "info",
    content: `${item.asset?.asset_name} - ${item.maintenance_type}`,
    date: dayjs(item.scheduled_date).format("YYYY-MM-DD"),
  })) : [];

  return (
    <div style={{ padding: "24px" }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Maintenance"
              value={maintenanceData?.total || 0}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Scheduled"
              value={scheduledCount}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={inProgressCount}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={completedCount}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Asset Maintenance"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ["asset-maintenance"] })}
            >
              Refresh
            </Button>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
            >
              {viewMode === "list" ? "Calendar View" : "List View"}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal("create")}
            >
              Schedule Maintenance
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Search maintenance..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ width: 200 }}
          />
          <Select
            placeholder="Status"
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="Scheduled">Scheduled</Option>
            <Option value="In_Progress">In Progress</Option>
            <Option value="Completed">Completed</Option>
            <Option value="Cancelled">Cancelled</Option>
          </Select>
          <Select
            placeholder="Type"
            value={filters.maintenance_type}
            onChange={(value) => setFilters({ ...filters, maintenance_type: value })}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="Preventive">Preventive</Option>
            <Option value="Corrective">Corrective</Option>
            <Option value="Emergency">Emergency</Option>
            <Option value="Upgrade">Upgrade</Option>
          </Select>
          <RangePicker
            onChange={(dates) => {
              setFilters({
                ...filters,
                from: dates?.[0]?.format("YYYY-MM-DD") || "",
                to: dates?.[1]?.format("YYYY-MM-DD") || "",
              });
            }}
          />
        </Space>

        {viewMode === "list" ? (
          <Table
            columns={columns}
            dataSource={maintenanceData?.maintenance || []}
            loading={isLoading}
            rowKey="_id"
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: maintenanceData?.total || 0,
              onChange: (page, pageSize) =>
                setPagination({ page, limit: pageSize }),
            }}
          />
        ) : (
          <Calendar
            cellRender={(current) => {
              const dateStr = dayjs(current).format("YYYY-MM-DD");
              const dayEvents = calendarData.filter((item: any) => item.date === dateStr);
              return (
                <div style={{ height: "100%" }}>
                  {dayEvents.map((event: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "12px",
                        padding: "2px 4px",
                        margin: "2px 0",
                        borderRadius: "4px",
                        backgroundColor:
                          event.type === "success"
                            ? "#f6ffed"
                            : event.type === "warning"
                            ? "#fffbe6"
                            : "#e6f7ff",
                        color:
                          event.type === "success"
                            ? "#52c41a"
                            : event.type === "warning"
                            ? "#faad14"
                            : "#1890ff",
                        cursor: "pointer",
                      }}
                    >
                      {event.content}
                    </div>
                  ))}
                </div>
              );
            }}
          />
        )}
      </Card>

      <Drawer
        title="Maintenance Details"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedMaintenance && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Maintenance No" span={2}>
              {selectedMaintenance.maintenance_no}
            </Descriptions.Item>
            <Descriptions.Item label="Asset" span={2}>
              {selectedMaintenance.asset?.asset_no} - {selectedMaintenance.asset?.asset_name}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              {selectedMaintenance.maintenance_type}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedMaintenance.status)}>
                {selectedMaintenance.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Scheduled Date">
              {dayjs(selectedMaintenance.scheduled_date).format("YYYY-MM-DD")}
            </Descriptions.Item>
            <Descriptions.Item label="Completed Date">
              {selectedMaintenance.completed_date
                ? dayjs(selectedMaintenance.completed_date).format("YYYY-MM-DD")
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Performed By">
              {selectedMaintenance.performed_by_type}
            </Descriptions.Item>
            <Descriptions.Item label="Cost">
              {selectedMaintenance.currency} {selectedMaintenance.cost?.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {selectedMaintenance.description}
            </Descriptions.Item>
            <Descriptions.Item label="Work Performed" span={2}>
              {selectedMaintenance.work_performed || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Parts Used" span={2}>
              {selectedMaintenance.parts_used?.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  {selectedMaintenance.parts_used.map((part: any, idx: number) => (
                    <li key={idx}>
                      {part.part_name} (Qty: {part.quantity}, Cost: {part.unit_cost})
                    </li>
                  ))}
                </ul>
              ) : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Notes" span={2}>
              {selectedMaintenance.notes || "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title={modalType.charAt(0).toUpperCase() + modalType.slice(1) + " Maintenance"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setCurrentStep(0);
        }}
        confirmLoading={
          createMutation.isLoading ||
          completeMutation.isLoading ||
          cancelMutation.isLoading
        }
        width={800}
        footer={modalType === "create" ? null : undefined}
        okText={modalType === "create" ? undefined : undefined}
        onOk={modalType === "create" ? undefined : handleModalSubmit}
      >
        <Form form={form} layout="vertical">
          {modalType === "create" && (
            <>
              <Steps current={currentStep} style={{ marginBottom: 24 }}>
                <Steps.Step title="Asset & Type" />
                <Steps.Step title="Assignment" />
                <Steps.Step title="Cost & Details" />
              </Steps>

              <div style={{ display: currentStep === 0 ? "block" : "none" }}>
                <Form.Item
                  name="asset_id"
                  label="Asset"
                  rules={[{ required: true, message: "Please select asset" }]}
                >
                  <Select placeholder="Select asset" loading={!assetsData}>
                    {assetsData?.assets?.map((asset: any) => (
                      <Option key={asset._id} value={asset._id}>
                        {asset.asset_no} - {asset.asset_name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="maintenance_type"
                  label="Maintenance Type"
                  rules={[{ required: true, message: "Please select type" }]}
                >
                  <Select placeholder="Select type">
                    <Option value="Preventive">Preventive</Option>
                    <Option value="Corrective">Corrective</Option>
                    <Option value="Emergency">Emergency</Option>
                    <Option value="Upgrade">Upgrade</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="scheduled_date"
                  label="Scheduled Date"
                  rules={[{ required: true, message: "Please select date" }]}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </div>

              <div style={{ display: currentStep === 1 ? "block" : "none" }}>
                <Form.Item
                  name="performed_by_type"
                  label="Performed By"
                  rules={[{ required: true, message: "Please select type" }]}
                >
                  <Select placeholder="Select type">
                    <Option value="Internal">Internal</Option>
                    <Option value="External">External</Option>
                  </Select>
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.performed_by_type !== currentValues.performed_by_type}>
                  {({ getFieldValue }) => {
                    const performedByType = getFieldValue("performed_by_type");
                    return (
                      <>
                        {performedByType === "Internal" && (
                          <Form.Item
                            name="performed_by_user"
                            label="Technician/User"
                            rules={[{ required: true, message: "Please select technician" }]}
                          >
                            <Select placeholder="Select technician" loading={!usersData}>
                              {usersData?.map((user: any) => (
                                <Option key={user._id} value={user._id}>
                                  {user.fullname || user.username}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        )}
                        {performedByType === "External" && (
                          <Form.Item
                            name="vendor_id"
                            label="Vendor"
                            rules={[{ required: true, message: "Please select vendor" }]}
                          >
                            <Select placeholder="Select vendor" loading={!suppliersData}>
                              {suppliersData?.map((supplier: any) => (
                                <Option key={supplier._id} value={supplier._id}>
                                  {supplier.name}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        )}
                      </>
                    );
                  }}
                </Form.Item>
              </div>

              <div style={{ display: currentStep === 2 ? "block" : "none" }}>
                <Form.Item
                  name="cost"
                  label="Cost"
                  rules={[{ required: true, message: "Please enter cost" }]}
                >
                  <Input type="number" placeholder="Enter cost" />
                </Form.Item>
                <Form.Item
                  name="currency"
                  label="Currency"
                  rules={[{ required: true, message: "Please select currency" }]}
                >
                  <Select placeholder="Select currency">
                    <Option value="KES">KES</Option>
                    <Option value="USD">USD</Option>
                    <Option value="EUR">EUR</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="description"
                  label="Description"
                  rules={[{ required: true, message: "Please enter description" }]}
                >
                  <Input.TextArea rows={3} placeholder="Enter description" />
                </Form.Item>
                <Form.Item name="notes" label="Notes">
                  <Input.TextArea rows={2} placeholder="Enter notes" />
                </Form.Item>
              </div>

              <div style={{ marginTop: 24 }}>
                {currentStep > 0 && (
                  <Button style={{ marginRight: 8 }} onClick={prev}>
                    Previous
                  </Button>
                )}
                {currentStep < 2 && (
                  <Button type="primary" onClick={next}>
                    Next
                  </Button>
                )}
                {currentStep === 2 && (
                  <Button type="primary" onClick={handleModalSubmit} loading={createMutation.isLoading}>
                    Submit
                  </Button>
                )}
              </div>
            </>
          )}
          {modalType === "complete" && (
            <Form.Item
              name="work_performed"
              label="Work Performed"
              rules={[{ required: true, message: "Please describe work performed" }]}
            >
              <Input.TextArea rows={6} placeholder="Describe the work performed" />
            </Form.Item>
          )}
          {modalType === "cancel" && (
            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true, message: "Please enter cancellation reason" }]}
            >
              <Input.TextArea rows={4} placeholder="Enter cancellation reason" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AssetMaintenancePage;
