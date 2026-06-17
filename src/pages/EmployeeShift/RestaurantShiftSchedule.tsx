import React, { useEffect, useRef, useState } from "react";
import {
    Avatar, Badge, Button, Drawer, Empty, message, Modal,
    Popconfirm, Popover, Select, Spin, Typography,
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

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    todayBg: "#eff6ff",
    todayBorder: "#3b82f6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
    white: "#ffffff",
};

const EMPLOYEE_COLORS = [
    "#6c1c2c", "#0958d9", "#531dab", "#006d75", "#d4380d",
    "#7265e6", "#00a2ae", "#52c41a", "#eb2f96", "#fa8c16",
    "#a0d911", "#13c2c2", "#faad14", "#c41d7f", "#0050b3",
    "#1d3557", "#2d6a4f", "#9d4edd", "#e85d04", "#588157",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const FULL_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    return EMPLOYEE_COLORS[Math.max(0, idx) % EMPLOYEE_COLORS.length];
};

// ══════════════════════════════════════════════════════════════════════════
// DESKTOP: SHIFT PILL
// ══════════════════════════════════════════════════════════════════════════
const ShiftPill: React.FC<{
    shift: any; color: string;
    onEdit: (s: any) => void; onDelete: (id: string) => void;
}> = ({ shift, color, onEdit, onDelete }) => {
    const popContent = (
        <div style={{ width: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <UserOutlined style={{ color: C.subText, fontSize: 12 }} />
                <Text strong style={{ fontSize: 12 }}>{shift?.employee_id?.fullname}</Text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <ClockCircleOutlined style={{ color: C.subText, fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: C.subText }}>{shift?.startTime} – {shift?.endTime}</Text>
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
        <Popover content={popContent} trigger="hover" placement="top">
            <div
                onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
                style={{
                    background: color, color: "#fff", borderRadius: 5,
                    padding: "4px 7px", marginBottom: 3, cursor: "pointer",
                    fontSize: 11, fontWeight: 600,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
                } as React.CSSProperties}
            >
                <ClockCircleOutlined style={{ marginRight: 3, fontSize: 9 }} />
                {shift?.startTime}–{shift?.endTime}
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
}> = ({ users, weekDays, getShifts, scheduleRef, onCellClick, onEdit, onDelete }) => (
    <div ref={scheduleRef} style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        {/* Day header */}
        <div style={{ display: "flex", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
            <div style={{
                width: 180, flexShrink: 0, padding: "12px 16px",
                borderRight: `1px solid ${C.border}`,
                display: "flex", alignItems: "center",
            }}>
                <Text style={{ fontSize: 11, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Employee
                </Text>
            </div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {weekDays.map((day, i) => {
                    const isToday = day.isSame(dayjs(), "day");
                    return (
                        <div key={i} style={{
                            textAlign: "center", padding: "10px 4px",
                            background: isToday ? C.todayBg : C.bg,
                            borderRight: i < 6 ? `1px solid ${C.border}` : "none",
                            borderTop: isToday ? `3px solid ${C.todayBorder}` : "3px solid transparent",
                        }}>
                            <Text style={{ fontSize: 10, color: isToday ? C.todayBorder : C.subText, fontWeight: 600, display: "block" }}>
                                {FULL_SHORT[day.day()]}
                            </Text>
                            <Text style={{ fontSize: 15, fontWeight: 700, color: isToday ? C.todayBorder : C.darkText }}>
                                {day.format("D")}
                            </Text>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Employee rows */}
        {users?.map((user, ui) => {
            const color = getEmployeeColor(users, user._id);
            return (
                <div key={user._id} style={{
                    display: "flex",
                    borderBottom: ui < users.length - 1 ? `1px solid ${C.border}` : "none",
                }}>
                    <div style={{
                        width: 180, flexShrink: 0, padding: "10px 14px",
                        borderRight: `1px solid ${C.border}`,
                        display: "flex", alignItems: "center", gap: 10, minHeight: 70,
                    }}>
                        <Avatar size={30} src={user.thumbnail} icon={<UserOutlined />}
                            style={{ background: color, flexShrink: 0 }} />
                        <Text style={{
                            fontSize: 12, fontWeight: 600, color: C.darkText,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                            {user.fullname}
                        </Text>
                    </div>
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                        {weekDays.map((day, di) => {
                            const isToday = day.isSame(dayjs(), "day");
                            const shifts = getShifts(user._id, day);
                            return (
                                <div key={di}
                                    onClick={() => { if (!shifts.length) onCellClick(user._id, DAYS[day.day()], day); }}
                                    style={{
                                        padding: 5, minHeight: 70,
                                        borderRight: di < 6 ? `1px solid ${C.border}` : "none",
                                        background: isToday ? `${C.todayBg}88` : C.white,
                                        cursor: shifts.length === 0 ? "pointer" : "default",
                                        display: "flex", flexDirection: "column", gap: 2,
                                        transition: "background 0.1s",
                                    }}
                                    onMouseEnter={(e) => { if (!shifts.length) (e.currentTarget as HTMLElement).style.background = C.bg; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isToday ? `${C.todayBg}88` : C.white; }}
                                >
                                    {shifts.map((s: any) => (
                                        <ShiftPill key={s._id} shift={s} color={color} onEdit={onEdit} onDelete={onDelete} />
                                    ))}
                                    {shifts.length === 0 && (
                                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <PlusOutlined style={{ color: "#d1d5db", fontSize: 12 }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        })}
    </div>
);

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
        background: C.bg, borderBottom: `1px solid ${C.border}`,
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
                        alignItems: "center", justifyContent: "center",
                        padding: "10px 4px", cursor: "pointer",
                        borderBottom: isSelected ? `3px solid ${C.primary}` : "3px solid transparent",
                        background: isSelected ? C.primaryLight : "transparent",
                        transition: "all 0.15s",
                        gap: 4,
                    }}
                >
                    <Text style={{
                        fontSize: 9, fontWeight: 600, lineHeight: 1,
                        color: isSelected ? C.primary : isToday ? C.todayBorder : C.subText,
                        textTransform: "uppercase",
                    }}>
                        {SHORT_DAYS[day.day()]}
                    </Text>
                    <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isSelected ? C.primary : isToday ? C.todayBorder : "transparent",
                    }}>
                        <Text style={{
                            fontSize: 13, fontWeight: 700, lineHeight: 1,
                            color: isSelected || isToday ? "#fff" : C.darkText,
                        }}>
                            {day.format("D")}
                        </Text>
                    </div>
                    {hasShifts && (
                        <div style={{
                            width: 5, height: 5, borderRadius: "50%",
                            background: isSelected ? C.primary : C.subText,
                        }} />
                    )}
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

    return (
        <div style={{ padding: "12px 16px" }}>
            {/* Day heading */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 14, paddingBottom: 10,
                borderBottom: `1px solid ${C.border}`,
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isToday ? C.todayBorder : C.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Text style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{day.format("D")}</Text>
                </div>
                <div>
                    <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>
                        {day.format("dddd")}
                        {isToday && <span style={{
                            marginLeft: 6, fontSize: 10, fontWeight: 600,
                            color: C.todayBorder, background: C.todayBg,
                            padding: "1px 6px", borderRadius: 4,
                        }}>Today</span>}
                    </Text>
                    <Text style={{ fontSize: 11, color: C.subText }}>{day.format("MMMM D, YYYY")}</Text>
                </div>
            </div>

            {/* Employee shift rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {users?.map((user) => {
                    const color = getEmployeeColor(users, user._id);
                    const shifts = getShifts(user._id, day);

                    return (
                        <div key={user._id} style={{
                            background: C.white, border: `1px solid ${C.border}`,
                            borderRadius: 12, overflow: "hidden",
                        }}>
                            {/* Employee name bar */}
                            <div style={{
                                display: "flex", alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 14px",
                                background: C.bg,
                                borderBottom: shifts.length ? `1px solid ${C.border}` : "none",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <Avatar size={32} src={user.thumbnail} icon={<UserOutlined />}
                                        style={{ background: color, flexShrink: 0 }} />
                                    <Text strong style={{ fontSize: 13, color: C.darkText }}>{user.fullname}</Text>
                                    {shifts.length > 0 && (
                                        <Badge count={shifts.length}
                                            style={{ background: color, fontSize: 10 }} />
                                    )}
                                </div>
                                <Button
                                    size="small" type="text"
                                    icon={<PlusOutlined />}
                                    onClick={() => onAddShift(user._id, DAYS[day.day()], day)}
                                    style={{
                                        color: C.primary, fontWeight: 600,
                                        fontSize: 12, borderRadius: 6,
                                    }}
                                >
                                    Add
                                </Button>
                            </div>

                            {/* Shifts for this employee on this day */}
                            {shifts.length > 0 && (
                                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                                    {shifts.map((shift: any) => (
                                        <div key={shift._id} style={{
                                            display: "flex", alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "8px 12px",
                                            background: `${color}12`,
                                            border: `1px solid ${color}30`,
                                            borderLeft: `4px solid ${color}`,
                                            borderRadius: 8,
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <ClockCircleOutlined style={{ color, fontSize: 13 }} />
                                                <Text strong style={{ fontSize: 13, color: C.darkText }}>
                                                    {shift.startTime} – {shift.endTime}
                                                </Text>
                                            </div>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <Button size="small" icon={<EditOutlined />}
                                                    onClick={() => onEdit(shift)}
                                                    style={{ borderRadius: 6, borderColor: C.border }} />
                                                <Popconfirm title="Delete this shift?" okText="Delete"
                                                    okType="danger" cancelText="Cancel"
                                                    onConfirm={() => onDelete(shift._id)}>
                                                    <Button size="small" icon={<DeleteOutlined />} danger
                                                        style={{ borderRadius: 6 }} />
                                                </Popconfirm>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty state inline */}
                            {shifts.length === 0 && (
                                <div style={{
                                    padding: "10px 14px",
                                    display: "flex", alignItems: "center", gap: 8,
                                }}>
                                    <Text style={{ fontSize: 12, color: C.subText }}>No shift assigned</Text>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
const RestaurantShiftSchedule: React.FC = () => {
    const width = useWindowWidth();
    const isMobile = width < 768;

    const actionRef = useRef<{ reset: () => void }>({ reset: () => { } });
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

    const weekDays = Array.from({ length: 7 }, (_, i) =>
        currentDate.startOf("week").add(i, "day")
    );

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
        return filtered;
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

    const selectedDay = weekDays[selectedDayIndex];

    return (
        <div style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            width: "100%",
        }}>
            <div style={{
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: "hidden",
                width: "100%",
                background: C.white,
            }}>

                {/* ═══ HEADER ════════════════════════════════════════════ */}
                <div style={{
                    background: C.bg,
                    borderBottom: `1px solid ${C.border}`,
                    padding: isMobile ? "12px 14px" : "14px 20px",
                }}>
                    {/* Title + week nav always in one row */}
                    <div style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: isMobile ? 10 : 10,
                    }}>
                        {/* Title */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                                background: C.primaryLight, borderRadius: 8,
                                padding: "6px 8px", color: C.primary, fontSize: 14, lineHeight: 1,
                            }}>
                                <SolutionOutlined />
                            </div>
                            <div>
                                <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>
                                    Staff Schedule
                                </Text>
                                <Text style={{ fontSize: 11, color: C.subText }}>
                                    {currentDate.format("MMM YYYY")} · Week {currentDate.week()}
                                </Text>
                            </div>
                        </div>

                        {/* Week navigation */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Button size="small" icon={<LeftOutlined />}
                                onClick={() => setCurrentDate(d => d.subtract(1, "week"))}
                                style={{ borderRadius: 6 }} />
                            <Button size="small"
                                onClick={() => {
                                    setCurrentDate(dayjs());
                                    const diff = dayjs().diff(dayjs().startOf("week"), "day");
                                    setSelectedDayIndex(Math.max(0, Math.min(6, diff)));
                                }}
                                style={{ borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                                Today
                            </Button>
                            <Button size="small" icon={<RightOutlined />}
                                onClick={() => setCurrentDate(d => d.add(1, "week"))}
                                style={{ borderRadius: 6 }} />
                        </div>
                    </div>

                    {/* Controls row */}
                    <div style={{
                        display: "flex", alignItems: "center",
                        gap: 8, flexWrap: "nowrap",
                    }}>
                        <Select
                            size="small" value={timeFilter} onChange={setTimeFilter}
                            style={{ flex: 1, maxWidth: isMobile ? "none" : 140 }}
                            options={[
                                { value: "all", label: "All Hours" },
                                { value: "morning", label: "Morning" },
                                { value: "afternoon", label: "Afternoon" },
                                { value: "evening", label: "Evening" },
                            ]}
                        />
                        {!isMobile && (
                            <Button size="small" icon={<FilePdfOutlined />}
                                onClick={exportToPDF} loading={exportLoading}
                                style={{ borderRadius: 6 }}>
                                Export PDF
                            </Button>
                        )}
                        <Button
                            size="small" type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => { setCurrentShift(null); setIsEditMode(false); triggerNewModal(); }}
                            style={{
                                background: C.primary, borderColor: C.primary,
                                borderRadius: 6, fontWeight: 600,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {isMobile ? "Add" : "New Shift"}
                        </Button>
                    </div>
                </div>

                {/* ═══ BODY ══════════════════════════════════════════════ */}
                <Spin spinning={isLoadingShifts || deleteMutation.isLoading || exportLoading}>
                    {!users || users.length === 0 ? (
                        <Empty description="No employees found" style={{ padding: "60px 0" }} />
                    ) : isMobile ? (
                        <>
                            {/* Day selector strip */}
                            <MobileDayBar
                                weekDays={weekDays}
                                selected={selectedDayIndex}
                                onSelect={setSelectedDayIndex}
                                shiftsPerDay={shiftsPerDay}
                            />
                            {/* Shifts for the selected day */}
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
                        <div style={{ padding: "16px 20px" }}>
                            <div style={{ overflowX: "auto" }}>
                                <div style={{ minWidth: 620 }}>
                                    <DesktopGrid
                                        users={users}
                                        weekDays={weekDays}
                                        scheduleRef={scheduleRef}
                                        getShifts={getShiftsForCell}
                                        onCellClick={handleAddShift}
                                        onEdit={handleEditShift}
                                        onDelete={(id) =>
                                            Modal.confirm({
                                                title: "Delete Shift",
                                                content: "Delete this shift?",
                                                okText: "Delete", okType: "danger",
                                                cancelText: "Cancel",
                                                onOk: () => handleDelete(id),
                                            })
                                        }
                                    />
                                </div>
                            </div>
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