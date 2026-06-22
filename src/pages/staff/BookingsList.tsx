import { useRef, useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActionType, ProTable, ProCard } from "@ant-design/pro-components";
import {
  Button, Modal, Popconfirm, Space, Typography, message,
} from "antd";
import {
  CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DeleteOutlined, EditOutlined, PhoneOutlined, TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { fetchAllSchedules, removeSchedule, fetchAllCustomers } from "@services/customers";
import { getAllProducts } from "@services/products";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
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
    completed: ["#f0fdf4", C.primary, "#bbf7d0", "Completed"],
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
  <div style={{ flex: 1, minWidth: 0 }}>
    <ProCard
      style={{ borderTop: `3px solid ${color}` }}
      bordered
      headerBordered={false}
      bodyStyle={{ padding: "12px 14px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <div style={{ background: bg, borderRadius: 6, padding: "4px 5px", color, fontSize: 13, lineHeight: 1 }}>{icon}</div>
        <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
      </div>
      <Text strong style={{ fontSize: 20, color: C.darkText, display: "block", lineHeight: 1.2 }}>{value}</Text>
      {sub && <Text style={{ fontSize: 11, color: C.subText }}>{sub}</Text>}
    </ProCard>
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
      <ProCard.Group direction="row" wrap style={{ marginBottom: 16 }}>
        {[
          { label: "Date", value: dayjs(record.appointment_date).format("DD MMM YYYY"), color: C.blue },
          { label: "Time", value: `${record.start_time} – ${record.end_time}`, color: C.purple },
          { label: "Duration", value: record.duration || "—", color: C.orange },
        ].map(s => (
          <ProCard
            key={s.label}
            colSpan={{ xs: 24, sm: 8 }}
            bordered
            style={{ borderLeft: `3px solid ${s.color}` }}
            bodyStyle={{ padding: "8px 12px" }}
          >
            <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>{s.label}</Text>
            <Text strong style={{ fontSize: 13, color: s.color }}>{s.value}</Text>
          </ProCard>
        ))}
      </ProCard.Group>

      <ProCard.Group direction="row" wrap style={{ marginBottom: 10 }}>
        {/* Client(s) */}
        <ProCard
          colSpan={{ xs: 24, sm: 12 }}
          bordered
          headerBordered
          title={group ? `Customers (${customers.length})` : "Client"}
          extra={group ? <TeamOutlined style={{ color: C.blue }} /> : <UserOutlined style={{ color: C.blue }} />}
        >
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
        </ProCard>

        {/* Appointment details */}
        <ProCard
          colSpan={{ xs: 24, sm: 12 }}
          bordered
          headerBordered
          title="Appointment"
        >
          <MetaRow label="Service"><Text style={{ fontSize: 12 }}>{record.service_id?.name || "—"}</Text></MetaRow>
          {record.table ? (
            <MetaRow label="Table/Room"><Text style={{ fontSize: 12 }}>{record.table}</Text></MetaRow>
          ) : (
            <MetaRow label="Staff"><Text style={{ fontSize: 12 }}>{record.staff_id?.fullname || "Unassigned"}</Text></MetaRow>
          )}
          {record.service_id?.price && (
            <MetaRow label="Price">
              <Text strong style={{ fontSize: 12, color: C.primary }}>KES {fmt(record.service_id.price)}</Text>
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
        </ProCard>
      </ProCard.Group>

      {(record.special_requests || record.notes) && (
        <ProCard bordered headerBordered title="Additional Information" style={{ marginTop: 10 }}>
          {record.special_requests && <MetaRow label="Special Requests" last={!record.notes}><Text style={{ fontSize: 12 }}>{record.special_requests}</Text></MetaRow>}
          {record.notes && <MetaRow label="Notes" last><Text style={{ fontSize: 12 }}>{record.notes}</Text></MetaRow>}
        </ProCard>
      )}
    </Modal>
  );
};

// ── Props ──────────────────────────────────────────────────────────────────
interface BookingsListProps {
  onEditBooking?: (booking: any) => void;
  refreshTrigger?: number;
}

// ── Main ───────────────────────────────────────────────────────────────────
const BookingsList: React.FC<BookingsListProps> = ({ onEditBooking, refreshTrigger }) => {
  const actionRef = useRef<ActionType>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [allBookings, setAllBookings] = useState<any[]>([]);

  // Reload data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      actionRef.current?.reload();
    }
  }, [refreshTrigger]);

  // Fetch customer data using React Query
  const { data: customerData = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetchAllCustomers();
      return response.data || [];
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch product/service data using React Query
  const { data: serviceData = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await getAllProducts();
      console.log('Service data:', response);
      return response.data || [];
    },
    staleTime: 0,
    gcTime: 0,
  });

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
      const resourceType = record.table ? "table" : "staff";
      onEditBooking({
        id: record._id,
        resourceType: resourceType,
        staff: record.staff_id?.fullname || "Unknown Staff",
        staffId: record.staff_id?._id,
        table: record.table || "",
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

  // Compute dynamic options for select dropdowns
  const clientOptions = useMemo(() => {
    return customerData
      .filter((customer: any) => customer.customer_name && customer._id)
      .sort((a: any, b: any) => a.customer_name.localeCompare(b.customer_name))
      .reduce((acc: Record<string, { text: string }>, customer: any) => {
        acc[customer._id] = { text: customer.customer_name };
        return acc;
      }, {} as Record<string, { text: string }>);
  }, [customerData]);

  const serviceOptions = useMemo(() => {
    const allProducts: any[] = [];
    serviceData.forEach((category: any) => {
      if (category.products && Array.isArray(category.products)) {
        allProducts.push(...category.products);
      }
    });
    return allProducts
      .filter((product: any) => product.name && product._id)
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .reduce((acc: Record<string, { text: string }>, product: any) => {
        acc[product._id] = { text: product.name };
        return acc;
      }, {} as Record<string, { text: string }>);
  }, [serviceData]);

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = [
    {
      title: "Client", key: "client", dataIndex: "_id", width: 220,
      search: {
        transform: (value: any) => ({ customer_id: value }),
      },
      valueType: "select",
      valueEnum: clientOptions,
      fieldProps: {
        showSearch: true,
        optionFilterProp: "text",
      },
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
      title: "Date & Time", dataIndex: "appointment_date", key: "datetime",
      search: false,
      width: 160,
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
      title: "Resource", key: "resource", width: 130,
      search: false,
      render: (_: any, record: any) => {
        if (record.table) {
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: "6px", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", color: C.primary, fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
                T
              </div>
              <Text style={{ fontSize: 12 }}>{record.table}</Text>
            </div>
          );
        }
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
      title: "Service", key: "service", width: 160,
      search: {
        transform: (value: any) => ({ service_id: value }),
      },
      valueType: "select",
      valueEnum: serviceOptions,
      fieldProps: {
        showSearch: true,
        optionFilterProp: "text",
      },
      render: (_: any, record: any) => (
        <div>
          <Text style={{ fontSize: 12 }}>{record.service_id?.name || "—"}</Text>
          {record.duration && <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{record.duration}</Text>}
          {record.service_id?.price && <Text style={{ fontSize: 11, color: C.primary, display: "block", fontWeight: 600 }}>KES {fmt(record.service_id.price)}</Text>}
        </div>
      ),
    },
    {
      title: "Status", key: "status", search: true, width: 110, align: "center" as const,
      valueType: "select",
      valueEnum: {
        today: { text: "Today", status: "Processing" },
        upcoming: { text: "Upcoming", status: "Default" },
        completed: { text: "Completed", status: "Success" },
      },
      fieldProps: {
        showSearch: true,
        optionFilterProp: "text",
      },
      filter: true,
      
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
    {
      title: "Date Range", key: "dateRange", hideInTable: true,
      search: {
        transform: (value: any) => ({ start_date: value[0], end_date: value[1] }),
      },
      valueType: "dateRange",
    },
    {
      title: "Booking Type", key: "bookingType", hideInTable: true,
      search: {
        transform: (value: any) => ({ booking_type: value }),
      },
      valueType: "select",
      valueEnum: {
        individual: { text: "Individual" },
        group: { text: "Group" },
      },
      fieldProps: {
        showSearch: true,
        optionFilterProp: "text",
      },
    },
    {
      title: "Table", key: "table", hideInTable: true,
      search: {
        transform: (value: any) => ({ table: value }),
      },
    },
  ];

  return (
    <>
      <ProTable
        columns={columns}
        rowKey="_id"
        actionRef={actionRef}
        request={async (params) => {
          const result = await fetchAllSchedules({
            keyword: params.keyword,
            customer_id: params.customer_id,
            staff_id: params.staff_id,
            service_id: params.service_id,
            status: params.status,
            start_date: params.start_date,
            end_date: params.end_date,
            booking_type: params.booking_type,
            table: params.table,
          });
          const data = result.data || [];
          setAllBookings(data);
          return { data, success: true, total: data.length };
        }}
        cardBordered
        options={{ fullScreen: true }}
        size="small"
        search={{
          labelWidth: 'auto',
          layout: 'vertical',
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
        }}
        scroll={{ x: 1200 }}
      />

      <BookingDetailModal
        open={detailsOpen}
        record={selectedRecord}
        onClose={() => { setDetailsOpen(false); setSelectedRecord(null); }}
        onEdit={handleEditClick}
      />
    </>
  );
};

export default BookingsList;