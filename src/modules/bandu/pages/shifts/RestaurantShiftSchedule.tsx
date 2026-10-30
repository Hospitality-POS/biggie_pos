import React, { useEffect, useRef, useState } from "react";
import {
    Avatar, Button, Empty, message,
    Popconfirm, Popover, Segmented, Spin, Typography,
} from "antd";
import {
    ClockCircleOutlined, DeleteOutlined, EditOutlined,
    FilePdfOutlined, LeftOutlined, PlusOutlined,
    RightOutlined, SolutionOutlined, UserOutlined,
} from "@ant-design/icons";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import EmployeeShiftModal from "@components/MODALS/pro/EmployeeShiftModal";
import { deleteShift, fetchAllShifts } from "@services/shifts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchAllUsersList } from "@services/users";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";

import { THEME_C, getPrimaryColor } from "@utils/getPrimaryColor";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    ...THEME_C,
    get primary() { return THEME_C.primary; },
    get primaryLight() { return THEME_C.primaryLight; },
    line: "#eef2f6",
    todayTint: "#f5f9ff",
};

const getEmployeeColors = () => [
    getPrimaryColor(), "#0958d9", "#531dab", "#006d75", "#d4380d",
    "#7265e6", "#00a2ae", "#52c41a", "#eb2f96", "#fa8c16",
    "#a0d911", "#13c2c2", "#faad14", "#c41d7f", "#0050b3",
    "#1d3557", "#2d6a4f", "#9d4edd", "#e85d04", "#588157",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const FULL_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_FILTERS = [
    { value: "all", label: "All day" },
    { value: "morning", label: "Morning" },
    { value: "afternoon", label: "Afternoon" },
    { value: "evening", label: "Evening" },
];

const EMPLOYEE_COL = 200;

// Hover-only affordances (the "+" in empty cells, row highlight).
const SCHEDULE_CSS = `
.rss-row:hover .rss-cell { background: #fafbfc; }
.rss-row:hover .rss-cell.rss-today { background: #eef5ff; }
.rss-cell .rss-add { opacity: 0; transition: opacity .12s; }
.rss-cell.rss-empty:hover .rss-add { opacity: 1; }
.rss-chip { transition: transform .1s, box-shadow .1s; }
.rss-chip:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(15,23,42,.08); }
`;

// ── Hooks ──────────────────────────────────────────────────────────────────
const useWindowWidth = () => {
    const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return w;
};

// ── Helpers ────────────────────────────────────────────────────────────────
const getEmployeeColor = (users: any[], employeeId: string) => {
    const idx = users?.findIndex((u) => u._id === employeeId) ?? 0;
    const colors = getEmployeeColors();
    return colors[Math.max(0, idx) % colors.length];
};

/** Shift length in hours; an end time at or before the start runs past midnight. */
const shiftHours = (s: any) => {
    const [sh, sm] = String(s?.startTime ?? "").split(":").map(Number);
    const [eh, em] = String(s?.endTime ?? "").split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return mins / 60;
};

const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}h`;

const weekLabel = (start: dayjs.Dayjs) => {
    const end = start.add(6, "day");
    if (start.year() !== end.year()) return `${start.format("D MMM YYYY")} – ${end.format("D MMM YYYY")}`;
    if (start.month() !== end.month()) return `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`;
    return `${start.format("D")} – ${end.format("D MMM YYYY")}`;
};

// ══════════════════════════════════════════════════════════════════════════
// SHIFT CHIP (shared by desktop grid and mobile day view)
// ══════════════════════════════════════════════════════════════════════════
const ShiftChip: React.FC<{ shift: any; color: string; large?: boolean }> = ({ shift, color, large }) => (
    <div
        className="rss-chip"
        style={{
            background: `${color}14`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 6,
            padding: large ? "8px 10px" : "5px 8px",
            cursor: "pointer",
            minWidth: 0,
            printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
        } as React.CSSProperties}
    >
        <div style={{
            fontSize: large ? 13 : 11.5, fontWeight: 600, color: C.darkText, lineHeight: 1.3,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
            {shift?.startTime} – {shift?.endTime}
        </div>
        <div style={{ fontSize: large ? 11 : 10, color: C.subText, lineHeight: 1.3 }}>
            {fmtHours(shiftHours(shift))}
        </div>
    </div>
);

// ══════════════════════════════════════════════════════════════════════════
// DESKTOP: SHIFT WITH HOVER ACTIONS
// ══════════════════════════════════════════════════════════════════════════
const DesktopShift: React.FC<{
    shift: any; color: string;
    onEdit: (s: any) => void; onDelete: (id: string) => void;
}> = ({ shift, color, onEdit, onDelete }) => {
    const popContent = (
        <div style={{ width: 210 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <Text strong style={{ fontSize: 13 }}>{shift?.employee_id?.fullname}</Text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, paddingLeft: 16 }}>
                <ClockCircleOutlined style={{ color: C.subText, fontSize: 11 }} />
                <Text style={{ fontSize: 12, color: C.subText }}>
                    {shift?.dayOfWeek} · {shift?.startTime} – {shift?.endTime} ({fmtHours(shiftHours(shift))})
                </Text>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
                <Button size="small" icon={<EditOutlined />} style={{ flex: 1, borderRadius: 6 }}
                    onClick={(e) => { e.stopPropagation(); onEdit(shift); }}>Edit</Button>
                <Popconfirm title="Delete this shift?" okText="Delete" okType="danger" cancelText="Cancel"
                    onConfirm={(e) => { e?.stopPropagation(); onDelete(shift._id); }}>
                    <Button size="small" icon={<DeleteOutlined />} danger style={{ flex: 1, borderRadius: 6 }}
                        onClick={(e) => e.stopPropagation()}>Delete</Button>
                </Popconfirm>
            </div>
        </div>
    );

    return (
        <Popover content={popContent} trigger="hover" placement="top" mouseEnterDelay={0.25}>
            <div onClick={(e) => { e.stopPropagation(); onEdit(shift); }}>
                <ShiftChip shift={shift} color={color} />
            </div>
        </Popover>
    );
};

// ══════════════════════════════════════════════════════════════════════════
// DESKTOP GRID VIEW
// ══════════════════════════════════════════════════════════════════════════
const DesktopGrid: React.FC<{
    users: any[]; weekDays: dayjs.Dayjs[];
    getShifts: (uid: string, day: dayjs.Dayjs) => any[];
    scheduleRef: React.RefObject<HTMLDivElement>;
    onCellClick: (uid: string, dow: string, day: dayjs.Dayjs) => void;
    onEdit: (s: any) => void; onDelete: (id: string) => void;
}> = ({ users, weekDays, getShifts, scheduleRef, onCellClick, onEdit, onDelete }) => {
    const gridCols = `${EMPLOYEE_COL}px repeat(7, minmax(96px, 1fr))`;
    const stickyCell: React.CSSProperties = {
        position: "sticky", left: 0, zIndex: 1, background: C.white,
        borderRight: `1px solid ${C.line}`,
    };

    return (
        <div ref={scheduleRef} style={{ minWidth: EMPLOYEE_COL + 7 * 96, background: C.white }}>
            {/* Day header */}
            <div style={{ display: "grid", gridTemplateColumns: gridCols, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ ...stickyCell, padding: "12px 20px", display: "flex", alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 11, fontWeight: 600, color: C.subText, letterSpacing: "0.3px" }}>
                        Staff
                    </Text>
                </div>
                {weekDays.map((day, i) => {
                    const isToday = day.isSame(dayjs(), "day");
                    return (
                        <div key={i} style={{
                            padding: "10px 4px 8px", textAlign: "center",
                            background: isToday ? C.todayTint : C.white,
                            borderRight: i < 6 ? `1px solid ${C.line}` : "none",
                        }}>
                            <Text style={{
                                fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4,
                                color: isToday ? C.primary : C.subText,
                            }}>
                                {FULL_SHORT[day.day()]}
                            </Text>
                            <span style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 28, height: 28, borderRadius: "50%",
                                fontSize: 14, fontWeight: 700,
                                background: isToday ? C.primary : "transparent",
                                color: isToday ? "#fff" : C.darkText,
                            }}>
                                {day.format("D")}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Employee rows */}
            {users?.map((user, ui) => {
                const color = getEmployeeColor(users, user._id);
                const weekShifts = weekDays.flatMap((d) => getShifts(user._id, d));
                const weekHours = weekShifts.reduce((s, sh) => s + shiftHours(sh), 0);
                return (
                    <div key={user._id} className="rss-row" style={{
                        display: "grid", gridTemplateColumns: gridCols,
                        borderBottom: ui < users.length - 1 ? `1px solid ${C.line}` : "none",
                    }}>
                        <div className="rss-cell" style={{
                            ...stickyCell, padding: "10px 20px",
                            display: "flex", alignItems: "center", gap: 10, minHeight: 64,
                        }}>
                            <Avatar size={32} src={user.thumbnail} icon={<UserOutlined />}
                                style={{ background: color, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <Text style={{
                                    fontSize: 13, fontWeight: 600, color: C.darkText, display: "block",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                    {user.fullname}
                                </Text>
                                <Text style={{ fontSize: 11, color: C.subText }}>
                                    {weekShifts.length
                                        ? `${weekShifts.length} shift${weekShifts.length === 1 ? "" : "s"} · ${fmtHours(weekHours)}`
                                        : "No shifts"}
                                </Text>
                            </div>
                        </div>
                        {weekDays.map((day, di) => {
                            const isToday = day.isSame(dayjs(), "day");
                            const shifts = getShifts(user._id, day);
                            const empty = shifts.length === 0;
                            return (
                                <div key={di}
                                    className={`rss-cell${isToday ? " rss-today" : ""}${empty ? " rss-empty" : ""}`}
                                    onClick={() => { if (empty) onCellClick(user._id, DAYS[day.day()], day); }}
                                    style={{
                                        padding: 6, minHeight: 64,
                                        borderRight: di < 6 ? `1px solid ${C.line}` : "none",
                                        background: isToday ? C.todayTint : C.white,
                                        cursor: empty ? "pointer" : "default",
                                        display: "flex", flexDirection: "column", gap: 4,
                                    }}
                                >
                                    {shifts.map((s: any) => (
                                        <DesktopShift key={s._id} shift={s} color={color} onEdit={onEdit} onDelete={onDelete} />
                                    ))}
                                    {empty && (
                                        <div className="rss-add" style={{
                                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                                            border: `1px dashed ${C.border}`, borderRadius: 6,
                                            color: C.subText, fontSize: 11, gap: 4,
                                        }}>
                                            <PlusOutlined style={{ fontSize: 10 }} /> Add
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════
// MOBILE: WEEK DAY SELECTOR BAR
// ══════════════════════════════════════════════════════════════════════════
const MobileDayBar: React.FC<{
    weekDays: dayjs.Dayjs[];
    selected: number;
    onSelect: (i: number) => void;
    shiftsPerDay: number[];
}> = ({ weekDays, selected, onSelect, shiftsPerDay }) => (
    <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        padding: "8px 8px 10px", gap: 2,
        borderBottom: `1px solid ${C.border}`,
    }}>
        {weekDays.map((day, i) => {
            const isToday = day.isSame(dayjs(), "day");
            const isSelected = selected === i;
            const hasShifts = shiftsPerDay[i] > 0;
            return (
                <button
                    key={i}
                    onClick={() => onSelect(i)}
                    style={{
                        all: "unset",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 4,
                        padding: "6px 0", borderRadius: 10, cursor: "pointer",
                        background: isSelected ? C.primaryLight : "transparent",
                    }}
                >
                    <Text style={{
                        fontSize: 10, fontWeight: 600, lineHeight: 1,
                        color: isSelected || isToday ? C.primary : C.subText,
                    }}>
                        {SHORT_DAYS[day.day()]}
                    </Text>
                    <span style={{
                        width: 30, height: 30, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700, lineHeight: 1,
                        background: isSelected ? C.primary : "transparent",
                        color: isSelected ? "#fff" : isToday ? C.primary : C.darkText,
                        boxShadow: isToday && !isSelected ? `inset 0 0 0 1.5px ${C.primary}` : "none",
                    }}>
                        {day.format("D")}
                    </span>
                    <span style={{
                        width: 4, height: 4, borderRadius: "50%",
                        background: hasShifts ? (isSelected ? C.primary : C.subText) : "transparent",
                    }} />
                </button>
            );
        })}
    </div>
);

// ══════════════════════════════════════════════════════════════════════════
// MOBILE: SHIFTS FOR SELECTED DAY (list of employees)
// ══════════════════════════════════════════════════════════════════════════
const MobileDayView: React.FC<{
    users: any[]; day: dayjs.Dayjs;
    getShifts: (uid: string, day: dayjs.Dayjs) => any[];
    onAddShift: (uid: string, dow: string, day: dayjs.Dayjs) => void;
    onEdit: (s: any) => void; onDelete: (id: string) => void;
}> = ({ users, day, getShifts, onAddShift, onEdit, onDelete }) => {
    const isToday = day.isSame(dayjs(), "day");
    const scheduled = users.filter((u) => getShifts(u._id, day).length > 0);
    const unscheduled = users.filter((u) => getShifts(u._id, day).length === 0);

    return (
        <div style={{ padding: "14px 14px 16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <Text strong style={{ fontSize: 15, color: C.darkText }}>
                    {day.format("dddd, D MMM")}
                    {isToday && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: C.primary }}>Today</span>}
                </Text>
                <Text style={{ fontSize: 12, color: C.subText }}>
                    {scheduled.length} on shift
                </Text>
            </div>

            {scheduled.length === 0 && (
                <div style={{
                    padding: "18px 12px", marginBottom: 12, textAlign: "center",
                    border: `1px dashed ${C.border}`, borderRadius: 10,
                }}>
                    <Text style={{ fontSize: 12, color: C.subText }}>Nobody is scheduled this day</Text>
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scheduled.map((user) => {
                    const color = getEmployeeColor(users, user._id);
                    const shifts = getShifts(user._id, day);
                    return (
                        <div key={user._id} style={{
                            border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, background: C.white,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                <Avatar size={30} src={user.thumbnail} icon={<UserOutlined />}
                                    style={{ background: color, flexShrink: 0 }} />
                                <Text strong style={{ fontSize: 13, color: C.darkText, flex: 1, minWidth: 0 }}>{user.fullname}</Text>
                                <Button size="small" type="text" icon={<PlusOutlined />}
                                    onClick={() => onAddShift(user._id, DAYS[day.day()], day)}
                                    style={{ color: C.primary, fontWeight: 600, fontSize: 12 }}>
                                    Add
                                </Button>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {shifts.map((shift: any) => (
                                    <div key={shift._id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ flex: 1, minWidth: 0 }} onClick={() => onEdit(shift)}>
                                            <ShiftChip shift={shift} color={color} large />
                                        </div>
                                        <Button icon={<EditOutlined />} aria-label="Edit shift"
                                            onClick={() => onEdit(shift)} style={{ borderRadius: 8 }} />
                                        <Popconfirm title="Delete this shift?" okText="Delete"
                                            okType="danger" cancelText="Cancel" placement="topRight"
                                            onConfirm={() => onDelete(shift._id)}>
                                            <Button icon={<DeleteOutlined />} danger aria-label="Delete shift" style={{ borderRadius: 8 }} />
                                        </Popconfirm>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {unscheduled.length > 0 && (
                <>
                    <Text style={{
                        display: "block", margin: "16px 0 8px",
                        fontSize: 11, fontWeight: 600, color: C.subText, letterSpacing: "0.3px",
                    }}>
                        Not scheduled
                    </Text>
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                        {unscheduled.map((user, i) => (
                            <div key={user._id} style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                                borderTop: i ? `1px solid ${C.line}` : "none", background: C.white,
                            }}>
                                <Avatar size={26} src={user.thumbnail} icon={<UserOutlined />}
                                    style={{ background: getEmployeeColor(users, user._id), flexShrink: 0 }} />
                                <Text style={{ fontSize: 13, color: C.darkText, flex: 1, minWidth: 0 }}>{user.fullname}</Text>
                                <Button size="small" type="text" icon={<PlusOutlined />}
                                    onClick={() => onAddShift(user._id, DAYS[day.day()], day)}
                                    style={{ color: C.primary, fontWeight: 600, fontSize: 12 }}>
                                    Add
                                </Button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
const RestaurantShiftSchedule: React.FC = () => {
    const width = useWindowWidth();
    const isMobile = width < 768;

    const actionRef = useRef<{ reset: () => void }>({ reset: () => { /* no-op */ } });
    const scheduleRef = useRef<HTMLDivElement>(null);
    const newBtnRef = useRef<HTMLDivElement>(null);
    const editBtnRef = useRef<HTMLDivElement>(null);

    const [currentDate, setCurrentDate] = useState(dayjs());
    const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
        const today = dayjs();
        const startOfWeek = today.startOf("week");
        const diff = today.diff(startOfWeek, "day");
        return Math.max(0, Math.min(6, diff));
    });
    const [timeFilter, setTimeFilter] = useState("all");
    const [exportLoading, setExportLoading] = useState(false);
    const [currentShift, setCurrentShift] = useState<any>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const shopId = localStorage.getItem("shopId");

    const { data: shifts, isLoading: isLoadingShifts, refetch: refetchShifts } = useQuery({
        queryKey: ["shifts"],
        queryFn: fetchAllShifts,
        retry: 1,
        networkMode: "always",
    });

    const { data: users } = useQuery({
        queryKey: ["users", shopId],
        enabled: !!shopId,
        queryFn: () => fetchAllUsersList({ fullname: "", email: "", shop_id: shopId! }),
        retry: 1,
        networkMode: "always",
        select: (data: any[]) =>
            data?.filter((u: any) => {
                const rt = u.roleId?.role_type?.toLowerCase() ?? u.role?.role_type?.toLowerCase();
                const isSuspended = u.is_suspended === true || u.status === "suspended";
                return rt !== "admin" && rt !== "cleaner" && !isSuspended;
            }) ?? [],
    });

    const deleteMutation = useMutation({
        mutationFn: deleteShift,
        onSuccess: () => { refetchShifts(); message.success("Shift deleted"); },
        onError: () => message.error("Failed to delete shift"),
    });

    const weekStart = currentDate.startOf("week");
    const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
    const isCurrentWeek = weekStart.isSame(dayjs().startOf("week"), "day");

    const getShiftsForCell = (employeeId: string, day: dayjs.Dayjs) => {
        const dow = DAYS[day.day()];
        let filtered = (shifts ?? []).filter(
            (s: any) => s.employee_id?._id === employeeId && s.dayOfWeek === dow
        );
        if (timeFilter !== "all") {
            filtered = filtered.filter((s: any) => {
                const h = parseInt(s.startTime.split(":")[0]);
                if (timeFilter === "morning" && h < 12) return true;
                if (timeFilter === "afternoon" && h >= 12 && h < 17) return true;
                if (timeFilter === "evening" && h >= 17) return true;
                return false;
            });
        }
        return filtered.sort((a: any, b: any) => String(a.startTime).localeCompare(String(b.startTime)));
    };

    const triggerNewModal = () => setTimeout(() => {
        newBtnRef.current?.querySelector("button")?.click();
    }, 50);

    const triggerEditModal = () => setTimeout(() => {
        editBtnRef.current?.querySelector("button")?.click();
    }, 50);

    const handleAddShift = (employeeId: string, dayOfWeek: string, date: dayjs.Dayjs) => {
        const employee = users?.find((u: any) => u._id === employeeId);
        setCurrentShift({ employee_id: employee?._id, dayOfWeek, date: date.format("YYYY-MM-DD") });
        setIsEditMode(false);
        triggerNewModal();
    };

    const handleEditShift = (shift: any) => {
        setCurrentShift(shift);
        setIsEditMode(true);
        triggerEditModal();
    };

    const handleDelete = (shiftId: string) => deleteMutation.mutate(shiftId);

    const exportToPDF = async () => {
        if (!scheduleRef.current) return;
        setExportLoading(true);
        try {
            const canvas = await html2canvas(scheduleRef.current, { scale: 2, useCORS: true });
            const pdf = new jsPDF({ orientation: "landscape", unit: "mm" });
            const imgW = 280;
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, imgW,
                (canvas.height * imgW) / canvas.width);
            pdf.save(`schedule-week-${currentDate.week()}.pdf`);
            message.success("Schedule exported!");
        } catch {
            message.error("Failed to export schedule");
        } finally {
            setExportLoading(false);
        }
    };

    useEffect(() => {
        actionRef.current.reset = () => { setCurrentShift(null); refetchShifts(); };
    }, [refetchShifts]);

    // Shifts count per day for the dot indicator on mobile
    const shiftsPerDay = weekDays.map((day) =>
        (users ?? []).reduce((sum, u) => sum + getShiftsForCell(u._id, day).length, 0)
    );

    // Week summary
    const weekShifts = (users ?? []).flatMap((u) => weekDays.flatMap((d) => getShiftsForCell(u._id, d)));
    const staffScheduled = (users ?? []).filter((u) => weekDays.some((d) => getShiftsForCell(u._id, d).length)).length;
    const weekHours = weekShifts.reduce((s, sh) => s + shiftHours(sh), 0);

    const selectedDay = weekDays[selectedDayIndex];

    const goToToday = () => {
        setCurrentDate(dayjs());
        const diff = dayjs().diff(dayjs().startOf("week"), "day");
        setSelectedDayIndex(Math.max(0, Math.min(6, diff)));
    };

    const summary = [
        { label: "Shifts", value: String(weekShifts.length) },
        { label: "Staff scheduled", value: `${staffScheduled}/${users?.length ?? 0}` },
        { label: "Hours", value: fmtHours(Math.round(weekHours * 10) / 10) },
    ];

    return (
        <div style={{ width: "100%" }}>
            <style>{SCHEDULE_CSS}</style>
            <div style={{
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: "hidden",
                width: "100%",
                background: C.white,
            }}>

                {/* ═══ HEADER ════════════════════════════════════════════ */}
                <div style={{
                    padding: isMobile ? "14px 14px 12px" : "16px 20px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex", flexDirection: "column", gap: 12,
                }}>
                    {/* Title + actions */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <div style={{
                                background: C.primaryLight, borderRadius: 10,
                                padding: "8px 9px", color: C.primary, fontSize: 16, lineHeight: 1,
                            }}>
                                <SolutionOutlined />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>
                                    Staff Schedule
                                </Text>
                                <Text style={{ fontSize: 12, color: C.subText }}>
                                    {weekLabel(weekStart)}
                                </Text>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {!isMobile && (
                                <Button icon={<FilePdfOutlined />} onClick={exportToPDF} loading={exportLoading}
                                    style={{ borderRadius: 8 }}>
                                    Export
                                </Button>
                            )}
                            <Button
                                type="primary" icon={<PlusOutlined />}
                                onClick={() => { setCurrentShift(null); setIsEditMode(false); triggerNewModal(); }}
                                style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}
                            >
                                {isMobile ? "Add" : "New shift"}
                            </Button>
                        </div>
                    </div>

                    {/* Week nav + filter + summary */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Button icon={<LeftOutlined />} aria-label="Previous week"
                                onClick={() => setCurrentDate((d) => d.subtract(1, "week"))}
                                style={{ borderRadius: 8 }} />
                            <Button onClick={goToToday} disabled={isCurrentWeek}
                                style={{ borderRadius: 8, fontWeight: 600 }}>
                                Today
                            </Button>
                            <Button icon={<RightOutlined />} aria-label="Next week"
                                onClick={() => setCurrentDate((d) => d.add(1, "week"))}
                                style={{ borderRadius: 8 }} />
                        </div>

                        {!isMobile && (
                            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                                {summary.map((s) => (
                                    <div key={s.label} style={{ textAlign: "right" }}>
                                        <Text strong style={{ fontSize: 14, color: C.darkText, display: "block", lineHeight: 1.2 }}>{s.value}</Text>
                                        <Text style={{ fontSize: 11, color: C.subText }}>{s.label}</Text>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Segmented
                            value={timeFilter}
                            onChange={(v) => setTimeFilter(String(v))}
                            options={TIME_FILTERS}
                            block={isMobile}
                            style={isMobile ? { width: "100%" } : undefined}
                        />
                    </div>
                </div>

                {/* ═══ BODY ══════════════════════════════════════════════ */}
                <Spin spinning={isLoadingShifts || deleteMutation.isLoading || exportLoading}>
                    {!users || users.length === 0 ? (
                        <Empty description="No employees found" style={{ padding: "60px 0" }} />
                    ) : isMobile ? (
                        <>
                            <MobileDayBar
                                weekDays={weekDays}
                                selected={selectedDayIndex}
                                onSelect={setSelectedDayIndex}
                                shiftsPerDay={shiftsPerDay}
                            />
                            <MobileDayView
                                users={users}
                                day={selectedDay}
                                getShifts={getShiftsForCell}
                                onAddShift={handleAddShift}
                                onEdit={handleEditShift}
                                onDelete={handleDelete}
                            />
                        </>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <DesktopGrid
                                users={users}
                                weekDays={weekDays}
                                scheduleRef={scheduleRef}
                                getShifts={getShiftsForCell}
                                onCellClick={handleAddShift}
                                onEdit={handleEditShift}
                                onDelete={handleDelete}
                            />
                        </div>
                    )}
                </Spin>
            </div>

            {/* Hidden modal triggers */}
            <div style={{ display: "none" }}>
                <div ref={newBtnRef}>
                    <EmployeeShiftModal actionRef={actionRef} edit={false} data={currentShift || {}} />
                </div>
                <div ref={editBtnRef}>
                    <EmployeeShiftModal actionRef={actionRef} edit={true} data={currentShift || {}} />
                </div>
            </div>
        </div>
    );
};

export default RestaurantShiftSchedule;
