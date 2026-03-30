import { useMemo, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Button, DatePicker, Drawer, Form, Input, Modal,
  Popconfirm, Select, Typography, message,
} from "antd";
import {
  CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DeleteOutlined, EditOutlined, FilterOutlined, PhoneOutlined,
  ReloadOutlined, SearchOutlined, StarFilled, TeamOutlined,
  UserOutlined, WalletOutlined,
} from "@ant-design/icons";
import { fetchAllSchedules, removeSchedule } from "@services/customers";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

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

const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 4,
  borderRadius: 5, padding: "2px 8px",
  fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
  background: bg, color, border: `1px solid ${border}`,
});

// ── Status logic ───────────────────────────────────────────────────────────
// FIX: Don't try to parse time into status — just use the DATE.
// "today" = appointment_date is today's date (regardless of time).
// "upcoming" = appointment_date is a future date.
// "completed" = appointment_date is a past date.
const getStatus = (appointmentDate: any): string => {
  if (!appointmentDate) return "unknown";
  const apptDate = dayjs(appointmentDate);
  if (!apptDate.isValid()) return "unknown";
  const now = dayjs();
  if (apptDate.isSame(now, "day")) return "today";
  if (apptDate.isAfter(now, "day")) return "upcoming";
  return "completed";
};

const StatusBadge = ({ date }: { date: any }) => {
  const s = getStatus(date);
  const map: Record<string, [string, string, string, string]> = {
    completed: ["#f0fdf4", C.green, "#bbf7d0", "Completed"],
    today: ["#fffbeb", C.orange, "#fde68a", "Today"],
    upcoming: ["#eff6ff", C.blue, "#bfdbfe", "Upcoming"],
    unknown: [C.bg, C.subText, C.border, "Unknown"],
  };
  const [bg, color, border, label] = map[s] || map.unknown;
  return <span style={pill(bg, color, border)}>{label}</span>;
};

// ── Shared atoms ───────────────────────────────────────────────────────────
const ModalTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
      {icon}
    </div>
    <Text strong style={{ fontSize: 14, color: C.darkText }}>{label}</Text>
  </div>
);

const MetaRow = ({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: last ? "none" : `1px solid ${C.border}` }}>
    <Text style={{ fontSize: 11, color: C.subText, flex: "0 0 130px" }}>{label}</Text>
    <div style={{ fontSize: 12, textAlign: "right" }}>{children}</div>
  </div>
);

const KpiCard = ({ icon, label, value, sub, color, bg }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; bg: string }) => (
  <div style={{ flex: "1 1 130px", background: "#fff", border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`, borderRadius: 10, padding: "12px 14px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
      <div style={{ background: bg, borderRadius: 6, padding: "4px 5px", color, fontSize: 13, lineHeight: 1 }}>{icon}</div>
      <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
    </div>
    <Text strong style={{ fontSize: 20, color: C.darkText, display: "block", lineHeight: 1.2 }}>{value}</Text>
    {sub && <Text style={{ fontSize: 11, color: C.subText }}>{sub}</Text>}
  </div>
);

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
    const names = record.customer_ids.map((c: any) => c?.customer_name || c?.name).filter(Boolean);
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

// ── Analytics ──────────────────────────────────────────────────────────────
const buildStats = (bookings: any[]) => {
  let today = 0, upcoming = 0, completed = 0, group = 0, totalRevenue = 0;
  const staffCount: Record<string, number> = {};
  const serviceCount: Record<string, { name: string; count: number }> = {};

  bookings.forEach(b => {
    const s = getStatus(b.appointment_date);
    if (s === "today") today++;
    else if (s === "upcoming") upcoming++;
    else if (s === "completed") completed++;
    if (isGroupBooking(b)) group++;

    const staff = b.staff_id?.fullname || "Unknown";
    staffCount[staff] = (staffCount[staff] || 0) + 1;

    const svc = b.service_id?.name || "Unknown";
    if (!serviceCount[svc]) serviceCount[svc] = { name: svc, count: 0 };
    serviceCount[svc].count++;

    if (b.service_id?.price) totalRevenue += Number(b.service_id.price);
  });

  return {
    total: bookings.length, today, upcoming, completed, group, totalRevenue,
    topStaff: Object.entries(staffCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 4),
    topServices: Object.values(serviceCount).sort((a, b) => b.count - a.count).slice(0, 4),
  };
};

const ProgressRow = ({ label, count, total, color, last }: { label: string; count: number; total: number; color: string; last?: boolean }) => {
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
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <KpiCard icon={<CalendarOutlined />} label="Total Bookings" value={s.total} sub={`${s.group} group booking${s.group !== 1 ? "s" : ""}`} color={C.blue} bg="#eff6ff" />
        <KpiCard icon={<StarFilled />} label="Today" value={s.today} sub="appointments today" color={C.orange} bg="#fffbeb" />
        <KpiCard icon={<ClockCircleOutlined />} label="Upcoming" value={s.upcoming} sub="scheduled ahead" color={C.indigo} bg="#eef2ff" />
        <KpiCard icon={<CheckCircleOutlined />} label="Completed" value={s.completed} sub="all time" color={C.green} bg="#f0fdf4" />
        <KpiCard icon={<WalletOutlined />} label="Est. Revenue" value={`KES ${fmt(s.totalRevenue)}`} sub="from services" color={C.purple} bg="#faf5ff" />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <UserOutlined style={{ color: C.primary, fontSize: 13 }} />
            <Text strong style={{ fontSize: 12, color: C.darkText }}>Top Staff</Text>
          </div>
          {s.topStaff.map((st, i) => <ProgressRow key={i} label={st.name} count={st.count} total={s.total} color={C.primary} last={i === s.topStaff.length - 1} />)}
        </div>
        <div style={{ flex: "1 1 220px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <WalletOutlined style={{ color: C.purple, fontSize: 13 }} />
            <Text strong style={{ fontSize: 12, color: C.darkText }}>Top Services</Text>
          </div>
          {s.topServices.map((sv, i) => <ProgressRow key={i} label={sv.name} count={sv.count} total={s.total} color={C.purple} last={i === s.topServices.length - 1} />)}
        </div>
        <div style={{ flex: "1 1 200px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
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

// ── Active filter chips ────────────────────────────────────────────────────
interface ActiveFilters {
  search?: string;
  client?: string;
  staff?: string;
  service?: string;
  status?: string;
  bookingType?: string;   // "individual" | "group"
  dateFrom?: string;
  dateTo?: string;
}

const FilterChips = ({ filters, onClear, onClearAll }: { filters: ActiveFilters; onClear: (k: keyof ActiveFilters) => void; onClearAll: () => void }) => {
  const chips: { key: keyof ActiveFilters; label: string }[] = [];
  if (filters.search) chips.push({ key: "search", label: `Search: ${filters.search}` });
  if (filters.client) chips.push({ key: "client", label: `Client: ${filters.client}` });
  if (filters.staff) chips.push({ key: "staff", label: `Staff: ${filters.staff}` });
  if (filters.service) chips.push({ key: "service", label: `Service: ${filters.service}` });
  if (filters.status) chips.push({ key: "status", label: `Status: ${filters.status}` });
  if (filters.bookingType) chips.push({ key: "bookingType", label: `Type: ${filters.bookingType === "group" ? "Group" : "Individual"}` });
  if (filters.dateFrom || filters.dateTo) chips.push({ key: "dateFrom", label: `Date: ${filters.dateFrom || "…"} → ${filters.dateTo || "…"}` });
  if (!chips.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "8px 12px", background: "#f0fdf4", border: `1px solid #bbf7d0`, borderRadius: 8, marginBottom: 10 }}>
      <Text style={{ fontSize: 11, color: C.subText }}>Filters:</Text>
      {chips.map((c, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 8px", fontSize: 11 }}>
          {c.label}
          <span style={{ cursor: "pointer", color: C.subText, fontSize: 10 }} onClick={() => onClear(c.key)}>✕</span>
        </span>
      ))}
      <Button type="link" size="small" onClick={onClearAll} style={{ padding: 0, height: "auto", fontSize: 11, color: C.red, marginLeft: "auto" }}>
        Clear All
      </Button>
    </div>
  );
};

// ── Filter drawer ──────────────────────────────────────────────────────────
const FilterDrawer = ({ open, onClose, onApply, onReset, form, staffOptions, serviceOptions }: {
  open: boolean; onClose: () => void; onApply: (v: any) => void; onReset: () => void;
  form: any; staffOptions: { label: string; value: string }[]; serviceOptions: { label: string; value: string }[];
}) => (
  <Drawer
    open={open} onClose={onClose} placement="bottom" height="auto" destroyOnClose
    styles={{ body: { padding: "16px 16px 0" }, footer: { padding: "12px 16px" } }}
    title={<ModalTitle icon={<FilterOutlined />} label="Filter Bookings" />}
    footer={
      <div style={{ display: "flex", gap: 10 }}>
        <Button block onClick={onReset} style={{ borderRadius: 8, height: 44 }}>Reset</Button>
        <Button block type="primary" onClick={() => form.submit()}
          style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 44 }}>
          Apply Filters
        </Button>
      </div>
    }
  >
    <Form form={form} layout="vertical" onFinish={onApply} style={{ paddingBottom: 16 }}>
      {/* Date range */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Date Range</div>
        <Form.Item name="date_range" label="Appointment Date" style={{ marginBottom: 0 }}>
          <RangePicker style={{ width: "100%", borderRadius: 8 }} format="DD MMM YYYY" />
        </Form.Item>
      </div>

      {/* Text filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Form.Item name="client" label="Client Name" style={{ flex: "1 1 200px", marginBottom: 12 }}>
          <Input placeholder="Search by client name…" style={{ borderRadius: 8 }} prefix={<UserOutlined style={{ color: C.subText }} />} />
        </Form.Item>
        <Form.Item name="staff" label="Staff Member" style={{ flex: "1 1 200px", marginBottom: 12 }}>
          <Select allowClear placeholder="Select staff…" options={staffOptions} showSearch
            filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
        </Form.Item>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Form.Item name="service" label="Service" style={{ flex: "1 1 200px", marginBottom: 12 }}>
          <Select allowClear placeholder="Select service…" options={serviceOptions} showSearch
            filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
        </Form.Item>
        <Form.Item name="status" label="Status" style={{ flex: "1 1 200px", marginBottom: 12 }}>
          <Select allowClear placeholder="Any status" options={[
            { label: "Today", value: "today" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Completed", value: "completed" },
          ]} />
        </Form.Item>
      </div>

      <Form.Item name="bookingType" label="Booking Type" style={{ marginBottom: 0 }}>
        <Select allowClear placeholder="All types" options={[
          { label: "Individual bookings only", value: "individual" },
          { label: "Group bookings only", value: "group" },
        ]} />
      </Form.Item>
    </Form>
  </Drawer>
);

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
          <div key={s.label} style={{ flex: "1 1 100px", background: "#fff", border: `1px solid ${C.border}`, borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: "8px 12px" }}>
            <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>{s.label}</Text>
            <Text strong style={{ fontSize: 13, color: s.color }}>{s.value}</Text>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* Client(s) */}
        <div style={{ flex: "1 1 220px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            {group ? <TeamOutlined style={{ color: C.blue }} /> : <UserOutlined style={{ color: C.blue }} />}
            <Text strong style={{ fontSize: 12, color: C.darkText }}>
              {group ? `Customers (${customers.length})` : "Client"}
            </Text>
          </div>
          {group ? (
            customers.map((c: any, i: number) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: i < customers.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <Text strong style={{ fontSize: 12 }}>{c?.customer_name || c?.name || "Unknown"}</Text>
                {c?.phone && <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{c.phone}</Text>}
              </div>
            ))
          ) : (
            <>
              <MetaRow label="Name"><Text style={{ fontSize: 12 }}>{resolveClientName(record)}</Text></MetaRow>
              {phones.length > 0 && <MetaRow label="Phone"><Text copyable style={{ fontSize: 12 }}>{phones[0]}</Text></MetaRow>}
              {primaryEmail && <MetaRow label="Email" last><Text style={{ fontSize: 12, color: C.subText }}>{primaryEmail}</Text></MetaRow>}
            </>
          )}
          {group && record.max_capacity && (
            <div style={{ marginTop: 8, padding: "6px 10px", background: "#eff6ff", borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: C.blue }}>
                Capacity: {record.current_capacity || customers.length} / {record.max_capacity}
                {(record.current_capacity || customers.length) < record.max_capacity ? ` · ${record.max_capacity - (record.current_capacity || customers.length)} spots open` : " · Full"}
              </Text>
            </div>
          )}
        </div>

        {/* Appointment details */}
        <div style={{ flex: "1 1 220px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
          <Text strong style={{ fontSize: 12, color: C.darkText, display: "block", marginBottom: 8 }}>Appointment</Text>
          <MetaRow label="Service"><Text style={{ fontSize: 12 }}>{record.service_id?.name || "—"}</Text></MetaRow>
          <MetaRow label="Staff"><Text style={{ fontSize: 12 }}>{record.staff_id?.fullname || "Unassigned"}</Text></MetaRow>
          {record.service_id?.price && (
            <MetaRow label="Price">
              <Text strong style={{ fontSize: 12, color: C.green }}>KES {fmt(record.service_id.price)}</Text>
            </MetaRow>
          )}
          <MetaRow label="Type">
            <span style={group ? pill("#eff6ff", C.blue, "#bfdbfe") : pill(C.bg, C.subText, C.border)}>
              {group ? "Group" : "Individual"}
            </span>
          </MetaRow>
          <MetaRow label="Status" last>
            <StatusBadge date={record.appointment_date} />
          </MetaRow>
        </div>
      </div>

      {(record.special_requests || record.notes) && (
        <div style={{ marginTop: 10, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
          {record.special_requests && <MetaRow label="Special Requests" last={!record.notes}><Text style={{ fontSize: 12 }}>{record.special_requests}</Text></MetaRow>}
          {record.notes && <MetaRow label="Notes" last><Text style={{ fontSize: 12 }}>{record.notes}</Text></MetaRow>}
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
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [searchText, setSearchText] = useState("");
  const [filterForm] = Form.useForm();

  // ── Derive unique staff / service options from loaded data ─────────────
  const staffOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    allBookings.forEach(b => {
      const name = b.staff_id?.fullname;
      if (name && !seen.has(name)) { seen.add(name); opts.push({ label: name, value: name }); }
    });
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [allBookings]);

  const serviceOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    allBookings.forEach(b => {
      const name = b.service_id?.name;
      if (name && !seen.has(name)) { seen.add(name); opts.push({ label: name, value: name }); }
    });
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [allBookings]);

  // ── Client-side filtering ──────────────────────────────────────────────
  // This is the KEY fix: all filtering happens here against the full allBookings array.
  // ProTable receives the already-filtered list so pagination/sorting work correctly.
  const filteredBookings = useMemo(() => {
    let data = allBookings;
    const f = activeFilters;

    // Global search (code, client name, staff, service)
    const q = searchText.trim().toLowerCase();
    if (q) {
      data = data.filter(b => {
        const client = resolveClientName(b).toLowerCase();
        const staff = (b.staff_id?.fullname || "").toLowerCase();
        const service = (b.service_id?.name || "").toLowerCase();
        const code = (b._id || "").toLowerCase();
        return client.includes(q) || staff.includes(q) || service.includes(q) || code.includes(q);
      });
    }

    // Client filter (from drawer)
    if (f.client) {
      const cl = f.client.toLowerCase();
      data = data.filter(b => resolveClientName(b).toLowerCase().includes(cl));
    }

    // Staff filter — exact match from dropdown
    if (f.staff) {
      data = data.filter(b => (b.staff_id?.fullname || "") === f.staff);
    }

    // Service filter — exact match from dropdown
    if (f.service) {
      data = data.filter(b => (b.service_id?.name || "") === f.service);
    }

    // Status filter
    if (f.status) {
      data = data.filter(b => getStatus(b.appointment_date) === f.status);
    }

    // Booking type filter
    if (f.bookingType === "group") {
      data = data.filter(b => isGroupBooking(b));
    } else if (f.bookingType === "individual") {
      data = data.filter(b => !isGroupBooking(b));
    }

    // Date range filter
    if (f.dateFrom || f.dateTo) {
      const from = f.dateFrom ? dayjs(f.dateFrom).startOf("day") : null;
      const to = f.dateTo ? dayjs(f.dateTo).endOf("day") : null;
      data = data.filter(b => {
        const d = dayjs(b.appointment_date);
        if (from && d.isBefore(from)) return false;
        if (to && d.isAfter(to)) return false;
        return true;
      });
    }

    return data;
  }, [allBookings, activeFilters, searchText]);

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

  const handleFilterApply = (values: any) => {
    const f: ActiveFilters = {};
    if (values.client?.trim()) f.client = values.client.trim();
    if (values.staff) f.staff = values.staff;
    if (values.service) f.service = values.service;
    if (values.status) f.status = values.status;
    if (values.bookingType) f.bookingType = values.bookingType;
    if (values.date_range?.length === 2) {
      f.dateFrom = dayjs(values.date_range[0]).format("YYYY-MM-DD");
      f.dateTo = dayjs(values.date_range[1]).format("YYYY-MM-DD");
    }
    setActiveFilters(f);
    setFilterDrawerOpen(false);
  };

  const handleFilterReset = () => {
    filterForm.resetFields();
    setActiveFilters({});
    setSearchText("");
    setFilterDrawerOpen(false);
  };

  const clearOneFilter = (key: keyof ActiveFilters) => {
    const f = { ...activeFilters };
    // Date range: clear both ends together
    if (key === "dateFrom" || key === "dateTo") { delete f.dateFrom; delete f.dateTo; }
    else delete f[key];
    setActiveFilters(f);
    // Sync drawer field
    const drawerKey = key === "dateFrom" || key === "dateTo" ? "date_range" : key;
    filterForm.setFieldValue(drawerKey, undefined);
  };

  const activeFilterCount = Object.keys(activeFilters).length + (searchText ? 1 : 0);

  // ── Columns ────────────────────────────────────────────────────────────
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
      title: "Client", key: "client", dataIndex: "_id", search: false, width: 220,
      render: (_: any, record: any) => {
        const group = isGroupBooking(record);
        const phones = getCustomerPhones(record);
        const display = formatCustomerNames(record);
        const count = Array.isArray(record.customer_ids) ? record.customer_ids.length : record.customer_id ? 1 : 0;
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {group ? <TeamOutlined style={{ color: C.blue, fontSize: 12 }} /> : <UserOutlined style={{ color: C.blue, fontSize: 12 }} />}
              <Text strong style={{ fontSize: 12 }}>{display}</Text>
              {group && <span style={pill("#eff6ff", C.blue, "#bfdbfe")}>{count}</span>}
            </div>
            {phones.length > 0 && (
              <Text style={{ fontSize: 11, color: C.subText, display: "block", marginTop: 2 }}>
                <PhoneOutlined style={{ marginRight: 3 }} />
                {phones.length === 1 ? phones[0] : `${phones.length} contacts`}
              </Text>
            )}
            {group && <span style={{ ...pill("#eff6ff", C.blue, "#bfdbfe"), marginTop: 4 }}>Group Booking</span>}
          </div>
        );
      },
    },
    {
      title: "Staff", key: "staff", search: false, width: 130,
      render: (_: any, record: any) => {
        const text = record.staff_id?.fullname;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", color: C.primary, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
              {text?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <Text style={{ fontSize: 12 }}>{text || "Unassigned"}</Text>
          </div>
        );
      },
    },
    {
      title: "Service", key: "service", search: false, width: 160,
      render: (_: any, record: any) => (
        <div>
          <Text style={{ fontSize: 12 }}>{record.service_id?.name || "—"}</Text>
          {record.duration && <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{record.duration}</Text>}
          {record.service_id?.price && <Text style={{ fontSize: 11, color: C.green, display: "block", fontWeight: 600 }}>KES {fmt(record.service_id.price)}</Text>}
        </div>
      ),
    },
    {
      title: "Status", key: "status", search: false, width: 110, align: "center" as const,
      render: (_: any, record: any) => <StatusBadge date={record.appointment_date} />,
    },
    {
      title: "Actions", key: "actions", search: false, width: 120, fixed: "right" as const,
      render: (_: any, record: any) => (
        <div style={{ display: "flex", gap: 4 }}>
          <Button type="text" size="small" icon={<CalendarOutlined style={{ color: C.blue }} />}
            onClick={() => { setSelectedRecord(record); setDetailsOpen(true); }} style={{ borderRadius: 6 }} />
          <Button type="text" size="small" icon={<EditOutlined style={{ color: C.primary }} />}
            onClick={() => handleEditClick(record)} style={{ borderRadius: 6 }} />
          <Popconfirm title="Delete this booking?" description="This action cannot be undone."
            onConfirm={() => { setDeletingId(record._id); handleDeleteBooking.mutate(record._id, { onSettled: () => setDeletingId(null) }); }}
            okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />}
              loading={deletingId === record._id} style={{ borderRadius: 6 }} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <AnalyticsPanel bookings={allBookings} />

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined style={{ color: C.subText }} />}
          placeholder="Search client, staff, service…"
          allowClear
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ flex: 1, minWidth: 200, borderRadius: 8 }}
        />
        <Button
          icon={<FilterOutlined />}
          onClick={() => setFilterDrawerOpen(true)}
          style={{
            borderRadius: 8,
            borderColor: activeFilterCount > 0 ? C.primary : C.border,
            color: activeFilterCount > 0 ? C.primary : C.darkText,
          }}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()} style={{ borderRadius: 8 }} />
      </div>

      <FilterChips filters={activeFilters} onClear={clearOneFilter} onClearAll={handleFilterReset} />

      <ProTable
        columns={columns}
        rowKey="_id"
        actionRef={actionRef}
        // Fetch all data once, store in state — filtering is client-side
        request={async () => {
          const result = await fetchAllSchedules();
          const data = result.data || [];
          setAllBookings(data);
          return { data, success: true, total: data.length };
        }}
        // Feed the filtered list into ProTable via dataSource
        dataSource={filteredBookings}
        cardBordered={false}
        size="small"
        search={false}   // ← disable built-in search; we handle it above
        pagination={{
          pageSize: 10, showSizeChanger: true, showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} bookings`,
        }}
        scroll={{ x: 900 }}
        headerTitle={
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
              <CalendarOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>Bookings List</Text>
            {filteredBookings.length !== allBookings.length && (
              <span style={pill("#eff6ff", C.blue, "#bfdbfe")}>
                {filteredBookings.length} of {allBookings.length}
              </span>
            )}
          </div>
        }
        toolBarRender={false}
        options={{ density: true, fullScreen: true, reload: () => actionRef.current?.reload() }}
      />

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        form={filterForm}
        staffOptions={staffOptions}
        serviceOptions={serviceOptions}
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