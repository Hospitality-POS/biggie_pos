import { useMemo, useState } from "react";
import {
    Button, Calendar, DatePicker, Dropdown, Empty, Grid, Modal, Segmented, Select, Tag, Tooltip, Typography, message,
} from "antd";
import {
    CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined,
    EditOutlined, LeftOutlined, LinkOutlined, MoreOutlined, PlusOutlined,
    RightOutlined, StopOutlined, VideoCameraOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { useAppDispatch } from "src/store";
import {
    ActivityType, LeadActivity,
    deleteLeadActivity, fetchAllActivities, rescheduleActivity, resolveActivity,
} from "@services/crm/leadActivities";
import ActivityFormModal from "./ActivityFormModal";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

type ViewMode = "month" | "week" | "day";

const TYPE_META: Record<ActivityType, { color: string; label: string }> = {
    call: { color: "#3b82f6", label: "Call" },
    email: { color: "#0ea5e9", label: "Email" },
    meeting: { color: "#8b5cf6", label: "Meeting" },
    demo: { color: "#0891b2", label: "Demo" },
    note: { color: "#64748b", label: "Note" },
    task: { color: "#16a34a", label: "Task" },
    whatsapp: { color: "#22c55e", label: "WhatsApp" },
    site_visit: { color: "#d97706", label: "Site Visit" },
    ticket: { color: "#dc2626", label: "Ticket" },
    other: { color: "#94a3b8", label: "Other" },
};

const STATUS_TAG: Record<string, { color: string; label: string }> = {
    open: { color: "blue", label: "Open" },
    done: { color: "green", label: "Done" },
    cancelled: { color: "default", label: "Cancelled" },
};

const getEntityLabel = (a: LeadActivity): string => {
    if (a.lead_id && typeof a.lead_id === "object") {
        return a.lead_id.entity_type === "company" ? (a.lead_id.company_name || "Company") : (a.lead_id.lead_name || "Lead");
    }
    if (a.customer_id && typeof a.customer_id === "object") {
        return a.customer_id.company_name || a.customer_id.customer_name || "Customer";
    }
    return "—";
};

const ActivityCard: React.FC<{
    activity: LeadActivity;
    onEdit: (a: LeadActivity) => void;
    onResolve: (a: LeadActivity, outcome: "done" | "cancelled") => void;
    onReschedule: (a: LeadActivity) => void;
    onDelete: (a: LeadActivity) => void;
}> = ({ activity, onEdit, onResolve, onReschedule, onDelete }) => {
    const meta = TYPE_META[activity.type] || TYPE_META.other;
    const statusMeta = STATUS_TAG[activity.status || "open"];
    const entityKind = activity.lead_id ? "Lead" : "Customer";

    const menuItems = [
        ...(activity.status !== "done" ? [{ key: "done", label: "Mark Done", icon: <CheckCircleOutlined /> }] : []),
        ...(activity.status !== "cancelled" ? [{ key: "cancel", label: "Mark Cancelled", icon: <StopOutlined /> }] : []),
        { key: "reschedule", label: "Reschedule", icon: <ClockCircleOutlined /> },
        { key: "edit", label: "Edit", icon: <EditOutlined /> },
        { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true },
    ];

    const handleMenuClick = ({ key }: { key: string }) => {
        if (key === "done") onResolve(activity, "done");
        if (key === "cancel") onResolve(activity, "cancelled");
        if (key === "reschedule") onReschedule(activity);
        if (key === "edit") onEdit(activity);
        if (key === "delete") onDelete(activity);
    };

    return (
        <div style={{
            background: "#fff", border: `1px solid ${C.border}`, borderLeft: `3px solid ${meta.color}`,
            borderRadius: 10, padding: "10px 12px", marginBottom: 8,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                        <Tag color={meta.color} style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>{meta.label}</Tag>
                        <Tag color={statusMeta.color} style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>{statusMeta.label}</Tag>
                        {activity.priority && activity.priority !== "medium" && (
                            <Tag color={activity.priority === "urgent" ? "red" : activity.priority === "high" ? "orange" : "default"}
                                style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>
                                {activity.priority.toUpperCase()}
                            </Tag>
                        )}
                    </div>
                    <Text strong style={{ fontSize: 12.5, color: C.darkText, display: "block" }}>
                        {activity.subject || meta.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: C.subText }}>
                        {entityKind}: {getEntityLabel(activity)} · {dayjs(activity.activity_date).format("h:mm A")}
                    </Text>
                    {activity.description && (
                        <Text style={{ fontSize: 11, color: C.subText, display: "block", marginTop: 3 }}>
                            {activity.description}
                        </Text>
                    )}
                    {activity.type === "meeting" && activity.meeting_link && (
                        <a href={activity.meeting_link} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, color: C.primary }}>
                            <VideoCameraOutlined /> Join meeting <LinkOutlined />
                        </a>
                    )}
                </div>
                <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={["click"]}>
                    <Button size="small" icon={<MoreOutlined />} style={{ borderRadius: 6 }} />
                </Dropdown>
            </div>
        </div>
    );
};

const ActivityCalendarPage: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const queryClient = useQueryClient();
    const dispatch = useAppDispatch();

    const [viewMode, setViewMode] = useState<ViewMode>("month");
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [typeFilter, setTypeFilter] = useState<ActivityType[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>(["open", "done", "cancelled"]);
    const [formOpen, setFormOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<LeadActivity | null>(null);
    const [rescheduleTarget, setRescheduleTarget] = useState<LeadActivity | null>(null);

    const shopId = JSON.parse(localStorage.getItem("shop") || "{}")?._id || localStorage.getItem("shopId") || "";

    // ── Range for the fetch — always fetch a full month so month dots are accurate,
    // and slice client-side for week/day agenda views.
    const rangeStart = selectedDate.startOf("month").startOf("week");
    const rangeEnd = selectedDate.endOf("month").endOf("week");

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["crm-activities", shopId, rangeStart.format("YYYY-MM-DD"), rangeEnd.format("YYYY-MM-DD"), typeFilter.join(","), statusFilter.join(",")],
        queryFn: () => fetchAllActivities({
            shop_id: shopId,
            start_date: rangeStart.toISOString(),
            end_date: rangeEnd.toISOString(),
            type: typeFilter.length ? typeFilter.join(",") : undefined,
            status: statusFilter.length ? statusFilter.join(",") : undefined,
            limit: 1000,
        }),
        enabled: !!shopId,
    });

    const activities = data?.activities || [];

    const refresh = () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["crm-activities"] });
    };

    const activitiesByDay = useMemo(() => {
        const map = new Map<string, LeadActivity[]>();
        activities.forEach((a) => {
            const key = dayjs(a.activity_date).format("YYYY-MM-DD");
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(a);
        });
        map.forEach((list) => list.sort((a, b) => dayjs(a.activity_date).valueOf() - dayjs(b.activity_date).valueOf()));
        return map;
    }, [activities]);

    const resolveMutation = useMutation({
        mutationFn: ({ id, outcome }: { id: string; outcome: "done" | "cancelled" }) => resolveActivity(id, outcome),
        onSuccess: refresh,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => dispatch(deleteLeadActivity(id) as any).unwrap(),
        onSuccess: refresh,
    });

    const handleReschedule = async (activity: LeadActivity, newDate: Dayjs) => {
        await rescheduleActivity(activity._id, newDate.toISOString());
        setRescheduleTarget(null);
        refresh();
    };

    const handleEdit = (a: LeadActivity) => { setEditingActivity(a); setFormOpen(true); };
    const handleNew = () => { setEditingActivity(null); setFormOpen(true); };

    // ── Navigation ────────────────────────────────────────────────────────
    const navigate = (dir: number) => {
        setSelectedDate((prev) => {
            if (viewMode === "month") return prev.add(dir, "month");
            if (viewMode === "week") return prev.add(dir, "week");
            return prev.add(dir, "day");
        });
    };

    const headerLabel = viewMode === "month"
        ? selectedDate.format("MMMM YYYY")
        : viewMode === "week"
            ? `${selectedDate.startOf("week").format("D MMM")} – ${selectedDate.endOf("week").format("D MMM YYYY")}`
            : selectedDate.format("dddd, D MMMM YYYY");

    // ── Month cell render ─────────────────────────────────────────────────
    const monthCellRender = (value: Dayjs) => {
        const list = activitiesByDay.get(value.format("YYYY-MM-DD")) || [];
        if (!list.length) return null;
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start" }}>
                {list.slice(0, 3).map((a) => {
                    const meta = TYPE_META[a.type] || TYPE_META.other;
                    return (
                        <div key={a._id} style={{
                            fontSize: 10, color: "#fff", background: meta.color, borderRadius: 4,
                            padding: "0 4px", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                            {dayjs(a.activity_date).format("HH:mm")} {a.subject || meta.label}
                        </div>
                    );
                })}
                {list.length > 3 && <Text style={{ fontSize: 9, color: C.subText }}>+{list.length - 3} more</Text>}
            </div>
        );
    };

    // ── Week/Day agenda days ─────────────────────────────────────────────
    const agendaDays = useMemo(() => {
        if (viewMode === "day") return [selectedDate];
        const start = selectedDate.startOf("week");
        return Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
    }, [viewMode, selectedDate]);

    return (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
                padding: isMobile ? "12px 12px 10px" : "16px 20px 14px", borderBottom: `1px solid ${C.border}`,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
                        <CalendarOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>Activity Calendar</Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>Track lead & customer engagement</Text>
                    </div>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleNew}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 36 }}>
                    New Activity
                </Button>
            </div>

            {/* Toolbar */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
                padding: isMobile ? "10px 12px" : "12px 20px", borderBottom: `1px solid ${C.border}`, background: C.bg,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Button size="small" icon={<LeftOutlined />} onClick={() => navigate(-1)} />
                    <Button size="small" onClick={() => setSelectedDate(dayjs())}>Today</Button>
                    <Button size="small" icon={<RightOutlined />} onClick={() => navigate(1)} />
                    <Text strong style={{ fontSize: 13, marginLeft: 6 }}>{headerLabel}</Text>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Select
                        mode="multiple" size="small" placeholder="All types" allowClear
                        style={{ minWidth: 140 }} maxTagCount={1}
                        value={typeFilter}
                        onChange={setTypeFilter}
                        options={Object.entries(TYPE_META).map(([k, v]) => ({ label: v.label, value: k }))}
                    />
                    <Select
                        mode="multiple" size="small" placeholder="Status" allowClear
                        style={{ minWidth: 140 }} maxTagCount={1}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                            { label: "Open", value: "open" },
                            { label: "Done", value: "done" },
                            { label: "Cancelled", value: "cancelled" },
                        ]}
                    />
                    <Segmented
                        size="small"
                        value={viewMode}
                        onChange={(v) => setViewMode(v as ViewMode)}
                        options={[
                            { label: "Month", value: "month" },
                            { label: "Week", value: "week" },
                            { label: "Day", value: "day" },
                        ]}
                    />
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: isMobile ? "10px" : "16px 20px" }}>
                {viewMode === "month" ? (
                    <Calendar
                        fullscreen={!isMobile}
                        value={selectedDate}
                        onSelect={(d) => { setSelectedDate(d); setViewMode("day"); }}
                        onPanelChange={(d) => setSelectedDate(d)}
                        cellRender={(current, info) => info.type === "date" ? monthCellRender(current as Dayjs) : info.originNode}
                        headerRender={() => null}
                    />
                ) : (
                    <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
                        {agendaDays.map((day) => {
                            const list = activitiesByDay.get(day.format("YYYY-MM-DD")) || [];
                            const isToday = day.isSame(dayjs(), "day");
                            return (
                                <div key={day.format("YYYY-MM-DD")} style={{ flex: viewMode === "day" ? "1 1 100%" : "1 1 220px", minWidth: 220 }}>
                                    <div style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "6px 8px", borderRadius: 8,
                                        background: isToday ? C.primaryLight : C.bg, marginBottom: 8,
                                    }}>
                                        <Text strong style={{ fontSize: 12, color: isToday ? C.primary : C.darkText }}>
                                            {day.format(viewMode === "day" ? "dddd, D MMM" : "ddd D MMM")}
                                        </Text>
                                        <Tag style={{ fontSize: 10, margin: 0 }}>{list.length}</Tag>
                                    </div>
                                    {list.length === 0 ? (
                                        <Empty
                                            description={isLoading ? "Loading…" : "No activities"}
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            style={{ padding: "12px 0" }}
                                        />
                                    ) : (
                                        list.map((a) => (
                                            <ActivityCard
                                                key={a._id}
                                                activity={a}
                                                onEdit={handleEdit}
                                                onResolve={(act, outcome) => resolveMutation.mutate({ id: act._id, outcome })}
                                                onReschedule={setRescheduleTarget}
                                                onDelete={(act) => deleteMutation.mutate(act._id)}
                                            />
                                        ))
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ActivityFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={refresh}
                activity={editingActivity}
                defaultDate={selectedDate.toDate()}
            />

            {rescheduleTarget && (
                <RescheduleModal
                    activity={rescheduleTarget}
                    onClose={() => setRescheduleTarget(null)}
                    onConfirm={handleReschedule}
                />
            )}
        </div>
    );
};

// ── Small inline reschedule modal ───────────────────────────────────────────
const RescheduleModal: React.FC<{
    activity: LeadActivity;
    onClose: () => void;
    onConfirm: (activity: LeadActivity, date: Dayjs) => void;
}> = ({ activity, onClose, onConfirm }) => {
    const [date, setDate] = useState<Dayjs | null>(dayjs(activity.activity_date));

    return (
        <Modal
            open
            onCancel={onClose}
            title="Reschedule Activity"
            okText="Reschedule"
            onOk={() => {
                if (!date) { message.error("Select a new date & time"); return; }
                onConfirm(activity, date);
            }}
        >
            <Tooltip title={activity.subject}>
                <Text style={{ display: "block", marginBottom: 12, fontSize: 12, color: C.subText }}>
                    {activity.subject || TYPE_META[activity.type]?.label}
                </Text>
            </Tooltip>
            <DatePicker
                showTime
                format="DD MMM YYYY, h:mm A"
                value={date}
                onChange={setDate}
                style={{ width: "100%" }}
            />
        </Modal>
    );
};

export default ActivityCalendarPage;
