import React, { useState } from "react";
import {
    Drawer,
    Typography,
    Row,
    Col,
    Divider,
    Tag,
    Table,
    Space,
    Badge,
    Descriptions,
    Button,
} from "antd";
import { EyeOutlined, EditOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { getNoteById, Note } from "@services/accounting/notes";
import NoteFormDrawer from "./NoteFormDrawer";
import InvoiceDetailDrawer from "../OrderManagement/Invoices/InvoiceDetailDrawer";
import BillDetailDrawer from "../OrderManagement/BillDetailDrawer";
import dayjs, { Dayjs } from "dayjs";

const { Text, Title } = Typography;

interface Props {
    open: boolean;
    onClose: () => void;
    noteId: string | null;
    onSuccess: () => void;
    onEdit?: (note: Note) => void;
    onOpenInvoice?: (invoiceId: string) => void;
}

const calcLineTotal = (line: any, vatMode: "INCLUSIVE" | "EXCLUSIVE") => {
    const gross = line.quantity * line.unit_price;
    const disc = gross * ((line.discount || 0) / 100);
    const after = gross - disc;
    const vatRate = line.vat_type === "STANDARD" ? 0.16 : 0;
    if (vatMode === "INCLUSIVE" && vatRate > 0) {
        const net = after / (1 + vatRate);
        return { net, vat: after - net, lineTotal: after, disc };
    }
    const vat = after * vatRate;
    return { net: after, vat, lineTotal: after + vat, disc };
};

const NoteDetailDrawer: React.FC<Props> = ({
    open, onClose, noteId, onSuccess, onEdit, onOpenInvoice,
}) => {
    const [billDetailOpen, setBillDetailOpen] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

    const { data: noteData, isLoading, error } = useQuery<{ note: Note }>({
        queryKey: ["note", noteId],
        queryFn: () => getNoteById(noteId!),
        enabled: !!noteId,
    });

    const note = noteData?.note;

    const handleOpenBill = (billId: string) => {
        setSelectedBillId(billId);
        setBillDetailOpen(true);
    };

    const handleCloseBill = () => {
        setBillDetailOpen(false);
        setSelectedBillId(null);
    };

    const isCredit = note?.note_type === "CREDIT_NOTE";

    const lineColumns = [
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            render: (text: string) => <Text>{text}</Text>,
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "quantity",
            width: 100,
            align: "right" as const,
            render: (value: number) => value.toLocaleString("en-KE", { minimumFractionDigits: 2 }),
        },
        {
            title: "Unit Price",
            dataIndex: "unit_price",
            key: "unit_price",
            width: 120,
            align: "right" as const,
            render: (value: number) => (
                <Text>KES {value.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
            ),
        },
        {
            title: "Discount %",
            dataIndex: "discount",
            key: "discount",
            width: 100,
            align: "right" as const,
            render: (value: number) => value ? `${value}%` : "—",
        },
        {
            title: "VAT",
            dataIndex: "vat_type",
            key: "vat_type",
            width: 80,
            render: (type: string) => {
                const vatLabels: Record<string, string> = {
                    NONE: "None",
                    STANDARD: "16%",
                    ZERO: "Zero",
                    EXEMPT: "Exempt",
                    OUT_OF_SCOPE: "Out of Scope",
                };
                return <Text>{vatLabels[type] || type}</Text>;
            },
        },
        {
            title: "Line Total",
            key: "total",
            width: 120,
            align: "right" as const,
            render: (_: any, record: any) => {
                const { lineTotal } = calcLineTotal(record, note?.vat_pricing_mode || "EXCLUSIVE");
                return (
                    <Text strong>
                        KES {lineTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                );
            },
        },
    ];

    if (isLoading || !note) {
        return (
            <Drawer
                title="Loading..."
                open={open}
                onClose={onClose}
                width={800}
                destroyOnClose
            >
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    Loading note details...
                </div>
            </Drawer>
        );
    }

    const totals = (note.lines || []).reduce(
        (acc, line) => {
            const c = calcLineTotal(line, note.vat_pricing_mode || "EXCLUSIVE");
            return {
                subtotal: acc.subtotal + c.net,
                totalVat: acc.totalVat + c.vat,
                grandTotal: acc.grandTotal + c.lineTotal,
                totalDisc: acc.totalDisc + c.disc,
            };
        },
        { subtotal: 0, totalVat: 0, grandTotal: 0, totalDisc: 0 }
    );

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { status: "success" | "processing" | "warning" | "error"; text: string }> = {
            Draft: { status: "warning", text: "Draft" },
            Approved: { status: "processing", text: "Approved" },
            Applied: { status: "success", text: "Applied" },
            Voided: { status: "error", text: "Voided" },
        };
        const config = statusConfig[status] || statusConfig.Draft;
        return <Badge status={config.status as any} text={config.text} />;
    };

    return (
        <>
            <Drawer
            title={
                <Space>
                    <Title level={4} style={{ margin: 0 }}>
                        {note.note_no}
                    </Title>
                    <Tag color={isCredit ? "green" : "orange"}>
                        {isCredit ? "Credit Note" : "Debit Note"}
                    </Tag>
                    {getStatusBadge(note.status)}
                </Space>
            }
            open={open}
            onClose={onClose}
            width={800}
            destroyOnClose
            extra={
                note.status === "Draft" && onEdit && (
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(note)}
                    >
                        Edit
                    </Button>
                )
            }
        >
            <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Direction">
                    <Tag color={note.direction === "customer" ? "blue" : "purple"}>
                        {note.direction === "customer" ? "CUSTOMER" : "SUPPLIER"}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Issue Date">
                    {dayjs(note.issue_date).format("DD MMM YYYY")}
                </Descriptions.Item>
                {note.expiry_date && (
                    <Descriptions.Item label="Expiry Date">
                        {dayjs(note.expiry_date).format("DD MMM YYYY")}
                    </Descriptions.Item>
                )}
                <Descriptions.Item label="Original Invoice">
                    {note.direction === "customer" && note.original_invoice_no ? (
                        onOpenInvoice ? (
                            <Button 
                                type="link" 
                                size="small"
                                icon={<ArrowRightOutlined />}
                                onClick={() => {
                                const invoiceId = typeof note.original_invoice_id === 'object' 
                                    ? note.original_invoice_id._id 
                                    : note.original_invoice_no;
                                if (invoiceId) onOpenInvoice(invoiceId);
                            }}
                                style={{ padding: 0, height: 'auto' }}
                            >
                                <Text code>{note.original_invoice_no}</Text>
                            </Button>
                        ) : (
                            <Text code>{note.original_invoice_no}</Text>
                        )
                    ) : note.direction === "supplier" && note.original_bill_id?.bill_no ? (
                        <Button 
                            type="link" 
                            size="small"
                            icon={<ArrowRightOutlined />}
                            onClick={() => {
                                if (note.original_bill_id?._id) {
                                    handleOpenBill(note.original_bill_id._id);
                                }
                            }}
                            style={{ padding: 0, height: 'auto' }}
                        >
                            <Text code>{note.original_bill_id.bill_no}</Text>
                        </Button>
                    ) : (
                        <Text type="secondary">-</Text>
                    )}
                </Descriptions.Item>
                <Descriptions.Item label="Contact">
                    {note.direction === "customer" && note.customer_id ? (
                        typeof note.customer_id === "object"
                            ? (note.customer_id as any)?.customer_name || (note.customer_id as any)?.name
                            : note.customer_id
                    ) : note.direction === "supplier" && note.supplier_id ? (
                        typeof note.supplier_id === "object"
                            ? (note.supplier_id as any)?.supplier_name || (note.supplier_id as any)?.name
                            : note.supplier_id
                    ) : (
                        "—"
                    )}
                </Descriptions.Item>
                <Descriptions.Item label="Reason" span={2}>
                    {note.reason}
                </Descriptions.Item>
                {note.notes && (
                    <Descriptions.Item label="Notes" span={2}>
                        {note.notes}
                    </Descriptions.Item>
                )}
                {note.internal_notes && (
                    <Descriptions.Item label="Internal Notes" span={2}>
                        {note.internal_notes}
                    </Descriptions.Item>
                )}
            </Descriptions>

            <Divider orientation="left">Line Items</Divider>

            <Table
                dataSource={note.lines || []}
                columns={lineColumns}
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
                summary={() => (
                    <Table.Summary fixed>
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={4}>
                                <Space direction="vertical" size={0}>
                                    {totals.totalDisc > 0 && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Discount: -KES {totals.totalDisc.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                        </Text>
                                    )}
                                    <Text strong>Subtotal:</Text>
                                </Space>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                            <Table.Summary.Cell index={5} align="right">
                                <Text strong>
                                    KES {totals.subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                </Text>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                        {totals.totalVat > 0 && (
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={5}>
                                    <Text style={{ color: "#1890ff" }}>VAT:</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={5} align="right">
                                    <Text style={{ color: "#1890ff" }}>
                                        KES {totals.totalVat.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                    </Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        )}
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={5}>
                                <Title level={5} style={{ margin: 0, color: isCredit ? "#389e0d" : "#cf1322" }}>
                                    Grand Total:
                                </Title>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="right">
                                <Title level={5} style={{ margin: 0, color: isCredit ? "#389e0d" : "#cf1322" }}>
                                    KES {totals.grandTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                </Title>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    </Table.Summary>
                )}
            />
        </Drawer>
        <BillDetailDrawer
            open={billDetailOpen}
            onClose={handleCloseBill}
            billId={selectedBillId}
            onOpenNote={(clickedNoteId) => {
                // Handle opening note from bill detail
                // If it's the same note, don't do anything
                if (clickedNoteId === noteId) return;
                
                // Open the note in a new drawer or navigate to it
                // For now, we'll just log it since we're already in a note drawer
                console.log('Open note from bill:', clickedNoteId);
            }}
        />
        </>
    );
};

export default NoteDetailDrawer;