import React from "react";
import {
    Drawer,
    Typography,
    Descriptions,
    Table,
    Tag,
    Button,
    Space,
    Divider,
    Badge,
    Spin,
} from "antd";
import {
    ArrowRightOutlined,
    EyeOutlined,
    EditOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getBillById, type Bill } from "@services/accounting/bill";
import { getNotesByBill } from "@services/accounting/notes";
import { getSupplierById } from "@services/supplier";

const { Title, Text } = Typography;

interface Props {
    open: boolean;
    onClose: () => void;
    billId: string | null;
    onOpenNote?: (noteId: string) => void;
    hideCreditNotes?: boolean;
}

const BillDetailDrawer: React.FC<Props> = ({
    open,
    onClose,
    billId,
    onOpenNote,
    hideCreditNotes = false,
}) => {
    const {
        data: billData,
        isLoading: billLoading,
        error: billError,
    } = useQuery({
        queryKey: ["bill", billId],
        queryFn: () => getBillById(billId!),
        enabled: !!billId,
    });

    const bill = billData?.bill;

    const {
        data: notesData,
        isLoading: notesLoading,
        error: notesError,
    } = useQuery({
        queryKey: ["notes-by-bill", billId],
        queryFn: () => getNotesByBill(billId!),
        enabled: !!billId,
    });

    const {
        data: supplierData,
        isLoading: supplierLoading,
    } = useQuery({
        queryKey: ["supplier", bill?.supplier_id?._id],
        queryFn: () => getSupplierById(bill?.supplier_id?._id!),
        enabled: !!bill?.supplier_id?._id,
    });

    const supplier = supplierData?.supplier || supplierData;
    
    // Debug: Log the actual bill data
    React.useEffect(() => {
        if (bill) {
            console.log('Bill Data:', bill);
            console.log('Bill Lines:', bill.bill_lines);
            console.log('Supplier Data:', supplierData);
        }
    }, [bill, supplierData]);

    if (billLoading) {
        return (
            <Drawer title="Loading..." open={open} onClose={onClose} width={800}>
                <div style={{ textAlign: "center", padding: "50px" }}>
                    <Spin size="large" />
                </div>
            </Drawer>
        );
    }

    if (billError || !bill) {
        return (
            <Drawer title="Error" open={open} onClose={onClose} width={800}>
                <div style={{ textAlign: "center", padding: "50px" }}>
                    <Text type="danger">Failed to load bill details</Text>
                    <br />
                    <Text type="secondary">Bill ID: {billId}</Text>
                </div>
            </Drawer>
        );
    }

    // Check if bill has mock data
    const hasMockData = bill.supplier_name === "Mock Company Ltd" || 
                       (bill.bill_lines && bill.bill_lines.some((line: any) => line.description === "Mock Description"));

    if (hasMockData) {
        console.warn('Bill contains mock data - this might be a development environment issue');
    }

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { status: "success" | "processing" | "warning" | "error"; text: string }> = {
            Draft: { status: "warning", text: "Draft" },
            Pending: { status: "processing", text: "Pending" },
            Partially_Paid: { status: "processing", text: "Partially Paid" },
            Paid: { status: "success", text: "Paid" },
            Overdue: { status: "error", text: "Overdue" },
            Voided: { status: "error", text: "Voided" },
            Cancelled: { status: "error", text: "Cancelled" },
        };
        const config = statusConfig[status] || statusConfig.Draft;
        return <Badge status={config.status as any} text={config.text} />;
    };

    const billColumns = [
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            render: (text: string) => text || "-",
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "quantity",
            align: "right" as const,
            render: (value: number) => value?.toLocaleString() || 0,
        },
        {
            title: "Unit Price",
            dataIndex: "unit_price",
            key: "unit_price",
            align: "right" as const,
            render: (value: number) => `KES ${(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            align: "right" as const,
            render: (value: number) => `KES ${(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
        },
        {
            title: "VAT",
            dataIndex: "vat_amount",
            key: "vat_amount",
            align: "right" as const,
            render: (value: number) => `KES ${(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
        },
    ];

    const notesColumns = [
        {
            title: "Note No.",
            dataIndex: "note_no",
            key: "note_no",
            render: (text: string, record: any) => (
                <Button 
                    type="link" 
                    size="small"
                    onClick={() => onOpenNote?.(record._id)}
                    style={{ padding: 0, height: 'auto' }}
                >
                    <Text code>{text}</Text>
                </Button>
            ),
        },
        {
            title: "Type",
            dataIndex: "note_type",
            key: "note_type",
            render: (type: string) => (
                <Tag color={type === "CREDIT_NOTE" ? "green" : "orange"}>
                    {type === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"}
                </Tag>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status: string) => {
                const statusConfig: Record<string, { status: "success" | "processing" | "warning" | "error"; text: string }> = {
                    Draft: { status: "warning", text: "Draft" },
                    Approved: { status: "processing", text: "Approved" },
                    Applied: { status: "success", text: "Applied" },
                    Voided: { status: "error", text: "Voided" },
                };
                const config = statusConfig[status] || statusConfig.Draft;
                return <Badge status={config.status as any} text={config.text} />;
            },
        },
        {
            title: "Amount",
            dataIndex: "grand_total",
            key: "grand_total",
            align: "right" as const,
            render: (value: number) => `KES ${(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`,
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: any, record: any) => (
                <Button
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => onOpenNote?.(record._id)}
                >
                    View
                </Button>
            ),
        },
    ];

    const notes = notesData?.notes || [];
    const totalCreditNotes = notesData?.total_credit_notes || 0;
    const totalDebitNotes = notesData?.total_debit_notes || 0;
    const netAdjustment = notesData?.net_adjustment || 0;

    return (
        <Drawer
            title={
                <Space>
                    <Title level={4} style={{ margin: 0 }}>
                        {bill.bill_no}
                    </Title>
                    {getStatusBadge(bill.status)}
                </Space>
            }
            open={open}
            onClose={onClose}
            width={900}
            extra={
                <Space>
                    <Button icon={<EditOutlined />}>Edit</Button>
                </Space>
            }
        >
            <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Supplier">
                    {supplier?.name || 
                     (typeof bill.supplier_id === 'object' ? bill.supplier_id?.name : null) || 
                     (typeof bill.supplier_id === 'object' ? `Supplier #${bill.supplier_id?._id?.slice(-8)}` : 
                      typeof bill.supplier_id === 'string' ? `Supplier #${bill.supplier_id.slice(-8)}` : 'Unknown') || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Bill Date">
                    {dayjs(bill.bill_date).format("DD MMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Due Date">
                    {dayjs(bill.due_date).format("DD MMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Grand Total">
                    <Text strong>
                        KES {(bill.grand_total || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Amount Paid">
                    KES {(bill.amount_paid || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Descriptions.Item>
                <Descriptions.Item label="Amount Due">
                    <Text strong style={{ color: bill.amount_due > 0 ? "#ef4444" : "#10b981" }}>
                        KES {(bill.amount_due || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Bill Items</Divider>
            <Table
                columns={billColumns}
                dataSource={bill.bill_lines || []}
                rowKey="_id"
                pagination={false}
                size="small"
                summary={(pageData) => {
                    const totalAmount = pageData.reduce((sum, item) => sum + (item.amount || 0), 0);
                    const totalVAT = pageData.reduce((sum, item) => sum + (item.vat_amount || 0), 0);
                    return (
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={3}>
                                <Text strong>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                                <Text strong>
                                    KES {totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                </Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2}>
                                <Text strong>
                                    KES {totalVAT.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                </Text>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    );
                }}
            />

            {!hideCreditNotes && (
                <>
                    <Divider orientation="left">Applied Credit/Debit Notes</Divider>
                    {notesLoading ? (
                        <div style={{ textAlign: "center", padding: "20px" }}>
                            <Spin />
                        </div>
                    ) : notes.length > 0 ? (
                        <>
                            <div style={{ marginBottom: 16 }}>
                                <Space>
                                    <Text strong>Total Credit Notes: {totalCreditNotes}</Text>
                                    <Text strong>Total Debit Notes: {totalDebitNotes}</Text>
                                    <Text strong>Net Adjustment: KES {netAdjustment.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
                                </Space>
                            </div>
                            <Table
                                columns={notesColumns}
                                dataSource={notes}
                                rowKey="_id"
                                pagination={false}
                                size="small"
                            />
                        </>
                    ) : (
                        <div style={{ textAlign: "center", padding: "20px" }}>
                            <Text type="secondary">No credit/debit notes applied to this bill</Text>
                        </div>
                    )}
                </>
            )}
        </Drawer>
    );

};

export default BillDetailDrawer;
