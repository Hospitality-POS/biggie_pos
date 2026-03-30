import React, { useEffect, useState } from "react";
import {
    Avatar, Button, InputNumber,
    message, Select, Skeleton, Tag, Typography,
} from "antd";
import {
    CheckOutlined, EditOutlined,
    ReloadOutlined, SaveOutlined, UserOutlined,
} from "@ant-design/icons";
import { fetchAllUsersList } from "@services/users";
import { useAppSelector, useAppDispatch } from "src/store";
import {
    fetchLeaveBalance, seedLeaveBalance,
    LeaveBalance, LeaveType,
} from "@services/hr/leave";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444",
    blue: "#3b82f6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
    white: "#ffffff",
};

// ── Width hook ────────────────────────────────────────────────────────────────
const useWindowWidth = () => {
    const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return w;
};

const LEAVE_TYPES: LeaveType[] = ["Annual", "Sick", "Emergency", "Maternity", "Paternity", "Unpaid"];

const TYPE_COLOR: Record<LeaveType, string> = {
    Annual: C.blue,
    Sick: C.red,
    Emergency: C.orange,
    Maternity: "#8b5cf6",
    Paternity: "#6366f1",
    Unpaid: C.subText,
};

const DEFAULT_ENTITLEMENTS: Record<LeaveType, number> = {
    Annual: 21, Sick: 10, Emergency: 3,
    Maternity: 90, Paternity: 5, Unpaid: 0,
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
    value: y, label: String(y),
}));

// ── Single leave-type row inside the editor ───────────────────────────────────
const LeaveTypeRow: React.FC<{
    type: LeaveType;
    balance?: LeaveBalance;
    entitled: number;
    isMobile: boolean;
    onChange: (type: LeaveType, value: number) => void;
}> = ({ type, balance, entitled, isMobile, onChange }) => {
    const color = TYPE_COLOR[type];
    const used = balance?.used ?? 0;
    const pending = balance?.pending ?? 0;
    const remaining = balance?.remaining ?? entitled;

    return (
        <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
        }}>
            {/* Top: type label + entitled input */}
            <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 10, marginBottom: 8,
                flexWrap: "wrap",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        width: 9, height: 9, borderRadius: "50%",
                        background: color, flexShrink: 0,
                    }} />
                    <Text strong style={{ fontSize: 13, color: C.darkText }}>{type}</Text>
                    {!balance && (
                        <Tag style={{
                            background: "#fef2f2", color: C.red, border: "none",
                            borderRadius: 6, fontSize: 9, padding: "1px 6px", margin: 0,
                        }}>
                            Not set
                        </Tag>
                    )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 11, color: C.subText }}>Entitled:</Text>
                    <InputNumber
                        min={0} max={365}
                        value={entitled}
                        onChange={(v) => onChange(type, v ?? 0)}
                        size="small"
                        style={{ width: 68, borderRadius: 6 }}
                    />
                    <Text style={{ fontSize: 11, color: C.subText }}>days</Text>
                </div>
            </div>

            {/* Stats row — only if balance exists */}
            {balance && (
                <div style={{
                    display: "flex", gap: 12,
                    background: C.bg, borderRadius: 7, padding: "7px 10px",
                }}>
                    {[
                        { label: "Used", value: used, color: used > 0 ? C.orange : C.subText },
                        { label: "Pending", value: pending, color: pending > 0 ? C.blue : C.subText },
                        { label: "Left", value: remaining, color: remaining > 0 ? C.green : C.red },
                    ].map(({ label, value, color: col }) => (
                        <div key={label} style={{ textAlign: "center" }}>
                            <Text style={{ fontSize: 9, color: C.subText, display: "block", fontWeight: 600, letterSpacing: "0.3px" }}>
                                {label.toUpperCase()}
                            </Text>
                            <Text strong style={{ fontSize: 13, color: col }}>{value}</Text>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Staff balance card ────────────────────────────────────────────────────────
const StaffBalanceCard: React.FC<{
    staff: any;
    year: number;
    isMobile: boolean;
    onSaved: () => void;
}> = ({ staff, year, isMobile, onSaved }) => {
    const dispatch = useAppDispatch();

    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [entitlements, setEntitlements] = useState<Record<LeaveType, number>>({ ...DEFAULT_ENTITLEMENTS });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchLeaveBalance(staff._id, year);
            const bals: LeaveBalance[] = data?.balances || [];
            setBalances(bals);
            const filled = { ...DEFAULT_ENTITLEMENTS };
            bals.forEach((b) => { if (b.leave_type in filled) (filled as any)[b.leave_type] = b.entitled; });
            setEntitlements(filled);
        } catch { /* use defaults */ }
        finally { setLoading(false); }
    };

    useEffect(() => { if (expanded) load(); }, [expanded, year]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await dispatch(seedLeaveBalance({
                staff_id: staff._id, year,
                entitlements: LEAVE_TYPES.map((t) => ({ leave_type: t, entitled: entitlements[t] })),
            })).unwrap();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            onSaved();
            load();
        } catch { /* error shown by service */ }
        finally { setSaving(false); }
    };

    const isSetUp = balances.length > 0;

    return (
        <div style={{
            background: C.white,
            border: `1px solid ${isSetUp ? C.border : C.orange + "60"}`,
            borderLeft: `3px solid ${isSetUp ? C.green : C.orange}`,
            borderRadius: 12, marginBottom: 8, overflow: "hidden",
        }}>
            {/* Header — tap to expand */}
            <div
                onClick={() => setExpanded((v) => !v)}
                style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: isMobile ? "12px 14px" : "12px 16px",
                    cursor: "pointer", gap: 10,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar size={34} src={staff.thumbnail} icon={<UserOutlined />}
                        style={{ background: C.primaryLight, color: C.primary, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                            {staff.fullname || staff.username}
                        </Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>
                            {staff.roleId?.role_type || staff.role?.role_type || "Staff"}
                        </Text>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {isSetUp ? (
                        <Tag style={{
                            background: "#f0fdf4", color: C.green, border: "none",
                            borderRadius: 6, fontSize: 11, padding: "2px 8px", margin: 0,
                        }}>
                            <CheckOutlined style={{ marginRight: 3 }} />Set up
                        </Tag>
                    ) : (
                        <Tag style={{
                            background: "#fffbeb", color: C.orange, border: "none",
                            borderRadius: 6, fontSize: 11, padding: "2px 8px", margin: 0,
                        }}>
                            Not configured
                        </Tag>
                    )}
                    <EditOutlined style={{ color: C.subText, fontSize: 13 }} />
                </div>
            </div>

            {/* Expanded editor */}
            {expanded && (
                <div style={{ borderTop: `1px solid ${C.border}` }}>
                    {loading ? (
                        <div style={{ padding: "16px" }}>
                            <Skeleton active paragraph={{ rows: 4 }} />
                        </div>
                    ) : (
                        <>
                            {LEAVE_TYPES.map((type) => (
                                <LeaveTypeRow
                                    key={type}
                                    type={type}
                                    balance={balances.find((b) => b.leave_type === type)}
                                    entitled={entitlements[type]}
                                    isMobile={isMobile}
                                    onChange={(t, v) => setEntitlements((p) => ({ ...p, [t]: v }))}
                                />
                            ))}

                            {/* Save / Cancel */}
                            <div style={{
                                padding: "12px 16px",
                                display: "flex", gap: 8,
                                flexDirection: isMobile ? "column" : "row",
                                justifyContent: isMobile ? "stretch" : "flex-end",
                            }}>
                                <Button
                                    size="small" onClick={() => setExpanded(false)}
                                    block={isMobile}
                                    style={{ borderRadius: 7, height: isMobile ? 38 : undefined }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="primary" size="small"
                                    icon={saved ? <CheckOutlined /> : <SaveOutlined />}
                                    loading={saving} onClick={handleSave}
                                    block={isMobile}
                                    style={{
                                        background: saved ? C.green : C.primary,
                                        borderColor: saved ? C.green : C.primary,
                                        borderRadius: 7, transition: "background 0.3s",
                                        height: isMobile ? 38 : undefined,
                                    }}
                                >
                                    {saved ? "Saved!" : "Save Entitlements"}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const LeaveBalanceSetup: React.FC = () => {
    const width = useWindowWidth();
    const isMobile = width < 768;

    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(currentYear);
    const [search, setSearch] = useState("");
    const [refresh, setRefresh] = useState(0);

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchAllUsersList({});
            const filtered = (data || []).filter(
                (u: any) => {
                    const rt = (u.roleId?.role_type || u.role?.role_type || "").toLowerCase();
                    return rt !== "admin";
                }
            );
            setStaff(filtered);
        } catch { message.error("Failed to load staff"); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [refresh]);

    const filteredStaff = staff.filter((s) =>
        !search ||
        s.fullname?.toLowerCase().includes(search.toLowerCase()) ||
        s.username?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: isMobile ? "12px" : "16px 20px" }}>

            {/* ── Info box ── */}
            <div style={{
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "12px 16px", marginBottom: 14,
            }}>
                <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", marginBottom: 4 }}>
                    Leave Entitlements
                </Text>
                <Text style={{ fontSize: 12, color: C.subText, lineHeight: 1.6 }}>
                    Set the number of leave days each staff member is entitled to per year.
                    Staff can't request leave for a type that hasn't been configured.
                    Tap any staff member to expand and edit.
                </Text>
            </div>

            {/* ── Controls ── */}
            <div style={{
                display: "flex", gap: 8, marginBottom: 12,
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap", alignItems: isMobile ? "stretch" : "center",
            }}>
                <input
                    placeholder="Search staff…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        flex: 1, minWidth: 0,
                        height: 32, borderRadius: 7,
                        border: `1px solid ${C.border}`,
                        padding: "0 10px", fontSize: 13,
                        outline: "none", color: C.darkText, background: C.white,
                    }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                    <Select
                        value={year} onChange={setYear} size="small"
                        style={{ width: isMobile ? "50%" : 90 }}
                        options={YEAR_OPTIONS}
                    />
                    <Button
                        size="small" icon={<ReloadOutlined />}
                        onClick={() => setRefresh((r) => r + 1)}
                        loading={loading}
                        style={{
                            borderRadius: 7, borderColor: C.border,
                            flex: isMobile ? 1 : undefined,
                        }}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* ── Defaults notice ── */}
            <div style={{
                background: C.primaryLight, border: `1px solid ${C.primary}25`,
                borderRadius: 8, padding: "10px 14px", marginBottom: 14,
            }}>
                <Text style={{ fontSize: 12, color: C.primary, lineHeight: 1.6 }}>
                    <strong>Defaults:</strong>{" "}
                    {LEAVE_TYPES.map((t) => `${t} ${DEFAULT_ENTITLEMENTS[t]}d`).join(" · ")}.
                    Expand each staff member to customise.
                </Text>
            </div>

            {/* ── Staff list ── */}
            {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{
                        background: C.white, border: `1px solid ${C.border}`,
                        borderRadius: 12, padding: "12px 16px", marginBottom: 8,
                    }}>
                        <Skeleton active avatar paragraph={false} />
                    </div>
                ))
            ) : filteredStaff.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <Text style={{ fontSize: 13, color: C.subText }}>No staff found</Text>
                </div>
            ) : (
                filteredStaff.map((s) => (
                    <StaffBalanceCard
                        key={s._id} staff={s} year={year}
                        isMobile={isMobile} onSaved={() => { }}
                    />
                ))
            )}
        </div>
    );
};

export default LeaveBalanceSetup;