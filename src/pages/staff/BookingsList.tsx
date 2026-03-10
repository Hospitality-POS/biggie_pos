import { useEffect, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Button, Form, Modal, Popconfirm, Select, Typography, message,
} from "antd";
import {
  CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DeleteOutlined, EditOutlined, PhoneOutlined,
  StarFilled, TeamOutlined, UserOutlined, WalletOutlined,
} from "@ant-design/icons";
import { fetchAllSchedules, removeSchedule } from "@services/customers";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";

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

// ── Status helpers ─────────────────────────────────────────────────────────
const getStatus = (appointmentDate: any, startTime: any): string => {
  if (!appointmentDate || !startTime) return "unknown";
  const now = dayjs();
  const appt = dayjs(`${appointmentDate} ${startTime}`, "YYYY-MM-DD h:mm A");
  if (appt.isBefore(now)) return "completed";
  if (appt.isSame(now, "day")) return "today";
  return "upcoming";
};

const StatusBadge = ({ date, time }: { date: any; time: any }) => {
  const s = getStatus(date, time);
  const map: Record<string, [string, string, string]> = {
    completed: ["#f0fdf4", C.green, "#bbf7d0"],
    today: ["#fffbeb", C.orange, "#fde68a"],
    upcoming: ["#eff6ff", C.blue, "#bfdbfe"],
    unknown: [C.bg, C.subText, C.border],
  };
  const [bg, color, border] = map[s] || map.unknown;
  const labels: Record<string, string> = { completed: "Completed", today: "Today", upcoming: "Upcoming" };
  return <span style={pill(bg, color, border)}>{labels[s] || s}</span>;
};

// ── Shared atoms ───────────────────────────────────────────────────────────
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

// ── Analytics ──────────────────────────────────────────────────────────────
const buildStats = (bookings: any[]) => {
  const now = dayjs();
  let today = 0, upcoming = 0, completed = 0, group = 0;
  const staffCount: Record<string, number> = {};
  const serviceCount: Record<string, { name: string; count: number }> = {};
  let totalRevenue = 0;

  bookings.forEach(b => {
    const status = getStatus(b.appointment_date, b.start_time);
    if (status === "today") today++;
    if (status === "upcoming") upcoming++;
    if (status === "completed") completed++;
    if (isGroupBooking(b)) group++;

    const staff = b.staff_id?.fullname || "Unknown";
    staffCount[staff] = (staffCount[staff] || 0) + 1;

    const svc = b.service_id?.name || "Unknown";
    if (!serviceCount[svc]) serviceCount[svc] = { name: svc, count: 0 };
    serviceCount[svc].count++;

    if (b.service_id?.price) totalRevenue += Number(b.service_id.price);
  });

  const topStaff = Object.entries(staffCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 4);

  const topServices = Object.values(serviceCount)
    .sort((a, b) => b.count - a.count).slice(0, 4);

  return { total: bookings.length, today, upcoming, completed, group, totalRevenue, topStaff, topServices };
};

const ProgressRow = ({ label, count, total, color, last }: {
  label: string; count: number; total: number; color: string; last?: boolean;
}) => {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ padding: "5px 0", borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <Text style={{ fontSize: 12, color: C.darkText }}>{label}</Text>
        <Text style={{ fontSize: 11, color, fontWeight: 600 }}>{count}</Text>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
};

const AnalyticsPanel = ({ bookings }: { bookings: any[] }) => {
  if (!bookings.length) return null;
  const s = buildStats(bookings);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* KPI strip */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <KpiCard icon={<CalendarOutlined />} label="Total Bookings" value={s.total}
          sub={`${s.group} group booking${s.group !== 1 ? "s" : ""}`}
          color={C.blue} bg="#eff6ff" />
        <KpiCard icon={<StarFilled />} label="Today" value={s.today}
          sub="appointments today"
          color={C.orange} bg="#fffbeb" />
        <KpiCard icon={<ClockCircleOutlined />} label="Upcoming" value={s.upcoming}
          sub="scheduled ahead"
          color={C.indigo} bg="#eef2ff" />
        <KpiCard icon={<CheckCircleOutlined />} label="Completed" value={s.completed}
          sub="all time"
          color={C.green} bg="#f0fdf4" />
        <KpiCard icon={<WalletOutlined />} label="Est. Revenue"
          value={`KES ${fmt(s.totalRevenue)}`}
          sub="from completed services"
          color={C.purple} bg="#faf5ff" />
      </div>

      {/* Bottom panels */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* Top staff */}
        <div style={{
          flex: "1 1 220px", background: "#fff",
          border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <UserOutlined style={{ color: C.primary, fontSize: 13 }} />
            <Text strong style={{ fontSize: 12, color: C.darkText }}>Top Staff</Text>
          </div>
          {s.topStaff.map((st, i) => (
            <ProgressRow key={i} label={st.name} count={st.count}
              total={s.total} color={C.primary} last={i === s.topStaff.length - 1} />
          ))}
        </div>

        {/* Top services */}
        <div style={{
          flex: "1 1 220px", background: "#fff",
          border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <WalletOutlined style={{ color: C.purple, fontSize: 13 }} />
            <Text strong style={{ fontSize: 12, color: C.darkText }}>Top Services</Text>
          </div>
          {s.topServices.map((sv, i) => (
            <ProgressRow key={i} label={sv.name} count={sv.count}
              total={s.total} color={C.purple} last={i === s.topServices.length - 1} />
          ))}
        </div>

        {/* Booking type breakdown */}
        <div style={{
          flex: "1 1 200px", background: "#fff",
          border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <TeamOutlined style={{ color: C.blue, fontSize: 13 }} />
            <Text strong style={{ fontSize: 12, color: C.darkText }}>Booking Types</Text>
          </div>
          <ProgressRow label="Individual" count={s.total - s.group} total={s.total} color={C.blue} />
          <ProgressRow label="Group" count={s.group} total={s.total} color={C.green} last />
        </div>
      </div>
    </div>
  );
};

// ── Client helpers ─────────────────────────────────────────────────────────
const isGroupBooking = (record: any): boolean => {
  if (!Array.isArray(record.customer_ids) || record.customer_ids.length < 2) return false;
  return record.customer_ids.filter((c: any) => c && (c.customer_name || c.name)).length > 1;
};

const resolveClientName = (record: any): string => {
  const ccn = record.custom_client_name;
  if (ccn && typeof ccn === "string" && ccn.trim()) return ccn.trim();

  const cid = record.customer_id;
  if (cid && typeof cid === "object" && !Array.isArray(cid)) {
    const name = cid.customer_name || cid.name;
    if (name?.trim()) return name.trim();
  }

  if (Array.isArray(record.customer_ids) && record.customer_ids.length > 0) {
    const names = record.customer_ids
      .map((c: any) => c?.customer_name || c?.name)
      .filter(Boolean);
    if (names.length) return names.join(", ");
  }

  return "Walk-in / Unassigned";
};

const formatCustomerNames = (record: any): string => {
  if (Array.isArray(record.customer_ids) && record.customer_ids.length > 1) {
    const populated = record.customer_ids.filter((c: any) => c && (c.customer_name || c.name));
    if (populated.length > 1) {
      const names = populated.map((c: any) => c.customer_name || c.name);
      const first2 = names.slice(0, 2).join(", ");
      return populated.length > 2 ? `${first2} +${populated.length - 2} more` : first2;
    }
  }
  return resolveClientName(record);
};

const getCustomerPhones = (record: any): string[] => {
  const phones: string[] = [];
  if (Array.isArray(record.customer_ids)) {
    record.customer_ids.forEach((c: any) => { if (c?.phone) phones.push(String(c.phone)); });
  }
  if (record.customer_id?.phone && !phones.includes(String(record.customer_id.phone))) {
    phones.push(String(record.customer_id.phone));
  }
  if (record.phone && !phones.includes(String(record.phone))) {
    phones.push(String(record.phone));
  }
  return phones;
};

// ── Booking detail modal ───────────────────────────────────────────────────
const BookingDetailModal = ({ open, record, onClose, onEdit }: {
  open: boolean; record: any; onClose: () => void; onEdit: (r: any) => void;
}) => {
  if (!record) return null;
  const group = isGroupBooking(record);
  const phones = getCustomerPhones(record);
  const customers = Array.isArray(record.customer_ids) ? record.customer_ids : [];
  const primaryEmail = record.customer_id?.email || record.email || customers[0]?.email;

  return (
    <Modal open={open} onCancel={onClose} destroyOnClose
      style={{ top: 20 }} width="min(680px, 96vw)"
      styles={{ body: { padding: "20px 24px" } }}
      title={<ModalTitle icon={<CalendarOutlined />} label="Booking Details" />}
      footer={[
        <Button key="close" onClick={onClose} style={{ borderRadius: 8 }}>Close</Button>,
        <Button key="edit" type="primary" icon={<EditOutlined />}
          onClick={() => { onClose(); onEdit(record); }}
          style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
          Edit Booking
        </Button>,
      ]}
    >
      {/* Status strip */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Date", value: dayjs(record.appointment_date).format("DD MMM YYYY"), color: C.blue },
          { label: "Time", value: `${record.start_time} – ${record.end_time}`, color: C.purple },
          { label: "Duration", value: record.duration || "—", color: C.orange },
        ].map(s => (
          <div key={s.label} style={{
            flex: "1 1 100px", background: "#fff", border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: "8px 12px",
          }}>
            <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>{s.label}</Text>
            <Text strong style={{ fontSize: 13, color: s.color }}>{s.value}</Text>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* Client(s) */}
        <div style={{
          flex: "1 1 220px", background: "#fff",
          border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            {group ? <TeamOutlined style={{ color: C.blue }} /> : <UserOutlined style={{ color: C.blue }} />}
            <Text strong style={{ fontSize: 12, color: C.darkText }}>
              {group ? `Customers (${customers.length})` : "Client"}
            </Text>
          </div>
          {group ? (
            customers.map((c: any, i: number) => (
              <div key={i} style={{
                padding: "6px 0",
                borderBottom: i < customers.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <Text strong style={{ fontSize: 12 }}>{c?.customer_name || c?.name || "Unknown"}</Text>
                {c?.phone && <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{c.phone}</Text>}
              </div>
            ))
          ) : (
            <>
              <MetaRow label="Name"><Text style={{ fontSize: 12 }}>{resolveClientName(record)}</Text></MetaRow>
              {phones.length > 0 && (
                <MetaRow label="Phone">
                  <Text copyable style={{ fontSize: 12 }}>{phones[0]}</Text>
                </MetaRow>
              )}
              {primaryEmail && (
                <MetaRow label="Email" last>
                  <Text style={{ fontSize: 12, color: C.subText }}>{primaryEmail}</Text>
                </MetaRow>
              )}
            </>
          )}
          {group && record.max_capacity && (
            <div style={{
              marginTop: 8, padding: "6px 10px",
              background: "#eff6ff", borderRadius: 6,
            }}>
              <Text style={{ fontSize: 11, color: C.blue }}>
                Capacity: {record.current_capacity || customers.length} / {record.max_capacity}
                {(record.current_capacity || customers.length) < record.max_capacity
                  ? ` · ${record.max_capacity - (record.current_capacity || customers.length)} spots open`
                  : " · Full"}
              </Text>
            </div>
          )}
        </div>

        {/* Appointment details */}
        <div style={{
          flex: "1 1 220px", background: "#fff",
          border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px",
        }}>
          <Text strong style={{ fontSize: 12, color: C.darkText, display: "block", marginBottom: 8 }}>
            Appointment
          </Text>
          <MetaRow label="Service">
            <Text style={{ fontSize: 12 }}>{record.service_id?.name || "—"}</Text>
          </MetaRow>
          <MetaRow label="Staff">
            <Text style={{ fontSize: 12 }}>{record.staff_id?.fullname || "Unassigned"}</Text>
          </MetaRow>
          {record.service_id?.price && (
            <MetaRow label="Price">
              <Text strong style={{ fontSize: 12, color: C.green }}>
                KES {fmt(record.service_id.price)}
              </Text>
            </MetaRow>
          )}
          <MetaRow label="Type">
            <span style={group
              ? pill("#eff6ff", C.blue, "#bfdbfe")
              : pill(C.bg, C.subText, C.border)}>
              {group ? "Group" : "Individual"}
            </span>
          </MetaRow>
          <MetaRow label="Status" last>
            <StatusBadge date={record.appointment_date} time={record.start_time} />
          </MetaRow>
        </div>
      </div>

      {(record.special_requests || record.notes) && (
        <div style={{
          marginTop: 10, background: "#fff", border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "10px 14px",
        }}>
          {record.special_requests && (
            <MetaRow label="Special Requests" last={!record.notes}>
              <Text style={{ fontSize: 12 }}>{record.special_requests}</Text>
            </MetaRow>
          )}
          {record.notes && (
            <MetaRow label="Notes" last>
              <Text style={{ fontSize: 12 }}>{record.notes}</Text>
            </MetaRow>
          )}
        </div>
      )}
    </Modal>
  );
};

// ── Props ──────────────────────────────────────────────────────────────────
interface BookingsListProps {
  onEditBooking?: (booking: any) => void;
}

// ── Main ───────────────────────────────────────────────────────────────────
const BookingsList: React.FC<BookingsListProps> = ({ onEditBooking }) => {
  const actionRef = useRef<ActionType>();
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteBooking = useMutation({
    mutationFn: removeSchedule,
    onSuccess: () => {
      message.success("Booking deleted");
      actionRef.current?.reload();
      setAllBookings([]);
    },
    onError: (error: any) => {
      message.error(`Failed to delete: ${error.message || "Unknown error"}`);
    },
  });

  const handleEditClick = (record: any) => {
    if (onEditBooking) {
      onEditBooking({
        id: record._id,
        staff: record.staff_id?.fullname || "Unknown Staff",
        staffId: record.staff_id?._id,
        start_time: record.start_time,
        end_time: record.end_time,
        client: resolveClientName(record),
        clientId: record.customer_id?._id,
        customClientName: record.custom_client_name,
        service: record.service_id?.name || "Unknown Service",
        serviceId: record.service_id?._id,
        duration: record.duration || "Unknown Duration",
        isTimeRange: record.start_time !== record.end_time,
        timeRangeDescription: `${record.start_time} - ${record.end_time}`,
        originalData: record,
        appointmentDate: record.appointment_date,
        specialRequests: record.special_requests,
        phone: record.phone,
      });
    } else {
      message.info("Switch to Calendar view to edit this booking");
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Date & Time", dataIndex: "appointment_date", key: "datetime",
      search: false, width: 160,
      sorter: (a: any, b: any) => dayjs(a.appointment_date).unix() - dayjs(b.appointment_date).unix(),
      defaultSortOrder: "descend" as const,
      render: (text: any, record: any) => (
        <div>
          <Text strong style={{ fontSize: 12, display: "block" }}>
            {dayjs(text).format("DD MMM YYYY")}
          </Text>
          <Text style={{ fontSize: 11, color: C.subText }}>
            <ClockCircleOutlined style={{ marginRight: 3 }} />
            {record.start_time} – {record.end_time}
          </Text>
        </div>
      ),
    },
    {
      title: "Client", key: "client", dataIndex: "_id", width: 220,
      render: (_: any, record: any) => {
        const group = isGroupBooking(record);
        const phones = getCustomerPhones(record);
        const display = formatCustomerNames(record);
        const count = Array.isArray(record.customer_ids)
          ? record.customer_ids.length
          : record.customer_id ? 1 : 0;

        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {group
                ? <TeamOutlined style={{ color: C.blue, fontSize: 12 }} />
                : <UserOutlined style={{ color: C.blue, fontSize: 12 }} />}
              <Text strong style={{ fontSize: 12 }}>{display}</Text>
              {group && (
                <span style={pill("#eff6ff", C.blue, "#bfdbfe")}>{count}</span>
              )}
            </div>
            {phones.length > 0 && (
              <Text style={{ fontSize: 11, color: C.subText, display: "block", marginTop: 2 }}>
                <PhoneOutlined style={{ marginRight: 3 }} />
                {phones.length === 1 ? phones[0] : `${phones.length} contacts`}
              </Text>
            )}
            {group && (
              <span style={{ ...pill("#eff6ff", C.blue, "#bfdbfe"), marginTop: 4 }}>
                Group Booking
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Staff", dataIndex: ["staff_id", "fullname"], key: "staff", width: 130,
      render: (text: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", background: C.primaryLight,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.primary, fontWeight: 700, fontSize: 11, flexShrink: 0,
          }}>
            {text?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <Text style={{ fontSize: 12 }}>{text || "Unassigned"}</Text>
        </div>
      ),
    },
    {
      title: "Service", dataIndex: ["service_id", "name"], key: "service", width: 160,
      render: (text: any, record: any) => (
        <div>
          <Text style={{ fontSize: 12 }}>{text || "—"}</Text>
          {record.duration && (
            <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
              {record.duration}
            </Text>
          )}
          {record.service_id?.price && (
            <Text style={{ fontSize: 11, color: C.green, display: "block", fontWeight: 600 }}>
              KES {fmt(record.service_id.price)}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Status", key: "status", search: false, width: 110, align: "center" as const,
      render: (_: any, record: any) => (
        <StatusBadge date={record.appointment_date} time={record.start_time} />
      ),
    },
    {
      title: "Actions", key: "actions", search: false, width: 120, fixed: "right" as const,
      render: (_: any, record: any) => (
        <div style={{ display: "flex", gap: 4 }}>
          <Button type="text" size="small"
            icon={<CalendarOutlined style={{ color: C.blue }} />}
            onClick={() => { setSelectedRecord(record); setDetailsOpen(true); }}
            style={{ borderRadius: 6 }} />
          <Button type="text" size="small"
            icon={<EditOutlined style={{ color: C.primary }} />}
            onClick={() => handleEditClick(record)}
            style={{ borderRadius: 6 }} />
          <Popconfirm
            title="Delete this booking?"
            description="This action cannot be undone."
            onConfirm={() => {
              setDeletingId(record._id);
              handleDeleteBooking.mutate(record._id, {
                onSettled: () => setDeletingId(null),
              });
            }}
            okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger
              icon={<DeleteOutlined />}
              loading={deletingId === record._id}
              style={{ borderRadius: 6 }} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <AnalyticsPanel bookings={allBookings} />

      <ProTable
        columns={columns}
        rowKey="_id"
        actionRef={actionRef}
        request={async (params) => {
          const result = await fetchAllSchedules();
          const data = result.data || [];
          setAllBookings(data);
          return { data, success: true, total: data.length };
        }}
        cardBordered={false}
        size="small"
        pagination={{
          pageSize: 10, showSizeChanger: true, showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} bookings`,
        }}
        scroll={{ x: 900 }}
        search={{ layout: "vertical", labelWidth: "auto", searchText: "Search", resetText: "Reset" }}
        headerTitle={
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{
              background: C.primaryLight, borderRadius: 7,
              padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1,
            }}>
              <CalendarOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>Bookings List</Text>
          </div>
        }
        toolBarRender={() => [
          <Button key="refresh" icon={<CalendarOutlined />}
            onClick={() => actionRef.current?.reload()}
            style={{ borderRadius: 8 }}>
            Refresh
          </Button>,
        ]}
        options={{ density: true, fullScreen: true, reload: () => actionRef.current?.reload() }}
      />

      <BookingDetailModal
        open={detailsOpen} record={selectedRecord}
        onClose={() => { setDetailsOpen(false); setSelectedRecord(null); }}
        onEdit={handleEditClick}
      />
    </>
  );
};

export default BookingsList;