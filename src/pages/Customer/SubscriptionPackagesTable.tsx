import React, { useState, useRef } from "react";
import {
    ProTable,
    ProColumns,
    ActionType,
    ModalForm,
    ProFormText,
    ProFormTextArea,
    ProFormDigit,
    ProFormSwitch,
    ProFormSelect,
} from "@ant-design/pro-components";
import {
    Button,
    Space,
    Tag,
    Popconfirm,
    message,
    Typography,
    Descriptions,
    Modal,
    Card,
    Statistic,
    Row,
    Col,
    Badge,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    BarChartOutlined,
} from "@ant-design/icons";
import {
    fetchAllPackages,
    createPackage,
    updatePackage,
    deletePackage,
    fetchPackageStatistics,
    Package,
} from "@services/subscription";

const { Text, Title } = Typography;

const SubscriptionPackagesTable: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [statsModalVisible, setStatsModalVisible] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [packageStats, setPackageStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Fetch packages
    const fetchPackages = async (params: any) => {
        try {
            const response = await fetchAllPackages({
                ...params,
                page: params.current,
                limit: params.pageSize,
            });

            return {
                data: response.packages || [],
                success: true,
                total: response.totalPackages || 0,
            };
        } catch (error) {
            message.error("Failed to fetch packages");
            return {
                data: [],
                success: false,
                total: 0,
            };
        }
    };

    // Handle create package
    const handleCreatePackage = async (values: any) => {
        try {
            await createPackage(values);
            setCreateModalVisible(false);
            actionRef.current?.reload();
            return true;
        } catch (error) {
            return false;
        }
    };

    // Handle update package
    const handleUpdatePackage = async (values: any) => {
        try {
            if (!selectedPackage) return false;
            await updatePackage(selectedPackage._id, values);
            setEditModalVisible(false);
            setSelectedPackage(null);
            actionRef.current?.reload();
            return true;
        } catch (error) {
            return false;
        }
    };

    // Handle delete package
    const handleDeletePackage = async (packageId: string) => {
        try {
            await deletePackage(packageId);
            actionRef.current?.reload();
        } catch (error) {
            console.error("Error deleting package:", error);
        }
    };

    // View package details
    const handleViewDetails = (record: Package) => {
        setSelectedPackage(record);
        setDetailsModalVisible(true);
    };

    // View package statistics
    const handleViewStatistics = async (record: Package) => {
        setSelectedPackage(record);
        setStatsModalVisible(true);
        setLoadingStats(true);
        try {
            const stats = await fetchPackageStatistics(record._id);
            setPackageStats(stats);
        } catch (error) {
            message.error("Failed to load statistics");
        } finally {
            setLoadingStats(false);
        }
    };

    // Table columns
    const columns: ProColumns<Package>[] = [
        {
            title: "Package Code",
            dataIndex: "code",
            key: "code",
            width: 140,
            fixed: "left",
            render: (text) => <Text strong copyable>{text}</Text>,
        },
        {
            title: "Package Name",
            dataIndex: "name",
            key: "name",
            width: 200,
            ellipsis: true,
            render: (text, record) => (
                <Space>
                    <Text strong>{text}</Text>
                    {!record.is_active && <Tag color="red">Inactive</Tag>}
                </Space>
            ),
        },
        {
            title: "Price",
            dataIndex: "price",
            key: "price",
            width: 120,
            align: "right",
            valueType: "money",
            render: (_, record) => (
                <Text strong style={{ color: "#52c41a" }}>
                    KES {record.price.toLocaleString()}
                </Text>
            ),
        },
        {
            title: "Total Visits",
            dataIndex: "total_visits",
            key: "total_visits",
            width: 120,
            align: "center",
            render: (text) => (
                <Badge
                    count={text}
                    style={{
                        backgroundColor: "#1890ff",
                        fontSize: 14,
                        height: 24,
                        lineHeight: "24px",
                    }}
                />
            ),
        },
        {
            title: "Validity",
            dataIndex: "validity_days",
            key: "validity_days",
            width: 120,
            align: "center",
            render: (days) => (
                <Tag color="blue">
                    {days ? `${days} days` : "No limit"}
                </Tag>
            ),
        },
        {
            title: "Price per Visit",
            key: "pricePerVisit",
            width: 130,
            align: "right",
            render: (_, record) => {
                const perVisit = (record.price / record.total_visits).toFixed(0);
                return (
                    <Text type="secondary">
                        KES {parseFloat(perVisit).toLocaleString()}/visit
                    </Text>
                );
            },
        },
        {
            title: "Status",
            dataIndex: "is_active",
            key: "is_active",
            width: 100,
            align: "center",
            filters: [
                { text: "Active", value: true },
                { text: "Inactive", value: false },
            ],
            render: (active) =>
                active ? (
                    <Tag color="success">Active</Tag>
                ) : (
                    <Tag color="error">Inactive</Tag>
                ),
        },
        {
            title: "Description",
            dataIndex: "desc",
            key: "desc",
            width: 200,
            ellipsis: true,
            hideInSearch: true,
        },
        {
            title: "Actions",
            key: "actions",
            width: 220,
            fixed: "right",
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetails(record)}
                    >
                        Details
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<BarChartOutlined />}
                        onClick={() => handleViewStatistics(record)}
                    >
                        Stats
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setSelectedPackage(record);
                            setEditModalVisible(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete this package?"
                        description="This will deactivate the package. Active subscriptions will not be affected."
                        onConfirm={() => handleDeletePackage(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="link"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <ProTable<Package>
                columns={columns}
                actionRef={actionRef}
                request={fetchPackages}
                rowKey="_id"
                search={{
                    labelWidth: "auto",
                    defaultCollapsed: false,
                }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                }}
                dateFormatter="string"
                headerTitle="Subscription Packages"
                toolBarRender={() => [
                    <Button
                        key="create"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateModalVisible(true)}
                    >
                        Create Package
                    </Button>,
                ]}
                scroll={{ x: 1400 }}
            />

            {/* Create Package Modal */}
            <ModalForm
                title="Create Subscription Package"
                open={createModalVisible}
                onOpenChange={setCreateModalVisible}
                onFinish={handleCreatePackage}
                width={600}
                modalProps={{
                    destroyOnClose: true,
                }}
            >
                <ProFormText
                    name="name"
                    label="Package Name"
                    placeholder="e.g., Premium Hair Package"
                    rules={[{ required: true, message: "Please enter package name" }]}
                />
                <ProFormText
                    name="code"
                    label="Package Code"
                    placeholder="e.g., PKG-001 (Leave blank for auto-generation)"
                    tooltip="Optional: Leave blank to auto-generate"
                />
                <Row gutter={16}>
                    <Col span={12}>
                        <ProFormDigit
                            name="price"
                            label="Package Price (KES)"
                            placeholder="5000"
                            min={0}
                            rules={[{ required: true, message: "Please enter price" }]}
                            fieldProps={{
                                precision: 0,
                                formatter: (value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                                parser: (value) => value?.replace(/KES\s?|(,*)/g, '') as any,
                            }}
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormDigit
                            name="total_visits"
                            label="Total Visits"
                            placeholder="10"
                            min={1}
                            rules={[{ required: true, message: "Please enter total visits" }]}
                        />
                    </Col>
                </Row>
                <ProFormDigit
                    name="validity_days"
                    label="Validity Period (Days)"
                    placeholder="120"
                    min={1}
                    tooltip="Number of days the package is valid after purchase"
                />
                <ProFormTextArea
                    name="desc"
                    label="Description"
                    placeholder="Package description..."
                    rows={3}
                />
                <ProFormSwitch
                    name="is_active"
                    label="Active"
                    initialValue={true}
                    tooltip="Only active packages can be purchased"
                />
            </ModalForm>

            {/* Edit Package Modal */}
            <ModalForm
                title="Edit Subscription Package"
                open={editModalVisible}
                onOpenChange={setEditModalVisible}
                onFinish={handleUpdatePackage}
                width={600}
                initialValues={selectedPackage || {}}
                modalProps={{
                    destroyOnClose: true,
                }}
            >
                <ProFormText
                    name="name"
                    label="Package Name"
                    rules={[{ required: true }]}
                />
                <ProFormText
                    name="code"
                    label="Package Code"
                    disabled
                    tooltip="Package code cannot be changed"
                />
                <Row gutter={16}>
                    <Col span={12}>
                        <ProFormDigit
                            name="price"
                            label="Package Price (KES)"
                            min={0}
                            rules={[{ required: true }]}
                            fieldProps={{
                                precision: 0,
                                formatter: (value) => `KES ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                                parser: (value) => value?.replace(/KES\s?|(,*)/g, '') as any,
                            }}
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormDigit
                            name="total_visits"
                            label="Total Visits"
                            min={1}
                            rules={[{ required: true }]}
                        />
                    </Col>
                </Row>
                <ProFormDigit
                    name="validity_days"
                    label="Validity Period (Days)"
                    min={1}
                />
                <ProFormTextArea
                    name="desc"
                    label="Description"
                    rows={3}
                />
                <ProFormSwitch
                    name="is_active"
                    label="Active"
                />
            </ModalForm>

            {/* Package Details Modal */}
            <Modal
                title="Package Details"
                open={detailsModalVisible}
                onCancel={() => {
                    setDetailsModalVisible(false);
                    setSelectedPackage(null);
                }}
                footer={[
                    <Button
                        key="close"
                        onClick={() => {
                            setDetailsModalVisible(false);
                            setSelectedPackage(null);
                        }}
                    >
                        Close
                    </Button>,
                ]}
                width={600}
            >
                {selectedPackage && (
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="Package Code" span={2}>
                            <Text strong copyable>{selectedPackage.code}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Package Name" span={2}>
                            <Text strong>{selectedPackage.name}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Price">
                            <Text strong style={{ color: "#52c41a" }}>
                                KES {selectedPackage.price.toLocaleString()}
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Total Visits">
                            <Badge
                                count={selectedPackage.total_visits}
                                style={{ backgroundColor: "#1890ff" }}
                            />
                        </Descriptions.Item>
                        <Descriptions.Item label="Price per Visit">
                            <Text>
                                KES {(selectedPackage.price / selectedPackage.total_visits).toFixed(0)}
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Validity">
                            <Tag color="blue">
                                {selectedPackage.validity_days
                                    ? `${selectedPackage.validity_days} days`
                                    : "No limit"}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Status" span={2}>
                            {selectedPackage.is_active ? (
                                <Tag color="success">Active</Tag>
                            ) : (
                                <Tag color="error">Inactive</Tag>
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Description" span={2}>
                            {selectedPackage.desc || "No description"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Created" span={2}>
                            {new Date(selectedPackage.createdAt).toLocaleString()}
                        </Descriptions.Item>
                        <Descriptions.Item label="Last Updated" span={2}>
                            {new Date(selectedPackage.updatedAt).toLocaleString()}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>

            {/* Package Statistics Modal */}
            <Modal
                title="Package Statistics"
                open={statsModalVisible}
                onCancel={() => {
                    setStatsModalVisible(false);
                    setSelectedPackage(null);
                    setPackageStats(null);
                }}
                footer={[
                    <Button
                        key="close"
                        onClick={() => {
                            setStatsModalVisible(false);
                            setSelectedPackage(null);
                            setPackageStats(null);
                        }}
                    >
                        Close
                    </Button>,
                ]}
                width={700}
            >
                {selectedPackage && (
                    <Space direction="vertical" size="large" style={{ width: "100%" }}>
                        <Card size="small">
                            <Title level={5}>{selectedPackage.name}</Title>
                            <Text type="secondary">{selectedPackage.code}</Text>
                        </Card>

                        {loadingStats ? (
                            <div style={{ textAlign: "center", padding: 40 }}>
                                Loading statistics...
                            </div>
                        ) : packageStats ? (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Card>
                                            <Statistic
                                                title="Total Subscriptions"
                                                value={packageStats.statistics?.total_subscriptions || 0}
                                                valueStyle={{ color: "#1890ff" }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={12}>
                                        <Card>
                                            <Statistic
                                                title="Active Subscriptions"
                                                value={packageStats.statistics?.active_subscriptions || 0}
                                                valueStyle={{ color: "#52c41a" }}
                                            />
                                        </Card>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Card>
                                            <Statistic
                                                title="Completed"
                                                value={packageStats.statistics?.completed_subscriptions || 0}
                                                valueStyle={{ color: "#722ed1" }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card>
                                            <Statistic
                                                title="Expired"
                                                value={packageStats.statistics?.expired_subscriptions || 0}
                                                valueStyle={{ color: "#fa8c16" }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card>
                                            <Statistic
                                                title="Cancelled"
                                                value={packageStats.statistics?.cancelled_subscriptions || 0}
                                                valueStyle={{ color: "#f5222d" }}
                                            />
                                        </Card>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Card>
                                            <Statistic
                                                title="Total Revenue"
                                                value={packageStats.statistics?.total_revenue || 0}
                                                prefix="KES"
                                                valueStyle={{ color: "#52c41a" }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={12}>
                                        <Card>
                                            <Statistic
                                                title="Visits Remaining"
                                                value={packageStats.statistics?.total_visits_remaining || 0}
                                                valueStyle={{ color: "#1890ff" }}
                                            />
                                        </Card>
                                    </Col>
                                </Row>

                                <Card>
                                    <Descriptions column={2} size="small">
                                        <Descriptions.Item label="Total Visits Allocated">
                                            {packageStats.statistics?.total_visits_allocated || 0}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Total Visits Used">
                                            {packageStats.statistics?.total_visits_used || 0}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </>
                        ) : null}
                    </Space>
                )}
            </Modal>
        </>
    );
};

export default SubscriptionPackagesTable;