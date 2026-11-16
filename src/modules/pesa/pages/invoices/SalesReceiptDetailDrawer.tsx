import React, { useState } from "react";
import {
    Drawer,
    Button,
    Space,
    Typography,
    Tag,
    Table,
    Alert,
    Popconfirm,
    message,
    Modal,
    Form,
    Select,
    Card as AntCard,
    Progress,
    Skeleton,
    Timeline,
    Tooltip,
} from "antd";
import {
    EditOutlined,
    CheckOutlined,
    StopOutlined,
    PrinterOutlined,
    AccountBookOutlined,
    DisconnectOutlined,
    UserOutlined,
    WalletOutlined,
    FileTextOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getSalesReceiptById,
    postSalesReceipt,
    fixVoidedJournalEntries,
    updateSalesReceipt,
    unlinkInvoiceFromSalesReceipt,
    SalesReceipt,
    SalesReceiptStatus,
} from "@services/accounting/salesReceipts";
import { getAllInvoices } from "@services/accounting/invoice";
import VoidReceiptModal from "./VoidReceiptModal";
import { downloadReceiptPdf } from "@utils/financeDocs";
import { useDocumentBusiness } from "@hooks/useDocumentBusiness";
import DocumentPdfButton from "@components/ExportTemplate/DocumentPdfButton";
import dayjs from "dayjs";

const { Text } = Typography;

// ── Presentation helpers ──────────────────────────────────────────────────────
const NUM: React.CSSProperties = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const fmt = (v?: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s?: string) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const STATUS_TONE: Record<SalesReceiptStatus, { color: string; tag: string }> = {
    Pending: { color: "#f59e0b", tag: "warning" },
    Posted: { color: "#16a34a", tag: "success" },
    Voided: { color: "#dc2626", tag: "error" },
};

const PAYMENT_LABEL: Record<string, string> = {
    Cash: "Cash", "M-Pesa": "M-Pesa", Card: "Card", Bank_Transfer: "Bank Transfer", Cheque: "Cheque", Other: "Other",
};

const Card: React.FC<{ title: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode }> = ({ title, extra, children }) => (
    <AntCard size="small" title={title} extra={extra} style={{ borderRadius: 10 }} styles={{ header: { minHeight: 40 } }}>
        {children}
    </AntCard>
);

const TotalRow: React.FC<{ label: React.ReactNode; value: React.ReactNode; muted?: boolean }> = ({ label, value, muted }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0", color: muted ? "#64748b" : undefined }}>
        <span>{label}</span>
        <span style={NUM}>{value}</span>
    </div>
);

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px dashed #f1f5f9" }}>
        <Text type="secondary" style={{ width: 120, flexShrink: 0, fontSize: 13 }}>{label}</Text>
        <div style={{ minWidth: 0 }}>{children}</div>
    </div>
);

const ActivityItem: React.FC<{ what: string; who: string; at: string }> = ({ what, who, at }) => (
    <div>
        <Text strong style={{ fontSize: 13 }}>{what}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}> · {who}</Text>
        {at && <div style={{ fontSize: 12, color: "#94a3b8" }}>{at}</div>}
    </div>
);

interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    receiptId: string | null;
    onEdit?: (id: string) => void;
    onSuccess: () => void;
}

const SalesReceiptDetailDrawer: React.FC<Props> = ({ open, setOpen, receiptId, onSuccess, onEdit }) => {
    const queryClient = useQueryClient();
    const business = useDocumentBusiness();
    const [linkInvoiceModalOpen, setLinkInvoiceModalOpen] = useState(false);
    const [linkInvoiceForm] = Form.useForm();

    const { data: receipt, isLoading } = useQuery({
        queryKey: ["sales-receipt", receiptId],
        queryFn: () => getSalesReceiptById(receiptId!),
        enabled: open && !!receiptId,
    });

    const { data: invoicesData } = useQuery({
        queryKey: ["invoices"],
        queryFn: () => getAllInvoices({ direction: "customer" }),
        enabled: linkInvoiceModalOpen,
        staleTime: 60_000,
    });

    const invoiceOptions = (invoicesData?.invoices || [])
        .filter((inv: any) => inv.status === "Pending" || inv.status === "Partially_Paid")
        .map((inv: any) => ({
            label: `${inv.order_no} - KES ${inv.grand_total?.toLocaleString()} (${inv.status})`,
            value: inv._id,
        }));

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

    const [voidOpen, setVoidOpen] = useState(false);

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

    const handleFixJournal = () => {
        fixJournalMutation.mutate();
    };

    const handleLinkInvoice = async (values: any) => {
        try {
            await updateSalesReceipt(receiptId!, { invoice_id: values.invoice_id });
            message.success("Receipt linked to invoice successfully");
            setLinkInvoiceModalOpen(false);
            linkInvoiceForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ["sales-receipt", receiptId] });
            onSuccess();
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to link invoice");
        }
    };

    const handleUnlinkInvoice = async () => {
        try {
            await unlinkInvoiceFromSalesReceipt(receiptId!);
            queryClient.invalidateQueries({ queryKey: ["sales-receipt", receiptId] });
            // Also invalidate the invoice query to update the invoice's salesReceipts array
            if (receipt?.invoice_id?._id) {
                queryClient.invalidateQueries({ queryKey: ["invoice", receipt.invoice_id._id] });
                queryClient.invalidateQueries({ queryKey: ["invoices"] });
            }
            onSuccess();
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to unlink invoice");
        }
    };

    // Posted receipts are editable too — the API voids the old journal entry and posts a replacement
    const canEdit = receipt?.status === "Pending" || receipt?.status === "Posted";
    const canPost = receipt?.status === "Pending";
    const canVoid = receipt?.status === "Pending" || receipt?.status === "Posted";
    const canLinkInvoice = receipt?.status === "Posted" && !receipt?.invoice_id;
    const canUnlinkInvoice = receipt?.status === "Posted" && receipt?.invoice_id;
    const needsJournalFix = receipt?.status === "Voided" && receipt?.journal_entry_id?.status === "Posted";

    if (isLoading) {
        return <Drawer open={open} onClose={() => setOpen(false)} title="Loading…"><Skeleton active paragraph={{ rows: 10 }} /></Drawer>;
    }

    if (!receipt) {
        return <Drawer open={open} onClose={() => setOpen(false)} title="Sales Receipt" />;
    }

    const r: any = receipt;
    const tone = STATUS_TONE[receipt.status];
    const customerName = receipt.customer_id?.customer_name || receipt.customer_name;
    const lines = receipt.lines || [];
    const hasVat = (receipt.total_vat || 0) > 0 || lines.some((l) => (l.vat_amount || 0) > 0);
    const hasDiscount = lines.some((l) => (l.discount || 0) > 0);
    const levy = receipt.catering_levy_amount || 0;
    const vatRateLabel = `${parseFloat(((receipt.vat_standard_rate || 0) * 100).toFixed(2))}%`;
    const project = typeof receipt.project_id === "object" ? receipt.project_id : null;
    const inv = receipt.invoice_id;
    const journal = receipt.journal_entry_id;
    const userName = (u: any) => u?.name || u?.username || "—";
    const when = (d?: string) => (d ? dayjs(d).format("DD MMM YYYY, HH:mm") : "");

    const vatLabel = (type?: string) =>
        type === "STANDARD" ? vatRateLabel : type === "ZERO" ? "0%" : type === "EXEMPT" ? "Exempt" : "—";

    const lineColumns = [
        {
            title: "Item", dataIndex: "description", key: "description",
            render: (v: string) => <Text>{v}</Text>,
        },
        { title: "Qty", dataIndex: "quantity", key: "quantity", width: 60, align: "right" as const },
        {
            title: "Price", dataIndex: "unit_price", key: "unit_price", width: 110, align: "right" as const,
            render: (v: number) => <span style={NUM}>{fmt(v)}</span>,
        },
        ...(hasDiscount ? [{
            title: "Disc.", dataIndex: "discount", key: "discount", width: 90, align: "right" as const,
            render: (v: number) => (v > 0 ? <span style={{ ...NUM, color: "#dc2626" }}>−{fmt(v)}</span> : <Text type="secondary">—</Text>),
        }] : []),
        ...(hasVat ? [{
            title: "VAT", key: "vat", width: 90, align: "right" as const,
            render: (_: any, l: any) => (
                <Tooltip title={l.vat_amount ? `VAT KES ${fmt(l.vat_amount)}` : undefined}>
                    <Text type={l.vat_type === "STANDARD" ? undefined : "secondary"} style={{ fontSize: 12 }}>{vatLabel(l.vat_type)}</Text>
                </Tooltip>
            ),
        }] : []),
        {
            title: "Total", dataIndex: "line_total", key: "line_total", width: 120, align: "right" as const,
            render: (v: number) => <Text strong style={NUM}>{fmt(v)}</Text>,
        },
    ];

    const handlePrint = () => {
        const rows = lines.map((l) => `<tr><td>${esc(l.description)}</td><td class="n">${l.quantity}</td><td class="n">${fmt(l.unit_price)}</td><td class="n">${fmt(l.line_total || 0)}</td></tr>`).join("");
        const totals = [
            ["Subtotal", fmt(receipt.subtotal)],
            ...(receipt.total_discount > 0 ? [["Discount", `−${fmt(receipt.total_discount)}`]] : []),
            ...(hasVat ? [[`VAT (${vatRateLabel}${receipt.vat_pricing_mode === "INCLUSIVE" ? ", incl." : ""})`, fmt(receipt.total_vat)]] : []),
            ...(levy > 0 ? [["Catering Levy", fmt(levy)]] : []),
        ].map(([k, v]) => `<tr><td colspan="3">${k}</td><td class="n">${v}</td></tr>`).join("");
        const w = window.open("", "_blank", "width=420,height=640");
        if (!w) return message.warning("Allow pop-ups to print the receipt");
        w.document.write(`<!doctype html><html><head><title>${esc(receipt.receipt_no)}</title><style>
            body{font-family:system-ui,sans-serif;font-size:12px;margin:24px;color:#111}
            h1{font-size:16px;margin:0}.muted{color:#666}table{width:100%;border-collapse:collapse;margin-top:12px}
            th,td{padding:4px 0;border-bottom:1px solid #eee;text-align:left}.n{text-align:right;font-variant-numeric:tabular-nums}
            .grand td{font-weight:700;font-size:14px;border-top:2px solid #111;border-bottom:none}
            ${receipt.status === "Voided" ? ".void{color:#b91c1c;font-weight:700;font-size:14px;margin-top:8px}" : ""}
        </style></head><body>
            <h1>Sales Receipt ${esc(receipt.receipt_no)}</h1>
            <div class="muted">${dayjs(receipt.receipt_date).format("DD MMM YYYY")} · ${esc(customerName || "Walk-in customer")}</div>
            <div class="muted">Paid with ${esc(PAYMENT_LABEL[receipt.payment_method] || receipt.payment_method)}${receipt.payment_reference ? ` · ${esc(receipt.payment_reference)}` : ""}</div>
            ${receipt.status === "Voided" ? `<div class="void">VOIDED</div>` : ""}
            <table><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Total</th></tr></thead>
            <tbody>${rows}${totals}<tr class="grand"><td colspan="3">Total (KES)</td><td class="n">${fmt(receipt.grand_total)}</td></tr></tbody></table>
            ${receipt.notes ? `<p class="muted">${esc(receipt.notes)}</p>` : ""}
        </body></html>`);
        w.document.close();
        w.focus();
        w.print();
    };

    return (
        <>
            <Drawer
            width={typeof window !== "undefined" ? Math.min(720, window.innerWidth) : 720}
            open={open}
            onClose={() => setOpen(false)}
            styles={{ body: { padding: 0, background: "#f8fafc" } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Text strong style={{ fontSize: 16, fontFamily: "monospace" }}>{receipt.receipt_no}</Text>
                    <Tag color={tone.tag} style={{ margin: 0, fontWeight: 600 }}>{receipt.status}</Tag>
                </div>
            }
            extra={
                <Space size={8}>
                    <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                    <DocumentPdfButton onDownload={(tpl) => downloadReceiptPdf(receipt, business, tpl)} />
                </Space>
            }
            footer={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div>
                        {canVoid && (
                            <Button danger type="text" icon={<StopOutlined />} onClick={() => setVoidOpen(true)}>
                                Void receipt
                            </Button>
                        )}
                    </div>
                    <Space wrap>
                        {canEdit && (
                            <Button icon={<EditOutlined />} onClick={() => onEdit?.(receipt._id)}>Edit</Button>
                        )}
                        {canPost && (
                            <Popconfirm
                                title="Post this receipt?"
                                description="Records the sale in the books with a journal entry."
                                onConfirm={handlePost}
                                okText="Post"
                            >
                                <Button type="primary" icon={<CheckOutlined />} loading={postMutation.isLoading}>
                                    Post to Books
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>
                </div>
            }
        >
            {/* ── Summary ─────────────────────────────────────────────── */}
            <div style={{ background: "#fff", padding: "20px 24px", borderBottom: "1px solid #e2e8f0", borderLeft: `4px solid ${tone.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(receipt.receipt_date).format("dddd, DD MMM YYYY")}
                        </Text>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <UserOutlined style={{ color: "#94a3b8" }} />
                            <Text strong style={{ fontSize: 15 }}>{customerName || "Walk-in customer"}</Text>
                        </div>
                        {receipt.customer_id?.phone && (
                            <Text type="secondary" style={{ fontSize: 12, display: "block", marginLeft: 22 }}>{receipt.customer_id.phone}</Text>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            <WalletOutlined style={{ color: "#94a3b8" }} />
                            <Text>{PAYMENT_LABEL[receipt.payment_method] || receipt.payment_method}</Text>
                            {receipt.payment_reference && (
                                <Text code copyable style={{ fontSize: 12 }}>{receipt.payment_reference}</Text>
                            )}
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Total</Text>
                        <div style={{
                            fontSize: 26, fontWeight: 700, lineHeight: 1.2, ...NUM,
                            color: receipt.status === "Voided" ? "#94a3b8" : "#0f172a",
                            textDecoration: receipt.status === "Voided" ? "line-through" : undefined,
                        }}>
                            KES {fmt(receipt.grand_total)}
                        </div>
                    </div>
                </div>

                {receipt.status === "Pending" && (
                    <Alert
                        type="warning" showIcon style={{ marginTop: 16 }}
                        message="Not yet in the books"
                        description="Post this receipt to record the revenue, tax and cash in the ledger."
                    />
                )}
                {receipt.status === "Voided" && (
                    <Alert
                        type="error" showIcon style={{ marginTop: 16 }}
                        message={`Voided${r.voided_at ? ` on ${when(r.voided_at)}` : ""}`}
                        description={
                            <>
                                {r.void_reason && <div>Reason: {r.void_reason}</div>}
                                {needsJournalFix && (
                                    <div style={{ marginTop: 8 }}>
                                        Its journal entry is still posted.{" "}
                                        <Popconfirm
                                            title="Void the journal entry?"
                                            description="Removes this voided receipt from the ledger."
                                            onConfirm={handleFixJournal}
                                            okText="Void entry"
                                        >
                                            <Button size="small" danger loading={fixJournalMutation.isLoading}>Fix journal entry</Button>
                                        </Popconfirm>
                                    </div>
                                )}
                            </>
                        }
                    />
                )}
            </div>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* ── Items & totals ──────────────────────────────────── */}
                <Card title={`Items (${lines.length})`}>
                    <Table
                        dataSource={lines}
                        columns={lineColumns}
                        rowKey={(l: any, i) => l._id || String(i)}
                        pagination={false}
                        size="small"
                        scroll={{ x: 480 }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                        <div style={{ width: "100%", maxWidth: 300 }}>
                            <TotalRow label="Subtotal" value={fmt(receipt.subtotal)} />
                            {receipt.total_discount > 0 && <TotalRow label="Discounts" value={`−${fmt(receipt.total_discount)}`} muted />}
                            {hasVat && (
                                <TotalRow
                                    label={`VAT ${vatRateLabel}${receipt.vat_pricing_mode === "INCLUSIVE" ? " (included in prices)" : ""}`}
                                    value={fmt(receipt.total_vat)}
                                />
                            )}
                            {levy > 0 && (
                                <TotalRow label={`Catering Levy ${parseFloat(((receipt.catering_levy_rate || 0) * 100).toFixed(2))}%`} value={fmt(levy)} />
                            )}
                            {receipt.catering_levy_exempt && <TotalRow label="Catering Levy" value="Exempt" muted />}
                            <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 6, paddingTop: 8 }}>
                                <TotalRow label={<Text strong>Total</Text>} value={<Text strong style={{ fontSize: 15 }}>KES {fmt(receipt.grand_total)}</Text>} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* ── Linked invoice ──────────────────────────────────── */}
                {(inv || canLinkInvoice) && (
                    <Card
                        title="Linked Invoice"
                        extra={
                            canUnlinkInvoice ? (
                                <Popconfirm
                                    title="Unlink from invoice?"
                                    description="The invoice will no longer count this receipt as a payment."
                                    onConfirm={handleUnlinkInvoice}
                                    okText="Unlink"
                                >
                                    <Button size="small" type="text" icon={<DisconnectOutlined />}>Unlink</Button>
                                </Popconfirm>
                            ) : null
                        }
                    >
                        {inv ? (
                            <>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <Space size={8}>
                                        <FileTextOutlined style={{ color: "#94a3b8" }} />
                                        <Text strong>{inv.order_no}</Text>
                                        <Tag color={inv.status === "Paid" ? "success" : inv.status === "Partially_Paid" ? "warning" : "default"} style={{ margin: 0 }}>
                                            {String(inv.status).replace(/_/g, " ")}
                                        </Tag>
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Invoice total KES {fmt(inv.grand_total)}</Text>
                                </div>
                                <Progress
                                    percent={inv.grand_total ? Math.min(100, Math.round((inv.amount_paid / inv.grand_total) * 100)) : 0}
                                    size="small" showInfo={false} strokeColor="#16a34a" style={{ margin: "10px 0 4px" }}
                                />
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                    <Text type="secondary">Paid KES {fmt(inv.amount_paid)}</Text>
                                    <Text type={inv.amount_due > 0 ? "danger" : "secondary"}>Due KES {fmt(inv.amount_due)}</Text>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <Text type="secondary">Use this receipt as payment for an open customer invoice.</Text>
                                <Button size="small" icon={<AccountBookOutlined />} onClick={() => setLinkInvoiceModalOpen(true)}>
                                    Link to Invoice
                                </Button>
                            </div>
                        )}
                    </Card>
                )}

                {/* ── Accounting ──────────────────────────────────────── */}
                <Card title="Accounting">
                    <InfoRow label="Journal entry">
                        {journal ? (
                            <Space size={6}>
                                <Text code>{journal.entry_no}</Text>
                                <Tag color={journal.status === "Posted" ? "success" : journal.status === "Voided" ? "error" : "default"} style={{ margin: 0 }}>
                                    {journal.status}
                                </Tag>
                            </Space>
                        ) : (
                            <Text type="secondary">{receipt.status === "Pending" ? "Created when posted" : "None"}</Text>
                        )}
                    </InfoRow>
                    <InfoRow label="VAT">
                        {hasVat
                            ? `${vatRateLabel} · prices ${receipt.vat_pricing_mode === "INCLUSIVE" ? "include" : "exclude"} VAT`
                            : <Text type="secondary">Not charged</Text>}
                    </InfoRow>
                    {project && <InfoRow label="Project">{project.name}</InfoRow>}
                </Card>

                {/* ── Notes ───────────────────────────────────────────── */}
                {receipt.notes && (
                    <Card title="Notes">
                        <Text style={{ whiteSpace: "pre-wrap" }}>{receipt.notes}</Text>
                    </Card>
                )}

                {/* ── Activity ────────────────────────────────────────── */}
                <Card title="Activity">
                    <Timeline
                        style={{ marginTop: 8, marginBottom: -16 }}
                        items={[
                            { color: "gray", children: <ActivityItem what="Created" who={userName(receipt.created_by)} at={when(receipt.createdAt)} /> },
                            ...(receipt.posted_at ? [{ color: "green", children: <ActivityItem what="Posted to books" who={userName(receipt.posted_by)} at={when(receipt.posted_at)} /> }] : []),
                            ...(r.voided_at ? [{ color: "red", children: <ActivityItem what="Voided" who={userName(r.voided_by)} at={when(r.voided_at)} /> }] : []),
                        ]}
                    />
                </Card>
            </div>
        </Drawer>

        {/* Link Invoice Modal */}
        <Modal
            title="Link to Invoice"
            open={linkInvoiceModalOpen}
            onCancel={() => setLinkInvoiceModalOpen(false)}
            onOk={() => linkInvoiceForm.submit()}
            okText="Link Invoice"
        >
            <Form form={linkInvoiceForm} layout="vertical" onFinish={handleLinkInvoice}>
                <Form.Item
                    name="invoice_id"
                    label="Select Invoice"
                    rules={[{ required: true, message: "Please select an invoice" }]}
                >
                    <Select
                        options={invoiceOptions}
                        placeholder="Select an invoice to link this payment to"
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>
                <Alert
                    message="Linking this receipt to an invoice will update the invoice's payment status and amount due."
                    type="info"
                    showIcon
                />
            </Form>
        </Modal>

        <VoidReceiptModal
            receipt={voidOpen ? receipt : null}
            onClose={() => setVoidOpen(false)}
            onVoided={() => {
                queryClient.invalidateQueries({ queryKey: ["sales-receipt", receiptId] });
                queryClient.invalidateQueries({ queryKey: ["invoices"] });
                onSuccess();
            }}
        />
        </>
    );
};

export default SalesReceiptDetailDrawer;
