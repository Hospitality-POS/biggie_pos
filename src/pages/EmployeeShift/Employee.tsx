import React, { useEffect, useRef, useState } from "react";
import {
  Avatar, Button, Drawer, Empty, message, Modal,
  Popconfirm, Popover, Select, Spin, Typography,
} from "antd";
import {
  CalendarOutlined, ClockCircleOutlined, DeleteOutlined,
  EditOutlined, FilePdfOutlined, LeftOutlined, PlusOutlined,
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
};

const EMPLOYEE_COLORS = [
  "#6c1c2c", "#0958d9", "#531dab", "#006d75", "#d4380d",
  "#7265e6", "#00a2ae", "#52c41a", "#eb2f96", "#fa8c16",
  "#a0d911", "#13c2c2", "#faad14", "#c41d7f", "#0050b3",
  "#1d3557", "#2d6a4f", "#9d4edd", "#e85d04", "#588157",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Mobile hook ────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ── Helpers ────────────────────────────────────────────────────────────────
const getEmployeeColor = (users: any[], employeeId: string) => {
  const idx = users?.findIndex((u) => u._id === employeeId) ?? 0;
  return EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length];
};

// ══════════════════════════════════════════════════════════════════════════
// SHIFT CARD (popover on hover for desktop, tap for mobile)
// ══════════════════════════════════════════════════════════════════════════
const ShiftCard: React.FC<{
  shift: any; color: string; isMobile: boolean;
  onEdit: (s: any) => void; onDelete: (id: string) => void;
}> = ({ shift, color, isMobile, onEdit, onDelete }) => {
  const content = (
    <div style={{ minWidth: 200, padding: "2px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <UserOutlined style={{ color: C.subText }} />
        <Text strong style={{ fontSize: 13 }}>{shift?.employee_id?.fullname}</Text>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <ClockCircleOutlined style={{ color: C.subText }} />
        <Text style={{ fontSize: 12, color: C.subText }}>{shift?.startTime} – {shift?.endTime}</Text>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
          style={{ borderRadius: 6, flex: 1 }}>Edit</Button>
        <Popconfirm title="Delete this shift?" okText="Delete" okType="danger" cancelText="Cancel"
          onConfirm={(e) => { e?.stopPropagation(); onDelete(shift._id); }}>
          <Button size="small" icon={<DeleteOutlined />} danger
            style={{ borderRadius: 6, flex: 1 }} onClick={(e) => e.stopPropagation()}>Delete</Button>
        </Popconfirm>
      </div>
    </div>
  );

  return (
    <Popover content={content} trigger={isMobile ? "click" : "hover"} placement="top">
      <div onClick={(e) => { e.stopPropagation(); if (!isMobile) onEdit(shift); }}
        style={{
          background: color, color: "#fff", borderRadius: 4,
          padding: isMobile ? "3px 5px" : "5px 7px",
          marginBottom: 3, cursor: "pointer", fontSize: isMobile ? 9 : 11,
          fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
        } as React.CSSProperties}>
        <ClockCircleOutlined style={{ marginRight: 3, fontSize: 9 }} />
        {shift?.startTime}–{shift?.endTime}
      </div>
    </Popover>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MOBILE: EMPLOYEE SHIFTS DRAWER (tapping a day card opens this)
// ══════════════════════════════════════════════════════════════════════════
const MobileDayDrawer: React.FC<{
  open: boolean; onClose: () => void;
  employee: any; day: dayjs.Dayjs | null; shifts: any[];
  color: string;
  onEdit: (s: any) => void; onDelete: (id: string) => void;
  onAdd: () => void;
}> = ({ open, onClose, employee, day, shifts, color, onEdit, onDelete, onAdd }) => (
  <Drawer
    open={open} onClose={onClose} placement="bottom"
    height="55vh" destroyOnClose
    styles={{ body: { padding: "16px 20px 100px" } }}
    title={
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar size={32} style={{ background: color }}>{employee?.fullname?.[0]}</Avatar>
        <div>
          <Text strong style={{ fontSize: 13, display: "block", color: C.darkText }}>{employee?.fullname}</Text>
          <Text style={{ fontSize: 11, color: C.subText }}>
            {day ? day.format("ddd, MMM D") : ""}
          </Text>
        </div>
      </div>
    }
    footer={
      <div style={{ padding: "10px 0" }}>
        <Button type="primary" icon={<PlusOutlined />} block onClick={onAdd}
          style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 44, fontWeight: 600 }}>
          Add Shift
        </Button>
      </div>
    }
  >
    {shifts.length === 0 ? (
      <Empty description="No shifts for this day" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ paddingTop: 30 }} />
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shifts.map((shift: any) => (
          <div key={shift._id} style={{
            border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${color}`, borderRadius: 10,
            padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <ClockCircleOutlined style={{ color, fontSize: 12 }} />
                <Text strong style={{ fontSize: 13 }}>{shift.startTime} – {shift.endTime}</Text>
              </div>
              <Text style={{ fontSize: 11, color: C.subText }}>{shift.dayOfWeek}</Text>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(shift)} style={{ borderRadius: 6 }} />
              <Popconfirm title="Delete this shift?" okText="Delete" okType="danger" cancelText="Cancel"
                onConfirm={() => onDelete(shift._id)}>
                <Button size="small" icon={<DeleteOutlined />} danger style={{ borderRadius: 6 }} />
              </Popconfirm>
            </div>
          </div>
        ))}
      </div>
    )}
  </Drawer>
);

// ══════════════════════════════════════════════════════════════════════════
// MOBILE VIEW: Card list per employee
// ══════════════════════════════════════════════════════════════════════════
const MobileView: React.FC<{
  users: any[]; weekDays: dayjs.Dayjs[];
  getShifts: (uid: string, day: dayjs.Dayjs) => any[];
  onCellTap: (user: any, day: dayjs.Dayjs, shifts: any[]) => void;
}> = ({ users, weekDays, getShifts, onCellTap }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {users?.map((user) => {
      const color = getEmployeeColor(users, user._id);
      return (
        <div key={user._id} style={{
          border: `1px solid ${C.border}`,
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* Employee header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", background: C.bg, borderBottom: `1px solid ${C.border}`,
          }}>
            <Avatar size={34} src={user.thumbnail} icon={<UserOutlined />} style={{ background: color }} />
            <Text strong style={{ fontSize: 13, color: C.darkText }}>{user.fullname}</Text>
          </div>
          {/* Day pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
            {weekDays.map((day, di) => {
              const shifts = getShifts(user._id, day);
              const isToday = day.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
              return (
                <div key={di} onClick={() => onCellTap(user, day, shifts)}
                  style={{
                    padding: "8px 4px", textAlign: "center", cursor: "pointer",
                    borderRight: di < 6 ? `1px solid ${C.border}` : "none",
                    background: isToday ? C.todayBg : "#fff",
                    minHeight: 60, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 3,
                  }}>
                  <Text style={{ fontSize: 9, color: isToday ? C.todayBorder : C.subText, fontWeight: 600 }}>
                    {SHORT_DAYS[day.day()]}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: 700, color: isToday ? C.todayBorder : C.darkText }}>
                    {day.format("D")}
                  </Text>
                  {shifts.length > 0 ? (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", background: color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#fff", fontWeight: 700,
                      printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
                    } as React.CSSProperties}>
                      {shifts.length}
                    </div>
                  ) : (
                    <PlusOutlined style={{ fontSize: 10, color: "#d1d5db" }} />
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
// DESKTOP VIEW: Full grid
// ══════════════════════════════════════════════════════════════════════════
const DesktopView: React.FC<{
  users: any[]; weekDays: dayjs.Dayjs[];
  getShifts: (uid: string, day: dayjs.Dayjs) => any[];
  scheduleRef: React.RefObject<HTMLDivElement>;
  onCellClick: (uid: string, dow: string, day: dayjs.Dayjs) => void;
  onEdit: (s: any) => void; onDelete: (id: string) => void;
}> = ({ users, weekDays, getShifts, scheduleRef, onCellClick, onEdit, onDelete }) => (
  <div ref={scheduleRef} style={{
    border: `1px solid ${C.border}`, borderRadius: 10,
    overflow: "hidden", minWidth: 700,
  }}>
    <div style={{ display: "flex" }}>
      {/* Employee column header */}
      <div style={{
        width: 200, flexShrink: 0,
        background: C.bg, borderRight: `1px solid ${C.border}`,
        padding: "12px 16px", display: "flex", alignItems: "center",
        borderBottom: `1px solid ${C.border}`, height: 56,
      }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Employees
        </Text>
      </div>
      {/* Day headers */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {weekDays.map((day, i) => {
          const isToday = day.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
          return (
            <div key={i} style={{
              textAlign: "center", padding: "10px 8px", height: 56,
              background: isToday ? C.todayBg : C.bg,
              borderRight: i < 6 ? `1px solid ${C.border}` : "none",
              borderBottom: `1px solid ${C.border}`,
              borderTop: isToday ? `3px solid ${C.todayBorder}` : "3px solid transparent",
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 11, color: isToday ? C.todayBorder : C.subText, fontWeight: 600, display: "block" }}>
                {SHORT_DAYS[day.day()]}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: 700, color: isToday ? C.todayBorder : C.darkText }}>
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
        <div key={user._id} style={{ display: "flex", borderBottom: ui < users.length - 1 ? `1px solid ${C.border}` : "none" }}>
          {/* Name col */}
          <div style={{
            width: 200, flexShrink: 0, borderRight: `1px solid ${C.border}`,
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
            minHeight: 72,
          }}>
            <Avatar size={32} src={user.thumbnail} icon={<UserOutlined />} style={{ background: color, flexShrink: 0 }} />
            <Text style={{ fontSize: 12, fontWeight: 600, color: C.darkText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.fullname}
            </Text>
          </div>
          {/* Day cells */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {weekDays.map((day, di) => {
              const isToday = day.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
              const dayOfWeek = DAYS[day.day()];
              const shifts = getShifts(user._id, day);
              return (
                <div key={di}
                  onClick={() => { if (shifts.length === 0) onCellClick(user._id, dayOfWeek, day); }}
                  style={{
                    padding: "6px", minHeight: 72,
                    borderRight: di < 6 ? `1px solid ${C.border}` : "none",
                    background: isToday ? `${C.todayBg}66` : "#fff",
                    cursor: shifts.length === 0 ? "pointer" : "default",
                    display: "flex", flexDirection: "column", gap: 2,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { if (shifts.length === 0) (e.currentTarget as HTMLElement).style.background = C.bg; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isToday ? `${C.todayBg}66` : "#fff"; }}
                >
                  {shifts.map((s: any) => (
                    <ShiftCard key={s._id} shift={s} color={color} isMobile={false} onEdit={onEdit} onDelete={onDelete} />
                  ))}
                  {shifts.length === 0 && (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <PlusOutlined style={{ color: "#d1d5db", fontSize: 13 }} />
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
// MAIN
// ══════════════════════════════════════════════════════════════════════════
const RestaurantShiftSchedule: React.FC = () => {
  const isMobile = useIsMobile();
  const actionRef = useRef<{ reset: () => void }>({ reset: () => { } });
  const scheduleRef = useRef<HTMLDivElement>(null);
  const newBtnRef = useRef<HTMLDivElement>(null);
  const editBtnRef = useRef<HTMLDivElement>(null);

  const [currentDate, setCurrentDate] = useState(dayjs());
  const [timeFilter, setTimeFilter] = useState("all");
  const [exportLoading, setExportLoading] = useState(false);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Mobile day drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState<any>(null);
  const [drawerDay, setDrawerDay] = useState<dayjs.Dayjs | null>(null);
  const [drawerShifts, setDrawerShifts] = useState<any[]>([]);

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
        const rt = u.role?.role_type?.toLowerCase();
        return rt !== "admin" && rt !== "cleaner";
      }) ?? [],
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: () => { refetchShifts(); message.success("Shift deleted"); },
    onError: () => message.error("Failed to delete shift"),
  });

  // ── Week helpers ─────────────────────────────────────────────────────
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

  // ── Click handlers ───────────────────────────────────────────────────
  const triggerNewModal = () => {
    setTimeout(() => {
      const btn = newBtnRef.current?.querySelector("button");
      btn?.click();
    }, 50);
  };

  const triggerEditModal = () => {
    setTimeout(() => {
      const btn = editBtnRef.current?.querySelector("button");
      btn?.click();
    }, 50);
  };

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

  const handleDelete = (shiftId: string) => {
    deleteMutation.mutate(shiftId);
  };

  // Mobile cell tap
  const handleMobileCellTap = (user: any, day: dayjs.Dayjs, dayShifts: any[]) => {
    setDrawerUser(user);
    setDrawerDay(day);
    setDrawerShifts(dayShifts);
    setDrawerOpen(true);
  };

  const handleMobileAdd = () => {
    if (!drawerUser || !drawerDay) return;
    setDrawerOpen(false);
    handleAddShift(drawerUser._id, DAYS[drawerDay.day()], drawerDay);
  };

  // ── PDF export ───────────────────────────────────────────────────────
  const exportToPDF = async () => {
    if (!scheduleRef.current) return;
    setExportLoading(true);
    try {
      const canvas = await html2canvas(scheduleRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm" });
      const imgW = 280;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, imgW, (canvas.height * imgW) / canvas.width);
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

  const drawerColor = drawerUser ? getEmployeeColor(users ?? [], drawerUser._id) : C.primary;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Card shell ─────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          background: C.bg, borderBottom: `1px solid ${C.border}`,
          padding: isMobile ? "12px 14px" : "14px 20px",
          display: "flex", flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between", gap: 12,
        }}>
          {/* Title + period */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              background: C.primaryLight, borderRadius: 8, padding: "5px 7px",
              color: C.primary, fontSize: 16, lineHeight: 1,
            }}>
              <SolutionOutlined />
            </div>
            <div>
              <Typography.Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>
                Staff Schedule
              </Typography.Text>
              <Typography.Text style={{ fontSize: 11, color: C.subText }}>
                {currentDate.format("MMMM YYYY")} · Week {currentDate.week()}
              </Typography.Text>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {/* Week nav */}
            <div style={{ display: "flex", gap: 4 }}>
              <Button size="small" icon={<LeftOutlined />} onClick={() => setCurrentDate(currentDate.subtract(1, "week"))}
                style={{ borderRadius: 6 }} />
              <Button size="small" onClick={() => setCurrentDate(dayjs())}
                style={{ borderRadius: 6, fontWeight: 600 }}>Today</Button>
              <Button size="small" icon={<RightOutlined />} onClick={() => setCurrentDate(currentDate.add(1, "week"))}
                style={{ borderRadius: 6 }} />
            </div>

            {/* Time filter */}
            <Select size="small" value={timeFilter} onChange={setTimeFilter}
              style={{ width: 110, borderRadius: 6 }}
              options={[
                { value: "all", label: "All Hours" },
                { value: "morning", label: "Morning" },
                { value: "afternoon", label: "Afternoon" },
                { value: "evening", label: "Evening" },
              ]}
            />

            {!isMobile && (
              <Button size="small" icon={<FilePdfOutlined />} onClick={exportToPDF} loading={exportLoading}
                style={{ borderRadius: 6 }}>
                Export PDF
              </Button>
            )}

            <Button size="small" type="primary" icon={<PlusOutlined />}
              onClick={() => { setCurrentShift(null); setIsEditMode(false); triggerNewModal(); }}
              style={{ background: C.primary, borderColor: C.primary, borderRadius: 6, fontWeight: 600 }}>
              {isMobile ? "Add" : "New Shift"}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? "12px" : "16px 20px" }}>
          <Spin spinning={isLoadingShifts || deleteMutation.isLoading || exportLoading}>
            {!users || users.length === 0 ? (
              <Empty description="No employees found" style={{ padding: "60px 0" }} />
            ) : isMobile ? (
              <MobileView
                users={users}
                weekDays={weekDays}
                getShifts={getShiftsForCell}
                onCellTap={handleMobileCellTap}
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <DesktopView
                  users={users}
                  weekDays={weekDays}
                  scheduleRef={scheduleRef}
                  getShifts={getShiftsForCell}
                  onCellClick={handleAddShift}
                  onEdit={handleEditShift}
                  onDelete={(id) =>
                    Modal.confirm({
                      title: "Delete Shift",
                      content: "Are you sure you want to delete this shift?",
                      okText: "Delete", okType: "danger", cancelText: "Cancel",
                      onOk: () => handleDelete(id),
                    })
                  }
                />
              </div>
            )}
          </Spin>
        </div>
      </div>

      {/* Mobile day drawer */}
      <MobileDayDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        employee={drawerUser}
        day={drawerDay}
        shifts={drawerShifts}
        color={drawerColor}
        onEdit={(s) => { setDrawerOpen(false); handleEditShift(s); }}
        onDelete={(id) => { deleteMutation.mutate(id); setDrawerOpen(false); }}
        onAdd={handleMobileAdd}
      />

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