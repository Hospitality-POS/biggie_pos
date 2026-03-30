import React, { useEffect, useState } from "react";
import {
    Button,
    Card,
    DatePicker,
    Drawer,
    Dropdown,
    Empty,
    Input,
    Modal,
    Select,
    Skeleton,
    Space,
    Table,
    Tag,
    Typography,
} from "antd";
import {
    CalendarOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    DollarOutlined,
    EditOutlined,
    EyeOutlined,
    HistoryOutlined,
    MailOutlined,
    MoreOutlined,
    PhoneOutlined,
    PlusOutlined,
    SearchOutlined,
    StopOutlined,
    TeamOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchAllWages,
    fetchWageById,
    deactivateWage,
    deleteWageById,
    calculateShopPayroll,
} from "@services/wages";
import WageForm from "./WageForm";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444",
    blue: "#3b82f6",
    indigo: "#6366f1",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtK = (v: number, currency = "KES") =>
    `${currency} ${v.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;

const calcNet = (wage: any) => {
    const allowances = wage.allowances?.reduce((s: number, a: any) => s + (a.amount || 0), 0) || 0;
    const deductions = wage.deductions?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0;
    return (wage.baseAmount || 0) + allowances - deductions;
};

// ── Mobile detection ──────────────────────────────────────────────────────────
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return isMobile;
};

// ── Wage type tag ─────────────────────────────────────────────────────────────
const WageTypeTag: React.FC<{ type: string }> = ({ type }) => {
    const cfg: Record<string, { color: string; bg: string }> = {
        daily: { color: C.blue, bg: "#eff6ff" },
        weekly: { color: C.green, bg: "#f0fdf4" },
        monthly: { color: C.indigo, bg: "#eef2ff" },
    };
    const s = cfg[type] || { color: C.subText, bg: "#f1f5f9" };
    return (
        <Tag style={{ background: s.bg, color: s.color, border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px" }}>
            {type?.toUpperCase()}
        </Tag>
    );
};

// ── Status tag ────────────────────────────────────────────────────────────────
const StatusTag: React.FC<{ active: boolean }> = ({ active }) => (
    <Tag
        icon={active ? <CheckCircleOutlined /> : <StopOutlined />}
        style={{
            background: active ? "#f0fdf4" : "#f1f5f9",
            color: active ? C.green : C.subText,
            border: "none",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            padding: "2px 8px",
        }}
    >
        {active ? "Active" : "Inactive"}
    </Tag>
);

// ── KPI card ──────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode; color: string; bg: string }> = ({
    label, value, icon, color, bg,
}) => (
    <div style={{ background: bg, borderRadius: 10, padding: "12px 14px", flex: "1 1 140px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ background: "#fff", borderRadius: 7, padding: "4px 5px", color, fontSize: 14, lineHeight: 1 }}>
                {icon}
            </div>
            <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {label}
            </Text>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
);

// ── Info pill (drawer) ────────────────────────────────────────────────────────
const InfoPill: React.FC<{ label: string; value: React.ReactNode; color?: string; bg?: string }> = ({
    label, value, color = C.darkText, bg = "#f8fafc",
}) => (
    <div style={{ background: bg, borderRadius: 8, padding: "8px 10px", minWidth: 0 }}>
        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 600 }}>
            {label}
        </Text>
        <Text style={{ fontSize: 12, color, fontWeight: 500 }}>{value || "—"}</Text>
    </div>
);

// ── Allowance / Deduction line ────────────────────────────────────────────────
const LineRow: React.FC<{ name: string; amount: number; frequency: string; currency: string; type: "allowance" | "deduction" }> = ({
    name, amount, frequency, currency, type,
}) => (
    <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "7px 0",
        borderBottom: `1px solid ${C.border}`,
    }}>
        <div>
            <Text style={{ fontSize: 12, color: C.darkText, fontWeight: 500 }}>{name}</Text>
            <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>{frequency}</Text>
        </div>
        <Text strong style={{ fontSize: 12, color: type === "allowance" ? C.green : C.red }}>
            {type === "allowance" ? "+" : "−"} {fmtK(amount, currency)}
        </Text>
    </div>
);

// ── Mobile wage card ──────────────────────────────────────────────────────────
const WageCard: React.FC<{
    record: any;
    onView: (r: any) => void;
    onEdit: (r: any) => void;
    onDeactivate: (r: any) => void;
    onDelete: (r: any) => void;
    loadingId: string | null;
}> = ({ record, onView, onEdit, onDeactivate, onDelete, loadingId }) => {
    const net = calcNet(record);
    const allowTotal = record.allowances?.reduce((s: number, a: any) => s + (a.amount || 0), 0) || 0;
    const dedTotal = record.deductions?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0;

    return (
        <Card
            style={{
                borderRadius: 12,
                marginBottom: 10,
                border: `1px solid ${record.isActive ? "#bbf7d0" : C.border}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                opacity: record.isActive ? 1 : 0.8,
            }}
            bodyStyle={{ padding: "12px 14px" }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 13, color: C.darkText }}>
                            {record.user_id?.fullname || "N/A"}
                        </Text>
                        <StatusTag active={record.isActive} />
                        <WageTypeTag type={record.wageType} />
                    </div>
                    {record.user_id?.email && (
                        <Space size={4}>
                            <MailOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
                            <Text style={{ fontSize: 11, color: C.subText }}>{record.user_id.email}</Text>
                        </Space>
                    )}
                </div>
                <Dropdown
                    trigger={["click"]}
                    menu={{
                        items: [
                            { key: "view", icon: <EyeOutlined />, label: "View Details", onClick: () => onView(record) },
                            { key: "edit", icon: <EditOutlined />, label: "Edit", onClick: () => onEdit(record) },
                            record.isActive
                                ? { key: "deactivate", icon: <StopOutlined />, label: "Deactivate", danger: true, onClick: () => onDeactivate(record) }
                                : { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => onDelete(record) },
                        ],
                    }}
                >
                    <Button
                        type="text"
                        icon={<MoreOutlined />}
                        loading={loadingId === record._id}
                        style={{ borderRadius: 7, border: `1px solid ${C.border}`, background: "#f8fafc", width: 32, height: 32, padding: 0 }}
                    />
                </Dropdown>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: "7px 8px" }}>
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Base</Text>
                    <Text strong style={{ fontSize: 12, color: C.darkText }}>{fmtK(record.baseAmount || 0, record.currency)}</Text>
                </div>
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "7px 8px" }}>
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Allowances</Text>
                    <Text strong style={{ fontSize: 12, color: C.green }}>+{fmtK(allowTotal, record.currency)}</Text>
                </div>
                <div style={{ background: "#fef2f2", borderRadius: 8, padding: "7px 8px" }}>
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Deductions</Text>
                    <Text strong style={{ fontSize: 12, color: C.red }}>−{fmtK(dedTotal, record.currency)}</Text>
                </div>
            </div>

            {/* Net + date */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ background: C.primaryLight, borderRadius: 8, padding: "7px 12px" }}>
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Net Wage</Text>
                    <Text strong style={{ fontSize: 14, color: C.primary }}>{fmtK(net, record.currency)}</Text>
                </div>
                <Space size={4}>
                    <CalendarOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
                    <Text style={{ fontSize: 11, color: C.subText }}>
                        {dayjs(record.effectiveDate).format("MMM DD, YYYY")}
                    </Text>
                </Space>
            </div>
        </Card>
    );
};

// ── View Drawer ───────────────────────────────────────────────────────────────
const WageDrawer: React.FC<{
    wage: any;
    open: boolean;
    isMobile: boolean;
    onClose: () => void;
}> = ({ wage, open, isMobile, onClose }) => {
    if (!wage) return null;

    const net = calcNet(wage);
    const allowTotal = wage.allowances?.reduce((s: number, a: any) => s + (a.amount || 0), 0) || 0;
    const dedTotal = wage.deductions?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement={isMobile ? "bottom" : "right"}
            height={isMobile ? "88vh" : undefined}
            width={isMobile ? "100%" : 520}
            styles={{ body: { padding: isMobile ? "16px 14px" : "20px 24px", overflowY: "auto" } }}
            title={
                <Space size={8}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                        <DollarOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                            {wage.user_id?.fullname || "Wage Details"}
                        </Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>Wage Record</Text>
                    </div>
                </Space>
            }
        >
            {/* Employee info */}
            <Text style={{ fontSize: 10, color: C.subText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                Employee
            </Text>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                <InfoPill label="Full Name" value={wage.user_id?.fullname} />
                <InfoPill label="Email" value={wage.user_id?.email} />
                {wage.user_id?.phone && <InfoPill label="Phone" value={wage.user_id.phone} />}
                <InfoPill label="Status" value={<StatusTag active={wage.isActive} />} bg="transparent" />
            </div>

            {/* Wage info */}
            <Text style={{ fontSize: 10, color: C.subText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                Wage Configuration
            </Text>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                <InfoPill label="Wage Type" value={<WageTypeTag type={wage.wageType} />} bg="transparent" />
                <InfoPill label="Payment Frequency" value={wage.paymentFrequency} />
                <InfoPill label="Effective Date" value={dayjs(wage.effectiveDate).format("MMM DD, YYYY")} />
                <InfoPill label="Base Amount" value={fmtK(wage.baseAmount || 0, wage.currency)} color={C.darkText} bg="#f8fafc" />
                {wage.overtimeRate > 0 && (
                    <InfoPill label="Overtime Rate" value={fmtK(wage.overtimeRate, wage.currency)} color={C.orange} bg="#fffbeb" />
                )}
            </div>

            {/* Allowances */}
            <Text style={{ fontSize: 10, color: C.subText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                Allowances ({wage.allowances?.length || 0})
            </Text>
            <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, padding: "0 12px", marginBottom: 18 }}>
                {wage.allowances?.length > 0 ? (
                    wage.allowances.map((a: any, i: number) => (
                        <LineRow key={i} name={a.name} amount={a.amount} frequency={a.frequency} currency={wage.currency} type="allowance" />
                    ))
                ) : (
                    <Text style={{ fontSize: 12, color: "#94a3b8", display: "block", padding: "12px 0" }}>No allowances</Text>
                )}
            </div>

            {/* Deductions */}
            <Text style={{ fontSize: 10, color: C.subText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                Deductions ({wage.deductions?.length || 0})
            </Text>
            <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, padding: "0 12px", marginBottom: 18 }}>
                {wage.deductions?.length > 0 ? (
                    wage.deductions.map((d: any, i: number) => (
                        <LineRow key={i} name={d.name} amount={d.amount} frequency={d.frequency} currency={wage.currency} type="deduction" />
                    ))
                ) : (
                    <Text style={{ fontSize: 12, color: "#94a3b8", display: "block", padding: "12px 0" }}>No deductions</Text>
                )}
            </div>

            {/* Summary */}
            <div style={{ background: "#f8fafc", borderRadius: 10, border: `1px solid ${C.border}`, padding: "12px 14px", marginBottom: 18 }}>
                {[
                    { label: "Base Wage", value: fmtK(wage.baseAmount || 0, wage.currency), color: C.darkText },
                    { label: "Total Allowances", value: `+ ${fmtK(allowTotal, wage.currency)}`, color: C.green },
                    { label: "Total Deductions", value: `− ${fmtK(dedTotal, wage.currency)}`, color: C.red },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <Text style={{ fontSize: 12, color: C.subText }}>{label}</Text>
                        <Text strong style={{ fontSize: 12, color }}>{value}</Text>
                    </div>
                ))}
                <div style={{ borderTop: `2px solid ${C.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText }}>Net Wage</Text>
                    <div style={{ background: C.primaryLight, borderRadius: 8, padding: "4px 14px" }}>
                        <Text strong style={{ fontSize: 16, color: C.primary }}>{fmtK(net, wage.currency)}</Text>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {wage.notes && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "9px 12px", marginBottom: 18 }}>
                    <Text style={{ fontSize: 10, color: "#92400e", fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.4px" }}>Notes</Text>
                    <Text style={{ fontSize: 12, color: "#374151" }}>{wage.notes}</Text>
                </div>
            )}

            {/* Timestamps */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <InfoPill label="Created" value={dayjs(wage.createdAt).format("MMM DD, YYYY HH:mm")} />
                <InfoPill label="Last Updated" value={dayjs(wage.updatedAt).format("MMM DD, YYYY HH:mm")} />
            </div>
        </Drawer>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
const WagesList: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingWage, setEditingWage] = useState<any>(null);
    const [viewDrawerVisible, setViewDrawerVisible] = useState(false);
    const [selectedWage, setSelectedWage] = useState<any>(null);
    const [loadingWageId, setLoadingWageId] = useState<string | null>(null);
    const [filters, setFilters] = useState<{
        search: string;
        wageType: string | undefined;
        isActive: string | undefined;
        dateRange: any;
    }>({ search: "", wageType: undefined, isActive: undefined, dateRange: null });

    const queryClient = useQueryClient();
    const isMobile = useIsMobile();
    const shopId = localStorage.getItem("shopId");

    const { data: wagesData, isLoading } = useQuery({
        queryKey: ["wages", filters.wageType, filters.isActive, filters.search],
        queryFn: () => fetchAllWages({ wageType: filters.wageType, isActive: filters.isActive, search: filters.search }),
    });

    const { data: payrollData } = useQuery({
        queryKey: ["shopPayroll", shopId],
        queryFn: () => calculateShopPayroll(shopId!),
        enabled: !!shopId && shopId !== "undefined" && shopId !== "null",
        retry: false,
    });

    const wages = wagesData?.data || [];
    const payroll = payrollData?.data || null;

    const deactivateMutation = useMutation({
        mutationFn: deactivateWage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wages"] });
            queryClient.invalidateQueries({ queryKey: ["shopPayroll"] });
        },
        onError: () => Modal.error({ title: "Failed to deactivate wage" }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteWageById,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wages"] });
            queryClient.invalidateQueries({ queryKey: ["shopPayroll"] });
        },
        onError: () => Modal.error({ title: "Failed to delete wage" }),
    });

    const handleView = async (record: any) => {
        try {
            setLoadingWageId(record._id);
            const res = await fetchWageById(record._id);
            setSelectedWage(res.data);
            setViewDrawerVisible(true);
        } catch {
            Modal.error({ title: "Failed to load wage details" });
        } finally {
            setLoadingWageId(null);
        }
    };

    const handleDeactivate = (record: any) => {
        confirm({
            title: "Deactivate Wage",
            content: `Deactivate wage for ${record.user_id?.fullname || "this employee"}?`,
            okText: "Deactivate",
            okButtonProps: { danger: true, style: { borderRadius: 7 } },
            cancelButtonProps: { style: { borderRadius: 7 } },
            onOk: () => deactivateMutation.mutate(record._id),
        });
    };

    const handleDelete = (record: any) => {
        confirm({
            title: "Delete Wage",
            content: `Permanently delete wage for ${record.user_id?.fullname || "this employee"}? This cannot be undone.`,
            okText: "Delete",
            okButtonProps: { danger: true, style: { borderRadius: 7 } },
            cancelButtonProps: { style: { borderRadius: 7 } },
            onOk: () => deleteMutation.mutate(record._id),
        });
    };

    const filteredWages = wages.filter((wage: any) => {
        if (filters.search) {
            const s = filters.search.toLowerCase();
            if (
                !wage.user_id?.fullname?.toLowerCase().includes(s) &&
                !wage.user_id?.email?.toLowerCase().includes(s)
            ) return false;
        }
        if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
            const d = dayjs(wage.effectiveDate);
            if (!d.isBetween(dayjs(filters.dateRange[0]).startOf("day"), dayjs(filters.dateRange[1]).endOf("day"), null, "[]"))
                return false;
        }
        return true;
    });

    const activeCount = filteredWages.filter((w: any) => w.isActive).length;
    const inactiveCount = filteredWages.filter((w: any) => !w.isActive).length;

    const setFilter = (k: string, v: any) => setFilters((f) => ({ ...f, [k]: v }));

    // ── Desktop table columns ─────────────────────────────────────────────────
    const columns = [
        {
            title: "Employee",
            dataIndex: ["user_id", "fullname"],
            key: "employee",
            render: (text: string, record: any) => (
                <div>
                    <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>{text || "N/A"}</Text>
                    <Text style={{ fontSize: 11, color: C.subText }}>{record.user_id?.email || ""}</Text>
                </div>
            ),
        },
        {
            title: "Type",
            dataIndex: "wageType",
            key: "wageType",
            width: 100,
            render: (type: string) => <WageTypeTag type={type} />,
        },
        {
            title: "Base Amount",
            dataIndex: "baseAmount",
            key: "baseAmount",
            width: 140,
            render: (amount: number, record: any) => (
                <Text strong style={{ fontSize: 13, color: C.darkText }}>{fmtK(amount || 0, record.currency)}</Text>
            ),
        },
        {
            title: "Allowances",
            key: "allowances",
            width: 130,
            render: (_: any, record: any) => {
                const total = record.allowances?.reduce((s: number, a: any) => s + (a.amount || 0), 0) || 0;
                return (
                    <Text strong style={{ color: C.green, fontSize: 12 }}>
                        + {fmtK(total, record.currency)}
                    </Text>
                );
            },
        },
        {
            title: "Deductions",
            key: "deductions",
            width: 130,
            render: (_: any, record: any) => {
                const total = record.deductions?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0;
                return (
                    <Text strong style={{ color: C.red, fontSize: 12 }}>
                        − {fmtK(total, record.currency)}
                    </Text>
                );
            },
        },
        {
            title: "Net Wage",
            key: "netWage",
            width: 150,
            render: (_: any, record: any) => {
                const net = calcNet(record);
                return (
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 10px", display: "inline-block" }}>
                        <Text strong style={{ fontSize: 13, color: C.primary }}>{fmtK(net, record.currency)}</Text>
                    </div>
                );
            },
        },
        {
            title: "Effective Date",
            dataIndex: "effectiveDate",
            key: "effectiveDate",
            width: 130,
            render: (date: string) => (
                <Space size={4}>
                    <CalendarOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
                    <Text style={{ fontSize: 12, color: C.subText }}>{dayjs(date).format("MMM DD, YYYY")}</Text>
                </Space>
            ),
        },
        {
            title: "Status",
            dataIndex: "isActive",
            key: "isActive",
            width: 100,
            render: (active: boolean) => <StatusTag active={active} />,
        },
        {
            title: "Actions",
            key: "actions",
            fixed: "right" as const,
            width: 120,
            render: (_: any, record: any) => (
                <Space size={6}>
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        loading={loadingWageId === record._id}
                        onClick={() => handleView(record)}
                        style={{ borderRadius: 6, border: `1px solid ${C.border}`, background: "#f8fafc", width: 30, height: 30, padding: 0 }}
                    />
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => { setEditingWage(record); setIsModalVisible(true); }}
                        style={{ borderRadius: 6, border: `1px solid ${C.border}`, background: "#f8fafc", width: 30, height: 30, padding: 0 }}
                    />
                    {record.isActive ? (
                        <Button
                            type="text"
                            danger
                            icon={<StopOutlined />}
                            onClick={() => handleDeactivate(record)}
                            style={{ borderRadius: 6, width: 30, height: 30, padding: 0 }}
                        />
                    ) : (
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(record)}
                            style={{ borderRadius: 6, width: 30, height: 30, padding: 0 }}
                        />
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: isMobile ? "12px 10px" : "24px" }}>
            {/* ── Page header ───────────────────────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <Space size={10}>
                    <div style={{ background: C.primaryLight, borderRadius: 9, padding: "7px 8px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
                        <DollarOutlined />
                    </div>
                    <div>
                        <Title level={isMobile ? 5 : 4} style={{ margin: 0, color: C.darkText }}>Employee Wages</Title>
                        <Text style={{ fontSize: 12, color: C.subText }}>Manage employee wage structures</Text>
                    </div>
                </Space>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => { setEditingWage(null); setIsModalVisible(true); }}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 500, height: 36 }}
                >
                    {isMobile ? "Add" : "Add Wage"}
                </Button>
            </div>

            {/* ── KPI strip ─────────────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                <KpiCard label="Total" value={filteredWages.length} icon={<HistoryOutlined />} color={C.indigo} bg="#eef2ff" />
                <KpiCard label="Active" value={activeCount} icon={<CheckCircleOutlined />} color={C.green} bg="#f0fdf4" />
                <KpiCard label="Inactive" value={inactiveCount} icon={<StopOutlined />} color={C.orange} bg="#fffbeb" />
                {payroll && (
                    <KpiCard
                        label="Monthly Payroll"
                        value={fmtK(payroll.totalPayroll || 0)}
                        icon={<DollarOutlined />}
                        color={C.primary}
                        bg={C.primaryLight}
                    />
                )}
            </div>

            {/* ── Filters ───────────────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <Input
                    placeholder="Search employees…"
                    prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                    value={filters.search}
                    onChange={(e) => setFilter("search", e.target.value)}
                    allowClear
                    style={{ width: isMobile ? "100%" : 230, borderRadius: 8, height: 36 }}
                />
                <RangePicker
                    value={filters.dateRange as any}
                    onChange={(dates) => setFilter("dateRange", dates)}
                    placeholder={["From", "To"]}
                    format="MMM DD, YYYY"
                    style={{ borderRadius: 8, height: 36, flex: isMobile ? 1 : undefined }}
                />
                <Select
                    placeholder="Wage Type"
                    value={filters.wageType}
                    onChange={(v) => setFilter("wageType", v)}
                    allowClear
                    style={{ width: 130, borderRadius: 8 }}
                    options={[
                        { value: "daily", label: "Daily" },
                        { value: "weekly", label: "Weekly" },
                        { value: "monthly", label: "Monthly" },
                    ]}
                />
                <Select
                    placeholder="Status"
                    value={filters.isActive}
                    onChange={(v) => setFilter("isActive", v)}
                    allowClear
                    style={{ width: 120, borderRadius: 8 }}
                    options={[
                        { value: "true", label: "Active" },
                        { value: "false", label: "Inactive" },
                    ]}
                />
            </div>

            {/* ── Mobile card list ──────────────────────────────────────────────── */}
            {isMobile ? (
                isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: `1px solid ${C.border}` }} bodyStyle={{ padding: 14 }}>
                            <Skeleton active paragraph={{ rows: 3 }} />
                        </Card>
                    ))
                ) : filteredWages.length === 0 ? (
                    <Empty description="No wages found" style={{ padding: "40px 0" }} />
                ) : (
                    filteredWages.map((record: any) => (
                        <WageCard
                            key={record._id}
                            record={record}
                            onView={handleView}
                            onEdit={(r) => { setEditingWage(r); setIsModalVisible(true); }}
                            onDeactivate={handleDeactivate}
                            onDelete={handleDelete}
                            loadingId={loadingWageId}
                        />
                    ))
                )
            ) : (
                /* ── Desktop table ──────────────────────────────────────────────── */
                <Card style={{ borderRadius: 12, border: `1px solid ${C.border}` }} bodyStyle={{ padding: 0 }}>
                    <Table
                        columns={columns}
                        dataSource={filteredWages}
                        rowKey="_id"
                        loading={isLoading}
                        scroll={{ x: 1300 }}
                        size="middle"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => (
                                <Text style={{ fontSize: 12, color: C.subText }}>{range[0]}–{range[1]} of {total} wages</Text>
                            ),
                        }}
                        rowClassName={(record) => record.isActive ? "" : "row-inactive"}
                    />
                </Card>
            )}

            {/* ── WageForm modal ────────────────────────────────────────────────── */}
            {isModalVisible && (
                <WageForm
                    visible={isModalVisible}
                    onCancel={() => { setIsModalVisible(false); setEditingWage(null); }}
                    editingWage={editingWage}
                />
            )}

            {/* ── View drawer ───────────────────────────────────────────────────── */}
            <WageDrawer
                wage={selectedWage}
                open={viewDrawerVisible}
                isMobile={isMobile}
                onClose={() => setViewDrawerVisible(false)}
            />
        </div>
    );
};

export default WagesList;