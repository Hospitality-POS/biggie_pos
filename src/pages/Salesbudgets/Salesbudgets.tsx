import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
    AuditOutlined, CheckOutlined, CloseOutlined,
    EditOutlined, EyeOutlined, MoreOutlined, PlusOutlined, SendOutlined,
} from "@ant-design/icons";
import {
    App, Button, DatePicker, Drawer, Dropdown, Form,
    Input, InputNumber, Modal, Select, Tag, Typography,
} from "antd";
import { useAppDispatch } from "../../store";
import {
    fetchAllSalesBudgets, createSalesBudget, updateSalesBudget,
    submitSalesBudget, approveSalesBudget,
    SalesBudget, BudgetStatus, BudgetPeriod,
} from "@services/crm/salesBudgets";
import { fetchAllCampaigns } from "@services/crm/campaigns";
import { fetchAllDepartments } from "@services/crm/departments";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    orange: "#f59e0b",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const STATUS_CFG: Record<BudgetStatus, { color: string; bg: string; border: string }> = {
    draft: { color: C.subText, bg: C.bg, border: C.border },
    submitted: { color: C.blue, bg: "#eff6ff", border: "#bfdbfe" },
    approved: { color: C.green, bg: "#f0fdf4", border: "#bbf7d0" },
    rejected: { color: C.red, bg: "#fef2f2", border: "#fecaca" },
    locked: { color: "#8b5cf6", bg: "#faf5ff", border: "#e9d5ff" },
};
const PERIODS: BudgetPeriod[] = ["monthly", "quarterly", "annual", "custom"];

const StatusPill = ({ status }: { status: BudgetStatus }) => {
    const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
    return (
        <span style={{ display: "inline-flex", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
            {status.toUpperCase()}
        </span>
    );
};

const VarianceText = ({ value }: { value?: number | null }) => {
    if (value == null) return <Text style={{ fontSize: 12, color: C.subText }}>—</Text>;
    const pos = value >= 0;
    return <Text style={{ fontSize: 12, color: pos ? C.green : C.red, fontWeight: 600 }}>{pos ? "+" : ""}KES {value.toLocaleString()}</Text>;
};

// ── Table ─────────────────────────────────────────────────────────────────────
export interface SalesBudgetTableHandle { reload: () => void }
interface SalesBudgetTableProps { onView: (b: SalesBudget) => void; onEdit: (b: SalesBudget) => void }

const SalesBudgetTable = forwardRef<SalesBudgetTableHandle, SalesBudgetTableProps>(
    ({ onView, onEdit }, ref) => {
        const actionRef = useRef<ActionType>();
        useImperativeHandle(ref, () => ({ reload: () => actionRef.current?.reload() }));

        const columns = [
            {
                title: "Budget", dataIndex: "name",
                render: (name: string, r: SalesBudget) => (
                    <div>
                        <Text strong style={{ fontSize: 12 }}>{name}</Text>
                        <Text style={{ fontSize: 11, color: C.subText, display: "block", textTransform: "capitalize" }}>{r.period}</Text>
                    </div>
                ),
            },
            { title: "Status", dataIndex: "status", search: false, render: (s: BudgetStatus) => <StatusPill status={s} /> },
            {
                title: "Campaign", dataIndex: "campaign_id", search: false,
                render: (c: any) => c
                    ? <Text style={{ fontSize: 11, color: C.subText }}>{c.name ?? c}</Text>
                    : <Text style={{ fontSize: 11, color: "#94a3b8" }}>—</Text>,
            },
            {
                title: "Department", dataIndex: "department_id", search: false,
                render: (d: any) => d
                    ? <Text style={{ fontSize: 11, color: "#8b5cf6" }}>{d.name ?? d}</Text>
                    : <Text style={{ fontSize: 11, color: "#94a3b8" }}>—</Text>,
            },
            { title: "Budgeted", dataIndex: "budgeted_revenue", search: false, render: (v: number) => <Text style={{ fontSize: 12 }}>{v ? `KES ${v.toLocaleString()}` : "—"}</Text> },
            { title: "Actual", dataIndex: "actual_revenue", search: false, render: (v: number) => <Text style={{ fontSize: 12, color: C.green }}>{v ? `KES ${v.toLocaleString()}` : "—"}</Text> },
            { title: "Variance", key: "variance", search: false, render: (_: any, r: SalesBudget) => <VarianceText value={r.revenue_variance} /> },
            {
                title: "Period", key: "period", search: false,
                render: (_: any, r: SalesBudget) => (
                    <Text style={{ fontSize: 11, color: C.subText }}>
                        {new Date(r.period_start).toLocaleDateString("en-GB")} — {new Date(r.period_end).toLocaleDateString("en-GB")}
                    </Text>
                ),
            },
            {
                title: "Actions", key: "actions", search: false, fixed: "right" as const, width: 56,
                render: (_: any, r: SalesBudget) => (
                    <Dropdown trigger={["click"]} menu={{
                        items: [
                            { key: "view", icon: <EyeOutlined />, label: "View Details", onClick: () => onView(r) },
                            ...(!["approved", "locked"].includes(r.status)
                                ? [{ key: "edit", icon: <EditOutlined />, label: "Edit Budget", onClick: () => onEdit(r) }]
                                : []),
                        ]
                    }}>
                        <Button type="text" icon={<MoreOutlined />} style={{ borderRadius: 6 }} />
                    </Dropdown>
                ),
            },
        ];

        return (
            <App>
                <ProTable<SalesBudget>
                    rowKey="_id" columns={columns} actionRef={actionRef}
                    request={async (params) => {
                        const res = await fetchAllSalesBudgets(params as any);
                        return { data: res.budgets, success: true, total: res.total };
                    }}
                    cardBordered={false}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto" }}
                    headerTitle={
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <AuditOutlined style={{ color: C.primary }} />
                            <Text strong style={{ fontSize: 14 }}>Sales Budgets</Text>
                        </div>
                    }
                    options={{ reload: () => actionRef.current?.reload() }}
                    scroll={{ x: "100%" }} size="small"
                />
            </App>
        );
    }
);
SalesBudgetTable.displayName = "SalesBudgetTable";

// ── Form Modal ────────────────────────────────────────────────────────────────
interface SalesBudgetFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    budget?: SalesBudget | null;
    mode?: "add" | "edit";
}

const SalesBudgetFormModal: React.FC<SalesBudgetFormModalProps> = ({
    visible, onClose, onSuccess, budget, mode = "add",
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const dispatch = useAppDispatch();
    const isEdit = mode === "edit";
    const shop_id = JSON.parse(localStorage.getItem("shop") || "{}")?._id;

    const { data: deptData } = useQuery({ queryKey: ["departments"], queryFn: fetchAllDepartments, staleTime: 60_000, enabled: visible });
    const { data: campaignData } = useQuery({ queryKey: ["campaigns-list"], queryFn: () => fetchAllCampaigns({ shop_id }), staleTime: 60_000, enabled: visible });

    const departments = deptData?.departments || [];
    const campaigns = campaignData?.campaigns || [];

    useEffect(() => {
        if (!visible) return;
        if (isEdit && budget) {
            form.setFieldsValue({
                ...budget,
                period_start: budget.period_start ? dayjs(budget.period_start) : undefined,
                period_end: budget.period_end ? dayjs(budget.period_end) : undefined,
                campaign_id: typeof budget.campaign_id === "object" ? (budget.campaign_id as any)?._id : budget.campaign_id,
                department_id: typeof budget.department_id === "object" ? (budget.department_id as any)?._id : budget.department_id,
            });
        } else {
            form.resetFields();
        }
    }, [visible, mode, budget, form]);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const payload = {
                ...values,
                period_start: values.period_start?.toISOString(),
                period_end: values.period_end?.toISOString(),
                shop_id,
            };
            if (isEdit && budget?._id) {
                await dispatch(updateSalesBudget({ id: budget._id, data: payload })).unwrap();
            } else {
                await dispatch(createSalesBudget(payload)).unwrap();
            }
            form.resetFields(); onClose(); onSuccess?.();
        } catch { } finally { setLoading(false); }
    };

    return (
        <Modal
            open={visible}
            onCancel={() => { if (!loading) { form.resetFields(); onClose(); } }}
            destroyOnClose style={{ top: 20 }} width="min(620px, 96vw)" footer={null}
            styles={{ body: { padding: "20px 24px 24px", maxHeight: "82vh", overflowY: "auto" } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: isEdit ? "#eff6ff" : C.primaryLight, borderRadius: 7, padding: "4px 6px", color: isEdit ? C.blue : C.primary, fontSize: 14, lineHeight: 1 }}>
                        {isEdit ? <EditOutlined /> : <AuditOutlined />}
                    </div>
                    <Text strong style={{ fontSize: 14 }}>{isEdit ? "Edit Budget" : "New Sales Budget"}</Text>
                </div>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 4 }}>
                <Form.Item name="name" label="Budget Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Q2 2026 Sales Budget" style={{ borderRadius: 8 }} autoFocus />
                </Form.Item>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="period" label="Period" style={{ flex: "1 1 140px" }} initialValue="monthly">
                        <Select>
                            {PERIODS.map(p => <Option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="period_start" label="Start" rules={[{ required: true }]} style={{ flex: "1 1 180px" }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="period_end" label="End" rules={[{ required: true }]} style={{ flex: "1 1 180px" }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} />
                    </Form.Item>
                </div>

                {/* Revenue & Costs */}
                <Text strong style={{ fontSize: 12, color: C.darkText, display: "block", marginBottom: 8 }}>Revenue &amp; Costs</Text>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="budgeted_revenue" label="Revenue (KES)" style={{ flex: "1 1 160px" }}>
                        <InputNumber min={0} style={{ width: "100%", borderRadius: 8 }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => v?.replace(/,/g, "") as any} />
                    </Form.Item>
                    <Form.Item name="budgeted_cogs" label="COGS (KES)" style={{ flex: "1 1 160px" }}>
                        <InputNumber min={0} style={{ width: "100%", borderRadius: 8 }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => v?.replace(/,/g, "") as any} />
                    </Form.Item>
                    <Form.Item name="budgeted_expenses" label="Expenses (KES)" style={{ flex: "1 1 160px" }}>
                        <InputNumber min={0} style={{ width: "100%", borderRadius: 8 }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={v => v?.replace(/,/g, "") as any} />
                    </Form.Item>
                </div>

                {/* Campaign & Department */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {campaigns.length > 0 && (
                        <Form.Item name="campaign_id" label="Link to Campaign (optional)" style={{ flex: "1 1 220px" }}>
                            <Select placeholder="Scope to a campaign" allowClear>
                                {campaigns.map((c: any) => (
                                    <Option key={c._id} value={c._id}>{c.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    {departments.length > 0 && (
                        <Form.Item name="department_id" label="Department (optional)" style={{ flex: "1 1 200px" }}>
                            <Select placeholder="Department" allowClear>
                                {departments.map(d => (
                                    <Option key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ""}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                </div>

                <Form.Item name="description" label="Description">
                    <TextArea rows={2} style={{ borderRadius: 8 }} />
                </Form.Item>

                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={() => { form.resetFields(); onClose(); }} disabled={loading} style={{ borderRadius: 8, height: 38 }}>Cancel</Button>
                    <Button block type="primary" htmlType="submit" loading={loading}
                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 38, fontWeight: 500 }}>
                        {isEdit ? "Update Budget" : "Create Budget"}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

// ── Detail Drawer ─────────────────────────────────────────────────────────────
interface SalesBudgetDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    budget: SalesBudget | null;
    onUpdated?: () => void;
}

const SalesBudgetDetailDrawer: React.FC<SalesBudgetDetailDrawerProps> = ({
    open, onClose, budget, onUpdated,
}) => {
    const dispatch = useAppDispatch();
    const [submitLoading, setSubmitLoading] = useState(false);
    const [approveLoading, setApproveLoading] = useState(false);

    if (!budget) return null;
    const shop_id = JSON.parse(localStorage.getItem("shop") || "{}")?._id;
    const cfg = STATUS_CFG[budget.status] ?? STATUS_CFG.draft;

    const handleSubmit = async () => {
        setSubmitLoading(true);
        try { await dispatch(submitSalesBudget({ id: budget._id, shop_id })).unwrap(); onUpdated?.(); }
        catch { } finally { setSubmitLoading(false); }
    };

    const handleApprove = async (action: "approve" | "reject", reason?: string) => {
        setApproveLoading(true);
        try {
            await dispatch(approveSalesBudget({ id: budget._id, shop_id, action, rejection_reason: reason })).unwrap();
            onUpdated?.();
        } catch { } finally { setApproveLoading(false); }
    };

    const MetricRow = ({ label, budgeted, actual }: { label: string; budgeted?: number; actual?: number }) => {
        const variance = (actual ?? 0) - (budgeted ?? 0);
        return (
            <div style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: 4 }}>{label}</Text>
                <div style={{ display: "flex", gap: 16 }}>
                    <div><Text style={{ fontSize: 10, color: C.subText }}>Budget </Text><Text style={{ fontSize: 12 }}>KES {(budgeted ?? 0).toLocaleString()}</Text></div>
                    <div><Text style={{ fontSize: 10, color: C.subText }}>Actual </Text><Text style={{ fontSize: 12, color: C.green }}>KES {(actual ?? 0).toLocaleString()}</Text></div>
                    <div><Text style={{ fontSize: 10, color: C.subText }}>Var </Text><VarianceText value={variance} /></div>
                </div>
            </div>
        );
    };

    return (
        <Drawer
            open={open} onClose={onClose} placement="right" width="min(520px, 98vw)" destroyOnClose
            styles={{ body: { padding: "16px 20px", background: C.bg } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}><AuditOutlined /></div>
                    <div>
                        <Text strong style={{ fontSize: 14, display: "block" }}>{budget.name}</Text>
                        <Tag style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 10, borderRadius: 8 }}>
                            {budget.status.toUpperCase()}
                        </Tag>
                    </div>
                </div>
            }
            footer={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {budget.status === "draft" && (
                        <Button icon={<SendOutlined />} loading={submitLoading} onClick={handleSubmit}
                            style={{ flex: 1, borderRadius: 8, background: C.blue, borderColor: C.blue, color: "#fff" }}>
                            Submit for Approval
                        </Button>
                    )}
                    {budget.status === "submitted" && (
                        <>
                            <Button icon={<CheckOutlined />} loading={approveLoading} onClick={() => handleApprove("approve")}
                                style={{ flex: 1, borderRadius: 8, background: C.green, borderColor: C.green, color: "#fff" }}>Approve</Button>
                            <Button icon={<CloseOutlined />} loading={approveLoading} onClick={() => handleApprove("reject", "Requires revision")}
                                style={{ flex: 1, borderRadius: 8, background: C.red, borderColor: C.red, color: "#fff" }}>Reject</Button>
                        </>
                    )}
                </div>
            }
        >
            {/* Budget vs Actual */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <Text strong style={{ fontSize: 11, color: C.primary, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>Budget vs Actual</Text>
                <MetricRow label="Revenue" budgeted={budget.budgeted_revenue} actual={budget.actual_revenue} />
                <MetricRow label="COGS" budgeted={budget.budgeted_cogs} actual={budget.actual_cogs} />
                <MetricRow label="Expenses" budgeted={budget.budgeted_expenses} actual={budget.actual_expenses} />
                <div style={{ padding: "8px 0" }}>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: 4 }}>Gross Profit</Text>
                    <div style={{ display: "flex", gap: 16 }}>
                        <div><Text style={{ fontSize: 10, color: C.subText }}>Budget </Text><Text style={{ fontSize: 12 }}>KES {(budget.budgeted_gross_profit ?? 0).toLocaleString()}</Text></div>
                        <div><Text style={{ fontSize: 10, color: C.subText }}>Actual </Text><Text style={{ fontSize: 12, color: C.green }}>KES {(budget.actual_gross_profit ?? 0).toLocaleString()}</Text></div>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <Text strong style={{ fontSize: 11, color: C.primary, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>Details</Text>
                {[
                    { label: "Period", value: budget.period },
                    { label: "Start", value: new Date(budget.period_start).toLocaleDateString("en-GB") },
                    { label: "End", value: new Date(budget.period_end).toLocaleDateString("en-GB") },
                    ...(budget.campaign_id
                        ? [{ label: "Campaign", value: typeof budget.campaign_id === "object" ? (budget.campaign_id as any).name : String(budget.campaign_id) }]
                        : []),
                    ...(budget.department_id
                        ? [{ label: "Department", value: typeof budget.department_id === "object" ? (budget.department_id as any).name : String(budget.department_id) }]
                        : []),
                    ...(budget.submitted_by ? [{ label: "Submitted By", value: (budget.submitted_by as any).fullname || (budget.submitted_by as any).username }] : []),
                    ...(budget.approved_by ? [{ label: "Approved By", value: (budget.approved_by as any).fullname || (budget.approved_by as any).username }] : []),
                    ...(budget.rejection_reason ? [{ label: "Rejection Reason", value: budget.rejection_reason }] : []),
                ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <Text style={{ fontSize: 11, color: C.subText }}>{row.label}</Text>
                        <Text style={{ fontSize: 12, textTransform: "capitalize" }}>{row.value}</Text>
                    </div>
                ))}
            </div>
        </Drawer>
    );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const SalesBudgets = () => {
    const tableRef = useRef<SalesBudgetTableHandle>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selected, setSelected] = useState<SalesBudget | null>(null);
    const [mode, setMode] = useState<"add" | "edit">("add");

    const handleAdd = () => { setMode("add"); setSelected(null); setFormOpen(true); };
    const handleEdit = (b: SalesBudget) => { setMode("edit"); setSelected(b); setFormOpen(true); };
    const handleView = (b: SalesBudget) => { setSelected(b); setDrawerOpen(true); };
    const handleSuccess = () => tableRef.current?.reload();

    return (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "16px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}><AuditOutlined /></div>
                    <div>
                        <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>Sales Budgets</Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>Plan and track revenue budgets</Text>
                    </div>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 36, fontSize: 13 }}>
                    New Budget
                </Button>
            </div>
            <div style={{ padding: "16px 20px" }}>
                <SalesBudgetTable ref={tableRef} onView={handleView} onEdit={handleEdit} />
            </div>
            <SalesBudgetFormModal visible={formOpen} mode={mode} budget={selected} onClose={() => setFormOpen(false)} onSuccess={handleSuccess} />
            <SalesBudgetDetailDrawer open={drawerOpen} budget={selected} onClose={() => setDrawerOpen(false)} onUpdated={handleSuccess} />
        </div>
    );
};

export default SalesBudgets;