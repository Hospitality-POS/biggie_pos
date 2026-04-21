import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
    AimOutlined, EditOutlined, EyeOutlined, MoreOutlined,
    PlusOutlined, TrophyOutlined,
} from "@ant-design/icons";
import {
    App, Button, DatePicker, Drawer, Dropdown, Form,
    Input, InputNumber, Modal, Progress, Select, Typography,
} from "antd";
import { useAppDispatch } from "../../store";
import {
    fetchAllSalesTargets, createSalesTarget, updateSalesTarget,
    SalesTarget, TargetType, TargetPeriod,
} from "@services/crm/salesTargets";
import { fetchAllCampaigns } from "@services/crm/campaigns";
import { fetchAllDepartments } from "@services/crm/departments";
import { fetchAllUsersList } from "@services/users";
import { fetchUserRoles } from "@services/users";
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

const TYPES: TargetType[] = ["revenue", "units_sold", "leads_generated", "leads_converted", "gross_profit", "new_customers"];
const PERIODS: TargetPeriod[] = ["daily", "weekly", "monthly", "quarterly", "annual", "custom"];

const isMoneyType = (t?: TargetType) => t === "revenue" || t === "gross_profit";

const AchievementBadge = ({ pct }: { pct: number }) => {
    const color = pct >= 100 ? C.green : pct >= 70 ? C.orange : C.red;
    return (
        <div style={{ minWidth: 120 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 11, color }}>{pct.toFixed(1)}%</Text>
                {pct >= 100 && <TrophyOutlined style={{ color: C.green, fontSize: 11 }} />}
            </div>
            <Progress percent={Math.min(pct, 100)} showInfo={false} size="small"
                strokeColor={color} trailColor={C.border} />
        </div>
    );
};

// ── Table ─────────────────────────────────────────────────────────────────────
export interface SalesTargetTableHandle { reload: () => void }
interface SalesTargetTableProps {
    onView: (t: SalesTarget) => void;
    onEdit: (t: SalesTarget) => void;
}

const SalesTargetTable = forwardRef<SalesTargetTableHandle, SalesTargetTableProps>(
    ({ onView, onEdit }, ref) => {
        const actionRef = useRef<ActionType>();
        useImperativeHandle(ref, () => ({ reload: () => actionRef.current?.reload() }));

        const columns = [
            {
                title: "Target", dataIndex: "name",
                render: (name: string, r: SalesTarget) => (
                    <div>
                        <Text strong style={{ fontSize: 12 }}>{name}</Text>
                        <Text style={{ fontSize: 11, color: C.subText, display: "block", textTransform: "capitalize" }}>
                            {r.type?.replace(/_/g, " ")} · {r.period}
                        </Text>
                    </div>
                ),
            },
            {
                title: "Scope", search: false,
                render: (_: any, r: SalesTarget) => {
                    if (typeof r.user_id === "object" && r.user_id?.fullname)
                        return <Text style={{ fontSize: 12 }}>{r.user_id.fullname}</Text>;
                    if (typeof r.department_id === "object" && (r.department_id as any)?.name)
                        return <Text style={{ fontSize: 12, color: "#8b5cf6" }}>{(r.department_id as any).name}</Text>;
                    if (typeof r.role_id === "object" && (r.role_id as any)?.role_type)
                        return <Text style={{ fontSize: 12, color: C.blue }}>{(r.role_id as any).role_type}</Text>;
                    return <Text style={{ fontSize: 12, color: C.subText }}>Team</Text>;
                },
            },
            {
                title: "Campaign", dataIndex: "campaign_id", search: false,
                render: (c: any) => c
                    ? <Text style={{ fontSize: 11, color: C.subText }}>{c.name ?? c}</Text>
                    : <Text style={{ fontSize: 11, color: "#94a3b8" }}>—</Text>,
            },
            {
                title: "Target", dataIndex: "target_value", search: false,
                render: (v: number, r: SalesTarget) => (
                    <Text style={{ fontSize: 12 }}>
                        {isMoneyType(r.type) ? `KES ${v?.toLocaleString()}` : v}
                    </Text>
                ),
            },
            {
                title: "Actual", dataIndex: "actual_value", search: false,
                render: (v: number, r: SalesTarget) => (
                    <Text style={{ fontSize: 12, color: C.green }}>
                        {isMoneyType(r.type) ? `KES ${v?.toLocaleString()}` : v}
                    </Text>
                ),
            },
            {
                title: "Achievement", key: "pct", search: false,
                render: (_: any, r: SalesTarget) => <AchievementBadge pct={r.achievement_percentage ?? 0} />,
            },
            {
                title: "Period", key: "period", search: false,
                render: (_: any, r: SalesTarget) => (
                    <Text style={{ fontSize: 11, color: C.subText }}>
                        {new Date(r.period_start).toLocaleDateString("en-GB")} — {new Date(r.period_end).toLocaleDateString("en-GB")}
                    </Text>
                ),
            },
            {
                title: "Actions", key: "actions", search: false, fixed: "right" as const, width: 56,
                render: (_: any, r: SalesTarget) => (
                    <Dropdown trigger={["click"]} menu={{
                        items: [
                            { key: "view", icon: <EyeOutlined />, label: "View Details", onClick: () => onView(r) },
                            { key: "edit", icon: <EditOutlined />, label: "Edit Target", onClick: () => onEdit(r) },
                        ]
                    }}>
                        <Button type="text" icon={<MoreOutlined />} style={{ borderRadius: 6 }} />
                    </Dropdown>
                ),
            },
        ];

        return (
            <App>
                <ProTable<SalesTarget>
                    rowKey="_id" columns={columns} actionRef={actionRef}
                    request={async (params) => {
                        const res = await fetchAllSalesTargets(params as any);
                        return { data: res.targets, success: true, total: res.total };
                    }}
                    cardBordered={false}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto" }}
                    headerTitle={
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <AimOutlined style={{ color: C.primary }} />
                            <Text strong style={{ fontSize: 14 }}>Sales Targets</Text>
                        </div>
                    }
                    options={{ reload: () => actionRef.current?.reload() }}
                    scroll={{ x: "100%" }}
                    size="small"
                />
            </App>
        );
    }
);
SalesTargetTable.displayName = "SalesTargetTable";

// ── Form Modal ────────────────────────────────────────────────────────────────
interface SalesTargetFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    target?: SalesTarget | null;
    mode?: "add" | "edit";
}

const SalesTargetFormModal: React.FC<SalesTargetFormModalProps> = ({
    visible, onClose, onSuccess, target, mode = "add",
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [scopeType, setScopeType] = useState<"user" | "role" | "department" | "team">("user");
    const dispatch = useAppDispatch();
    const isEdit = mode === "edit";
    const shop_id = JSON.parse(localStorage.getItem("shop") || "{}")?._id;

    const { data: deptData } = useQuery({ queryKey: ["departments"], queryFn: fetchAllDepartments, staleTime: 60_000, enabled: visible });
    const { data: campaignData } = useQuery({ queryKey: ["campaigns-list"], queryFn: () => fetchAllCampaigns({ shop_id }), staleTime: 60_000, enabled: visible });
    const { data: usersData } = useQuery({ queryKey: ["users-list"], queryFn: () => fetchAllUsersList({ shop_id }), staleTime: 60_000, enabled: visible });
    const { data: rolesData } = useQuery({ queryKey: ["roles-list"], queryFn: fetchUserRoles, staleTime: 60_000, enabled: visible });

    const departments = deptData?.departments || [];
    const campaigns = campaignData?.campaigns || [];
    const users = Array.isArray(usersData) ? usersData : [];
    const roles = Array.isArray(rolesData) ? rolesData : [];

    useEffect(() => {
        if (!visible) return;
        if (isEdit && target) {
            // Detect scope type from populated fields
            if (typeof target.user_id === "object" && target.user_id?._id) setScopeType("user");
            else if (typeof target.role_id === "object" && (target.role_id as any)?._id) setScopeType("role");
            else if (typeof target.department_id === "object" && (target.department_id as any)?._id) setScopeType("department");
            else if (target.team) setScopeType("team");

            form.setFieldsValue({
                ...target,
                period_start: target.period_start ? dayjs(target.period_start) : undefined,
                period_end: target.period_end ? dayjs(target.period_end) : undefined,
                user_id: typeof target.user_id === "object" ? (target.user_id as any)?._id : target.user_id,
                role_id: typeof target.role_id === "object" ? (target.role_id as any)?._id : target.role_id,
                department_id: typeof target.department_id === "object" ? (target.department_id as any)?._id : target.department_id,
                campaign_id: typeof target.campaign_id === "object" ? (target.campaign_id as any)?._id : target.campaign_id,
                budget_id: typeof target.budget_id === "object" ? (target.budget_id as any)?._id : target.budget_id,
            });
        } else {
            form.resetFields();
            setScopeType("user");
        }
    }, [visible, mode, target, form]);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const payload = {
                ...values,
                period_start: values.period_start?.toISOString(),
                period_end: values.period_end?.toISOString(),
                // Clear unused scope fields
                user_id: scopeType === "user" ? values.user_id : undefined,
                role_id: scopeType === "role" ? values.role_id : undefined,
                department_id: scopeType === "department" ? values.department_id : undefined,
                team: scopeType === "team" ? values.team : undefined,
                shop_id,
            };
            if (isEdit && target?._id) {
                await dispatch(updateSalesTarget({ id: target._id, data: payload })).unwrap();
            } else {
                await dispatch(createSalesTarget(payload)).unwrap();
            }
            form.resetFields();
            onClose();
            onSuccess?.();
        } catch { } finally { setLoading(false); }
    };

    return (
        <Modal
            open={visible}
            onCancel={() => { if (!loading) { form.resetFields(); onClose(); } }}
            destroyOnClose style={{ top: 20 }} width="min(600px, 96vw)" footer={null}
            styles={{ body: { padding: "20px 24px 24px", maxHeight: "82vh", overflowY: "auto" } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: isEdit ? "#eff6ff" : C.primaryLight, borderRadius: 7, padding: "4px 6px", color: isEdit ? C.blue : C.primary, fontSize: 14, lineHeight: 1 }}>
                        {isEdit ? <EditOutlined /> : <AimOutlined />}
                    </div>
                    <Text strong style={{ fontSize: 14 }}>{isEdit ? "Edit Target" : "New Sales Target"}</Text>
                </div>
            }
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 4 }}>
                <Form.Item name="name" label="Target Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Q2 Revenue Target" style={{ borderRadius: 8 }} autoFocus />
                </Form.Item>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="type" label="Metric Type" rules={[{ required: true }]} style={{ flex: "1 1 180px" }}>
                        <Select placeholder="What are you measuring?">
                            {TYPES.map(t => (
                                <Option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="period" label="Period" style={{ flex: "1 1 140px" }} initialValue="monthly">
                        <Select>
                            {PERIODS.map(p => <Option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</Option>)}
                        </Select>
                    </Form.Item>
                </div>

                <Form.Item name="target_value" label="Target Value" rules={[{ required: true }]}>
                    <InputNumber
                        min={0} style={{ width: "100%", borderRadius: 8 }}
                        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        parser={v => v?.replace(/,/g, "") as any}
                    />
                </Form.Item>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="period_start" label="Period Start" rules={[{ required: true }]} style={{ flex: "1 1 200px" }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item name="period_end" label="Period End" rules={[{ required: true }]} style={{ flex: "1 1 200px" }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} />
                    </Form.Item>
                </div>

                {/* Scope selector */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px 4px", marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Assign To
                    </Text>
                    <Select
                        value={scopeType}
                        onChange={(v) => { setScopeType(v); form.resetFields(["user_id", "role_id", "department_id", "team"]); }}
                        style={{ width: "100%", marginBottom: 10, borderRadius: 8 }}
                    >
                        <Option value="user">Specific User</Option>
                        <Option value="role">Role (all users with this role)</Option>
                        <Option value="department">Department</Option>
                        <Option value="team">Free-text Team Label</Option>
                    </Select>

                    {scopeType === "user" && (
                        <Form.Item name="user_id" label="User">
                            <Select placeholder="Select user" allowClear showSearch
                                filterOption={(input, opt) => String(opt?.children || "").toLowerCase().includes(input.toLowerCase())}>
                                {users.map((u: any) => (
                                    <Option key={u._id} value={u._id}>{u.fullname || u.username}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    {scopeType === "role" && (
                        <Form.Item name="role_id" label="Role">
                            <Select placeholder="Select role" allowClear>
                                {roles.map((r: any) => (
                                    <Option key={r._id} value={r._id}>{r.role_type}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    {scopeType === "department" && (
                        <Form.Item name="department_id" label="Department">
                            <Select placeholder="Select department" allowClear>
                                {departments.map(d => (
                                    <Option key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ""}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                    {scopeType === "team" && (
                        <Form.Item name="team" label="Team Label">
                            <Input placeholder="e.g. Field Sales, Nairobi Team" style={{ borderRadius: 8 }} />
                        </Form.Item>
                    )}
                </div>

                {/* Campaign link */}
                {campaigns.length > 0 && (
                    <Form.Item name="campaign_id" label="Link to Campaign (optional)">
                        <Select placeholder="Only count results from this campaign" allowClear>
                            {campaigns.map((c: any) => (
                                <Option key={c._id} value={c._id}>{c.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                <Form.Item name="notes" label="Notes">
                    <TextArea rows={2} style={{ borderRadius: 8 }} />
                </Form.Item>

                <div style={{ display: "flex", gap: 10 }}>
                    <Button block onClick={() => { form.resetFields(); onClose(); }} disabled={loading} style={{ borderRadius: 8, height: 38 }}>Cancel</Button>
                    <Button block type="primary" htmlType="submit" loading={loading}
                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 38, fontWeight: 500 }}>
                        {isEdit ? "Update Target" : "Create Target"}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

// ── Detail Drawer ─────────────────────────────────────────────────────────────
const SalesTargetDetailDrawer: React.FC<{ open: boolean; onClose: () => void; target: SalesTarget | null }> = ({
    open, onClose, target,
}) => {
    if (!target) return null;
    const pct = target.achievement_percentage ?? 0;
    const color = pct >= 100 ? C.green : pct >= 70 ? C.orange : C.red;
    const isMoneyT = isMoneyType(target.type);

    const scopeLabel = () => {
        if (typeof target.user_id === "object" && target.user_id?.fullname) return target.user_id.fullname;
        if (typeof target.department_id === "object" && (target.department_id as any)?.name) return `Dept: ${(target.department_id as any).name}`;
        if (typeof target.role_id === "object" && (target.role_id as any)?.role_type) return `Role: ${(target.role_id as any).role_type}`;
        return target.team || "Team";
    };

    return (
        <Drawer open={open} onClose={onClose} placement="right" width="min(480px, 98vw)" destroyOnClose
            styles={{ body: { padding: "16px 20px", background: C.bg } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                        <AimOutlined />
                    </div>
                    <Text strong style={{ fontSize: 14 }}>{target.name}</Text>
                </div>
            }
        >
            {/* Achievement ring */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 14px", marginBottom: 14, textAlign: "center" }}>
                <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: 8 }}>Achievement</Text>
                <Text strong style={{ fontSize: 40, color, display: "block", lineHeight: 1.1 }}>{pct.toFixed(1)}%</Text>
                <Progress percent={Math.min(pct, 100)} showInfo={false} strokeColor={color} trailColor={C.border} style={{ marginTop: 10 }} />
                {target.is_achieved && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <TrophyOutlined style={{ color: C.green }} />
                        <Text style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Target Achieved!</Text>
                    </div>
                )}
            </div>

            {/* KPIs */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                {[
                    { label: "Target", value: isMoneyT ? `KES ${target.target_value?.toLocaleString()}` : String(target.target_value ?? 0) },
                    { label: "Actual", value: isMoneyT ? `KES ${target.actual_value?.toLocaleString()}` : String(target.actual_value ?? 0) },
                    { label: "Gap", value: isMoneyT ? `KES ${target.gap?.toLocaleString() ?? "0"}` : String(target.gap ?? 0) },
                ].map(k => (
                    <div key={k.label} style={{ flex: "1 1 120px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                        <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>{k.label}</Text>
                        <Text strong style={{ fontSize: 16, color: C.darkText }}>{k.value}</Text>
                    </div>
                ))}
            </div>

            {/* Details */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                {[
                    { label: "Metric", value: target.type?.replace(/_/g, " ") },
                    { label: "Period", value: target.period },
                    { label: "Start", value: new Date(target.period_start).toLocaleDateString("en-GB") },
                    { label: "End", value: new Date(target.period_end).toLocaleDateString("en-GB") },
                    { label: "Assigned To", value: scopeLabel() },
                    ...(target.campaign_id
                        ? [{ label: "Campaign", value: typeof target.campaign_id === "object" ? (target.campaign_id as any).name : String(target.campaign_id) }]
                        : []),
                    ...(target.budget_id
                        ? [{ label: "Budget", value: typeof target.budget_id === "object" ? (target.budget_id as any).name : String(target.budget_id) }]
                        : []),
                ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <Text style={{ fontSize: 11, color: C.subText }}>{row.label}</Text>
                        <Text style={{ fontSize: 12, textTransform: "capitalize" }}>{row.value}</Text>
                    </div>
                ))}
                {target.notes && (
                    <div style={{ padding: "6px 0 0" }}>
                        <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Notes</Text>
                        <Text style={{ fontSize: 12 }}>{target.notes}</Text>
                    </div>
                )}
            </div>
        </Drawer>
    );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const SalesTargets = () => {
    const tableRef = useRef<SalesTargetTableHandle>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selected, setSelected] = useState<SalesTarget | null>(null);
    const [mode, setMode] = useState<"add" | "edit">("add");

    const handleAdd = () => { setMode("add"); setSelected(null); setFormOpen(true); };
    const handleEdit = (t: SalesTarget) => { setMode("edit"); setSelected(t); setFormOpen(true); };
    const handleView = (t: SalesTarget) => { setSelected(t); setDrawerOpen(true); };
    const handleSuccess = () => tableRef.current?.reload();

    return (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "16px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}><AimOutlined /></div>
                    <div>
                        <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>Sales Targets</Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>Set and track team performance goals</Text>
                    </div>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 36, fontSize: 13 }}>
                    New Target
                </Button>
            </div>
            <div style={{ padding: "16px 20px" }}>
                <SalesTargetTable ref={tableRef} onView={handleView} onEdit={handleEdit} />
            </div>
            <SalesTargetFormModal visible={formOpen} mode={mode} target={selected} onClose={() => setFormOpen(false)} onSuccess={handleSuccess} />
            <SalesTargetDetailDrawer open={drawerOpen} target={selected} onClose={() => setDrawerOpen(false)} />
        </div>
    );
};

export default SalesTargets;