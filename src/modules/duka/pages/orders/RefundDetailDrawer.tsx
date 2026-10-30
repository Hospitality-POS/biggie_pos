import React from "react";
import { Drawer, Descriptions, Tag, Space, Button, Typography, Divider, Badge, Table } from "antd";
import { CloseOutlined, EditOutlined, CheckCircleOutlined, StopOutlined, SwapOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
    Refund,
    RefundStatus,
    RefundType,
    RefundMethod,
    RefundReason,
    RefundItem,
} from "@services/accounting/refunds";

const { Text, Title } = Typography;

interface RefundDetailDrawerProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    refund?: Refund | null;
    onEdit?: (refund: Refund) => void;
    onApprove?: (refund: Refund) => void;
    onProcess?: (refund: Refund) => void;
    onVoid?: (refund: Refund) => void;
}

const RefundDetailDrawer: React.FC<RefundDetailDrawerProps> = ({
    open,
    setOpen,
    refund,
    onEdit,
    onApprove,
    onProcess,
    onVoid,
}) => {
    const STATUS_CONFIG: Record<RefundStatus, { color: string; label: string }> = {
        Pending: { color: "processing", label: "Pending" },
        Approved: { color: "warning", label: "Approved" },
        Processed: { color: "success", label: "Processed" },
        Voided: { color: "default", label: "Voided" },
    };

    const REFUND_TYPE_CONFIG: Record<RefundType, { color: string; label: string }> = {
        Full: { color: "red", label: "Full" },
        Partial: { color: "orange", label: "Partial" },
        Exchange: { color: "blue", label: "Exchange" },
    };

    if (!refund) return null;

    const refundItemColumns = [
        {
            title: "Item Name",
            dataIndex: "item_name",
            key: "item_name",
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "quantity",
            width: 100,
            align: "right" as const,
            render: (quantity: number) => <Text>{quantity}</Text>,
        },
        {
            title: "Unit Price",
            dataIndex: "unit_price",
            key: "unit_price",
            width: 120,
            align: "right" as const,
            render: (price: number) => <Text>KES {price.toLocaleString()}</Text>,
        },
        {
            title: "Total Amount",
            dataIndex: "total_amount",
            key: "total_amount",
            width: 120,
            align: "right" as const,
            render: (amount: number) => <Text strong>KES {amount.toLocaleString()}</Text>,
        },
        {
            title: "Reason",
            dataIndex: "reason",
            key: "reason",
            render: (reason?: string) => reason ? <Text>{reason}</Text> : <Text type="secondary">-</Text>,
        },
    ];

    return (
        <Drawer
            title="Refund Details"
            width={700}
            open={open}
            onClose={() => setOpen(false)}
            extra={
                <Space>
                    {refund.status === "Pending" && onEdit && (
                        <Button
                            icon={<EditOutlined />}
                            onClick={() => onEdit(refund)}
                        >
                            Edit
                        </Button>
                    )}
                    {refund.status === "Pending" && onApprove && (
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => onApprove(refund)}
                        >
                            Approve
                        </Button>
                    )}
                    {refund.status === "Approved" && onProcess && (
                        <Button
                            type="primary"
                            icon={<SwapOutlined />}
                            onClick={() => onProcess(refund)}
                        >
                            Process
                        </Button>
                    )}
                    {refund.status !== "Voided" && onVoid && (
                        <Button
                            danger
                            icon={<StopOutlined />}
                            onClick={() => onVoid(refund)}
                        >
                            Void
                        </Button>
                    )}
                    <Button icon={<CloseOutlined />} onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </Space>
            }
        >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                {/* Refund Header */}
                <div>
                    <Title level={4}>{refund.refund_no}</Title>
                    <Space>
                        <Tag color={REFUND_TYPE_CONFIG[refund.refund_type].color}>
                            {REFUND_TYPE_CONFIG[refund.refund_type].label}
                        </Tag>
                        <Badge
                            status={STATUS_CONFIG[refund.status].color as any}
                            text={STATUS_CONFIG[refund.status].label}
                        />
                    </Space>
                </div>

                {/* Refund Details */}
                <Descriptions column={1} bordered>
                    <Descriptions.Item label="Refund Date">
                        {dayjs(refund.refund_date).format("DD MMMM YYYY")}
                    </Descriptions.Item>
                    <Descriptions.Item label="Original Invoice">
                        <Space>
                            <Text strong>{refund.original_invoice_no}</Text>
                            <Text type="secondary">({refund.original_invoice_id})</Text>
                        </Space>
                    </Descriptions.Item>
                    {refund.original_transaction_date && (
                        <Descriptions.Item label="Original Transaction Date">
                            {dayjs(refund.original_transaction_date).format("DD MMMM YYYY")}
                        </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Customer">
                        <div>
                            <Text strong>{refund.customer_name}</Text>
                            {refund.customer_contact && (
                                <div>
                                    <Text type="secondary">{refund.customer_contact}</Text>
                                </div>
                            )}
                        </div>
                    </Descriptions.Item>
                    <Descriptions.Item label="Refund Reason">
                        <Space direction="vertical" size="small">
                            <Tag>{refund.refund_reason.replace("_", " ")}</Tag>
                            {refund.refund_reason_details && (
                                <Text>{refund.refund_reason_details}</Text>
                            )}
                        </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Refund Amount">
                        <Text
                            strong
                            style={{ color: "#ff4d4f", fontSize: "16px" }}
                        >
                            KES {refund.refund_total.toLocaleString()}
                        </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Refund Method">
                        <Tag>{refund.refund_method.replace("_", " ")}</Tag>
                    </Descriptions.Item>
                    {refund.notes && (
                        <Descriptions.Item label="Notes">
                            <Text>{refund.notes}</Text>
                        </Descriptions.Item>
                    )}
                </Descriptions>

                {/* Refund Items */}
                <Divider />
                <Title level={5}>Refund Items</Title>
                <Table
                    dataSource={refund.refund_items}
                    columns={refundItemColumns}
                    pagination={false}
                    size="small"
                    rowKey="_id"
                    summary={(pageData) => {
                        const totalAmount = pageData.reduce(
                            (sum, item) => sum + item.total_amount,
                            0
                        );
                        return (
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={3}>
                                    <Text strong>Total</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={3}>
                                    <Text strong>KES {totalAmount.toLocaleString()}</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={4} />
                            </Table.Summary.Row>
                        );
                    }}
                />

                {/* Audit Information */}
                <Divider />
                <Title level={5}>Audit Information</Title>
                <Descriptions column={1} size="small">
                    <Descriptions.Item label="Created">
                        {dayjs(refund.createdAt || refund.refund_date).format(
                            "DD MMMM YYYY HH:mm"
                        )}
                        {refund.created_by && (
                            <Text type="secondary">
                                {" by "}
                                {typeof refund.created_by === "string"
                                    ? refund.created_by
                                    : refund.created_by?.name || "Unknown"}
                            </Text>
                        )}
                    </Descriptions.Item>
                    {refund.approved_by && (
                        <Descriptions.Item label="Approved">
                            {dayjs(refund.approved_at).format("DD MMMM YYYY HH:mm")}
                            <Text type="secondary">
                                {" by "}
                                {typeof refund.approved_by === "string"
                                    ? refund.approved_by
                                    : refund.approved_by?.name || "Unknown"}
                            </Text>
                        </Descriptions.Item>
                    )}
                    {refund.processed_by && (
                        <Descriptions.Item label="Processed">
                            {dayjs(refund.processed_at).format("DD MMMM YYYY HH:mm")}
                            <Text type="secondary">
                                {" by "}
                                {typeof refund.processed_by === "string"
                                    ? refund.processed_by
                                    : refund.processed_by?.name || "Unknown"}
                            </Text>
                        </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Last Updated">
                        {dayjs(refund.updatedAt).format("DD MMMM YYYY HH:mm")}
                    </Descriptions.Item>
                </Descriptions>
            </Space>
        </Drawer>
    );
};

export default RefundDetailDrawer;
