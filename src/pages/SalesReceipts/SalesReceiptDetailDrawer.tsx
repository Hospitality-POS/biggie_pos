import React from "react";
import {
    Drawer,
    Button,
    Space,
    Typography,
    Tag,
    Divider,
    Descriptions,
    Table,
    Alert,
    Row,
    Col,
    Popconfirm,
    message,
} from "antd";
import {
    EditOutlined,
    CheckOutlined,
    StopOutlined,
    PrinterOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getSalesReceiptById,
    postSalesReceipt,
    voidSalesReceipt,
    fixVoidedJournalEntries,
    SalesReceipt,
    SalesReceiptStatus,
} from "@services/accounting/salesReceipts";
import dayjs from "dayjs";

const { Text, Title } = Typography;

interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    receiptId: string | null;
    onSuccess: () => void;
}

const SalesReceiptDetailDrawer: React.FC<Props> = ({ open, setOpen, receiptId, onSuccess }) => {
    const queryClient = useQueryClient();

    const { data: receipt, isLoading } = useQuery({
        queryKey: ["sales-receipt", receiptId],
        queryFn: () => getSalesReceiptById(receiptId!),
        enabled: open && !!receiptId,
    });

    const postMutation = useMutation({
        mutationFn: postSalesReceipt,
        onSuccess: () => {
            message.success("Sales receipt posted successfully");
            queryClient.invalidateQueries({ queryKey: ["sales-receipt", receiptId] });
            onSuccess();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || "Failed to post sales receipt");
        },
    });

    const voidMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => voidSalesReceipt(id, reason),
        onSuccess: () => {
            message.success("Sales receipt voided successfully");
            queryClient.invalidateQueries({ queryKey: ["sales-receipt", receiptId] });
            onSuccess();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || "Failed to void sales receipt");
        },
    });

    const fixJournalMutation = useMutation({
        mutationFn: fixVoidedJournalEntries,
        onSuccess: (result) => {
            message.success(result.message);
            queryClient.invalidateQueries({ queryKey: ["sales-receipt", receiptId] });
            onSuccess();
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || "Failed to fix journal entry");
        },
    });

    const handlePost = () => {
        if (receiptId) {
            postMutation.mutate(receiptId);
        }
    };

    const handleVoid = () => {
        const reason = prompt("Please provide a reason for voiding this receipt:");
        if (reason && receiptId) {
            voidMutation.mutate({ id: receiptId, reason });
        }
    };

    const handleFixJournal = () => {
        fixJournalMutation.mutate();
    };

    const canEdit = receipt?.status === "Pending";
    const canPost = receipt?.status === "Pending";
    const canVoid = receipt?.status === "Pending" || receipt?.status === "Posted";
    const needsJournalFix = receipt?.status === "Voided" && receipt?.journal_entry_id?.status === "Posted";

    const lineColumns = [
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
        },
        {
            title: "Qty",
            dataIndex: "quantity",
            key: "quantity",
            align: "right" as const,
        },
        {
            title: "Unit Price",
            dataIndex: "unit_price",
            key: "unit_price",
            align: "right" as const,
            render: (price: number) => `KES ${price.toFixed(2)}`,
        },
        {
            title: "Discount",
            dataIndex: "discount",
            key: "discount",
            align: "right" as const,
            render: (discount: number) => (discount > 0 ? `KES ${discount.toFixed(2)}` : "—"),
        },
        {
            title: "VAT Type",
            dataIndex: "vat_type",
            key: "vat_type",
            render: (type: string) => <Tag>{type}</Tag>,
        },
        {
            title: "VAT Rate",
            dataIndex: "vat_rate",
            key: "vat_rate",
            align: "right" as const,
            render: (rate: number) => `${(rate * 100).toFixed(0)}%`,
        },
        {
            title: "Net Amount",
            dataIndex: "net_amount",
            key: "net_amount",
            align: "right" as const,
            render: (amount: number) => `KES ${amount.toFixed(2)}`,
        },
        {
            title: "VAT Amount",
            dataIndex: "vat_amount",
            key: "vat_amount",
            align: "right" as const,
            render: (amount: number) => `KES ${amount.toFixed(2)}`,
        },
        {
            title: "Line Total",
            dataIndex: "line_total",
            key: "line_total",
            align: "right" as const,
            render: (total: number) => <Text strong>KES {total.toFixed(2)}</Text>,
        },
    ];

    if (isLoading) {
        return <Drawer open={open} onClose={() => setOpen(false)} title="Loading..." />;
    }

    if (!receipt) {
        return <Drawer open={open} onClose={() => setOpen(false)} title="Sales Receipt" />;
    }

    const statusColors: Record<SalesReceiptStatus, string> = {
        Pending: "warning",
        Posted: "success",
        Voided: "error",
    };

    return (
        <Drawer
            title={`Sales Receipt - ${receipt.receipt_no}`}
            width={800}
            open={open}
            onClose={() => setOpen(false)}
            footer={
                <Space style={{ textAlign: "right", width: "100%" }}>
                    <Button icon={<PrinterOutlined />}>Print</Button>
                    {needsJournalFix && (
                        <Popconfirm
                            title="Fix journal entry?"
                            description="This will void the associated journal entry for this voided receipt."
                            onConfirm={handleFixJournal}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button 
                                type="primary" 
                                style={{ backgroundColor: "#faad14", borderColor: "#faad14" }}
                                loading={fixJournalMutation.isLoading}
                            >
                                Fix Journal Entry
                            </Button>
                        </Popconfirm>
                    )}
                    {canEdit && (
                        <Button icon={<EditOutlined />} onClick={() => {/* Open edit drawer */}}>
                            Edit
                        </Button>
                    )}
                    {canPost && (
                        <Popconfirm
                            title="Post this receipt?"
                            description="This will create a journal entry in accounting."
                            onConfirm={handlePost}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button type="primary" icon={<CheckOutlined />} loading={postMutation.isLoading}>
                                Post
                            </Button>
                        </Popconfirm>
                    )}
                    {canVoid && (
                        <Popconfirm
                            title="Void this receipt?"
                            description="This action cannot be undone."
                            onConfirm={handleVoid}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button danger icon={<StopOutlined />} loading={voidMutation.isLoading}>
                                Void
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            }
        >
            <Space direction="vertical" style={{ width: "100%" }} size="large">
                {/* Status */}
                <Alert
                    message={`Status: ${receipt.status}`}
                    type={receipt.status === "Posted" ? "success" : receipt.status === "Voided" ? "error" : "warning"}
                    showIcon
                />

                {/* Receipt Details */}
                <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="Receipt No" span={2}>
                        <Text strong style={{ fontFamily: "monospace" }}>{receipt.receipt_no}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Receipt Date">
                        {dayjs(receipt.receipt_date).format("DD MMM YYYY")}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                        <Tag color={statusColors[receipt.status]}>{receipt.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Customer" span={2}>
                        {receipt.customer_id?.customer_name || receipt.customer_name || "Cash Sale"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Payment Method">
                        {receipt.payment_method}
                    </Descriptions.Item>
                    <Descriptions.Item label="Payment Reference">
                        {receipt.payment_reference || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created By">
                        {receipt.created_by?.name || receipt.created_by?.username}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created At">
                        {dayjs(receipt.createdAt).format("DD MMM YYYY HH:mm")}
                    </Descriptions.Item>
                    {receipt.posted_at && (
                        <>
                            <Descriptions.Item label="Posted By">
                                {receipt.posted_by?.name || receipt.posted_by?.username}
                            </Descriptions.Item>
                            <Descriptions.Item label="Posted At">
                                {dayjs(receipt.posted_at).format("DD MMM YYYY HH:mm")}
                            </Descriptions.Item>
                        </>
                    )}
                    {receipt.journal_entry_id && (
                        <Descriptions.Item label="Journal Entry" span={2}>
                            <Text code>{receipt.journal_entry_id.entry_no}</Text>
                            <Tag color="success" style={{ marginLeft: 8 }}>
                                {receipt.journal_entry_id.status}
                            </Tag>
                        </Descriptions.Item>
                    )}
                </Descriptions>

                {/* Notes */}
                {receipt.notes && (
                    <>
                        <Divider orientation="left">Notes</Divider>
                        <Text>{receipt.notes}</Text>
                    </>
                )}

                {/* Line Items */}
                <Divider orientation="left">Line Items</Divider>
                <Table
                    dataSource={receipt.lines}
                    columns={lineColumns}
                    rowKey="_id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 1000 }}
                />

                {/* Totals */}
                <Divider orientation="left">Totals</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Text>Subtotal:</Text>
                    </Col>
                    <Col span={12} style={{ textAlign: "right" }}>
                        <Text strong>KES {receipt.subtotal.toFixed(2)}</Text>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Text>Total VAT:</Text>
                    </Col>
                    <Col span={12} style={{ textAlign: "right" }}>
                        <Text strong>KES {receipt.total_vat.toFixed(2)}</Text>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Text>Total Discount:</Text>
                    </Col>
                    <Col span={12} style={{ textAlign: "right" }}>
                        <Text strong>KES {receipt.total_discount.toFixed(2)}</Text>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Title level={4} style={{ margin: 0 }}>Grand Total:</Title>
                    </Col>
                    <Col span={12} style={{ textAlign: "right" }}>
                        <Title level={4} style={{ margin: 0, color: "#1890ff" }}>
                            KES {receipt.grand_total.toFixed(2)}
                        </Title>
                    </Col>
                </Row>

                {/* VAT Settings */}
                <Divider orientation="left">VAT Settings</Divider>
                <Descriptions column={2} size="small">
                    <Descriptions.Item label="Pricing Mode">
                        {receipt.vat_pricing_mode}
                    </Descriptions.Item>
                    <Descriptions.Item label="Standard Rate">
                        {((receipt.vat_standard_rate || 0) * 100).toFixed(0)}%
                    </Descriptions.Item>
                </Descriptions>
            </Space>
        </Drawer>
    );
};

export default SalesReceiptDetailDrawer;
