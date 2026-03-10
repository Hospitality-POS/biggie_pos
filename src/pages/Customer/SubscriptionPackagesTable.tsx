import { useEffect, useRef, useState } from "react";
import { ActionType, ProColumns, ProTable } from "@ant-design/pro-components";
import {
    Button, Form, Drawer, Input, InputNumber, Modal,
    Popconfirm, Progress, Select, Switch, Typography, message,
} from "antd";
import {
    BarChartOutlined, CheckCircleOutlined, ClockCircleOutlined,
    DeleteOutlined, EditOutlined, EyeOutlined,
    FilterOutlined, PlusOutlined, RiseOutlined,
    SearchOutlined, StopOutlined, TeamOutlined,
    TrophyOutlined, WalletOutlined,
} from "@ant-design/icons";
import {
    fetchAllPackages, createPackage, updatePackage,
    deletePackage, fetchPackageStatistics, Package,
} from "@services/subscription";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    orange: "#f59e0b",
    purple: "#8b5cf6",
    indigo: "#6366f1",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ── CSS helpers ────────────────────────────────────────────────────────────
const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    borderRadius: 5, padding: "2px 8px",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
    background: bg, color, border: `1px solid ${border}`,
});

// ── Shared atoms ───────────────────────────────────────────────────────────
const SectionLabel = ({ text }: { text: string }) => (
    <span style={{
        display: "block", fontSize: 10, color: C.subText,
        textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8,
    }}>{text}</span>
);

const ModalTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
            background: C.primaryLight, borderRadius: 7,
            padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1,
        }}>
            {icon}
        </div>
        <Text strong style={{ fontSize: 14, color: C.darkText }}>{label}</Text>
    </div>
);

const MetaRow = ({ label, children, last }: {
    label: string; children: React.ReactNode; last?: boolean;
}) => (
    <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "7px 0", borderBottom: last ? "none" : `1px solid ${C.border}`,
    }}>
        <Text style={{ fontSize: 11, color: C.subText, flex: "0 0 130px" }}>{label}</Text>
        <div style={{ fontSize: 12, textAlign: "right" }}>{children}</div>
    </div>
);

// ── KPI card ───────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, color, bg }: {
    icon: React.ReactNode; label: string; value: string | number;
    sub?: string; color: string; bg: string;
}) => (
    <div style={{
        flex: "1 1 130px", background: "#fff", border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`, borderRadius: 10, padding: "12px 14px",
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <div style={{ background: bg, borderRadius: 6, padding: "4px 5px", color, fontSize: 13, lineHeight: 1 }}>
                {icon}
            </div>
            <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
        </div>
        <Text strong style={{ fontSize: 20, color: C.darkText, display: "block", lineHeight: 1.2 }}>{value}</Text>
        {sub && <Text style={{ fontSize: 11, color: C.subText }}>{sub}</Text>}
    </div>
);

// ── Overview stats panel ───────────────────────────────────────────────────
const OverviewPanel = ({ packages }: { packages: Package[] }) => {
    if (!packages.length) return null;
    const total = packages.length;
    const active = packages.filter(p => p.is_active).length;
    const inactive = total - active;
    const avgPrice = Math.round(packages.reduce((s, p) => s + (p.price || 0), 0) / total);
    const avgVisits = Math.round(packages.reduce((s, p) => s + (p.total_visits || 0), 0) / total);
    const totalVisits = packages.reduce((s, p) => s + (p.total_visits || 0), 0);

    return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <KpiCard icon={<TeamOutlined />} label="Total Packages" value={total}
                sub={`${active} active · ${inactive} inactive`}
                color={C.blue} bg="#eff6ff" />
            <KpiCard icon={<CheckCircleOutlined />} label="Active" value={active}
                sub={`${total ? Math.round((active / total) * 100) : 0}% of packages`}
                color={C.green} bg="#f0fdf4" />
            <KpiCard icon={<StopOutlined />} label="Inactive" value={inactive}
                color={C.red} bg="#fef2f2" />
            <KpiCard icon={<RiseOutlined />} label="Avg Price" value={`KES ${fmt(avgPrice)}`}
                sub="per package"
                color={C.purple} bg="#faf5ff" />
            <KpiCard icon={<TrophyOutlined />} label="Avg Visits" value={avgVisits}
                sub="per package"
                color={C.orange} bg="#fffbeb" />
            <KpiCard icon={<WalletOutlined />} label="Total Visits" value={fmt(totalVisits)}
                sub="across all packages"
                color={C.indigo} bg="#eef2ff" />
        </div>
    );
};

// ── Inline filter bar ──────────────────────────────────────────────────────
interface Filters { search: string; status: "all" | "active" | "inactive" }
const DEFAULT_FILTERS: Filters = { search: "", status: "all" };

const FilterBar = ({ filters, onChange, onReset, onCreate }: {
    filters: Filters;
    onChange: (patch: Partial<Filters>) => void;
    onReset: () => void;
    onCreate: () => void;
}) => {
    const hasFilters = !!filters.search || filters.status !== "all";
    return (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <Input
                prefix={<SearchOutlined style={{ color: C.subText }} />}
                placeholder="Search by name or code…"
                allowClear
                value={filters.search}
                onChange={e => onChange({ search: e.target.value })}
                style={{ flex: "1 1 200px", maxWidth: 320, borderRadius: 8 }}
            />
            <Select
                value={filters.status}
                onChange={v => onChange({ status: v })}
                style={{ width: 150 }}
                options={[
                    { label: "All Packages", value: "all" },
                    { label: "Active only", value: "active" },
                    { label: "Inactive only", value: "inactive" },
                ]}
            />
            {hasFilters && (
                <Button icon={<FilterOutlined />} onClick={onReset}
                    style={{ borderRadius: 8, color: C.red, borderColor: C.red }}>
                    Reset
                </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
                Create Package
            </Button>
        </div>
    );
};

// ── Filter chips ───────────────────────────────────────────────────────────
const FilterChips = ({ filters, onClear }: {
    filters: Filters; onClear: (key: keyof Filters | "all") => void;
}) => {
    const chips: { key: keyof Filters; label: string }[] = [];
    if (filters.search) chips.push({ key: "search", label: `Search: ${filters.search}` });
    if (filters.status !== "all") chips.push({ key: "status", label: `Status: ${filters.status}` });
    if (!chips.length) return null;

    return (
        <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
            padding: "8px 12px", background: "#f0fdf4", border: `1px solid #bbf7d0`,
            borderRadius: 8, marginBottom: 10,
        }}>
            <Text style={{ fontSize: 11, color: C.subText }}>Filters:</Text>
            {chips.map((c, i) => (
                <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 5, background: "#fff",
                    border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 8px", fontSize: 11,
                }}>
                    {c.label}
                    <span style={{ cursor: "pointer", color: C.subText, fontSize: 10 }}
                        onClick={() => onClear(c.key)}>✕</span>
                </span>
            ))}
            <Button type="link" size="small" onClick={() => onClear("all")}
                style={{ padding: 0, height: "auto", fontSize: 11, color: C.red, marginLeft: "auto" }}>
                Clear All
            </Button>
        </div>
    );
};

// ── Package form ───────────────────────────────────────────────────────────
const PackageForm = ({ form, isEdit }: { form: any; isEdit?: boolean }) => (
    <Form form={form} layout="vertical">
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14 }}>
            <SectionLabel text="Package Details" />
            <Form.Item name="name" label="Package Name"
                rules={[{ required: true, message: "Package name required" }]} style={{ marginBottom: 12 }}>
                <Input placeholder="e.g. Premium Hair Package" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="code" label="Package Code" style={{ marginBottom: 12 }}
                tooltip={isEdit ? "Package code cannot be changed" : "Leave blank for auto-generation"}>
                <Input placeholder={isEdit ? undefined : "e.g. PKG-001 (optional)"}
                    disabled={isEdit} style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="desc" label="Description" style={{ marginBottom: 12 }}>
                <Input.TextArea rows={3} placeholder="Package description…" style={{ borderRadius: 8 }} />
            </Form.Item>
        </div>

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14 }}>
            <SectionLabel text="Pricing & Visits" />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Form.Item name="price" label="Price (KES)"
                    rules={[{ required: true, message: "Price required" }]}
                    style={{ flex: "1 1 160px", marginBottom: 12 }}>
                    <InputNumber min={0} style={{ width: "100%", borderRadius: 8 }} placeholder="5000" />
                </Form.Item>
                <Form.Item name="total_visits" label="Total Visits"
                    rules={[{ required: true, message: "Total visits required" }]}
                    style={{ flex: "1 1 120px", marginBottom: 12 }}>
                    <InputNumber min={1} style={{ width: "100%", borderRadius: 8 }} placeholder="10" />
                </Form.Item>
                <Form.Item name="validity_days" label="Validity (Days)"
                    style={{ flex: "1 1 120px", marginBottom: 12 }}>
                    <InputNumber min={1} style={{ width: "100%", borderRadius: 8 }} placeholder="120" />
                </Form.Item>
            </div>
        </div>

        <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
        }}>
            <Form.Item name="is_active" valuePropName="checked" initialValue={true} style={{ margin: 0 }}>
                <Switch size="small" />
            </Form.Item>
            <div>
                <Text style={{ fontSize: 12, fontWeight: 500 }}>Active Package</Text>
                <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                    Only active packages can be purchased
                </Text>
            </div>
        </div>
    </Form>
);

// ── Details modal ──────────────────────────────────────────────────────────
const DetailsModal = ({ open, pkg, onClose }: {
    open: boolean; pkg: Package | null; onClose: () => void;
}) => {
    if (!pkg) return null;
    const perVisit = pkg.total_visits > 0 ? Math.round(pkg.price / pkg.total_visits) : 0;
    return (
        <Modal open={open} onCancel={onClose} destroyOnClose
            style={{ top: 20 }} width="min(600px, 96vw)"
            styles={{ body: { padding: "20px 24px" } }}
            title={<ModalTitle icon={<EyeOutlined />} label={`Package — ${pkg.name}`} />}
            footer={<Button onClick={onClose} style={{ borderRadius: 8 }}>Close</Button>}
        >
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                    { label: "Price", value: `KES ${fmt(pkg.price)}`, color: C.green },
                    { label: "Per Visit", value: `KES ${fmt(perVisit)}`, color: C.blue },
                    { label: "Total Visits", value: pkg.total_visits, color: C.purple },
                ].map(s => (
                    <div key={s.label} style={{
                        flex: "1 1 100px", background: "#fff", border: `1px solid ${C.border}`,
                        borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: "10px 12px",
                    }}>
                        <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{s.label}</Text>
                        <Text strong style={{ fontSize: 16, color: s.color }}>{s.value}</Text>
                    </div>
                ))}
            </div>
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px" }}>
                <MetaRow label="Code"><Text copyable strong style={{ fontSize: 12 }}>{pkg.code}</Text></MetaRow>
                <MetaRow label="Validity">
                    <Text style={{ fontSize: 12 }}>{pkg.validity_days ? `${pkg.validity_days} days` : "No limit"}</Text>
                </MetaRow>
                <MetaRow label="Status">
                    {pkg.is_active
                        ? <span style={pill("#f0fdf4", C.green, "#bbf7d0")}><CheckCircleOutlined />Active</span>
                        : <span style={pill("#fef2f2", C.red, "#fecaca")}><StopOutlined />Inactive</span>}
                </MetaRow>
                <MetaRow label="Description"><Text style={{ fontSize: 12 }}>{pkg.desc || "—"}</Text></MetaRow>
                <MetaRow label="Created">
                    <Text style={{ fontSize: 12 }}>{new Date(pkg.createdAt).toLocaleDateString("en-GB")}</Text>
                </MetaRow>
                <MetaRow label="Updated" last>
                    <Text style={{ fontSize: 12 }}>{new Date(pkg.updatedAt).toLocaleDateString("en-GB")}</Text>
                </MetaRow>
            </div>
        </Modal>
    );
};

// ── Stats modal ────────────────────────────────────────────────────────────
const StatsModal = ({ open, pkg, stats, loading, onClose }: {
    open: boolean; pkg: Package | null; stats: any; loading: boolean; onClose: () => void;
}) => {
    if (!pkg) return null;
    const s = stats?.statistics || {};
    const totalAlloc = s.total_visits_allocated || 0;
    const totalUsed = s.total_visits_used || 0;
    const usagePct = totalAlloc > 0 ? Math.round((totalUsed / totalAlloc) * 100) : 0;

    return (
        <Modal open={open} onCancel={onClose} destroyOnClose
            style={{ top: 20 }} width="min(700px, 96vw)"
            styles={{ body: { padding: "20px 24px" } }}
            title={<ModalTitle icon={<BarChartOutlined />} label={`Stats — ${pkg.name}`} />}
            footer={<Button onClick={onClose} style={{ borderRadius: 8 }}>Close</Button>}
        >
            <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                background: C.primaryLight, borderRadius: 8, marginBottom: 16,
            }}>
                <Text strong style={{ fontSize: 13, color: C.primary }}>{pkg.name}</Text>
                <Text style={{ fontSize: 11, color: C.subText }}>· {pkg.code}</Text>
                <Text style={{ fontSize: 11, color: C.green, marginLeft: "auto" }}>
                    KES {fmt(pkg.price)} · {pkg.total_visits} visits
                </Text>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: C.subText }}>Loading statistics…</div>
            ) : stats ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <KpiCard icon={<TeamOutlined />} label="Total Subscriptions" value={s.total_subscriptions || 0} color={C.blue} bg="#eff6ff" />
                        <KpiCard icon={<CheckCircleOutlined />} label="Active" value={s.active_subscriptions || 0} color={C.green} bg="#f0fdf4" />
                        <KpiCard icon={<WalletOutlined />} label="Total Revenue"
                            value={`KES ${fmt(s.total_revenue || 0)}`}
                            sub={`Avg KES ${s.total_subscriptions ? fmt(Math.round((s.total_revenue || 0) / s.total_subscriptions)) : "—"}`}
                            color={C.purple} bg="#faf5ff" />
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <KpiCard icon={<TrophyOutlined />} label="Completed" value={s.completed_subscriptions || 0} color={C.indigo} bg="#eef2ff" />
                        <KpiCard icon={<ClockCircleOutlined />} label="Expired" value={s.expired_subscriptions || 0} color={C.orange} bg="#fffbeb" />
                        <KpiCard icon={<StopOutlined />} label="Cancelled" value={s.cancelled_subscriptions || 0} color={C.red} bg="#fef2f2" />
                    </div>
                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <Text strong style={{ fontSize: 13, color: C.darkText }}>Visit Usage</Text>
                            <Text style={{ fontSize: 12, color: C.subText }}>{usagePct}% consumed</Text>
                        </div>
                        <Progress percent={usagePct} showInfo={false} size="small"
                            strokeColor={usagePct >= 90 ? C.red : usagePct >= 60 ? C.orange : C.green}
                            trailColor={C.border} />
                        <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                            {[
                                { label: "Allocated", value: totalAlloc, color: C.blue },
                                { label: "Used", value: totalUsed, color: C.orange },
                                { label: "Remaining", value: s.total_visits_remaining || 0, color: C.green },
                            ].map(v => (
                                <div key={v.label}>
                                    <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>{v.label}</Text>
                                    <Text strong style={{ fontSize: 15, color: v.color }}>{fmt(v.value)}</Text>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: C.subText }}>No statistics available</div>
            )}
        </Modal>
    );
};

// ── Main ───────────────────────────────────────────────────────────────────
const SubscriptionPackagesTable: React.FC = () => {
    const actionRef = useRef<ActionType>();
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [allPackages, setAllPackages] = useState<Package[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
    const [pkgStats, setPkgStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);

    const loadAllForStats = async () => {
        try {
            const res = await fetchAllPackages({ page: 1, limit: 500 });
            setAllPackages(res.packages || []);
        } catch { /* silent */ }
    };

    useEffect(() => { loadAllForStats(); }, []);
    useEffect(() => { actionRef.current?.reload(); }, [filters]);

    // ── Table fetch ────────────────────────────────────────────────────────
    const fetchPackages = async (params: any) => {
        try {
            const req: any = { ...params, page: params.current, limit: params.pageSize };
            if (filters.search) req.search = filters.search;
            if (filters.status !== "all") req.is_active = filters.status === "active";
            const res = await fetchAllPackages(req);
            return { data: res.packages || [], success: true, total: res.totalPackages || 0 };
        } catch {
            message.error("Failed to fetch packages");
            return { data: [], success: false, total: 0 };
        }
    };

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleCreate = async () => {
        try {
            const values = await createForm.validateFields();
            setCreating(true);
            await createPackage(values);
            message.success("Package created");
            setCreateOpen(false); createForm.resetFields();
            loadAllForStats(); actionRef.current?.reload();
        } catch (e: any) {
            if (e?.errorFields) return;
            message.error(e.message || "Failed to create package");
        } finally { setCreating(false); }
    };

    const handleUpdate = async () => {
        if (!selectedPkg) return;
        try {
            const values = await editForm.validateFields();
            setUpdating(true);
            await updatePackage(selectedPkg._id, values);
            message.success("Package updated");
            setEditOpen(false); setSelectedPkg(null); editForm.resetFields();
            loadAllForStats(); actionRef.current?.reload();
        } catch (e: any) {
            if (e?.errorFields) return;
            message.error(e.message || "Failed to update package");
        } finally { setUpdating(false); }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deletePackage(id);
            message.success("Package deleted");
            loadAllForStats(); actionRef.current?.reload();
        } catch (e: any) {
            message.error(e.message || "Failed to delete package");
        } finally { setDeletingId(null); }
    };

    const openEdit = (record: Package) => {
        setSelectedPkg(record); editForm.setFieldsValue({ ...record }); setEditOpen(true);
    };

    const openStats = async (record: Package) => {
        setSelectedPkg(record); setPkgStats(null); setStatsOpen(true); setLoadingStats(true);
        try { setPkgStats(await fetchPackageStatistics(record._id)); }
        catch { message.error("Failed to load statistics"); }
        finally { setLoadingStats(false); }
    };

    const updateFilter = (patch: Partial<Filters>) => setFilters(prev => ({ ...prev, ...patch }));
    const clearFilter = (key: keyof Filters | "all") => {
        if (key === "all") { setFilters(DEFAULT_FILTERS); return; }
        setFilters(prev => ({ ...prev, [key]: key === "status" ? "all" : "" }));
    };

    // ── Columns ──────────────────────────────────────────────────────────────
    const columns: ProColumns<Package>[] = [
        {
            title: "Code", dataIndex: "code", key: "code", width: 140, fixed: "left",
            render: (text) => <Text copyable strong style={{ fontSize: 12 }}>{text}</Text>,
        },
        {
            title: "Name", dataIndex: "name", key: "name", width: 200, ellipsis: true,
            render: (text, record) => (
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Text strong style={{ fontSize: 12 }}>{text}</Text>
                    {!record.is_active && (
                        <span style={pill("#fef2f2", C.red, "#fecaca")}><StopOutlined />Inactive</span>
                    )}
                </div>
            ),
        },
        {
            title: "Price", dataIndex: "price", key: "price", width: 130, align: "right",
            render: (_, r) => <Text strong style={{ fontSize: 12, color: C.green }}>KES {fmt(r.price)}</Text>,
        },
        {
            title: "Visits", dataIndex: "total_visits", key: "total_visits", width: 90, align: "center",
            render: (v) => <span style={pill("#eff6ff", C.blue, "#bfdbfe")}>{v}</span>,
        },
        {
            title: "Validity", dataIndex: "validity_days", key: "validity_days", width: 110, align: "center",
            render: (days) => (
                <span style={days ? pill("#eff6ff", C.blue, "#bfdbfe") : pill(C.bg, C.subText, C.border)}>
                    {days ? `${days}d` : "No limit"}
                </span>
            ),
        },
        {
            title: "Per Visit", key: "perVisit", width: 110, align: "right",
            render: (_, r) => (
                <Text style={{ fontSize: 12, color: C.subText }}>
                    KES {fmt(r.total_visits > 0 ? Math.round(r.price / r.total_visits) : 0)}
                </Text>
            ),
        },
        {
            title: "Status", dataIndex: "is_active", key: "is_active", width: 100, align: "center",
            render: (active) => active
                ? <span style={pill("#f0fdf4", C.green, "#bbf7d0")}><CheckCircleOutlined />Active</span>
                : <span style={pill("#fef2f2", C.red, "#fecaca")}><StopOutlined />Inactive</span>,
        },
        {
            title: "Description", dataIndex: "desc", key: "desc", width: 180, ellipsis: true,
            render: (text) => <Text style={{ fontSize: 12, color: C.subText }}>{text || "—"}</Text>,
        },
        {
            title: "Actions", key: "actions", width: 130, fixed: "right",
            render: (_, record) => (
                <div style={{ display: "flex", gap: 2 }}>
                    <Button type="text" size="small" icon={<EyeOutlined style={{ color: C.blue }} />}
                        onClick={() => { setSelectedPkg(record); setDetailsOpen(true); }}
                        style={{ borderRadius: 6 }} />
                    <Button type="text" size="small" icon={<BarChartOutlined style={{ color: C.purple }} />}
                        onClick={() => openStats(record)} style={{ borderRadius: 6 }} />
                    <Button type="text" size="small" icon={<EditOutlined style={{ color: C.primary }} />}
                        onClick={() => openEdit(record)} style={{ borderRadius: 6 }} />
                    <Popconfirm
                        title="Delete this package?"
                        description="Active subscriptions will not be affected."
                        onConfirm={() => handleDelete(record._id)}
                        okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
                    >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />}
                            loading={deletingId === record._id} style={{ borderRadius: 6 }} />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const DrawerFooter = ({ onCancel, onSubmit, loading, submitLabel }: {
        onCancel: () => void; onSubmit: () => void; loading: boolean; submitLabel: string;
    }) => (
        <div style={{ display: "flex", gap: 10 }}>
            <Button block onClick={onCancel} style={{ borderRadius: 8, height: 40 }}>Cancel</Button>
            <Button block type="primary" loading={loading} onClick={onSubmit}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 40, fontWeight: 500 }}>
                {submitLabel}
            </Button>
        </div>
    );

    return (
        <>
            {/* Overview stats */}
            <OverviewPanel packages={allPackages} />

            {/* Inline filter bar */}
            <FilterBar
                filters={filters}
                onChange={updateFilter}
                onReset={() => setFilters(DEFAULT_FILTERS)}
                onCreate={() => { createForm.resetFields(); setCreateOpen(true); }}
            />

            {/* Active filter chips */}
            <FilterChips filters={filters} onClear={clearFilter} />

            {/* Table — search=false, toolBarRender=false */}
            <ProTable<Package>
                columns={columns}
                actionRef={actionRef}
                request={fetchPackages}
                rowKey="_id"
                search={false}
                toolBarRender={false}
                cardBordered={false}
                size="small"
                pagination={{
                    defaultPageSize: 10, showSizeChanger: true, showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} packages`,
                }}
                scroll={{ x: 1100 }}
                options={{
                    density: true, fullScreen: true,
                    reload: () => { loadAllForStats(); actionRef.current?.reload(); },
                }}
            />

            {/* Create drawer */}
            <Drawer
                open={createOpen} onClose={() => setCreateOpen(false)}
                placement="right" width="min(520px, 96vw)" destroyOnClose
                styles={{ body: { padding: "20px 24px", paddingBottom: 100 }, footer: { padding: "12px 16px" } }}
                title={<ModalTitle icon={<PlusOutlined />} label="Create Package" />}
                footer={<DrawerFooter onCancel={() => setCreateOpen(false)} onSubmit={handleCreate} loading={creating} submitLabel="Create Package" />}
            >
                <PackageForm form={createForm} />
            </Drawer>

            {/* Edit drawer */}
            <Drawer
                open={editOpen}
                onClose={() => { setEditOpen(false); setSelectedPkg(null); editForm.resetFields(); }}
                placement="right" width="min(520px, 96vw)" destroyOnClose
                styles={{ body: { padding: "20px 24px", paddingBottom: 100 }, footer: { padding: "12px 16px" } }}
                title={<ModalTitle icon={<EditOutlined />} label={`Edit — ${selectedPkg?.name || ""}`} />}
                footer={
                    <DrawerFooter
                        onCancel={() => { setEditOpen(false); setSelectedPkg(null); editForm.resetFields(); }}
                        onSubmit={handleUpdate} loading={updating} submitLabel="Update Package"
                    />
                }
            >
                <PackageForm form={editForm} isEdit />
            </Drawer>

            <DetailsModal
                open={detailsOpen} pkg={selectedPkg}
                onClose={() => { setDetailsOpen(false); setSelectedPkg(null); }}
            />
            <StatsModal
                open={statsOpen} pkg={selectedPkg}
                stats={pkgStats} loading={loadingStats}
                onClose={() => { setStatsOpen(false); setSelectedPkg(null); setPkgStats(null); }}
            />
        </>
    );
};

export default SubscriptionPackagesTable;