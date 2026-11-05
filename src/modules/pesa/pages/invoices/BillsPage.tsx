import React, { useEffect, useMemo, useState } from "react";
import {
    Button, Spin, Table, Typography, Tag, Modal,
    Form, InputNumber, Select, Input, App, Popconfirm, Tooltip, Space,
} from "antd";
import {
    FileTextOutlined, PlusOutlined, DollarOutlined,
    StopOutlined, MoreOutlined, EyeOutlined, EditOutlined, SearchOutlined, CopyOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import BillFormModal from "@modules/duka/pages/orders/components/BillFormModal";
import ProjectTagCell from "@components/accounting/ProjectTagCell";
import {
    getAllBills, getBillSummary, getBillById, recordBillPayment, voidBill,
    BILL_EDITABLE_STATUSES, billEditLockReason,
    type Bill, type BillStatus,
} from "@services/accounting/bill";
import BillDetailDrawer from "./components/BillDetailDrawer";
import DocumentPdfButton from "@components/ExportTemplate/DocumentPdfButton";
import { downloadBillPdf } from "@utils/financeDocs";
import { useDocumentBusiness } from "@hooks/useDocumentBusiness";
import type { ExportTemplateId } from "@utils/exportTemplates";
import NoteDetailDrawer from "./NoteDetailDrawer";
import { fetchAllPaymentMethods } from "@services/paymentMethod";
import { getAllAccounts } from "@services/accounting/accounts";
import { THEME_C } from "@utils/getPrimaryColor";
import { fetchAllSuppliers } from "@services/supplier";
import PeriodFilter, { defaultPeriod, periodRange, isDefaultPeriod, type PeriodValue } from "@components/PeriodFilter";

const { Text } = Typography;

const C = THEME_C;

const BILL_STATUS_OPTIONS: { label: string; value: BillStatus }[] = [
    { label: "Draft", value: "Draft" },
    { label: "Pending", value: "Pending" },
    { label: "Partially Paid", value: "Partially_Paid" },
    { label: "Overdue", value: "Overdue" },
    { label: "Paid", value: "Paid" },
    { label: "Voided", value: "Voided" },
    { label: "Cancelled", value: "Cancelled" },
];

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SummaryCard: React.FC<{ label: string; value: string; color: string; bg: string }> = ({
    label, value, color, bg,
}) => (
    <div style={{
        flex: "1 1 130px", background: bg,
        border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`,
        borderRadius: 8, padding: "10px 14px",
    }}>
        <Text style={{
            fontSize: 10, color: C.subText, textTransform: "uppercase",
            letterSpacing: "0.4px", fontWeight: 700, display: "block", marginBottom: 4,
        }}>{label}</Text>
        <Text strong style={{ fontSize: 14, color }}>{value}</Text>
    </div>
);

const STATUS_CFG: Record<BillStatus, { color: string; label: string }> = {
    Draft: { color: "default", label: "Draft" },
    Pending: { color: "orange", label: "Pending" },
    Partially_Paid: { color: "blue", label: "Partial" },
    Paid: { color: "green", label: "Paid" },
    Overdue: { color: "red", label: "Overdue" },
    Voided: { color: "default", label: "Voided" },
    Cancelled: { color: "default", label: "Cancelled" },
};

const PAYABLE_STATUSES: BillStatus[] = ["Pending", "Partially_Paid", "Overdue"];
const VOIDABLE_STATUSES: BillStatus[] = ["Pending", "Partially_Paid", "Overdue", "Draft"];
// Mirrors the API's updateBill rule — only Paid / Voided / Cancelled bills are locked
const EDITABLE_STATUSES = BILL_EDITABLE_STATUSES;
const editLockReason = billEditLockReason;

// ── Payment modal ─────────────────────────────────────────────────────────────
const BillPaymentModal: React.FC<{
    bill: Bill | null;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ bill, open, onClose, onSuccess }) => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const { data: methodsData } = useQuery({
        queryKey: ["payment-methods"],
        queryFn: () => fetchAllPaymentMethods({}),
        enabled: open,
    });
    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: () => getAllAccounts({}),
        enabled: open,
    });

    const methodOptions = (methodsData || []).map((m: any) => ({
        label: m.name, value: m._id,
    }));
    const assetAccountOptions = (accountsData?.accounts || [])
        .filter((a: any) => a.account_type === "ASSET" && a.is_active)
        .map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    const amountDue = bill?.amount_due ?? bill?.grand_total ?? 0;

    const mutation = useMutation({
        mutationFn: (values: any) =>
            recordBillPayment(bill!._id, {
                amount: values.amount,
                method_id: values.method_id,
                account_id: values.account_id,
                reference: values.reference,
                notes: values.notes,
            }),
        onSuccess: () => {
            message.success("Payment recorded");
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            queryClient.invalidateQueries({ queryKey: ["bill-summary"] });
            form.resetFields();
            onSuccess();
            onClose();
        },
    });

    return (
        <Modal
            open={open}
            onCancel={() => { form.resetFields(); onClose(); }}
            title={
                <Space>
                    <DollarOutlined style={{ color: C.green }} />
                    <span>Record Payment — {bill?.bill_no}</span>
                </Space>
            }
            footer={[
                <Button key="cancel" onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>,
                <Button
                    key="pay" type="primary" loading={mutation.isPending}
                    style={{ background: C.green, borderColor: C.green }}
                    onClick={() => form.validateFields().then((v) => mutation.mutate(v))}
                >
                    Record Payment
                </Button>,
            ]}
            destroyOnClose
            width={480}
        >
            <div style={{
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
                <Text style={{ fontSize: 12, color: C.subText }}>Amount Due</Text>
                <Text strong style={{ fontSize: 15, color: C.green }}>KES {fmt(amountDue)}</Text>
            </div>

            <Form form={form} layout="vertical" initialValues={{ amount: amountDue }}>
                <Form.Item name="method_id" label="Payment Method" rules={[{ required: true }]}>
                    <Select showSearch placeholder="M-Pesa / Bank / Cash"
                        options={methodOptions} optionFilterProp="label" />
                </Form.Item>
                <Form.Item name="account_id" label="Payment Account" rules={[{ required: true, message: "Select payment account" }]}>
                    <Select showSearch placeholder="Bank / Cash account"
                        options={assetAccountOptions} optionFilterProp="label" />
                </Form.Item>
                <Form.Item
                    name="amount" label="Amount (KES)"
                    rules={[{ required: true }, { type: "number", min: 0.01, max: amountDue }]}
                >
                    <InputNumber
                        style={{ width: "100%" }} min={0.01} max={amountDue} precision={2}
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        parser={(v) => v!.replace(/,/g, "") as any}
                    />
                </Form.Item>
                <Form.Item name="reference" label="Reference / Transaction Code">
                    <Input placeholder="M-Pesa code, cheque no..." />
                </Form.Item>
                <Form.Item name="notes" label="Notes">
                    <Input placeholder="Optional" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

// ── Void modal ────────────────────────────────────────────────────────────────
const VoidBillModal: React.FC<{
    bill: Bill | null;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ bill, open, onClose, onSuccess }) => {
    const [reason, setReason] = useState("");
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => voidBill(bill!._id, reason),
        onSuccess: () => {
            message.success("Bill voided");
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            queryClient.invalidateQueries({ queryKey: ["bill-summary"] });
            setReason("");
            onSuccess();
            onClose();
        },
    });

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={<Space><StopOutlined style={{ color: C.red }} /><span>Void Bill — {bill?.bill_no}</span></Space>}
            footer={[
                <Button key="cancel" onClick={onClose}>Cancel</Button>,
                <Button key="void" danger loading={mutation.isPending}
                    disabled={!reason.trim()}
                    onClick={() => mutation.mutate()}>
                    Void Bill
                </Button>,
            ]}
            destroyOnClose
            width={420}
        >
            <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                This will reverse the journal entry. This action cannot be undone.
            </Text>
            <Input.TextArea
                rows={3}
                placeholder="Reason for voiding (required)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
            />
        </Modal>
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────
function BillsPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [payTarget, setPayTarget] = useState<Bill | null>(null);
    const [voidTarget, setVoidTarget] = useState<Bill | null>(null);
    const [editTarget, setEditTarget] = useState<Bill | null>(null);
    // Bill whose details pre-fill a new bill (Clone)
    const [cloneTarget, setCloneTarget] = useState<Bill | null>(null);
    const [viewTarget, setViewTarget] = useState<Bill | null>(null);
    const [noteDetailOpen, setNoteDetailOpen] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    // ── Filters ─────────────────────────────────────────────────────────────
    // Period: a month / calendar quarter / year picked with one picker, or a custom range
    const [period, setPeriod] = useState<PeriodValue>(defaultPeriod);
    const [statusFilter, setStatusFilter] = useState<BillStatus | undefined>();
    const [supplierFilter, setSupplierFilter] = useState<string | undefined>();
    const [supplierSearch, setSupplierSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    // Debounce the free-text search so each keystroke doesn't refetch
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const dateRange = useMemo(() => periodRange(period), [period]);
    const from = dateRange[0].format("YYYY-MM-DD");
    const to = dateRange[1].format("YYYY-MM-DD");

    const filtersActive = !!(statusFilter || supplierFilter || search) || !isDefaultPeriod(period);
    const clearFilters = () => {
        setStatusFilter(undefined);
        setSupplierFilter(undefined);
        setSearchInput("");
        setSearch("");
        setPeriod(defaultPeriod());
        setPage(1);
    };

    const { data: suppliersData, isFetching: suppliersFetching } = useQuery({
        queryKey: ["suppliers-dropdown-bills-filter", supplierSearch],
        queryFn: () => fetchAllSuppliers({ name: supplierSearch }),
        select: (res: any) => (Array.isArray(res) ? res : res?.suppliers || res?.data || []),
        staleTime: 30_000,
    });
    const supplierOptions = (suppliersData || []).map((s: any) => ({ label: s.name, value: s._id }));

    const queryClient = useQueryClient();
    const business = useDocumentBusiness();
    // Table rows don't carry every detail — fetch the full bill for its PDF
    const downloadRowPdf = async (row: Bill, tpl: ExportTemplateId) => {
        const { bill } = await queryClient.fetchQuery({ queryKey: ["bill", row._id], queryFn: () => getBillById(row._id) });
        await downloadBillPdf(bill, business, tpl);
    };

    const { data, isLoading } = useQuery({
        queryKey: ["bills", page, from, to, statusFilter, supplierFilter, search],
        queryFn: () => getAllBills({
            page, limit: 10, from, to,
            status: statusFilter,
            supplier_id: supplierFilter,
            search: search || undefined,
        }),
    });

    const { data: summaryData } = useQuery({
        queryKey: ["bill-summary", from, to, supplierFilter],
        queryFn: () => getBillSummary({ from, to, supplier_id: supplierFilter }),
    });

    const bills: Bill[] = data?.bills || [];
    const total = data?.total || 0;
    const overdueCount = summaryData?.overdue_count || 0;
    // The summary is grouped by status, so a status filter is applied here
    const summaryRows = (summaryData?.summary || []).filter((r) => !statusFilter || r._id === statusFilter);
    const totalBills = summaryRows.reduce((s, r) => s + r.total_value, 0);
    const totalPaid = summaryRows.filter((r) => r._id === "Paid").reduce((s, r) => s + r.total_paid, 0);
    const totalOutstanding = summaryRows.reduce((s, r) => s + r.total_due, 0);

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["bills"] });
        queryClient.invalidateQueries({ queryKey: ["bill-summary"] });
    };

    const columns = [
        {
            title: "Bill Date", dataIndex: "bill_date", width: 110,
            render: (v: string) => (
                <Text style={{ fontSize: 12, color: C.subText }}>{dayjs(v).format("DD MMM YYYY")}</Text>
            ),
        },
        {
            title: "Bill No", dataIndex: "bill_no", width: 130,
            render: (v: string) => (
                <Text style={{ fontSize: 11, fontFamily: "monospace", color: C.subText }}>{v}</Text>
            ),
        },
        {
            title: "Supplier", dataIndex: "supplier_id",
            render: (s: any, row: Bill) => {
                const name = s?.name || row.supplier_name;
                return name
                    ? <Text style={{ fontSize: 12, fontWeight: 500 }}>{name}</Text>
                    : <Text style={{ color: C.subText }}>—</Text>;
            },
        },
        {
            title: "Description",
            render: (_: any, row: Bill) => {
                const desc = row.bill_lines?.[0]?.description || row.notes;
                return desc
                    ? <Text style={{ fontSize: 12 }}>{desc}</Text>
                    : <Text style={{ color: C.subText }}>—</Text>;
            },
        },
        {
            title: "Due Date", dataIndex: "due_date", width: 110,
            render: (v: string) => v ? (
                <Text style={{
                    fontSize: 12,
                    color: dayjs(v).isBefore(dayjs()) ? C.red : C.subText,
                    fontWeight: dayjs(v).isBefore(dayjs()) ? 600 : 400,
                }}>
                    {dayjs(v).format("DD MMM YYYY")}
                </Text>
            ) : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Status", dataIndex: "status", width: 100,
            render: (s: BillStatus) => {
                const cfg = STATUS_CFG[s] || { color: "default", label: s };
                return (
                    <Tag color={cfg.color} style={{ fontSize: 11, fontWeight: 600 }}>
                        {cfg.label}
                    </Tag>
                );
            },
        },
        {
            title: "Amount", dataIndex: "grand_total", align: "right" as const, width: 120,
            render: (v: number) => (
                <Text strong style={{ color: C.purple, fontSize: 13 }}>KES {fmt(v)}</Text>
            ),
        },
        {
            title: "Paid", dataIndex: "amount_paid", align: "right" as const, width: 110,
            render: (v: number) => v
                ? <Text style={{ fontSize: 12, color: C.green }}>{fmt(v)}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Due", dataIndex: "amount_due", align: "right" as const, width: 110,
            render: (v: number) => v
                ? <Text strong style={{ color: C.red, fontSize: 12 }}>{fmt(v)}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "JE", dataIndex: "journal_entry_id", width: 150,
            render: (je: any) => je ? (
                <span style={{
                    background: je.status === "Posted" ? "#f0fdf4" : "#fffbeb",
                    color: je.status === "Posted" ? C.green : C.orange,
                    border: `1px solid ${je.status === "Posted" ? "#bbf7d0" : "#fde68a"}`,
                    borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                }}>
                    {je.entry_no}
                </span>
            ) : <span style={{ color: C.subText, fontSize: 12 }}>—</span>,
        },
        {
            title: "Project", key: "project", width: 180,
            render: (_: any, r: any) => (
                <ProjectTagCell
                    docType="bill"
                    docId={r._id}
                    value={r.project_id}
                    disabled={["Voided", "Cancelled"].includes(r.status)}
                    invalidate={["bills", "bill", "journal-entries"]}
                />
            ),
        },
        {
            title: "Actions", key: "actions", width: 285, fixed: "right" as const,
            render: (_: any, row: Bill) => {
                const canPay = PAYABLE_STATUSES.includes(row.status);
                const canVoid = VOIDABLE_STATUSES.includes(row.status);
                const canEdit = EDITABLE_STATUSES.includes(row.status);
                return (
                    <Space size={4}>
                        <Tooltip title="View Bill Details">
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => setViewTarget(row)}
                            />
                        </Tooltip>
                        <DocumentPdfButton compact onDownload={(tpl) => downloadRowPdf(row, tpl)} />
                        <Tooltip title={canEdit ? "Edit Bill" : editLockReason(row.status)}>
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                disabled={!canEdit}
                                style={canEdit ? { background: "#1890ff", borderColor: "#1890ff", color: "#fff" } : undefined}
                                onClick={() => setEditTarget(row)}
                            />
                        </Tooltip>
                        <Tooltip title="Clone — new bill with these details">
                            <Button
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => setCloneTarget(row)}
                            />
                        </Tooltip>
                        {canPay && (
                            <Tooltip title="Record Payment">
                                <Button
                                    size="small" type="primary"
                                    icon={<DollarOutlined />}
                                    style={{ background: C.green, borderColor: C.green }}
                                    onClick={() => setPayTarget(row)}
                                />
                            </Tooltip>
                        )}
                        {canVoid && (
                            <Tooltip title="Void Bill">
                                <Button
                                    size="small" danger
                                    icon={<StopOutlined />}
                                    onClick={() => setVoidTarget(row)}
                                />
                            </Tooltip>
                        )}
                        {!canPay && !canVoid && !canEdit && (
                            <Text style={{ fontSize: 11, color: C.subText }}>
                                {row.status}
                            </Text>
                        )}
                    </Space>
                );
            },
        },
    ];

    return (
        <App>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 10,
                    padding: "14px 18px", background: C.bg, borderBottom: `1px solid ${C.border}`,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            background: "#f5f3ff", borderRadius: 8,
                            padding: "5px 7px", color: C.purple, fontSize: 16, lineHeight: 1,
                        }}>
                            <FileTextOutlined />
                        </div>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Supplier Bills</Text>
                        {overdueCount > 0 && (
                            <Tag color="red" style={{ fontSize: 11, fontWeight: 600 }}>
                                {overdueCount} Overdue
                            </Tag>
                        )}
                    </div>
                </div>

                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", flexWrap: "wrap", gap: 10,
                    }}>
                        <PeriodFilter value={period} onChange={(p) => { setPeriod(p); setPage(1); }} />
                        <Button
                            type="primary" icon={<PlusOutlined />}
                            onClick={() => setModalOpen(true)}
                            style={{ background: C.purple, borderColor: C.purple, borderRadius: 8, fontWeight: 600 }}
                        >
                            Create Supplier Bill
                        </Button>
                    </div>

                    {/* ── Status / supplier / search filters ── */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Select
                            allowClear
                            placeholder="All statuses"
                            value={statusFilter}
                            onChange={(v) => { setStatusFilter(v); setPage(1); }}
                            style={{ width: 170 }}
                            options={BILL_STATUS_OPTIONS}
                        />
                        <Select
                            allowClear
                            showSearch
                            placeholder="All suppliers"
                            value={supplierFilter}
                            onChange={(v) => { setSupplierFilter(v); setPage(1); }}
                            onSearch={setSupplierSearch}
                            filterOption={false}
                            loading={suppliersFetching}
                            options={supplierOptions}
                            notFoundContent={suppliersFetching ? "Searching…" : "No suppliers"}
                            style={{ width: 240 }}
                        />
                        <Input
                            allowClear
                            prefix={<SearchOutlined style={{ color: C.subText }} />}
                            placeholder="Bill no, supplier ref or supplier"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            style={{ width: 260, borderRadius: 8 }}
                        />
                        {filtersActive && (
                            <Button type="link" onClick={clearFilters} style={{ paddingInline: 4 }}>
                                Clear filters
                            </Button>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <SummaryCard label="Total Bills" value={`KES ${fmt(totalBills)}`} color={C.purple} bg="#f5f3ff" />
                        <SummaryCard label="Paid" value={`KES ${fmt(totalPaid)}`} color={C.green} bg="#f0fdf4" />
                        <SummaryCard label="Outstanding" value={`KES ${fmt(totalOutstanding)}`} color={C.red} bg="#fef2f2" />
                    </div>

                    <Spin spinning={isLoading}>
                        <Table
                            rowKey="_id"
                            dataSource={bills}
                            columns={columns}
                            size="small"
                            pagination={{
                                current: page, total, pageSize: 10, onChange: setPage,
                                showTotal: (t) => `${t} entries`,
                                style: { marginBottom: 0 },
                            }}
                            scroll={{ x: 1300 }}
                            style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}
                        />
                    </Spin>
                </div>
            </div>

            <BillFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={refresh}
            />

            <BillFormModal
                open={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSuccess={refresh}
                billToEdit={editTarget}
            />

            <BillFormModal
                open={!!cloneTarget}
                onClose={() => setCloneTarget(null)}
                onSuccess={refresh}
                billToClone={cloneTarget}
            />

            <BillPaymentModal
                bill={payTarget}
                open={!!payTarget}
                onClose={() => setPayTarget(null)}
                onSuccess={refresh}
            />

            <VoidBillModal
                bill={voidTarget}
                open={!!voidTarget}
                onClose={() => setVoidTarget(null)}
                onSuccess={refresh}
            />

            <BillDetailDrawer
                open={!!viewTarget}
                onClose={() => setViewTarget(null)}
                billId={viewTarget?._id || null}
                onEdit={(bill) => {
                    // Close the drawer and open the edit form on the freshly loaded bill
                    setViewTarget(null);
                    setEditTarget(bill);
                }}
                onClone={(bill) => {
                    setViewTarget(null);
                    setCloneTarget(bill);
                }}
                onOpenNote={(noteId) => {
                    setSelectedNoteId(noteId);
                    setNoteDetailOpen(true);
                }}
            />

            <NoteDetailDrawer
                open={noteDetailOpen}
                onClose={() => {
                    setNoteDetailOpen(false);
                    setSelectedNoteId(null);
                }}
                noteId={selectedNoteId}
                onSuccess={() => {
                    // Refresh the data when note is updated
                    refresh();
                }}
            />
        </App>
    );
}

export default BillsPage;