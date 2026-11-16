import React from "react";
import { Drawer, Descriptions, Tag, Space, Button, Typography, Divider, Badge } from "antd";
import { CloseOutlined, EditOutlined, CheckCircleOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
    PettyCashTransaction,
    PettyCashStatus,
    PettyCashTransactionType,
    PettyCashPaymentMethod,
    PettyCashCategory,
} from "@services/accounting/pettyCash";

const { Text, Title } = Typography;

interface PettyCashDetailDrawerProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    transaction?: PettyCashTransaction | null;
    onEdit?: (transaction: PettyCashTransaction) => void;
    onApprove?: (transaction: PettyCashTransaction) => void;
    onVoid?: (transaction: PettyCashTransaction) => void;
}

const PettyCashDetailDrawer: React.FC<PettyCashDetailDrawerProps> = ({
    open,
    setOpen,
    transaction,
    onEdit,
    onApprove,
    onVoid,
}) => {
    const STATUS_CONFIG: Record<PettyCashStatus, { color: string; label: string }> = {
        Pending: { color: "processing", label: "Pending" },
        Approved: { color: "success", label: "Approved" },
        Voided: { color: "default", label: "Voided" },
    };

    const TRANSACTION_TYPE_CONFIG: Record<PettyCashTransactionType, { color: string; label: string }> = {
        Deposit: { color: "green", label: "Deposit" },
        Withdrawal: { color: "orange", label: "Withdrawal" },
        Expense: { color: "red", label: "Expense" },
    };

    if (!transaction) return null;

    return (
        <Drawer
            title="Petty Cash Transaction Details"
            width={600}
            open={open}
            onClose={() => setOpen(false)}
            extra={
                <Space>
                    {transaction.status === "Pending" && onEdit && (
                        <Button
                            icon={<EditOutlined />}
                            onClick={() => onEdit(transaction)}
                        >
                            Edit
                        </Button>
                    )}
                    {transaction.status === "Pending" && onApprove && (
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => onApprove(transaction)}
                        >
                            Approve
                        </Button>
                    )}
                    {transaction.status !== "Voided" && onVoid && (
                        <Button
                            danger
                            icon={<StopOutlined />}
                            onClick={() => onVoid(transaction)}
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
                {/* Transaction Header */}
                <div>
                    <Title level={4}>{transaction.transaction_no}</Title>
                    <Space>
                        <Tag color={TRANSACTION_TYPE_CONFIG[transaction.transaction_type].color}>
                            {TRANSACTION_TYPE_CONFIG[transaction.transaction_type].label}
                        </Tag>
                        <Badge
                            status={STATUS_CONFIG[transaction.status].color as any}
                            text={STATUS_CONFIG[transaction.status].label}
                        />
                    </Space>
                </div>

                {/* Transaction Details */}
                <Descriptions column={1} bordered>
                    <Descriptions.Item label="Transaction Date">
                        {dayjs(transaction.transaction_date).format("DD MMMM YYYY")}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description">
                        <Text strong>{transaction.description}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Category">
                        <Tag>{transaction.category}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Amount">
                        <Text
                            strong
                            style={{
                                color: transaction.transaction_type === "Deposit" ? "#52c41a" : "#ff4d4f",
                                fontSize: "16px",
                            }}
                        >
                            {transaction.transaction_type === "Deposit" ? "+" : "-"}KES{" "}
                            {transaction.amount.toLocaleString()}
                        </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Currency">
                        {transaction.currency}
                    </Descriptions.Item>
                    <Descriptions.Item label="Payment Method">
                        <Tag>{transaction.payment_method.replace("_", " ")}</Tag>
                    </Descriptions.Item>
                    {transaction.payee_name && (
                        <Descriptions.Item label="Payee Name">
                            {transaction.payee_name}
                        </Descriptions.Item>
                    )}
                    {transaction.recipient_name && (
                        <Descriptions.Item label="Recipient Name">
                            {transaction.recipient_name}
                        </Descriptions.Item>
                    )}
                    {transaction.receipt_no && (
                        <Descriptions.Item label="Receipt Number">
                            {transaction.receipt_no}
                        </Descriptions.Item>
                    )}
                    {transaction.receipt_date && (
                        <Descriptions.Item label="Receipt Date">
                            {dayjs(transaction.receipt_date).format("DD MMMM YYYY")}
                        </Descriptions.Item>
                    )}
                    {transaction.notes && (
                        <Descriptions.Item label="Notes">
                            <Text>{transaction.notes}</Text>
                        </Descriptions.Item>
                    )}
                </Descriptions>

                {/* Audit Information */}
                <Divider />
                <Title level={5}>Audit Information</Title>
                <Descriptions column={1} size="small">
                    <Descriptions.Item label="Created">
                        {dayjs(transaction.createdAt || transaction.transaction_date).format(
                            "DD MMMM YYYY HH:mm"
                        )}
                        {transaction.created_by && (
                            <Text type="secondary">
                                {" by "}
                                {typeof transaction.created_by === "string"
                                    ? transaction.created_by
                                    : transaction.created_by?.name || "Unknown"}
                            </Text>
                        )}
                    </Descriptions.Item>
                    {transaction.approved_by && (
                        <Descriptions.Item label="Approved">
                            {dayjs(transaction.approved_at).format("DD MMMM YYYY HH:mm")}
                            <Text type="secondary">
                                {" by "}
                                {typeof transaction.approved_by === "string"
                                    ? transaction.approved_by
                                    : transaction.approved_by?.name || "Unknown"}
                            </Text>
                        </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Last Updated">
                        {dayjs(transaction.updatedAt).format("DD MMMM YYYY HH:mm")}
                    </Descriptions.Item>
                </Descriptions>
            </Space>
        </Drawer>
    );
};

export default PettyCashDetailDrawer;
