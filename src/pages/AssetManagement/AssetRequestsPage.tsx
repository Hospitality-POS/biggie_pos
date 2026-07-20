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
  Steps,
  Dropdown,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  StopOutlined,
  SendOutlined,
  MoreOutlined,
  RollbackOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as assetsApi from "src/services/accounting/assetsApi";
import { fetchAllDepartments } from "src/services/crm/departments";

const { RangePicker } = DatePicker;
const { Option } = Select;

const AssetRequestsPage = () => {
  const [filters, setFilters] = useState({
    status: "",
    department_id: "",
    search: "",
    from: "",
    to: "",
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"create" | "approve" | "reject" | "issue" | "cancel" | "return" | "assign">("create");
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["asset-requests", filters, pagination],
    queryFn: () => assetsApi.getAssetRequests({ ...filters, ...pagination }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ["asset-requests-summary", filters],
    queryFn: () => assetsApi.getRequestSummary(filters),
  });

  // Calculate stats from actual requests data
  const totalRequests = requestsData?.total || requestsData?.requests?.length || 0;
  const pendingCount = requestsData?.requests?.filter((r: any) => r.status === "Pending")?.length || 0;
  const approvedCount = requestsData?.requests?.filter((r: any) => r.status === "Approved")?.length || 0;
  const issuedCount = requestsData?.requests?.filter((r: any) => r.status === "Issued")?.length || 0;
  const returnedCount = requestsData?.requests?.filter((r: any) => 
    r.status === "Issued" && r.issued_assets?.every((item: any) => item.returned_date !== null)
  )?.length || 0;

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchAllDepartments,
  });

  const { data: availableAssets } = useQuery({
    queryKey: ["available-assets"],
    queryFn: () => assetsApi.getAssets({ page: 1, limit: 100 }),
    enabled: modalType === "issue",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => assetsApi.createAssetRequest(data),
    onSuccess: () => {
      message.success("Asset request created successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-requests"] });
      setModalVisible(false);
      form.resetFields();
      setCurrentStep(0);
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.approveAssetRequest(id, data),
    onSuccess: () => {
      message.success("Request approved successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-requests"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.rejectAssetRequest(id, data),
    onSuccess: () => {
      message.success("Request rejected successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-requests"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const issueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.issueAssets(id, data),
    onSuccess: () => {
      message.success("Assets issued successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-requests"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.cancelAssetRequest(id, data),
    onSuccess: () => {
      message.success("Request cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-requests"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ assetId }: { assetId: string }) => assetsApi.returnAsset(assetId),
    onSuccess: () => {
      message.success("Asset returned successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-requests"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to return asset. The asset must be in 'Assigned' status before it can be returned.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ assetId, data }: { assetId: string; data: any }) => assetsApi.assignAsset(assetId, data),
    onSuccess: () => {
      message.success("Asset assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["asset-requests"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to assign asset");
    },
  });

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (modalType === "create") {
        createMutation.mutate(values);
      } else if (modalType === "approve") {
        approveMutation.mutate({ id: selectedRequest._id, data: values });
      } else if (modalType === "reject") {
        rejectMutation.mutate({ id: selectedRequest._id, data: values });
      } else if (modalType === "issue") {
        issueMutation.mutate({ id: selectedRequest._id, data: values });
      } else if (modalType === "cancel") {
        cancelMutation.mutate({ id: selectedRequest._id, data: values });
      } else if (modalType === "return") {
        selectedRequest?.issued_assets?.forEach((item: any) => {
          const assetId = item.asset_id?._id || item.asset?._id || item._id;
          if (assetId) {
            returnMutation.mutate({ assetId });
          }
        });
      } else if (modalType === "assign") {
        const assetId = selectedRequest?.issued_assets?.[0]?.asset_id?._id;
        if (assetId) {
          assignMutation.mutate({ assetId, data: values });
        }
      }
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const openModal = (type: typeof modalType, request?: any) => {
    setModalType(type);
    setSelectedRequest(request);
    setModalVisible(true);
  };

  const viewRequest = (request: any) => {
    setSelectedRequest(request);
    setDrawerVisible(true);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      Pending: "orange",
      Approved: "green",
      Rejected: "red",
      Issued: "blue",
      Cancelled: "default",
    };
    return colors[status] || "default";
  };

  const columns = [
    {
      title: "Request No",
      dataIndex: "request_no",
      key: "request_no",
      width: 150,
    },
    {
      title: "Requester",
      dataIndex: "requester_name",
      key: "requester_name",
      width: 150,
    },
    {
      title: "Department",
      dataIndex: "department_name",
      key: "department_name",
      width: 120,
    },
    {
      title: "Asset Category",
      dataIndex: "asset_category",
      key: "asset_category",
      width: 150,
    },
    {
      title: "Quantity",
      dataIndex: "quantity_requested",
      key: "quantity_requested",
      width: 80,
    },
    {
      title: "Required By",
      dataIndex: "required_by_date",
      key: "required_by_date",
      width: 120,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD"),
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
      width: 80,
      render: (_: any, record: any) => {
        const menuItems = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: "View",
            onClick: () => viewRequest(record),
          },
        ];

        if (record.status === "Pending") {
          menuItems.push({
            key: "approve",
            icon: <CheckOutlined />,
            label: "Approve",
            onClick: () => openModal("approve", record),
          });
          menuItems.push({
            key: "reject",
            icon: <CloseOutlined />,
            label: "Reject",
            onClick: () => openModal("reject", record),
          });
          menuItems.push({
            key: "cancel",
            icon: <StopOutlined />,
            label: "Cancel",
            onClick: () => openModal("cancel", record),
          });
        }

        if (record.status === "Approved") {
          menuItems.push({
            key: "issue",
            icon: <SendOutlined />,
            label: "Issue",
            onClick: () => openModal("issue", record),
          });
        }

        if (record.status === "Issued") {
          // Check if all assets are returned
          const allReturned = record.issued_assets?.every((item: any) => item.returned_date !== null);
          
          if (allReturned) {
            // All assets returned - only view option available
            // No assign/return options - user must create new request
          } else {
            // Check if assets are assigned based on asset_id.status
            const isAssigned = record.issued_assets?.some((item: any) => item.asset_id?.status === "Assigned");
            
            if (isAssigned) {
              menuItems.push({
                key: "return",
                icon: <RollbackOutlined />,
                label: "Return",
                onClick: () => openModal("return", record),
              });
            } else {
              menuItems.push({
                key: "assign",
                icon: <UserAddOutlined />,
                label: "Assign",
                onClick: () => openModal("assign", record),
              });
            }
          }
        }

        return (
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={5}>
          <Card>
            <Statistic
              title="Total Requests"
              value={totalRequests}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Pending"
              value={pendingCount}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Approved"
              value={approvedCount}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Issued"
              value={issuedCount}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Returned"
              value={returnedCount}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Asset Requests"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ["asset-requests"] })}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal("create")}
            >
              New Request
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Search requests..."
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
            <Option value="Pending">Pending</Option>
            <Option value="Approved">Approved</Option>
            <Option value="Rejected">Rejected</Option>
            <Option value="Issued">Issued</Option>
            <Option value="Cancelled">Cancelled</Option>
          </Select>
          <Select
            placeholder="Department"
            value={filters.department_id}
            onChange={(value) => setFilters({ ...filters, department_id: value })}
            style={{ width: 150 }}
            allowClear
            loading={!departmentsData}
          >
            {departmentsData?.departments?.map((dept: any) => (
              <Option key={dept._id} value={dept._id}>
                {dept.name}
              </Option>
            ))}
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

        <Table
          columns={columns}
          dataSource={requestsData?.requests || []}
          loading={isLoading}
          rowKey="_id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: requestsData?.total || 0,
            onChange: (page, pageSize) =>
              setPagination({ page, limit: pageSize }),
          }}
        />
      </Card>

      <Drawer
        title="Request Details"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedRequest && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Request No" span={2}>
                {selectedRequest.request_no}
              </Descriptions.Item>
              <Descriptions.Item label="Requester" span={2}>
                {selectedRequest.requester_name}
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                {selectedRequest.department_name}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {selectedRequest.location}
              </Descriptions.Item>
              <Descriptions.Item label="Asset Category">
                {selectedRequest.asset_category}
              </Descriptions.Item>
              <Descriptions.Item label="Asset Type">
                {selectedRequest.asset_type}
              </Descriptions.Item>
              <Descriptions.Item label="Quantity Requested">
                {selectedRequest.quantity_requested}
              </Descriptions.Item>
              <Descriptions.Item label="Required By">
                {dayjs(selectedRequest.required_by_date).format("YYYY-MM-DD")}
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Tag color={getStatusColor(selectedRequest.status)}>
                  {selectedRequest.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reason" span={2}>
                {selectedRequest.reason}
              </Descriptions.Item>
              <Descriptions.Item label="Justification" span={2}>
                {selectedRequest.justification}
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>
                {selectedRequest.notes || "-"}
              </Descriptions.Item>
            </Descriptions>

            <Card title="Approval Workflow" size="small">
              <Steps
                current={selectedRequest.current_approval_step}
                direction="vertical"
                items={selectedRequest.approval_workflow?.map((step: any) => ({
                  title: step.approver_name,
                  description: `${step.approver_role} - ${step.status}`,
                  status: step.status === "Approved" ? "finish" : step.status === "Rejected" ? "error" : "wait",
                }))}
              />
            </Card>
          </>
        )}
      </Drawer>

      <Modal
        title={modalType.charAt(0).toUpperCase() + modalType.slice(1) + " Request"}
        open={modalVisible}
        onOk={modalType === "create" ? undefined : handleModalSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setCurrentStep(0);
        }}
        confirmLoading={
          createMutation.isLoading ||
          approveMutation.isLoading ||
          rejectMutation.isLoading ||
          issueMutation.isLoading ||
          cancelMutation.isLoading ||
          returnMutation.isLoading ||
          assignMutation.isLoading
        }
        width={modalType === "create" ? 800 : 600}
        footer={modalType === "create" ? null : undefined}
        okText={modalType === "return" ? "Return Assets" : modalType === "assign" ? "Assign Asset" : undefined}
        onOk={modalType === "create" ? undefined : handleModalSubmit}
      >
        <Form form={form} layout="vertical">
          {modalType === "create" && (
            <>
              <Steps current={currentStep} style={{ marginBottom: 24 }}>
                <Steps.Step title="Basic Info" />
                <Steps.Step title="Quantity & Timing" />
                <Steps.Step title="Details" />
              </Steps>
              <div style={{ display: currentStep === 0 ? "block" : "none" }}>
                <Form.Item
                  name="department_id"
                  label="Department"
                  rules={[{ required: true, message: "Please select department" }]}
                >
                  <Select placeholder="Select department" loading={!departmentsData}>
                    {departmentsData?.departments?.map((dept: any) => (
                      <Option key={dept._id} value={dept._id}>
                        {dept.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="location"
                  label="Location"
                  rules={[{ required: true, message: "Please enter location" }]}
                >
                  <Input placeholder="Enter location" />
                </Form.Item>
                <Form.Item
                  name="asset_category"
                  label="Asset Category"
                  rules={[{ required: true, message: "Please select category" }]}
                >
                  <Select placeholder="Select category">
                    <Option value="Equipment">Equipment</Option>
                    <Option value="Vehicles">Vehicles</Option>
                    <Option value="Furniture">Furniture</Option>
                    <Option value="IT Equipment">IT Equipment</Option>
                    <Option value="Buildings">Buildings</Option>
                    <Option value="Land">Land</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="asset_type"
                  label="Asset Type"
                  rules={[{ required: true, message: "Please enter asset type" }]}
                >
                  <Input placeholder="Enter asset type" />
                </Form.Item>
              </div>
              <div style={{ display: currentStep === 1 ? "block" : "none" }}>
                <Form.Item
                  name="quantity_requested"
                  label="Quantity"
                  rules={[{ required: true, message: "Please enter quantity" }]}
                >
                  <Input type="number" placeholder="Enter quantity" />
                </Form.Item>
                <Form.Item
                  name="required_by_date"
                  label="Required By Date"
                  rules={[{ required: true, message: "Please select date" }]}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </div>
              <div style={{ display: currentStep === 2 ? "block" : "none" }}>
                <Form.Item
                  name="reason"
                  label="Reason"
                  rules={[{ required: true, message: "Please enter reason" }]}
                >
                  <Input.TextArea rows={3} placeholder="Enter reason" />
                </Form.Item>
                <Form.Item name="justification" label="Justification">
                  <Input.TextArea rows={3} placeholder="Enter justification" />
                </Form.Item>
                <Form.Item name="notes" label="Notes">
                  <Input.TextArea rows={2} placeholder="Enter notes" />
                </Form.Item>
              </div>
              <div style={{ marginTop: 24, textAlign: "right" }}>
                {currentStep > 0 && (
                  <Button style={{ marginRight: 8 }} onClick={() => setCurrentStep(currentStep - 1)}>
                    Previous
                  </Button>
                )}
                {currentStep < 2 ? (
                  <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button type="primary" onClick={handleModalSubmit}>
                    Create Request
                  </Button>
                )}
              </div>
            </>
          )}
          {modalType === "approve" && (
            <Form.Item name="comments" label="Comments">
              <Input.TextArea rows={4} placeholder="Enter approval comments" />
            </Form.Item>
          )}
          {modalType === "reject" && (
            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true, message: "Please enter rejection reason" }]}
            >
              <Input.TextArea rows={4} placeholder="Enter rejection reason" />
            </Form.Item>
          )}
          {modalType === "issue" && (
            <Form.Item
              name="asset_ids"
              label="Select Assets"
              rules={[{ required: true, message: "Please select assets" }]}
            >
              <Select mode="multiple" placeholder="Select assets to issue" loading={!availableAssets}>
                {availableAssets?.assets?.map((asset: any) => (
                  <Option key={asset._id} value={asset._id}>
                    {asset.asset_no} - {asset.asset_name} ({asset.asset_category})
                  </Option>
                ))}
              </Select>
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
          {modalType === "return" && (
            <div>
              <p style={{ marginBottom: 16 }}>
                The following assets will be returned:
              </p>
              {selectedRequest?.issued_assets?.map((item: any, index: number) => {
                const asset = item.asset_id || item.asset || item;
                const assetId = asset?._id || item.asset_id?._id || item._id;
                return (
                  <div key={index} style={{ padding: "8px 12px", background: "#f5f5f5", marginBottom: 8, borderRadius: 4 }}>
                    <strong>{asset?.asset_no || 'N/A'}</strong> - {item.asset_name || asset?.asset_name || 'N/A'}
                    <div style={{ fontSize: 12, color: "#999" }}>ID: {String(assetId || 'N/A')}</div>
                  </div>
                );
              })}
            </div>
          )}
          {modalType === "assign" && (
            <>
              <p style={{ marginBottom: 16 }}>
                Assign the asset to a custodian:
              </p>
              <Form.Item
                name="custodian_id"
                label="Custodian"
                rules={[{ required: true, message: "Please select a custodian" }]}
                initialValue={selectedRequest?.requester_id?._id}
              >
                <Select placeholder="Select custodian">
                  <Option value={selectedRequest?.requester_id?._id}>{selectedRequest?.requester_name || selectedRequest?.requester_id?.username}</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="location"
                label="Location"
                rules={[{ required: true, message: "Please enter location" }]}
                initialValue={selectedRequest?.location}
              >
                <Input placeholder="Enter location" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AssetRequestsPage;
