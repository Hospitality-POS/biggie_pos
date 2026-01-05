import React, { useState, useRef } from "react";
import {
    Button,
    Dropdown,
    Space,
    Table,
    Tag,
    Typography,
    Descriptions,
    Divider,
    Modal,
    Flex,
    Badge,
    Input,
} from "antd";
import {
    DeleteOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    TruckOutlined,
    StopOutlined,
    CloseCircleOutlined,
    MoreOutlined,
    SwapOutlined,
    ArrowRightOutlined,
    PrinterOutlined,
    FilePdfOutlined,
    FileExcelOutlined,
    EyeOutlined,
} from "@ant-design/icons";
import { ProTable } from "@ant-design/pro-components";
import type { ActionType } from "@ant-design/pro-components";
import AddEditTransferModal from "../../../components/MODALS/pro/AddEditTransferModal";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Transfer {
    _id: string;
    transfer_code: string;
    from_shop_id: {
        _id: string;
        name: string;
        location: string;
    };
    to_shop_id: {
        _id: string;
        name: string;
        location: string;
    };
    status: 'pending' | 'in_transit' | 'completed' | 'cancelled' | 'rejected';
    initiated_by: {
        _id: string;
        name: string;
        email?: string;
    };
    approved_by?: {
        _id: string;
        name: string;
        email?: string;
    };
    received_by?: {
        _id: string;
        name: string;
        email?: string;
    };
    transfer_date: string;
    expected_delivery_date?: string;
    actual_delivery_date?: string;
    notes?: string;
    rejection_reason?: string;
    total_items: number;
    items?: TransferItem[];
    createdAt: string;
    updatedAt: string;
}

interface TransferItem {
    _id: string;
    from_product_id: {
        _id: string;
        name: string;
        code: string;
        thumbnail?: string;
    };
    to_product_id: {
        _id: string;
        name: string;
        code: string;
        thumbnail?: string;
    };
    quantity: number;
    unit_id: {
        _id: string;
        name: string;
    };
    notes?: string;
}

interface MaterialTransferTableProps {
    onDeleteTransfer: (id: string) => Promise<{ success: boolean }>;
    onApproveTransfer: (id: string) => Promise<{ success: boolean }>;
    onCompleteTransfer: (id: string) => Promise<{ success: boolean }>;
    onRejectTransfer: (id: string, reason: string) => Promise<{ success: boolean }>;
    onCancelTransfer: (id: string) => Promise<{ success: boolean }>;
    onViewTransfer: (record: Transfer) => void;
    onPrintTransfer: (record: Transfer) => void;
    onExportToExcel: (data: Transfer[]) => void;
    onExportToPDF: (data: Transfer[]) => void;
    onFetchData: (
        params: any,
        sort?: any,
        filter?: any
    ) => Promise<{
        data: Transfer[];
        success: boolean;
        total: number;
    }>;
}

export const MaterialTransferTable: React.FC<MaterialTransferTableProps> = ({
    onDeleteTransfer,
    onApproveTransfer,
    onCompleteTransfer,
    onRejectTransfer,
    onCancelTransfer,
    onViewTransfer,
    onPrintTransfer,
    onExportToExcel,
    onExportToPDF,
    onFetchData,
}) => {
    const [selectedRows, setSelectedRows] = useState<Transfer[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedTransferId, setSelectedTransferId] = useState<string>("");
    const [rejectionReason, setRejectionReason] = useState("");

    const actionRef = useRef<ActionType>();

    // Status render function
    const renderStatus = (status: string) => {
        const statusConfig = {
            pending: {
                icon: <ClockCircleOutlined />,
                color: "orange",
                text: "Pending",
            },
            in_transit: {
                icon: <TruckOutlined />,
                color: "blue",
                text: "In Transit",
            },
            completed: {
                icon: <CheckCircleOutlined />,
                color: "success",
                text: "Completed",
            },
            cancelled: {
                icon: <StopOutlined />,
                color: "default",
                text: "Cancelled",
            },
            rejected: {
                icon: <CloseCircleOutlined />,
                color: "red",
                text: "Rejected",
            },
        };

        const config = statusConfig[status as keyof typeof statusConfig];
        return (
            <Tag
                color={config?.color}
                icon={config?.icon}
                aria-label={`${config?.text} status`}
            >
                {config?.text}
            </Tag>
        );
    };

    // Toggle row expansion
    const handleExpand = (expanded: boolean, record: Transfer) => {
        if (expanded) {
            setExpandedRowKeys([...expandedRowKeys, record._id]);
        } else {
            setExpandedRowKeys(
                expandedRowKeys.filter((key: string) => key !== record._id)
            );
        }
    };

    // Handle delete transfer
    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: "Confirm Delete",
            content: "Are you sure you want to delete this transfer?",
            onOk: async () => {
                const { success } = await onDeleteTransfer(id);
                if (success) {
                    actionRef.current?.reload();
                }
            },
        });
    };

    // Handle approve transfer
    const handleApprove = async (id: string) => {
        Modal.confirm({
            title: "Approve Transfer",
            content: "This will deduct items from the source shop. Continue?",
            onOk: async () => {
                const { success } = await onApproveTransfer(id);
                if (success) {
                    actionRef.current?.reload();
                }
            },
        });
    };

    // Handle complete transfer
    const handleComplete = async (id: string) => {
        Modal.confirm({
            title: "Complete Transfer",
            content: "This will add items to the destination shop. Continue?",
            onOk: async () => {
                const { success } = await onCompleteTransfer(id);
                if (success) {
                    actionRef.current?.reload();
                }
            },
        });
    };

    // Handle reject transfer
    const handleRejectClick = (id: string) => {
        setSelectedTransferId(id);
        setRejectModalVisible(true);
    };

    const handleRejectSubmit = async () => {
        if (!rejectionReason.trim()) {
            Modal.error({
                title: "Error",
                content: "Please provide a rejection reason",
            });
            return;
        }

        const { success } = await onRejectTransfer(selectedTransferId, rejectionReason);
        if (success) {
            setRejectModalVisible(false);
            setRejectionReason("");
            setSelectedTransferId("");
            actionRef.current?.reload();
        }
    };

    // Handle cancel transfer
    const handleCancel = async (id: string) => {
        Modal.confirm({
            title: "Cancel Transfer",
            content: "Are you sure you want to cancel this transfer?",
            onOk: async () => {
                const { success } = await onCancelTransfer(id);
                if (success) {
                    actionRef.current?.reload();
                }
            },
        });
    };

    // Row selection
    const rowSelection = {
        selectedRowKeys: selectedRows.map((row: Transfer) => row._id),
        onChange: (_: React.Key[], selectedRows: Transfer[]) => {
            setSelectedRows(selectedRows);
        },
        preserveSelectedRowKeys: true,
    };

    // Selected rows actions
    const selectedRowActions = (
        <Space>
            <Button
                type="text"
                icon={<PrinterOutlined />}
                onClick={() => selectedRows.forEach(row => onPrintTransfer(row))}
                disabled={selectedRows.length === 0}
            >
                Print Selected
            </Button>
            <Button
                type="text"
                icon={<FileExcelOutlined />}
                onClick={() => onExportToExcel(selectedRows)}
                disabled={selectedRows.length === 0}
            >
                Export to Excel
            </Button>
            <Button
                type="text"
                icon={<FilePdfOutlined />}
                onClick={() => onExportToPDF(selectedRows)}
                disabled={selectedRows.length === 0}
            >
                Export to PDF
            </Button>
        </Space>
    );

    // Expanded row render
    const expandedRowRender = (record: Transfer) => (
        <div style={{ padding: "16px", background: "#fafafa" }}>
            <Title level={5} style={{ marginBottom: "16px" }}>
                Transfer Details - {record.transfer_code}
            </Title>
            <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="From Shop">
                    <Space>
                        <Badge color="blue" />
                        <div>
                            <div style={{ fontWeight: 500 }}>{record.from_shop_id?.name || "N/A"}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {record.from_shop_id?.location || ""}
                            </Text>
                        </div>
                    </Space>
                </Descriptions.Item>
                <Descriptions.Item label="To Shop">
                    <Space>
                        <Badge color="green" />
                        <div>
                            <div style={{ fontWeight: 500 }}>{record.to_shop_id?.name || "N/A"}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {record.to_shop_id?.location || ""}
                            </Text>
                        </div>
                    </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Transfer Date">
                    {new Date(record.transfer_date).toLocaleDateString()}
                </Descriptions.Item>
                <Descriptions.Item label="Expected Delivery">
                    {record.expected_delivery_date
                        ? new Date(record.expected_delivery_date).toLocaleDateString()
                        : "Not set"}
                </Descriptions.Item>
                <Descriptions.Item label="Initiated By">
                    {record.initiated_by?.email || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                    {new Date(record.createdAt).toLocaleString()}
                </Descriptions.Item>
                {record.approved_by && (
                    <Descriptions.Item label="Approved By">
                        {record.approved_by.email}
                    </Descriptions.Item>
                )}
                {record.received_by && (
                    <Descriptions.Item label="Received By">
                        {record.received_by.email}
                    </Descriptions.Item>
                )}
                {record.actual_delivery_date && (
                    <Descriptions.Item label="Actual Delivery">
                        {new Date(record.actual_delivery_date).toLocaleDateString()}
                    </Descriptions.Item>
                )}
                {record.rejection_reason && (
                    <Descriptions.Item label="Rejection Reason" span={2}>
                        <Text type="danger">{record.rejection_reason}</Text>
                    </Descriptions.Item>
                )}
                <Descriptions.Item label="Notes" span={2}>
                    {record.notes || "No notes available"}
                </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ margin: "16px 0" }}>
                <Space>
                    <SwapOutlined />
                    <span>Transfer Items Mapping ({record.total_items})</span>
                </Space>
            </Divider>
            <Table
                dataSource={record.items || []}
                rowKey="_id"
                pagination={false}
                size="small"
                scroll={{ x: 900 }}
                columns={[
                    {
                        title: "From Product (Source)",
                        key: "from_product",
                        width: 280,
                        render: (_: any, item: TransferItem) => (
                            <Space>
                                {item.from_product_id?.thumbnail && (
                                    <img
                                        src={item.from_product_id.thumbnail}
                                        alt={item.from_product_id.name}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            objectFit: "cover",
                                            borderRadius: 4,
                                            border: "2px solid #1890ff"
                                        }}
                                    />
                                )}
                                <div>
                                    <div style={{ fontWeight: 500, color: "#1890ff" }}>
                                        {item.from_product_id?.name || "N/A"}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Code: {item.from_product_id?.code || "N/A"}
                                    </Text>
                                </div>
                            </Space>
                        ),
                    },
                    {
                        title: "",
                        key: "arrow",
                        width: 60,
                        align: "center",
                        render: () => (
                            <ArrowRightOutlined
                                style={{
                                    fontSize: 16,
                                    color: "#52c41a",
                                    fontWeight: "bold"
                                }}
                            />
                        ),
                    },
                    {
                        title: "To Product (Destination)",
                        key: "to_product",
                        width: 280,
                        render: (_: any, item: TransferItem) => (
                            <Space>
                                {item.to_product_id?.thumbnail && (
                                    <img
                                        src={item.to_product_id.thumbnail}
                                        alt={item.to_product_id.name}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            objectFit: "cover",
                                            borderRadius: 4,
                                            border: "2px solid #52c41a"
                                        }}
                                    />
                                )}
                                <div>
                                    <div style={{ fontWeight: 500, color: "#52c41a" }}>
                                        {item.to_product_id?.name || "N/A"}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Code: {item.to_product_id?.code || "N/A"}
                                    </Text>
                                </div>
                            </Space>
                        ),
                    },
                    {
                        title: "Quantity",
                        key: "quantity",
                        width: 120,
                        align: "center",
                        render: (_: any, item: TransferItem) => (
                            <Tag color="purple" style={{ fontSize: 14, fontWeight: "bold" }}>
                                {item.quantity} {item.unit_id?.name || ""}
                            </Tag>
                        ),
                    },
                    {
                        title: "Notes",
                        dataIndex: "notes",
                        key: "notes",
                        width: 200,
                        render: (notes: string) => notes || "-",
                    },
                ]}
            />
        </div>
    );

    // Table columns
    const columns = [
        {
            title: "Transfer Code",
            dataIndex: "transfer_code",
            width: 120,
            fixed: "left",
            fieldProps: {
                placeholder: "Enter transfer code",
            },
            render: (text: string) => (
                <Tag
                    color="purple"
                    style={{ fontWeight: "bold" }}
                    aria-label="Transfer Code"
                >
                    {text}
                </Tag>
            ),
        },
        {
            title: "From → To",
            key: "shops",
            width: 250,
            search: false,
            render: (_: any, record: Transfer) => (
                <Space direction="vertical" size={2}>
                    <Space size={4}>
                        <Badge color="blue" />
                        <Text strong>{record.from_shop_id?.name || "N/A"}</Text>
                    </Space>
                    <ArrowRightOutlined style={{ fontSize: 12, color: "#999" }} />
                    <Space size={4}>
                        <Badge color="green" />
                        <Text strong>{record.to_shop_id?.name || "N/A"}</Text>
                    </Space>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            align: "center",
            search: false,
            width: 130,
            render: renderStatus,
            filters: [
                { text: "Pending", value: "pending" },
                { text: "In Transit", value: "in_transit" },
                { text: "Completed", value: "completed" },
                { text: "Cancelled", value: "cancelled" },
                { text: "Rejected", value: "rejected" },
            ],
            onFilter: (value: string, record: Transfer) =>
                record.status === value,
        },
        {
            title: "Items",
            dataIndex: "total_items",
            width: 80,
            align: "center",
            search: false,
            render: (items: number) => (
                <Badge
                    count={items}
                    showZero
                    color="blue"
                    style={{ backgroundColor: "#1890ff" }}
                />
            ),
        },
        {
            title: "Transfer Date",
            dataIndex: "transfer_date",
            width: 120,
            search: false,
            render: (dateString: string) => {
                if (!dateString) return "-";
                return new Date(dateString).toLocaleDateString();
            },
        },
        {
            title: "Expected Delivery",
            dataIndex: "expected_delivery_date",
            align: "center",
            width: 140,
            search: false,
            render: (dateString: string) => {
                if (!dateString) return <Tag>Not set</Tag>;
                const date = new Date(dateString);
                const today = new Date();
                const isOverdue =
                    date < today && date.toDateString() !== today.toDateString();
                return (
                    <Tag
                        color={isOverdue ? "error" : "processing"}
                        aria-label="Expected Delivery Date"
                    >
                        {date.toLocaleDateString()}
                    </Tag>
                );
            },
        },
        {
            title: "Initiated By",
            dataIndex: ["initiated_by", "email"],
            width: 130,
            search: false,
            ellipsis: true,
        },
        {
            title: "Actions",
            key: "actions",
            search: false,
            width: 120,
            fixed: "right",
            render: (_: any, record: Transfer) => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: "view",
                                icon: <EyeOutlined />,
                                label: "View Details",
                                onClick: () => onViewTransfer(record),
                            },
                            {
                                key: "print",
                                icon: <PrinterOutlined />,
                                label: "Print",
                                onClick: () => onPrintTransfer(record),
                            },
                            {
                                key: "edit",
                                icon: (
                                    <AddEditTransferModal
                                        actionRef={actionRef}
                                        data={record}
                                        edit
                                        key={`edit-transfer-${JSON.stringify(record)}`}
                                    />
                                ),
                                disabled: record.status !== "pending",
                            },
                            record.status === "pending" && {
                                key: "approve",
                                icon: <CheckCircleOutlined />,
                                label: "Approve",
                                onClick: () => handleApprove(record._id),
                            },
                            record.status === "in_transit" && {
                                key: "complete",
                                icon: <CheckCircleOutlined />,
                                label: "Complete",
                                onClick: () => handleComplete(record._id),
                            },
                            (record.status === "pending" || record.status === "in_transit") && {
                                key: "reject",
                                icon: <CloseCircleOutlined />,
                                label: "Reject",
                                danger: true,
                                onClick: () => handleRejectClick(record._id),
                            },
                            record.status === "pending" && {
                                key: "cancel",
                                icon: <StopOutlined />,
                                label: "Cancel",
                                danger: true,
                                onClick: () => handleCancel(record._id),
                            },
                            {
                                key: "delete",
                                icon: <DeleteOutlined />,
                                label: "Delete",
                                danger: true,
                                onClick: () => handleDelete(record._id),
                            },
                        ].filter(Boolean) as any[],
                    }}
                    trigger={["hover"]}
                >
                    <Button
                        type="text"
                        icon={<MoreOutlined />}
                        aria-label="Transfer Actions"
                    />
                </Dropdown>
            ),
        },
    ];

    return (
        <div className="material-transfer-table" aria-label="Material Transfer Table">
            <ProTable<Transfer>
                rowKey="_id"
                headerTitle="Material Transfers"
                search={{
                    labelWidth: "auto",
                    span: { xs: 24, sm: 12, md: 8, lg: 6, xl: 6, xxl: 4 },
                    searchText: "Search",
                    resetText: "Reset",
                    layout: "vertical",
                }}
                rowSelection={rowSelection}
                actionRef={actionRef}
                expandable={{
                    expandedRowRender,
                    expandedRowKeys,
                    onExpand: handleExpand,
                }}
                columns={columns}
                request={async (params, sort, filter) => {
                    const { data, total } = await onFetchData(params, sort, filter);
                    return {
                        data,
                        total,
                        success: true,
                    };
                }}
                scroll={{ x: 1400 }}
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} transfers`,
                }}
                tableAlertRender={({ selectedRowKeys }) => {
                    if (selectedRowKeys.length > 0) {
                        return (
                            <Flex justify="space-between" align="center" gap={16}>
                                <Typography.Text>
                                    {selectedRowKeys.length} selected
                                </Typography.Text>
                                {selectedRowActions}
                            </Flex>
                        );
                    }
                    return null;
                }}
                toolBarRender={() => [
                    <AddEditTransferModal key="add-transfer" actionRef={actionRef} />,
                ]}
                options={{
                    density: true,
                    fullScreen: true,
                    reload: () => actionRef.current?.reload(),
                    setting: {
                        draggable: true,
                        checkedReset: true,
                    },
                }}
                rowClassName={(record) => {
                    if (record.status === "cancelled") return "row-cancelled";
                    if (record.status === "rejected") return "row-rejected";
                    if (record.status === "completed") return "row-completed";
                    return "";
                }}
            />

            {/* Reject Modal */}
            <Modal
                title="Reject Transfer"
                open={rejectModalVisible}
                onOk={handleRejectSubmit}
                onCancel={() => {
                    setRejectModalVisible(false);
                    setRejectionReason("");
                    setSelectedTransferId("");
                }}
                okText="Reject"
                okButtonProps={{ danger: true }}
            >
                <Space direction="vertical" style={{ width: "100%" }}>
                    <Text>Please provide a reason for rejecting this transfer:</Text>
                    <TextArea
                        rows={4}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                    />
                </Space>
            </Modal>
        </div>
    );
};

export default MaterialTransferTable;