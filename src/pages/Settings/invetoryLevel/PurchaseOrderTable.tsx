import React from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
    Button,
    Space,
    Tag,
    Progress,
    Tooltip,
    Dropdown,
    Typography,
    Popconfirm
} from "antd";
import AddEditPurchaseOrderModal from "@components/MODALS/pro/AddEditPurchaseOrderModal";
import CreateDeliveryFromPOModal from "@components/MODALS/pro/CreateDeliveryFromPOModal";
import PurchaseOrderItems from "./PurchaseOrderItems";
import {
    DeleteOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    TruckOutlined,
    StopOutlined,
    MoreOutlined,
    FileTextOutlined,
    CarOutlined,
    PrinterOutlined,
    FilePdfOutlined,
    FileExcelOutlined,
    ExpandAltOutlined,
    CompressOutlined
} from "@ant-design/icons";
import type { MenuProps } from 'antd';

const { Title } = Typography;

interface PurchaseOrderItem {
    _id: string;
    inventory_id: {
        name: string;
        sku?: string;
    };
    unit_id: {
        name: string;
        abbreviation?: string;
    };
    quantity_ordered: number;
    quantity_received: number;
    unit_price: number;
    total_price: number;
    notes?: string;
}

interface PurchaseOrder {
    _id: string;
    po_number: string;
    supplier_id: {
        name: string;
        contact?: string;
        email?: string;
    };
    status: string;
    po_items: PurchaseOrderItem[];
    total_amount: number;
    delivery_percentage: number;
    expected_delivery_date?: string;
    created_by: {
        name: string;
        email?: string;
    };
    createdAt: string;
    notes?: string;
    deliveries?: any[];
}

interface PurchaseOrderTableProps {
    actionRef: React.RefObject<ActionType>;
    onDeletePO: (id: string) => void;
    onUpdateStatus: (id: string, status: string) => void;
    onPrintPO: (record: PurchaseOrder) => void;
    onExportToExcel: (data: PurchaseOrder[]) => void;
    onExportToPDF: (data: PurchaseOrder[]) => void;
    onBulkPrint: () => void;
    onGenerateSummary: () => void;
    onFetchData: (params: any, sort?: any, filter?: any) => Promise<{
        data: PurchaseOrder[];
        success: boolean;
        total: number;
    }>;
}

const PurchaseOrderTable: React.FC<PurchaseOrderTableProps> = ({
    actionRef,
    onDeletePO,
    onUpdateStatus,
    onPrintPO,
    onExportToExcel,
    onExportToPDF,
    onBulkPrint,
    onGenerateSummary,
    onFetchData
}) => {
    // Status render function
    const renderStatus = (status: string) => {
        const statusConfig = {
            pending: { icon: <ClockCircleOutlined />, color: 'orange', text: 'Pending' },
            approved: { icon: <CheckCircleOutlined />, color: 'green', text: 'Approved' },
            partially_delivered: { icon: <TruckOutlined />, color: 'blue', text: 'Partial Delivery' },
            fully_delivered: { icon: <CheckCircleOutlined />, color: 'success', text: 'Delivered' },
            cancelled: { icon: <StopOutlined />, color: 'red', text: 'Cancelled' }
        };

        const config = statusConfig[status as keyof typeof statusConfig];

        return (
            <Tag color={config?.color} icon={config?.icon}>
                {config?.text}
            </Tag>
        );
    };

    // Delivery progress render
    const renderDeliveryProgress = (record: PurchaseOrder) => {
        const percentage = record.delivery_percentage || 0;

        let status: "success" | "exception" | "normal" | "active" = "normal";
        let strokeColor = "#1890ff";

        if (percentage === 100) {
            status = "success";
            strokeColor = "#52c41a";
        } else if (percentage > 0) {
            status = "active";
            strokeColor = "#1890ff";
        }

        return (
            <Space direction="vertical" size={2}>
                <Progress
                    percent={percentage}
                    size="small"
                    status={status}
                    strokeColor={strokeColor}
                    style={{ width: 100 }}
                />
                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {percentage}% delivered
                </span>
            </Space>
        );
    };

    // Total amount render
    const renderTotalAmount = (amount: number) => {
        if (!amount) return <span style={{ color: '#8c8c8c' }}>No amount</span>;

        return (
            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                Ksh. {amount.toLocaleString()}
            </span>
        );
    };

    // Action dropdown menu
    const getActionItems = (record: PurchaseOrder): MenuProps['items'] => {
        const items: MenuProps['items'] = [
            {
                key: 'print',
                icon: <PrinterOutlined />,
                label: 'Print PO',
                onClick: () => onPrintPO(record),
            },
        ];

        if (record.status === 'pending') {
            items.push(
                {
                    key: 'approve',
                    icon: <CheckCircleOutlined />,
                    label: 'Approve',
                    onClick: () => onUpdateStatus(record._id, 'approved'),
                },
                {
                    key: 'cancel',
                    icon: <StopOutlined />,
                    label: 'Cancel',
                    danger: true,
                    onClick: () => onUpdateStatus(record._id, 'cancelled'),
                }
            );
        }

        if (record.status === 'approved' || record.status === 'partially_delivered') {
            items.push({
                key: 'create-delivery',
                icon: <CarOutlined />,
                label: 'Create Delivery',
                onClick: () => {
                    // Handle create delivery from PO
                },
            });
        }

        return items;
    };

    const actionColumn = {
        title: "Actions",
        dataIndex: "actions",
        hideInSearch: true,
        width: 200,
        fixed: 'right' as const,
        render: (_, record: PurchaseOrder) => [
            <Space size="small" key={record._id}>
                <AddEditPurchaseOrderModal
                    actionRef={actionRef}
                    data={record}
                    edit={true}
                />

                {(record.status === 'approved' || record.status === 'partially_delivered') && (
                    <CreateDeliveryFromPOModal
                        actionRef={actionRef}
                        purchaseOrder={record}
                    />
                )}

                <Dropdown
                    menu={{ items: getActionItems(record) }}
                    trigger={['click']}
                >
                    <Button
                        type="text"
                        icon={<MoreOutlined />}
                        size="small"
                    />
                </Dropdown>

                <Popconfirm
                    title="Delete Purchase Order"
                    description="Are you sure you want to delete this purchase order? This action cannot be undone."
                    onConfirm={() => onDeletePO(record._id)}
                    okText="Yes, Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                    disabled={record.deliveries && record.deliveries.length > 0}
                >
                    <Button
                        type="primary"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        title={record.deliveries && record.deliveries.length > 0
                            ? "Cannot delete PO with deliveries"
                            : "Delete purchase order"}
                        disabled={record.deliveries && record.deliveries.length > 0}
                    >
                        Delete
                    </Button>
                </Popconfirm>
            </Space>
        ],
    };

    return (
        <ProTable<PurchaseOrder>
            rowKey="_id"
            cardBordered
            scroll={{ x: 1400 }}
            pagination={{
                pageSize: 10,
                showQuickJumper: true,
                showSizeChanger: true,
                showTotal: (total, range) => (
                    <div>{`Showing ${range[0]}-${range[1]} of ${total} total purchase orders`}</div>
                ),
            }}
            expandable={{
                expandedRowRender: (record) => (
                    <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
                        <Title level={5} style={{ marginBottom: '16px' }}>
                            Purchase Order Items - {record.po_number}
                        </Title>
                        <PurchaseOrderItems record={record} />
                    </div>
                ),
                expandIcon: ({ expanded, onExpand, record }) =>
                    expanded ? (
                        <CompressOutlined
                            onClick={(e) => onExpand(record, e)}
                            style={{ color: '#1890ff' }}
                        />
                    ) : (
                        <ExpandAltOutlined
                            onClick={(e) => onExpand(record, e)}
                            style={{ color: '#1890ff' }}
                        />
                    ),
                expandRowByClick: false,
            }}
            columns={[
                {
                    title: "PO Number",
                    dataIndex: "po_number",
                    hideInSearch: false,
                    width: 130,
                    fieldProps: {
                        placeholder: "Enter PO Number",
                    },
                    sorter: true,
                    render: (text) => (
                        <code style={{
                            background: '#f6f8fa',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            {text}
                        </code>
                    ),
                },
                {
                    title: "Supplier",
                    dataIndex: "supplier_id",
                    hideInSearch: true,
                    width: 150,
                    render: (_, record) => {
                        if (record?.supplier_id?.name) {
                            return (
                                <Space direction="vertical" size={2}>
                                    <span style={{ fontWeight: 'bold' }}>
                                        {record.supplier_id.name}
                                    </span>
                                    {record.supplier_id.contact && (
                                        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                            {record.supplier_id.contact}
                                        </span>
                                    )}
                                </Space>
                            );
                        }
                        return <span style={{ color: '#8c8c8c' }}>No supplier</span>;
                    },
                },
                {
                    title: "Status",
                    dataIndex: "status",
                    hideInSearch: false,
                    width: 140,
                    render: (_, record) => renderStatus(record.status),
                    valueEnum: {
                        pending: { text: 'Pending', status: 'Warning' },
                        approved: { text: 'Approved', status: 'Success' },
                        partially_delivered: { text: 'Partial Delivery', status: 'Processing' },
                        fully_delivered: { text: 'Delivered', status: 'Success' },
                        cancelled: { text: 'Cancelled', status: 'Error' },
                    },
                },
                {
                    title: "Items Count",
                    dataIndex: "po_items",
                    hideInSearch: true,
                    width: 100,
                    render: (_, record) => {
                        const itemsCount = record?.po_items?.length || 0;
                        return (
                            <Tag color="geekblue" icon={<FileTextOutlined />}>
                                {itemsCount} items
                            </Tag>
                        );
                    },
                },
                {
                    title: "Total Amount",
                    dataIndex: "total_amount",
                    hideInSearch: true,
                    width: 120,
                    sorter: true,
                    render: (_, record) => renderTotalAmount(record.total_amount),
                },
                {
                    title: "Delivery Progress",
                    dataIndex: "delivery_percentage",
                    hideInSearch: true,
                    width: 140,
                    render: (_, record) => renderDeliveryProgress(record),
                },
                {
                    title: "Expected Delivery",
                    dataIndex: "expected_delivery_date",
                    hideInSearch: true,
                    width: 120,
                    render: (text) => {
                        if (!text) return <span style={{ color: '#8c8c8c' }}>Not set</span>;

                        const date = new Date(text);
                        const today = new Date();
                        const isOverdue = date < today && date.toDateString() !== today.toDateString();

                        return (
                            <Space direction="vertical" size={2}>
                                <span style={{
                                    color: isOverdue ? '#ff4d4f' : '#1890ff',
                                    fontWeight: isOverdue ? 'bold' : 'normal'
                                }}>
                                    {date.toLocaleDateString()}
                                </span>
                                {isOverdue && (
                                    <Tag color="red" size="small">
                                        Overdue
                                    </Tag>
                                )}
                            </Space>
                        );
                    },
                },
                {
                    title: "Created By",
                    dataIndex: "created_by",
                    hideInSearch: true,
                    width: 120,
                    render: (_, record) => {
                        if (record?.created_by?.name) {
                            return (
                                <Tooltip title={record.created_by.email}>
                                    <Tag color="purple">
                                        {record.created_by.name}
                                    </Tag>
                                </Tooltip>
                            );
                        }
                        return <span style={{ color: '#8c8c8c' }}>Unknown</span>;
                    },
                },
                {
                    title: "Created Date",
                    dataIndex: "createdAt",
                    hideInSearch: true,
                    width: 120,
                    sorter: true,
                    render: (text) => {
                        if (!text) return '-';
                        const date = new Date(text);
                        return (
                            <Space direction="vertical" size={2}>
                                <span>{date.toLocaleDateString()}</span>
                                <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </Space>
                        );
                    },
                },
                actionColumn,
            ]}
            request={onFetchData}
            tableAlertRender={({ selectedRowKeys, selectedRows }) => {
                const totalValue = selectedRows.reduce((sum, row) => {
                    return sum + (row.total_amount || 0);
                }, 0);

                const pendingCount = selectedRows.filter(row => row.status === 'pending').length;
                const approvedCount = selectedRows.filter(row => row.status === 'approved').length;

                return (
                    <Space>
                        <span>
                            Selected {selectedRowKeys.length} purchase orders
                        </span>
                        {totalValue > 0 && (
                            <span>
                                Total value: <strong>Ksh. {totalValue.toLocaleString()}</strong>
                            </span>
                        )}
                        {pendingCount > 0 && (
                            <Tag color="orange">{pendingCount} pending</Tag>
                        )}
                        {approvedCount > 0 && (
                            <Tag color="green">{approvedCount} approved</Tag>
                        )}
                    </Space>
                );
            }}
            tableAlertOptionRender={({ selectedRows }) => (
                <Space>
                    <Button
                        size="small"
                        icon={<FileExcelOutlined />}
                        onClick={() => onExportToExcel(selectedRows)}
                    >
                        Export Selected to Excel
                    </Button>
                    <Button
                        size="small"
                        icon={<FilePdfOutlined />}
                        onClick={() => onExportToPDF(selectedRows)}
                    >
                        Export Selected to PDF
                    </Button>
                </Space>
            )}
            actionRef={actionRef}
            rowSelection={{
                alwaysShowAlert: true,
            }}
            search={{
                searchText: "Search",
                resetText: "Reset",
                labelWidth: "auto",
                collapsed: false,
                collapseRender: (collapsed) => collapsed ? 'Expand' : 'Collapse',
            }}
            dateFormatter="string"
            headerTitle="Purchase Order Management"
            toolBarRender={() => [
                <AddEditPurchaseOrderModal key="add" actionRef={actionRef} />,
                <Dropdown
                    key="bulk-actions"
                    menu={{
                        items: [
                            {
                                key: 'bulk-print-all',
                                icon: <PrinterOutlined />,
                                label: 'Bulk Print All POs',
                                onClick: onBulkPrint,
                            },
                            {
                                key: 'summary-report',
                                icon: <FileTextOutlined />,
                                label: 'Generate Summary Report',
                                onClick: onGenerateSummary,
                            },
                        ]
                    }}
                    trigger={['click']}
                >
                    <Button icon={<MoreOutlined />}>
                        More Actions
                    </Button>
                </Dropdown>
            ]}
            options={{
                setting: {
                    listsHeight: 400,
                },
                reload: true,
                density: true,
                fullScreen: true,
            }}
        />
    );
};

export default PurchaseOrderTable;