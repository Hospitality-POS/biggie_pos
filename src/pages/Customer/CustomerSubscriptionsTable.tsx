import React, { useRef, useState } from "react";
import {
    ProTable,
    ProColumns,
    ActionType,
} from "@ant-design/pro-components";
import {
    Button,
    Space,
    Tag,
    Typography,
    Modal,
    Descriptions,
    Progress,
    Card,
    Statistic,
    Row,
    Col,
    message,
    Popconfirm,
    Tooltip,
    Input,
    Select,
    DatePicker,
    Form,
    Dropdown,
    Badge,
    InputNumber,
    Drawer,
} from "antd";
import {
    EyeOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    StopOutlined,
    DeleteOutlined,
    FilterOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    SaveOutlined,
    CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { MenuProps } from "antd";
import {
    fetchAllSubscriptions,
    fetchSubscriptionById,
    deleteSubscription,
    updateSubscription,
    CustomerSubscription,
} from "@services/subscription";

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const CustomerSubscriptionsTable: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<CustomerSubscription | null>(null);
    const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filterForm] = Form.useForm();
    const [searchForm] = Form.useForm();

    // ✅ FIX: Use both a ref (for fetchSubscriptions closure) and state (for UI rendering)
    const activeFiltersRef = useRef<any>({});
    const [activeFilters, setActiveFilters] = useState<any>({});

    // Edit state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<CustomerSubscription | null>(null);
    const [editForm] = Form.useForm();
    const [updating, setUpdating] = useState(false);

    // ✅ FIX: Helper to update both ref and state together, then reload
    const applyFilters = (filters: any) => {
        activeFiltersRef.current = filters;
        setActiveFilters(filters);
        actionRef.current?.reload();
    };

    // Safe date formatter
    const formatDate = (dateInput: any): string => {
        if (typeof dateInput === 'string') {
            try {
                const date = new Date(dateInput);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-GB');
                }
            } catch (error) {
                console.error("Error formatting string date:", dateInput, error);
            }
            return "Invalid Date";
        }

        if (dateInput && typeof dateInput === 'object') {
            if (dateInput.text) {
                return dateInput.text;
            }
            if (dateInput.value) {
                try {
                    const date = new Date(dateInput.value);
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-GB');
                    }
                } catch (error) {
                    console.error("Error formatting object date:", dateInput, error);
                }
            }
        }

        return "N/A";
    };

    // ✅ FIX: Read from ref instead of state to avoid stale closure
    const fetchSubscriptions = async (params: any) => {
        try {
            const allFilters = { ...activeFiltersRef.current };

            const requestParams: any = {
                page: params.current || 1,
                limit: params.pageSize || 20,
                ...allFilters,
            };

            Object.keys(requestParams).forEach(key => {
                if (requestParams[key] === undefined || requestParams[key] === null) {
                    delete requestParams[key];
                }
            });

            const response = await fetchAllSubscriptions(requestParams);

            return {
                data: response.subscriptions || [],
                success: true,
                total: response.totalSubscriptions || 0,
            };
        } catch (error) {
            console.error("Error fetching subscriptions:", error);
            message.error("Failed to load subscriptions");
            return {
                data: [],
                success: false,
                total: 0,
            };
        }
    };

    // View subscription details
    const handleViewDetails = async (record: CustomerSubscription) => {
        setSelectedSubscription(record);
        setDetailsModalVisible(true);
        setLoadingDetails(true);

        try {
            const details = await fetchSubscriptionById(record._id);
            setSubscriptionDetails(details);
        } catch (error) {
            console.error("Error loading subscription details:", error);
            message.error("Failed to load subscription details");
        } finally {
            setLoadingDetails(false);
        }
    };

    // Edit subscription
    const handleEditSubscription = (record: CustomerSubscription) => {
        setEditingSubscription(record);
        editForm.setFieldsValue({
            total_visits_allowed: record.total_visits_allowed,
            visits_used: record.visits_used,
            visits_remaining: record.visits_remaining,
            purchase_amount: record.purchase_amount,
            start_date: record.start_date ? dayjs(record.start_date) : null,
            end_date: record.end_date ? dayjs(record.end_date) : null,
            status: record.status,
            payment_status: record.payment_status,
            cancellation_reason: record.cancellation_reason,
            refund_amount: record.refund_amount,
        });
        setEditModalVisible(true);
    };

    // Handle edit form submission
    const handleEditSubmit = async (values: any) => {
        if (!editingSubscription) return;

        setUpdating(true);
        try {
            const updateData: any = {
                ...values,
                start_date: values.start_date ? values.start_date.toISOString() : undefined,
                end_date: values.end_date ? values.end_date.toISOString() : undefined,
            };

            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined || updateData[key] === null) {
                    delete updateData[key];
                }
            });

            await updateSubscription(editingSubscription._id, updateData);
            message.success("Subscription updated successfully");

            setEditModalVisible(false);
            setEditingSubscription(null);
            editForm.resetFields();

            actionRef.current?.reload();
        } catch (error: any) {
            console.error("Error updating subscription:", error);
            message.error(error.message || "Failed to update subscription");
        } finally {
            setUpdating(false);
        }
    };

    // Delete subscription
    const handleDeleteSubscription = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteSubscription(id);
            message.success("Subscription deleted successfully");
            actionRef.current?.reload();
        } catch (error: any) {
            console.error("Error deleting subscription:", error);
            message.error(error.message || "Failed to delete subscription");
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Active": return "success";
            case "Expired": return "warning";
            case "Exhausted": return "default";
            case "Cancelled": return "error";
            default: return "default";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Active": return <CheckCircleOutlined />;
            case "Expired": return <ClockCircleOutlined />;
            case "Exhausted":
            case "Cancelled": return <StopOutlined />;
            default: return null;
        }
    };

    // ✅ FIX: Use applyFilters helper
    const handleFilterSubmit = (values: any) => {
        const filters: any = { ...activeFiltersRef.current };

        // Clear previous filter-panel keys before applying new ones
        delete filters.status;
        delete filters.start_date_from;
        delete filters.start_date_to;
        delete filters.customer_name;
        delete filters.package_name;
        delete filters.min_amount;
        delete filters.max_amount;

        if (values.status && values.status.length > 0) {
            filters.status = values.status;
        }
        if (values.date_range && values.date_range.length === 2) {
            filters.start_date_from = dayjs(values.date_range[0]).startOf('day').format('YYYY-MM-DD');
            filters.start_date_to = dayjs(values.date_range[1]).endOf('day').format('YYYY-MM-DD');
        }
        if (values.customer_name) {
            filters.customer_name = values.customer_name;
        }
        if (values.package_name) {
            filters.package_name = values.package_name;
        }
        if (values.min_amount) {
            filters.min_amount = values.min_amount;
        }
        if (values.max_amount) {
            filters.max_amount = values.max_amount;
        }

        applyFilters(filters);
    };

    // ✅ FIX: Use applyFilters helper
    const handleSearch = (values: any) => {
        const filters: any = { ...activeFiltersRef.current };

        if (values.search) {
            filters.search = values.search;
        } else {
            delete filters.search;
        }

        applyFilters(filters);
    };

    // ✅ FIX: Use applyFilters helper
    const handleResetFilters = () => {
        filterForm.resetFields();
        searchForm.resetFields();
        applyFilters({});
    };

    const countActiveFilters = () => {
        let count = 0;
        if (activeFilters.status) count++;
        if (activeFilters.start_date_from) count++;
        if (activeFilters.customer_name) count++;
        if (activeFilters.package_name) count++;
        if (activeFilters.min_amount || activeFilters.max_amount) count++;
        if (activeFilters.search) count++;
        return count;
    };

    // ✅ FIX: Use applyFilters helper
    const clearFilter = (key: string) => {
        const newFilters = { ...activeFiltersRef.current };
        delete newFilters[key];
        applyFilters(newFilters);
    };

    const columns: ProColumns<CustomerSubscription>[] = [
        {
            title: "Subscription Code",
            dataIndex: "subscription_code",
            key: "subscription_code",
            width: 150,
            fixed: "left",
            render: (text) => <Text strong copyable>{text}</Text>,
        },
        {
            title: "Customer",
            dataIndex: ["customer_id", "customer_name"],
            key: "customer_name",
            width: 180,
            ellipsis: true,
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{text}</div>
                    {record.customer_id?.phone && (
                        <div style={{ fontSize: 12, color: '#666' }}>
                            {String(record.customer_id.phone)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "Package",
            dataIndex: ["package_id", "name"],
            key: "package_name",
            width: 180,
            ellipsis: true,
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{text}</div>
                    {record.package_id?.code && (
                        <div style={{ fontSize: 12, color: '#666' }}>
                            {record.package_id.code}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: "Visits",
            key: "visits",
            width: 180,
            render: (_, record) => {
                if (!record.total_visits_allowed || record.total_visits_allowed === 0) {
                    return <Text type="secondary">N/A</Text>;
                }
                const percentage = (record.visits_used / record.total_visits_allowed) * 100;
                return (
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text>{record.visits_used} / {record.total_visits_allowed} used</Text>
                        <Progress
                            percent={percentage}
                            size="small"
                            status={percentage >= 100 ? "exception" : "active"}
                            showInfo={false}
                            strokeColor={percentage >= 100 ? "#ff4d4f" : "#1890ff"}
                        />
                    </Space>
                );
            },
        },
        {
            title: "Visits Remaining",
            dataIndex: "visits_remaining",
            key: "visits_remaining",
            width: 120,
            align: "center",
            render: (remaining) => (
                <Tag color={remaining > 0 ? "blue" : "red"}>{remaining || 0}</Tag>
            ),
        },
        {
            title: "Amount",
            dataIndex: "purchase_amount",
            key: "purchase_amount",
            width: 120,
            align: "right",
            render: (amount) => (
                <Text strong style={{ color: "#52c41a" }}>
                    KES {amount ? amount.toLocaleString() : "0"}
                </Text>
            ),
        },
        {
            title: "Start Date",
            dataIndex: "start_date",
            key: "start_date",
            width: 120,
            render: (_, record) => {
                const dateValue = record.start_date;
                if (typeof dateValue === 'string') {
                    try {
                        const date = new Date(dateValue);
                        if (!isNaN(date.getTime())) return date.toLocaleDateString('en-GB');
                    } catch (e) { }
                }
                return "Invalid Date";
            },
        },
        {
            title: "End Date",
            dataIndex: "end_date",
            key: "end_date",
            width: 120,
            render: (_, record) => {
                const dateValue = record.end_date;
                if (typeof dateValue === 'string') {
                    try {
                        const date = new Date(dateValue);
                        if (!isNaN(date.getTime())) return date.toLocaleDateString('en-GB');
                    } catch (e) { }
                }
                return "Invalid Date";
            },
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 120,
            render: (status) => (
                <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
                    {status}
                </Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            fixed: "right",
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="View Details">
                        <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewDetails(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit Subscription">
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEditSubscription(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Subscription"
                        description="Are you sure you want to delete this subscription? This action cannot be undone."
                        onConfirm={() => handleDeleteSubscription(record._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete Subscription">
                            <Button
                                type="link"
                                size="small"
                                icon={<DeleteOutlined />}
                                danger
                                loading={deletingId === record._id}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const ActiveFiltersDisplay = () => {
        const filterCount = countActiveFilters();
        if (filterCount === 0) return null;

        return (
            <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Space wrap size={[8, 8]}>
                    <Text strong style={{ fontSize: 14 }}>Active Filters:</Text>
                    {activeFilters.status && (
                        <Tag closable onClose={() => clearFilter('status')}>
                            Status: {Array.isArray(activeFilters.status)
                                ? activeFilters.status.join(', ')
                                : activeFilters.status}
                        </Tag>
                    )}
                    {activeFilters.start_date_from && (
                        <Tag closable onClose={() => {
                            const newFilters = { ...activeFiltersRef.current };
                            delete newFilters.start_date_from;
                            delete newFilters.start_date_to;
                            applyFilters(newFilters);
                        }}>
                            Date: {activeFilters.start_date_from} to {activeFilters.start_date_to}
                        </Tag>
                    )}
                    {activeFilters.customer_name && (
                        <Tag closable onClose={() => clearFilter('customer_name')}>
                            Customer: {activeFilters.customer_name}
                        </Tag>
                    )}
                    {activeFilters.package_name && (
                        <Tag closable onClose={() => clearFilter('package_name')}>
                            Package: {activeFilters.package_name}
                        </Tag>
                    )}
                    {activeFilters.search && (
                        <Tag closable onClose={() => clearFilter('search')}>
                            Search: {activeFilters.search}
                        </Tag>
                    )}
                    {activeFilters.min_amount && (
                        <Tag closable onClose={() => clearFilter('min_amount')}>
                            Min Amount: KES {activeFilters.min_amount}
                        </Tag>
                    )}
                    {activeFilters.max_amount && (
                        <Tag closable onClose={() => clearFilter('max_amount')}>
                            Max Amount: KES {activeFilters.max_amount}
                        </Tag>
                    )}
                </Space>
                <Button
                    type="link"
                    size="small"
                    onClick={handleResetFilters}
                    style={{ padding: 0, height: 'auto' }}
                >
                    Clear All
                </Button>
            </div>
        );
    };

    const filterMenuItems: MenuProps['items'] = [
        {
            key: '1',
            label: (
                <div style={{ width: 300, padding: 8 }}>
                    <Form
                        form={filterForm}
                        layout="vertical"
                        onFinish={handleFilterSubmit}
                    >
                        <Form.Item name="customer_name" label="Customer Name">
                            <Input placeholder="Enter customer name" />
                        </Form.Item>
                        <Form.Item name="package_name" label="Package Name">
                            <Input placeholder="Enter package name" />
                        </Form.Item>
                        <Form.Item name="status" label="Status">
                            <Select mode="multiple" placeholder="Select status" allowClear>
                                <Option value="Active">Active</Option>
                                <Option value="Expired">Expired</Option>
                                <Option value="Exhausted">Exhausted</Option>
                                <Option value="Cancelled">Cancelled</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="date_range" label="Start Date Range">
                            <RangePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Row gutter={8}>
                            <Col span={12}>
                                <Form.Item name="min_amount" label="Min Amount">
                                    <InputNumber style={{ width: '100%' }} placeholder="KES" min={0} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="max_amount" label="Max Amount">
                                    <InputNumber style={{ width: '100%' }} placeholder="KES" min={0} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item style={{ marginBottom: 0 }}>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                <Button onClick={() => filterForm.resetFields()}>Reset</Button>
                                <Button type="primary" htmlType="submit">Apply</Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </div>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* Search Bar */}
            <div style={{ marginBottom: 16 }}>
                <Form
                    form={searchForm}
                    layout="inline"
                    onFinish={handleSearch}
                    style={{ display: 'flex', gap: 8 }}
                >
                    <Form.Item name="search" style={{ flex: 1, margin: 0 }}>
                        <Input
                            placeholder="Search by subscription code, customer, package..."
                            prefix={<SearchOutlined />}
                            allowClear
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                        Search
                    </Button>
                    <Dropdown
                        menu={{ items: filterMenuItems }}
                        placement="bottomRight"
                        trigger={['click']}
                        overlayStyle={{ minWidth: 350 }}
                    >
                        <Button icon={<FilterOutlined />}>
                            Filters
                            {countActiveFilters() > 0 && (
                                <Badge
                                    count={countActiveFilters()}
                                    size="small"
                                    style={{ marginLeft: 4, backgroundColor: '#1890ff' }}
                                />
                            )}
                        </Button>
                    </Dropdown>
                    <Tooltip title="Refresh">
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => actionRef.current?.reload()}
                        />
                    </Tooltip>
                </Form>
            </div>

            {/* Active Filters Display */}
            <ActiveFiltersDisplay />

            {/* Table */}
            <ProTable<CustomerSubscription>
                columns={columns}
                actionRef={actionRef}
                request={fetchSubscriptions}
                rowKey="_id"
                search={false}
                toolbar={{ title: null }}
                toolBarRender={false}
                pagination={{
                    defaultPageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showTotal: (total, range) =>
                        `Showing ${range[0]}-${range[1]} of ${total} subscriptions`,
                }}
                dateFormatter="string"
                scroll={{ x: 1600 }}
                options={{
                    density: true,
                    fullScreen: true,
                    reload: () => actionRef.current?.reload(),
                    setting: true,
                }}
                bordered
                size="small"
                cardBordered={false}
            />

            {/* Subscription Details Modal */}
            <Modal
                title="Subscription Details"
                open={detailsModalVisible}
                onCancel={() => {
                    setDetailsModalVisible(false);
                    setSelectedSubscription(null);
                    setSubscriptionDetails(null);
                }}
                footer={[
                    <Button key="close" onClick={() => {
                        setDetailsModalVisible(false);
                        setSelectedSubscription(null);
                        setSubscriptionDetails(null);
                    }}>
                        Close
                    </Button>,
                ]}
                width={800}
            >
                {selectedSubscription && (
                    <Space direction="vertical" style={{ width: "100%" }} size="large">
                        <Row gutter={16}>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Total Visits"
                                        value={selectedSubscription.total_visits_allowed || 0}
                                        valueStyle={{ color: "#1890ff" }}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Visits Used"
                                        value={selectedSubscription.visits_used || 0}
                                        valueStyle={{ color: "#722ed1" }}
                                    />
                                </Card>
                            </Col>
                            <Col span={8}>
                                <Card size="small">
                                    <Statistic
                                        title="Visits Remaining"
                                        value={selectedSubscription.visits_remaining || 0}
                                        valueStyle={{
                                            color: (selectedSubscription.visits_remaining || 0) > 0
                                                ? "#52c41a" : "#f5222d",
                                        }}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="Subscription Code" span={2}>
                                <Text strong copyable>
                                    {selectedSubscription.subscription_code || "N/A"}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Customer">
                                <div>
                                    <div>{selectedSubscription.customer_id?.customer_name || "N/A"}</div>
                                    {selectedSubscription.customer_id?.phone && (
                                        <div style={{ fontSize: 12, color: '#666' }}>
                                            {String(selectedSubscription.customer_id.phone)}
                                        </div>
                                    )}
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Package">
                                <div>
                                    <div>{selectedSubscription.package_id?.name || "N/A"}</div>
                                    {selectedSubscription.package_id?.code && (
                                        <div style={{ fontSize: 12, color: '#666' }}>
                                            {selectedSubscription.package_id.code}
                                        </div>
                                    )}
                                </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Purchase Amount">
                                <Text strong style={{ color: "#52c41a" }}>
                                    KES {(selectedSubscription.purchase_amount || 0).toLocaleString()}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Payment Status">
                                <Tag color={selectedSubscription.payment_status === "Paid" ? "success" : "warning"}>
                                    {selectedSubscription.payment_status || "N/A"}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Start Date">
                                {(() => {
                                    const d = selectedSubscription.start_date;
                                    if (typeof d === 'string') {
                                        const date = new Date(d);
                                        if (!isNaN(date.getTime())) return date.toLocaleDateString('en-GB');
                                    }
                                    return "Invalid Date";
                                })()}
                            </Descriptions.Item>
                            <Descriptions.Item label="End Date">
                                {(() => {
                                    const d = selectedSubscription.end_date;
                                    if (typeof d === 'string') {
                                        const date = new Date(d);
                                        if (!isNaN(date.getTime())) return date.toLocaleDateString('en-GB');
                                    }
                                    return "Invalid Date";
                                })()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Status" span={2}>
                                <Tag
                                    color={getStatusColor(selectedSubscription.status)}
                                    icon={getStatusIcon(selectedSubscription.status)}
                                >
                                    {selectedSubscription.status || "N/A"}
                                </Tag>
                            </Descriptions.Item>
                            {selectedSubscription.cancellation_reason && (
                                <Descriptions.Item label="Cancellation Reason" span={2}>
                                    {selectedSubscription.cancellation_reason}
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                    </Space>
                )}
            </Modal>

            {/* Edit Subscription Drawer */}
            <Drawer
                title={`Edit Subscription - ${editingSubscription?.subscription_code || ''}`}
                width={500}
                open={editModalVisible}
                onClose={() => {
                    setEditModalVisible(false);
                    setEditingSubscription(null);
                    editForm.resetFields();
                }}
                footer={[
                    <Button key="cancel" onClick={() => {
                        setEditModalVisible(false);
                        setEditingSubscription(null);
                        editForm.resetFields();
                    }}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={updating}
                        onClick={() => editForm.submit()}
                        icon={<SaveOutlined />}
                    >
                        Update Subscription
                    </Button>,
                ]}
            >
                {editingSubscription && (
                    <Form
                        form={editForm}
                        layout="vertical"
                        onFinish={handleEditSubmit}
                        initialValues={{
                            total_visits_allowed: editingSubscription.total_visits_allowed,
                            visits_used: editingSubscription.visits_used,
                            visits_remaining: editingSubscription.visits_remaining,
                            purchase_amount: editingSubscription.purchase_amount,
                            start_date: editingSubscription.start_date ? dayjs(editingSubscription.start_date) : null,
                            end_date: editingSubscription.end_date ? dayjs(editingSubscription.end_date) : null,
                            status: editingSubscription.status,
                            payment_status: editingSubscription.payment_status,
                            cancellation_reason: editingSubscription.cancellation_reason,
                            refund_amount: editingSubscription.refund_amount,
                        }}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="total_visits_allowed"
                                    label="Total Visits Allowed"
                                    rules={[{ required: true, message: 'Please enter total visits' }]}
                                >
                                    <InputNumber min={1} style={{ width: '100%' }} placeholder="Total visits" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="visits_used"
                                    label="Visits Used"
                                    rules={[{ required: true, message: 'Please enter visits used' }]}
                                >
                                    <InputNumber min={0} style={{ width: '100%' }} placeholder="Visits used" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="visits_remaining"
                                    label="Visits Remaining"
                                    rules={[{ required: true, message: 'Please enter visits remaining' }]}
                                >
                                    <InputNumber min={0} style={{ width: '100%' }} placeholder="Visits remaining" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="purchase_amount"
                                    label="Purchase Amount"
                                    rules={[{ required: true, message: 'Please enter purchase amount' }]}
                                >
                                    <InputNumber min={0} style={{ width: '100%' }} placeholder="KES" prefix="KES" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="start_date"
                                    label="Start Date"
                                    rules={[{ required: true, message: 'Please select start date' }]}
                                >
                                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="end_date"
                                    label="End Date"
                                    rules={[{ required: true, message: 'Please select end date' }]}
                                >
                                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="status"
                                    label="Status"
                                    rules={[{ required: true, message: 'Please select status' }]}
                                >
                                    <Select placeholder="Select status">
                                        <Option value="Active">Active</Option>
                                        <Option value="Expired">Expired</Option>
                                        <Option value="Exhausted">Exhausted</Option>
                                        <Option value="Cancelled">Cancelled</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="payment_status"
                                    label="Payment Status"
                                    rules={[{ required: true, message: 'Please select payment status' }]}
                                >
                                    <Select placeholder="Select payment status">
                                        <Option value="Paid">Paid</Option>
                                        <Option value="Pending">Pending</Option>
                                        <Option value="Refunded">Refunded</Option>
                                        <Option value="Failed">Failed</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name="cancellation_reason" label="Cancellation Reason">
                            <Input.TextArea rows={3} placeholder="Enter cancellation reason (if applicable)" />
                        </Form.Item>

                        <Form.Item name="refund_amount" label="Refund Amount">
                            <InputNumber min={0} style={{ width: '100%' }} placeholder="KES" prefix="KES" />
                        </Form.Item>

                        <div style={{
                            padding: '16px',
                            background: '#f6ffed',
                            borderRadius: '6px',
                            marginTop: '16px'
                        }}>
                            <Text type="secondary">
                                Note: Updating subscription details will also update related orders and payments if applicable.
                            </Text>
                        </div>
                    </Form>
                )}
            </Drawer>
        </div>
    );
};

export default CustomerSubscriptionsTable;