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
  Timeline,
} from "antd";
import {
  EyeOutlined,
  UserAddOutlined,
  RollbackOutlined,
  SwapOutlined,
  StopOutlined,
  DollarOutlined,
  RiseOutlined,
  PlusOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as assetsApi from "src/services/accounting/assetsApi";
import { fetchAllUsersByShopId } from "src/services/users";

const { RangePicker } = DatePicker;
const { Option } = Select;

const AssetRegisterPage = () => {
  const [filters, setFilters] = useState({
    status: "",
    asset_category: "",
    department: "",
    location: "",
    search: "",
    from: "",
    to: "",
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"create" | "assign" | "transfer" | "retire" | "dispose" | "revalue">("assign");
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ["assets", filters, pagination],
    queryFn: () => assetsApi.getAssets({ ...filters, ...pagination }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ["assets-summary", filters],
    queryFn: () => assetsApi.getAssetSummary(filters),
  });

  // Calculate stats from actual assets data
  const totalAssets = assetsData?.total || assetsData?.assets?.length || 0;
  const totalValue = assetsData?.assets?.reduce((sum: number, asset: any) => sum + (asset.purchase_cost || 0), 0) || 0;
  const accumulatedDepreciation = assetsData?.assets?.reduce((sum: number, asset: any) => sum + (asset.accumulated_depreciation || 0), 0) || 0;
  const netBookValue = assetsData?.assets?.reduce((sum: number, asset: any) => sum + (asset.net_book_value || 0), 0) || 0;

  const { data: usersData } = useQuery({
    queryKey: ["shop-users"],
    queryFn: fetchAllUsersByShopId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.assignAsset(id, data),
    onSuccess: () => {
      message.success("Asset assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const returnMutation = useMutation({
    mutationFn: (id: string) => assetsApi.returnAsset(id),
    onSuccess: () => {
      message.success("Asset returned successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.transferAsset(id, data),
    onSuccess: () => {
      message.success("Asset transferred successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const retireMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.retireAsset(id, data),
    onSuccess: () => {
      message.success("Asset retired successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const disposeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.disposeAsset(id, data),
    onSuccess: () => {
      message.success("Asset disposed successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const revalueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.revalueAsset(id, data),
    onSuccess: () => {
      message.success("Asset revalued successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setModalVisible(false);
      form.resetFields();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => assetsApi.createAsset(data),
    onSuccess: () => {
      message.success("Asset created successfully");
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setModalVisible(false);
      form.resetFields();
      setCurrentStep(0);
    },
  });

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (modalType === "create") {
        createMutation.mutate(values);
      } else if (modalType === "assign") {
        assignMutation.mutate({ id: selectedAsset._id, data: values });
      } else if (modalType === "transfer") {
        transferMutation.mutate({ id: selectedAsset._id, data: values });
      } else if (modalType === "retire") {
        retireMutation.mutate({ id: selectedAsset._id, data: values });
      } else if (modalType === "dispose") {
        disposeMutation.mutate({ id: selectedAsset._id, data: values });
      } else if (modalType === "revalue") {
        revalueMutation.mutate({ id: selectedAsset._id, data: values });
      }
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleReturn = (asset: any) => {
    returnMutation.mutate(asset._id);
  };

  const openModal = (type: typeof modalType, asset: any) => {
    setModalType(type);
    setSelectedAsset(asset);
    setModalVisible(true);
  };

  const viewAsset = (asset: any) => {
    setSelectedAsset(asset);
    setDrawerVisible(true);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      Available: "green",
      Assigned: "blue",
      In_Maintenance: "orange",
      Retired: "gray",
      Disposed: "red",
      Written_Off: "default",
    };
    return colors[status] || "default";
  };

  const columns = [
    {
      title: "Asset No",
      dataIndex: "asset_no",
      key: "asset_no",
      width: 150,
    },
    {
      title: "Asset Name",
      dataIndex: "asset_name",
      key: "asset_name",
      width: 200,
    },
    {
      title: "Category",
      dataIndex: "asset_category",
      key: "asset_category",
      width: 120,
    },
    {
      title: "Location",
      dataIndex: "current_location",
      key: "current_location",
      width: 150,
    },
    {
      title: "Custodian",
      key: "custodian",
      width: 150,
      render: (_: any, record: any) => record.custodian?.name || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: "Net Book Value",
      dataIndex: "net_book_value",
      key: "net_book_value",
      width: 120,
      render: (value: number, record: any) =>
        `${record.currency} ${value?.toLocaleString() || 0}`,
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
            onClick: () => viewAsset(record),
          },
        ];

        if (record.status === "Available") {
          menuItems.push({
            key: "assign",
            icon: <UserAddOutlined />,
            label: "Assign",
            onClick: () => openModal("assign", record),
          });
        }

        if (record.status === "Assigned") {
          menuItems.push({
            key: "return",
            icon: <RollbackOutlined />,
            label: "Return",
            onClick: () => handleReturn(record),
          });
        }

        menuItems.push({
          key: "transfer",
          icon: <SwapOutlined />,
          label: "Transfer",
          onClick: () => openModal("transfer", record),
        });

        if (record.status !== "Retired" && record.status !== "Disposed") {
          menuItems.push({
            key: "retire",
            icon: <StopOutlined />,
            label: "Retire",
            onClick: () => openModal("retire", record),
          });
        }

        if (record.status !== "Disposed") {
          menuItems.push({
            key: "dispose",
            icon: <DollarOutlined />,
            label: "Dispose",
            onClick: () => openModal("dispose", record),
          });
        }

        menuItems.push({
          key: "revalue",
          icon: <RiseOutlined />,
          label: "Revalue",
          onClick: () => openModal("revalue", record),
        });

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
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Assets"
              value={totalAssets}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={totalValue}
              prefix="KES"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Accumulated Depreciation"
              value={accumulatedDepreciation}
              prefix="KES"
              precision={2}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Net Book Value"
              value={netBookValue}
              prefix="KES"
              precision={2}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Asset Register"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal("create")}
          >
            Add New Asset
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Search assets..."
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
            <Option value="Available">Available</Option>
            <Option value="Assigned">Assigned</Option>
            <Option value="In_Maintenance">In Maintenance</Option>
            <Option value="Retired">Retired</Option>
            <Option value="Disposed">Disposed</Option>
          </Select>
          <Select
            placeholder="Category"
            value={filters.asset_category}
            onChange={(value) => setFilters({ ...filters, asset_category: value })}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="Equipment">Equipment</Option>
            <Option value="Vehicles">Vehicles</Option>
            <Option value="Furniture">Furniture</Option>
            <Option value="IT Equipment">IT Equipment</Option>
            <Option value="Buildings">Buildings</Option>
            <Option value="Land">Land</Option>
            <Option value="Intangible Assets">Intangible Assets</Option>
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
          dataSource={assetsData?.assets || []}
          loading={isLoading}
          rowKey="_id"
          expandable={{
            expandedRowRender: (record: any) => (
              <div style={{ padding: "16px" }}>
                <h4 style={{ marginBottom: 12 }}>Issuance History</h4>
                {record.transactions && record.transactions.length > 0 ? (
                  <Timeline
                    items={record.transactions.map((txn: any) => ({
                      children: (
                        <div>
                          <div style={{ fontWeight: 500 }}>{txn.transaction_type}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {txn.description}
                          </div>
                          <div style={{ fontSize: 12, color: "#999" }}>
                            {dayjs(txn.transaction_date).format("YYYY-MM-DD HH:mm")}
                            {txn.from_custodian && ` • From: ${txn.from_custodian?.username || txn.from_custodian_name || txn.from_custodian}`}
                            {txn.to_custodian && ` • To: ${txn.to_custodian?.username || txn.to_custodian_name || txn.to_custodian}`}
                            {txn.from_location && ` • From: ${txn.from_location}`}
                            {txn.to_location && ` • To: ${txn.to_location}`}
                          </div>
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <p style={{ color: "#999" }}>No transaction history available</p>
                )}
              </div>
            ),
            rowExpandable: () => true,
          }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: assetsData?.total || 0,
            onChange: (page, pageSize) =>
              setPagination({ page, limit: pageSize }),
          }}
        />
      </Card>

      <Drawer
        title="Asset Details"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedAsset && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Asset No" span={2}>
                {selectedAsset.asset_no}
              </Descriptions.Item>
              <Descriptions.Item label="Asset Name" span={2}>
                {selectedAsset.asset_name}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {selectedAsset.description}
              </Descriptions.Item>
              <Descriptions.Item label="Serial Number">
                {selectedAsset.serial_number}
              </Descriptions.Item>
              <Descriptions.Item label="Tag Number">
                {selectedAsset.tag_number}
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {selectedAsset.asset_category}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                {selectedAsset.asset_type}
              </Descriptions.Item>
              <Descriptions.Item label="Purchase Cost">
                {selectedAsset.currency} {selectedAsset.purchase_cost?.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Salvage Value">
                {selectedAsset.currency} {selectedAsset.salvage_value?.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Useful Life">
                {selectedAsset.useful_life_years} years
              </Descriptions.Item>
              <Descriptions.Item label="Depreciation Method">
                {selectedAsset.depreciation_method}
              </Descriptions.Item>
              <Descriptions.Item label="Accumulated Depreciation">
                {selectedAsset.currency} {selectedAsset.accumulated_depreciation?.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Net Book Value">
                {selectedAsset.currency} {selectedAsset.net_book_value?.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {selectedAsset.current_location}
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                {selectedAsset.department}
              </Descriptions.Item>
              <Descriptions.Item label="Custodian">
                {selectedAsset.custodian?.name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedAsset.status)}>
                  {selectedAsset.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Condition">
                {selectedAsset.condition}
              </Descriptions.Item>
              <Descriptions.Item label="Purchase Date">
                {dayjs(selectedAsset.purchase_date).format("YYYY-MM-DD")}
              </Descriptions.Item>
              <Descriptions.Item label="Warranty Expiry">
                {selectedAsset.warranty_expiry
                  ? dayjs(selectedAsset.warranty_expiry).format("YYYY-MM-DD")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>
                {selectedAsset.notes || "-"}
              </Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 12 }}>Issuance History</h4>
              {selectedAsset.transactions && selectedAsset.transactions.length > 0 ? (
                <Timeline
                  items={selectedAsset.transactions.map((txn: any) => ({
                    children: (
                      <div>
                        <div style={{ fontWeight: 500 }}>{txn.transaction_type}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          {txn.description}
                        </div>
                        <div style={{ fontSize: 12, color: "#999" }}>
                          {dayjs(txn.transaction_date).format("YYYY-MM-DD HH:mm")}
                          {txn.from_custodian && ` • From: ${txn.from_custodian?.username || txn.from_custodian_name || txn.from_custodian}`}
                          {txn.to_custodian && ` • To: ${txn.to_custodian?.username || txn.to_custodian_name || txn.to_custodian}`}
                          {txn.from_location && ` • From: ${txn.from_location}`}
                          {txn.to_location && ` • To: ${txn.to_location}`}
                        </div>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <p style={{ color: "#999" }}>No transaction history available</p>
              )}
            </div>
          </>
        )}
      </Drawer>

      <Modal
        title={modalType.charAt(0).toUpperCase() + modalType.slice(1) + " Asset"}
        open={modalVisible}
        onOk={modalType === "create" ? undefined : handleModalSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setCurrentStep(0);
        }}
        confirmLoading={
          assignMutation.isLoading ||
          transferMutation.isLoading ||
          retireMutation.isLoading ||
          disposeMutation.isLoading ||
          revalueMutation.isLoading ||
          createMutation.isLoading
        }
        width={modalType === "create" ? 800 : 600}
        footer={modalType === "create" ? null : undefined}
      >
        {modalType === "create" ? (
          <>
            <Steps current={currentStep} style={{ marginBottom: 24 }}>
              <Steps.Step title="Basic Info" />
              <Steps.Step title="Financial Info" />
              <Steps.Step title="Additional Details" />
            </Steps>
            <Form form={form} layout="vertical">
              <div style={{ display: currentStep === 0 ? "block" : "none" }}>
                <Form.Item
                  name="asset_name"
                  label="Asset Name"
                  rules={[{ required: true, message: "Please enter asset name" }]}
                >
                  <Input placeholder="Enter asset name" />
                </Form.Item>
                <Form.Item
                  name="asset_no"
                  label="Asset Number"
                  rules={[{ required: true, message: "Please enter asset number" }]}
                >
                  <Input placeholder="Enter asset number" />
                </Form.Item>
                <Form.Item
                  name="asset_category"
                  label="Category"
                  rules={[{ required: true, message: "Please select category" }]}
                >
                  <Select placeholder="Select category">
                    <Option value="Furniture">Furniture</Option>
                    <Option value="Electronics">Electronics</Option>
                    <Option value="Vehicles">Vehicles</Option>
                    <Option value="Machinery">Machinery</Option>
                    <Option value="Buildings">Buildings</Option>
                    <Option value="Land">Land</Option>
                    <Option value="Equipment">Equipment</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="current_location"
                  label="Location"
                  rules={[{ required: true, message: "Please enter location" }]}
                >
                  <Input placeholder="Enter location" />
                </Form.Item>
              </div>
              <div style={{ display: currentStep === 1 ? "block" : "none" }}>
                <Form.Item
                  name="purchase_date"
                  label="Purchase Date"
                  rules={[{ required: true, message: "Please select purchase date" }]}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  name="purchase_cost"
                  label="Purchase Cost"
                  rules={[{ required: true, message: "Please enter purchase cost" }]}
                >
                  <Input type="number" placeholder="Enter purchase cost" />
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
                    <Option value="GBP">GBP</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="useful_life"
                  label="Useful Life (Years)"
                  rules={[{ required: true, message: "Please enter useful life" }]}
                >
                  <Input type="number" placeholder="Enter useful life in years" />
                </Form.Item>
                <Form.Item
                  name="depreciation_method"
                  label="Depreciation Method"
                  rules={[{ required: true, message: "Please select method" }]}
                >
                  <Select placeholder="Select method">
                    <Option value="straight_line">Straight Line</Option>
                    <Option value="reducing_balance">Reducing Balance</Option>
                    <Option value="units_of_production">Units of Production</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ display: currentStep === 2 ? "block" : "none" }}>
                <Form.Item
                  name="condition"
                  label="Condition"
                  rules={[{ required: true, message: "Please enter condition" }]}
                >
                  <Select placeholder="Select condition">
                    <Option value="New">New</Option>
                    <Option value="Good">Good</Option>
                    <Option value="Fair">Fair</Option>
                    <Option value="Poor">Poor</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="warranty_expiry" label="Warranty Expiry">
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="serial_number" label="Serial Number">
                  <Input placeholder="Enter serial number" />
                </Form.Item>
                <Form.Item name="notes" label="Notes">
                  <Input.TextArea rows={4} placeholder="Enter additional notes" />
                </Form.Item>
              </div>
            </Form>
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
                  Create Asset
                </Button>
              )}
            </div>
          </>
        ) : (
          <Form form={form} layout="vertical">
            {modalType === "assign" && (
            <>
              <Form.Item
                name="custodian_id"
                label="Custodian"
                rules={[{ required: true, message: "Please select custodian" }]}
              >
                <Select placeholder="Select custodian" loading={!usersData}>
                  {usersData?.map((user: any) => (
                    <Option key={user._id} value={user._id}>
                      {user.fullname || user.email}
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
            </>
          )}
          {modalType === "transfer" && (
            <>
              <Form.Item
                name="to_location"
                label="To Location"
                rules={[{ required: true, message: "Please enter location" }]}
              >
                <Input placeholder="Enter new location" />
              </Form.Item>
              <Form.Item name="to_custodian" label="To Custodian (Optional)">
                <Select placeholder="Select custodian" allowClear loading={!usersData}>
                  {usersData?.map((user: any) => (
                    <Option key={user._id} value={user._id}>
                      {user.fullname || user.email}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}
          {modalType === "retire" && (
            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true, message: "Please enter reason" }]}
            >
              <Input.TextArea rows={4} placeholder="Enter retirement reason" />
            </Form.Item>
          )}
          {modalType === "dispose" && (
            <>
              <Form.Item
                name="disposal_date"
                label="Disposal Date"
                rules={[{ required: true, message: "Please select date" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="disposal_price"
                label="Disposal Price"
                rules={[{ required: true, message: "Please enter price" }]}
              >
                <Input type="number" placeholder="Enter disposal price" />
              </Form.Item>
            </>
          )}
          {modalType === "revalue" && (
            <>
              <Form.Item
                name="new_value"
                label="New Value"
                rules={[{ required: true, message: "Please enter new value" }]}
              >
                <Input type="number" placeholder="Enter new value" />
              </Form.Item>
              <Form.Item
                name="reason"
                label="Reason"
                rules={[{ required: true, message: "Please enter reason" }]}
              >
                <Input.TextArea rows={4} placeholder="Enter revaluation reason" />
              </Form.Item>
            </>
          )}
        </Form>
        )}
      </Modal>
    </div>
  );
};

export default AssetRegisterPage;
