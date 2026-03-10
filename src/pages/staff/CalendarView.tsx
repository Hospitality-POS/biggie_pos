import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, DatePicker, Drawer, Form, Input, InputNumber,
  Popconfirm, Radio, Select, Spin, TimePicker, Typography, message,
} from "antd";
import {
  CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined,
  EditOutlined, LeftOutlined, PlusOutlined, RightOutlined,
} from "@ant-design/icons";
import { fetchAllUsersList } from "@services/users";
import {
  createSchedule, fetchAllCustomers, fetchAllSchedules,
  removeSchedule, updateSchedule,
} from "@services/customers";
import { getAllProducts } from "@services/products";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";

const { Text } = Typography;
const { RangePicker } = TimePicker;
const { TextArea } = Input;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  blue: "#3b82f6",
  orange: "#f59e0b",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Shared atoms ───────────────────────────────────────────────────────────
const SectionLabel = ({ text }: { text: string }) => (
  <span style={{
    display: "block", fontSize: 10, color: C.subText,
    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8,
  }}>{text}</span>
);

const FormSection = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14,
  }}>
    {children}
  </div>
);

// ── Time slots ─────────────────────────────────────────────────────────────
const HOUR_RANGE = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM – 10 PM
const ALL_TIME_SLOTS: string[] = [];
HOUR_RANGE.forEach(hour => {
  [0, 15, 30, 45].forEach(minutes => {
    if (hour === 22 && minutes > 0) return;
    const period = hour >= 12 ? "PM" : "AM";
    const displayHr = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const fmtMin = minutes < 10 ? `0${minutes}` : minutes;
    ALL_TIME_SLOTS.push(`${displayHr}:${fmtMin} ${period}`);
  });
});

const matchSlotIndex = (timeStr: string): number => {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  let idx = ALL_TIME_SLOTS.findIndex(s => norm(s) === norm(timeStr));
  if (idx !== -1) return idx;
  // fallback: parse h:mm A manually
  const [tp, ap] = timeStr.split(" ");
  let [h, m] = tp.split(":").map(Number);
  if (ap?.toUpperCase() === "PM" && h < 12) h += 12;
  if (ap?.toUpperCase() === "AM" && h === 12) h = 0;
  return ALL_TIME_SLOTS.findIndex(s => {
    const [tp2, ap2] = s.split(" ");
    let [h2, m2] = tp2.split(":").map(Number);
    if (ap2?.toUpperCase() === "PM" && h2 < 12) h2 += 12;
    if (ap2?.toUpperCase() === "AM" && h2 === 12) h2 = 0;
    return h2 === h && m2 === m;
  });
};

// ── Appointment form drawer ────────────────────────────────────────────────
interface AppointmentFormProps {
  open: boolean;
  isEditMode: boolean;
  editingId?: string;
  staffMembers: any[];
  customers: any[];
  products: any[];
  selectedDate: Date;
  loadingStaff: boolean;
  loadingCustomers: boolean;
  loadingProducts: boolean;
  formattedSchedules: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const AppointmentForm = ({
  open, isEditMode, editingId, staffMembers, customers, products,
  selectedDate, loadingStaff, loadingCustomers, loadingProducts,
  formattedSchedules, onClose, onSuccess,
}: AppointmentFormProps) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [bookingType, setBookingType] = useState<"individual" | "group">("individual");
  const [clientInputMode, setClientInputMode] = useState<"existing" | "custom">("existing");
  const [maxCapacity, setMaxCapacity] = useState(1);
  const [selectedCusts, setSelectedCusts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isTimeRangeAvailable = (staffName: string, start: string, end: string, excludeId?: string): boolean => {
    const si = matchSlotIndex(start), ei = matchSlotIndex(end);
    if (si === -1 || ei === -1 || si >= ei) return false;
    for (let i = si; i < ei; i++) {
      const conflict = formattedSchedules.find(appt => {
        if (excludeId && appt.id === excludeId) return false;
        if (appt.staff !== staffName) return false;
        const as = matchSlotIndex(appt.start_time);
        const ae = matchSlotIndex(appt.end_time);
        return i >= as && i < ae;
      });
      if (conflict) return false;
    }
    return true;
  };

  const handleSubmit = async (values: any) => {
    let customerIds: string[] = [];
    let clientId: string | null = null;

    if (clientInputMode === "existing") {
      if (bookingType === "group") {
        customerIds = values.clientNames || [];
      } else if (values.clientName) {
        customerIds = [values.clientName];
        clientId = values.clientName;
      }
    }

    const staffMember = values.staff;
    const appointmentDate = values.appointmentDate
      ? dayjs(values.appointmentDate).format("YYYY-MM-DD")
      : dayjs(selectedDate).format("YYYY-MM-DD");
    const customName = clientInputMode === "custom" ? values.customClientName : null;
    const staffName = staffMembers.find(s => s.id === staffMember)?.name || "Unknown";

    if (!values.timeRange) {
      message.error("Please select a valid time range.");
      return;
    }

    const startStr = dayjs(values.timeRange[0]).format("h:mm A");
    const endStr = dayjs(values.timeRange[1]).format("h:mm A");
    const si = matchSlotIndex(startStr);
    const ei = matchSlotIndex(endStr);

    if (si === -1 || ei === -1) {
      message.error("Unable to match selected times. Please pick from the list.");
      return;
    }
    if (si >= ei) { message.error("End time must be after start time."); return; }

    const startSlot = ALL_TIME_SLOTS[si];
    const endSlot = ALL_TIME_SLOTS[ei];

    if (!isTimeRangeAvailable(staffName, startSlot, endSlot, editingId)) {
      message.error(`Time range conflicts with an existing appointment for ${staffName}.`);
      return;
    }

    const payload = {
      staff_id: staffMember,
      start_time: startSlot,
      end_time: endSlot,
      client_id: clientId,
      customer_ids: customerIds,
      custom_client_name: customName,
      service_id: values.service,
      duration: `${Math.round((ei - si) * 15)} mins`,
      isTimeRange: true,
      timeRangeDescription: `${startSlot} - ${endSlot}`,
      appointment_date: appointmentDate,
      special_requests: values.specialRequests,
      source: "admin_portal",
      booking_type: bookingType,
      max_capacity: maxCapacity,
      notes: values.notes,
    };

    setSubmitting(true);
    try {
      if (isEditMode && editingId) {
        await dispatch(updateSchedule({ id: editingId, data: payload }) as any).unwrap();
        message.success("Appointment updated");
      } else {
        await dispatch(createSchedule(payload) as any).unwrap();
        message.success("Appointment booked");
      }
      onSuccess();
      onClose();
      form.resetFields();
      setBookingType("individual");
      setClientInputMode("existing");
      setMaxCapacity(1);
      setSelectedCusts([]);
    } catch (e: any) {
      message.error(e.message || `Failed to ${isEditMode ? "update" : "create"} appointment`);
    } finally { setSubmitting(false); }
  };

  const handleClose = () => {
    onClose();
    form.resetFields();
    setBookingType("individual");
    setClientInputMode("existing");
    setMaxCapacity(1);
    setSelectedCusts([]);
  };

  const nextSlot = (slot: string) => {
    const i = ALL_TIME_SLOTS.indexOf(slot);
    return i !== -1 && i < ALL_TIME_SLOTS.length - 1 ? ALL_TIME_SLOTS[i + 1] : slot;
  };

  return (
    <Drawer
      open={open} onClose={handleClose} placement="right"
      width="min(520px, 96vw)" destroyOnClose
      styles={{ body: { padding: "20px 24px", paddingBottom: 110 }, footer: { padding: "12px 16px" } }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            background: C.primaryLight, borderRadius: 7,
            padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1,
          }}>
            {isEditMode ? <EditOutlined /> : <PlusOutlined />}
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>
            {isEditMode ? "Edit Appointment" : "New Appointment"}
          </Text>
        </div>
      }
      footer={
        <div style={{ display: "flex", gap: 10 }}>
          <Button block onClick={handleClose} style={{ borderRadius: 8, height: 40 }}>Cancel</Button>
          <Button block type="primary" loading={submitting}
            onClick={() => form.submit()}
            icon={isEditMode ? <EditOutlined /> : <CheckCircleOutlined />}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 40, fontWeight: 500 }}>
            {isEditMode ? "Update Appointment" : "Confirm Booking"}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}
        initialValues={{ bookingType: "individual", maxCapacity: 1 }}>

        {/* Date & Staff */}
        <FormSection>
          <SectionLabel text="Schedule" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Form.Item name="appointmentDate" label="Date"
              rules={[{ required: true, message: "Select a date" }]}
              style={{ flex: "1 1 160px", marginBottom: 12 }}>
              <DatePicker style={{ width: "100%", borderRadius: 8 }}
                format="YYYY-MM-DD"
                disabledDate={c => c && c < dayjs().startOf("day")} />
            </Form.Item>
            <Form.Item name="staff" label="Staff Member"
              rules={[{ required: true, message: "Select staff" }]}
              style={{ flex: "1 1 160px", marginBottom: 12 }}>
              <Select placeholder="Select staff" loading={loadingStaff} style={{ borderRadius: 8 }}
                options={staffMembers.map(s => ({ label: s.name, value: s.id }))} />
            </Form.Item>
          </div>
          <Form.Item name="timeRange" label="Time Range"
            rules={[{ required: true, message: "Select time range" }]}
            style={{ marginBottom: 12 }}
            extra="7:00 AM – 10:00 PM, 15-min intervals">
            <RangePicker format="h:mm A" minuteStep={15}
              style={{ width: "100%", borderRadius: 8 }}
              showTime={{ format: "h:mm A", hourStep: 1, minuteStep: 15, use12Hours: true }}
              disabledTime={() => ({
                disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 22, 23],
                disabledMinutes: () => Array.from({ length: 60 }, (_, i) => i).filter(m => m % 15 !== 0),
              })} />
          </Form.Item>
        </FormSection>

        {/* Client */}
        <FormSection>
          <SectionLabel text="Client Information" />
          <Form.Item style={{ marginBottom: 12 }}>
            <Radio.Group value={clientInputMode}
              onChange={e => {
                setClientInputMode(e.target.value);
                if (e.target.value === "custom") {
                  setBookingType("individual");
                  setMaxCapacity(1);
                  setSelectedCusts([]);
                  form.setFieldsValue({ clientName: undefined, clientNames: [], bookingType: "individual", maxCapacity: 1 });
                }
              }}
              style={{ width: "100%" }}>
              <Radio.Button value="existing" style={{ width: "50%", textAlign: "center", borderRadius: "8px 0 0 8px" }}>
                Existing Client
              </Radio.Button>
              <Radio.Button value="custom" style={{ width: "50%", textAlign: "center", borderRadius: "0 8px 8px 0" }}>
                New Client
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {clientInputMode === "existing" ? (
            <>
              <Form.Item name="bookingType" label="Booking Type" style={{ marginBottom: 12 }}>
                <Radio.Group value={bookingType}
                  onChange={e => {
                    setBookingType(e.target.value);
                    if (e.target.value === "individual") {
                      setMaxCapacity(1); setSelectedCusts([]);
                      form.setFieldsValue({ clientNames: [], maxCapacity: 1 });
                    } else {
                      setMaxCapacity(5);
                      form.setFieldsValue({ clientName: undefined, maxCapacity: 5 });
                    }
                  }}>
                  <Radio value="individual">Individual</Radio>
                  <Radio value="group">Group</Radio>
                </Radio.Group>
              </Form.Item>

              {bookingType === "individual" ? (
                <Form.Item name="clientName" label="Client"
                  rules={[{ required: true, message: "Select a client" }]}
                  style={{ marginBottom: 12 }}>
                  <Select placeholder="Select client" showSearch allowClear
                    loading={loadingCustomers} style={{ borderRadius: 8 }}
                    optionFilterProp="label"
                    options={Array.isArray(customers)
                      ? customers.map(c => ({ label: c.customer_name, value: c._id }))
                      : []} />
                </Form.Item>
              ) : (
                <>
                  <Form.Item name="clientNames" label="Customers"
                    rules={[{ required: true, message: "Select at least one customer" }]}
                    style={{ marginBottom: 12 }}>
                    <Select mode="multiple" placeholder="Select customers" showSearch
                      allowClear loading={loadingCustomers}
                      style={{ borderRadius: 8 }} maxTagCount="responsive"
                      optionFilterProp="label"
                      options={Array.isArray(customers)
                        ? customers.map(c => ({ label: c.customer_name, value: c._id }))
                        : []}
                      onChange={vals => {
                        setSelectedCusts(vals);
                        if (vals.length > maxCapacity) {
                          setMaxCapacity(vals.length);
                          form.setFieldsValue({ maxCapacity: vals.length });
                        }
                      }} />
                  </Form.Item>
                  <Form.Item name="maxCapacity" label="Max Capacity"
                    extra={`${selectedCusts.length} selected`}
                    style={{ marginBottom: 12 }}>
                    <InputNumber min={selectedCusts.length || 1} max={20}
                      style={{ width: "100%", borderRadius: 8 }}
                      onChange={v => setMaxCapacity(v || 1)} />
                  </Form.Item>
                </>
              )}
            </>
          ) : (
            <Form.Item name="customClientName" label="Client Name"
              rules={[{ required: true, message: "Enter client name" }]}
              style={{ marginBottom: 12 }}>
              <Input placeholder="Enter client name" style={{ borderRadius: 8 }} />
            </Form.Item>
          )}
        </FormSection>

        {/* Service & Notes */}
        <FormSection>
          <SectionLabel text="Service & Notes" />
          <Form.Item name="service" label="Service"
            rules={[{ required: true, message: "Select a service" }]}
            style={{ marginBottom: 12 }}>
            <Select placeholder="Select service" showSearch allowClear
              loading={loadingProducts} style={{ borderRadius: 8 }}
              optionFilterProp="label"
              notFoundContent={loadingProducts ? <Spin size="small" /> : "No services found"}
              options={products.map(p => ({
                label: `${p.name} — ${p.category} (KES ${p.price})`,
                value: p.id,
              }))} />
          </Form.Item>
          <Form.Item name="specialRequests" label="Special Requests" style={{ marginBottom: 12 }}>
            <TextArea rows={3} placeholder="Special requests…" style={{ borderRadius: 8 }} />
          </Form.Item>
          {bookingType === "group" && (
            <Form.Item name="notes" label="Group Notes" style={{ marginBottom: 12 }}>
              <TextArea rows={2} placeholder="Notes for this group booking…" style={{ borderRadius: 8 }} />
            </Form.Item>
          )}
        </FormSection>
      </Form>
    </Drawer>
  );
};

// ── Calendar view ──────────────────────────────────────────────────────────
interface CalendarViewProps {
  onRegisterEditHandler?: (fn: (appt: any) => void) => void;
}

const CalendarView = ({ onRegisterEditHandler }: CalendarViewProps) => {
  const dispatch = useDispatch();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<"day" | "week">("day");
  const [formOpen, setFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [formDefaults, setFormDefaults] = useState<any>({});

  const shopId = localStorage.getItem("shopId");

  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchAllCustomers,
    retry: 1,
  });

  const { data: scheduleData, refetch: refetchSchedules } = useQuery({
    queryKey: ["schedule", dayjs(selectedDate).format("YYYY-MM-DD")],
    queryFn: () => fetchAllSchedules(dayjs(selectedDate).format("YYYY-MM-DD")),
    staleTime: 10000,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
    retry: 1,
  });

  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["users", shopId],
    enabled: !!shopId,
    queryFn: () => fetchAllUsersList({ fullname: "", email: "", shop_id: shopId! }),
    retry: 1,
    select: (data: any[]) =>
      data?.filter(u => {
        const rt = u.role?.role_type?.toLowerCase();
        return rt !== "admin" && rt !== "cleaner";
      }) ?? [],
  });

  const deleteAppt = useMutation({
    mutationFn: removeSchedule,
    onSuccess: () => { message.success("Appointment deleted"); refetchSchedules(); },
    onError: (e: any) => message.error(e.message || "Failed to delete"),
  });

  // ── Derived data ──────────────────────────────────────────────────────
  const staffMembers = useMemo(() => {
    if (!staffData) return [];
    return staffData.map((u: any) => ({
      id: u._id,
      name: u.fullname || u.username,
      role: u.role?.role_type || "staff",
      status: u.status || "Active",
    }));
  }, [staffData]);

  const customers = useMemo(() =>
    Array.isArray(customersData) ? customersData : [], [customersData]);

  const formattedProducts = useMemo(() => {
    if (!productsData || !Array.isArray(productsData)) return [];
    const out: any[] = [];
    productsData.forEach((cat: any) => {
      cat.products?.forEach((p: any) => {
        out.push({ id: p._id, name: p.name, price: p.price, category: cat.name });
      });
    });
    return out;
  }, [productsData]);

  const selectedDateStr = dayjs(selectedDate).format("YYYY-MM-DD");

  const formattedSchedules = useMemo(() => {
    if (!scheduleData?.data || !Array.isArray(scheduleData.data)) return [];
    return scheduleData.data
      .filter((appt: any) => {
        if (!appt.appointment_date) return true;
        return dayjs(appt.appointment_date).format("YYYY-MM-DD") === selectedDateStr;
      })
      .map((appt: any) => ({
        id: appt._id,
        staff: appt.staff_id?.fullname || "Unknown",
        staffId: appt.staff_id?._id,
        start_time: appt.start_time,
        end_time: appt.end_time,
        client: appt.customer_id?.customer_name || appt.custom_client_name || "Unknown",
        clientId: appt.customer_id?._id,
        customClientName: appt.custom_client_name,
        service: appt.service_id?.name || "Unknown",
        serviceId: appt.service_id?._id,
        duration: appt.duration,
        isTimeRange: appt.start_time !== appt.end_time,
        timeRangeDescription: `${appt.start_time} - ${appt.end_time}`,
        appointmentDate: appt.appointment_date,
        specialRequests: appt.special_requests,
        phone: appt.phone,
        originalData: appt,
      }));
  }, [scheduleData, selectedDateStr]);

  // ── Time slot helpers ─────────────────────────────────────────────────
  const isSlotBooked = useCallback((staffName: string, timeSlot: string) => {
    return formattedSchedules.some(appt => {
      if (appt.staff !== staffName) return false;
      if (appt.start_time === timeSlot) return true;
      if (appt.isTimeRange) {
        const si = ALL_TIME_SLOTS.indexOf(appt.start_time);
        const ei = ALL_TIME_SLOTS.indexOf(appt.end_time);
        const ti = ALL_TIME_SLOTS.indexOf(timeSlot);
        return ti >= si && ti < ei;
      }
      return false;
    });
  }, [formattedSchedules]);

  const getAppt = useCallback((staffName: string, time: string) =>
    formattedSchedules.find(a => a.staff === staffName && a.start_time === time),
    [formattedSchedules]);

  const getStaffAppts = useCallback((staffName: string) =>
    formattedSchedules.filter(a => a.staff === staffName),
    [formattedSchedules]);

  const nextSlot = (slot: string) => {
    const i = ALL_TIME_SLOTS.indexOf(slot);
    return i !== -1 && i < ALL_TIME_SLOTS.length - 1 ? ALL_TIME_SLOTS[i + 1] : slot;
  };

  const getApptPosition = (start: string, end: string) => {
    const si = ALL_TIME_SLOTS.indexOf(start);
    const ei = ALL_TIME_SLOTS.indexOf(end);
    return { top: si * 20, height: (ei - si) * 20 || 20 };
  };

  // ── Open form helpers ─────────────────────────────────────────────────
  const openCreate = (staffId?: string, timeSlot?: string) => {
    setIsEditMode(false);
    setEditingId(undefined);
    const defaults: any = {
      appointmentDate: dayjs(selectedDate),
      bookingType: "individual",
      maxCapacity: 1,
    };
    if (staffId) defaults.staff = staffId;
    if (timeSlot) {
      defaults.timeRange = [
        dayjs(timeSlot, "h:mm A"),
        dayjs(nextSlot(timeSlot), "h:mm A"),
      ];
    }
    setFormDefaults(defaults);
    setFormOpen(true);
  };

  const openEdit = (appt: any) => {
    setIsEditMode(true);
    setEditingId(appt.id);
    const orig = appt.originalData;
    const custIds = orig?.customer_ids?.map((c: any) => c._id || c) || [];
    const defaults: any = {
      staff: appt.staffId,
      appointmentDate: orig?.appointment_date ? dayjs(orig.appointment_date) : dayjs(selectedDate),
      timeRange: [dayjs(appt.start_time, "h:mm A"), dayjs(appt.end_time, "h:mm A")],
      service: appt.serviceId,
      specialRequests: appt.specialRequests || "",
      notes: orig?.notes || "",
      bookingType: orig?.booking_type || "individual",
      maxCapacity: orig?.max_capacity || 1,
      customClientName: appt.customClientName || "",
    };
    if (orig?.booking_type === "group" && custIds.length > 0) {
      defaults.clientNames = custIds;
    } else if (appt.clientId) {
      defaults.clientName = appt.clientId;
    }
    setFormDefaults(defaults);
    setFormOpen(true);
  };

  // Register openEdit with parent so list-view can trigger it
  useEffect(() => {
    onRegisterEditHandler?.(openEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterEditHandler]);

  const handleSlotClick = (time: string, staffName: string) => {
    if (isSlotBooked(staffName, time)) {
      const appt = getAppt(staffName, time);
      if (appt) openEdit(appt);
      return;
    }
    const staff = staffMembers.find(s => s.name === staffName);
    openCreate(staff?.id, time);
  };

  const navigateDay = (dir: number) =>
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      return d;
    });

  // ── Day calendar grid ─────────────────────────────────────────────────
  const renderDayGrid = () => {
    if (loadingStaff || !staffMembers.length) return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0", gap: 12 }}>
        <Spin size="large" />
        <Text style={{ color: C.subText, alignSelf: "center" }}>Loading staff…</Text>
      </div>
    );

    return (
      <div style={{
        display: "flex", flexDirection: "column",
        overflow: "hidden", maxHeight: "calc(100vh - 260px)", position: "relative",
      }}>
        {/* Staff headers */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.bg, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${C.border}` }} />
          {staffMembers.map(staff => (
            <div key={staff.id} style={{
              flex: "1 0 180px", minWidth: 180, padding: "10px 12px",
              textAlign: "center", borderRight: `1px solid ${C.border}`, position: "relative",
            }}>
              {/* Avatar circle */}
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: C.primaryLight,
                color: C.primary, fontWeight: 700, fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 4px",
              }}>
                {staff.name.charAt(0).toUpperCase()}
              </div>
              <Text strong style={{ fontSize: 12, display: "block" }}>{staff.name}</Text>
              <Text style={{ fontSize: 10, color: C.subText }}>{staff.role}</Text>
              <Button type="dashed" icon={<PlusOutlined />} size="small"
                style={{ position: "absolute", top: 8, right: 8, borderRadius: 6 }}
                onClick={e => { e.stopPropagation(); openCreate(staff.id); }} />
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div style={{ display: "flex", overflowY: "auto", flexGrow: 1 }}>
          {/* Time axis */}
          <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.bg }}>
            {HOUR_RANGE.map(hour => {
              const dh = hour > 12 ? hour - 12 : hour;
              const per = hour >= 12 ? "PM" : "AM";
              return (
                <div key={hour} style={{
                  height: 80, borderBottom: `1px solid ${C.border}`,
                  display: "flex", alignItems: "flex-start", justifyContent: "center",
                  paddingTop: 5, color: C.subText, fontSize: 11, fontWeight: 500,
                  position: "relative",
                }}>
                  {`${dh} ${per}`}
                  {[20, 40, 60].map(t => (
                    <div key={t} style={{
                      position: "absolute", left: 0, right: 0, top: t,
                      borderBottom: `1px dotted ${C.border}`,
                    }} />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Staff columns */}
          <div style={{ display: "flex", flexGrow: 1 }}>
            {staffMembers.map(staff => {
              const appts = getStaffAppts(staff.name);
              return (
                <div key={staff.id} style={{
                  flex: "1 0 180px", minWidth: 180,
                  borderRight: `1px solid ${C.border}`, position: "relative",
                }}>
                  {/* Hour grid */}
                  {HOUR_RANGE.map(hour => (
                    <div key={hour} style={{
                      height: 80, borderBottom: `1px solid ${C.border}`,
                      position: "relative",
                    }}>
                      {[20, 40, 60].map(t => (
                        <div key={t} style={{
                          position: "absolute", left: 0, right: 0, top: t,
                          borderBottom: `1px dotted ${C.border}`, zIndex: 1,
                        }} />
                      ))}
                      {[0, 1, 2, 3].map(q => {
                        const min = q * 15;
                        const dh = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                        const per = hour >= 12 ? "PM" : "AM";
                        const slot = `${dh}:${min < 10 ? "0" + min : min} ${per}`;
                        const booked = isSlotBooked(staff.name, slot);
                        return (
                          <div key={q} style={{
                            position: "absolute", left: 0, right: 0,
                            top: q * 20, height: 20, zIndex: 2,
                            cursor: booked ? "default" : "pointer",
                          }}
                            onClick={booked ? undefined : () => handleSlotClick(slot, staff.name)}
                          />
                        );
                      })}
                    </div>
                  ))}

                  {/* Appointment blocks */}
                  {appts.map(appt => {
                    const { top, height } = getApptPosition(appt.start_time, appt.end_time);
                    const custDisp = appt.originalData?.customer_ids?.length > 1
                      ? `${appt.originalData.customer_ids.length} customers`
                      : appt.customClientName || appt.client;

                    return (
                      <div key={appt.id}
                        title={`${custDisp}\n${appt.service}\n${appt.timeRangeDescription}`}
                        style={{
                          position: "absolute", top, left: 3, right: 3, height,
                          background: "#e8f4fd", borderLeft: `3px solid ${C.blue}`,
                          borderRadius: 4, padding: "3px 6px",
                          overflow: "hidden", cursor: "pointer", zIndex: 3,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        }}
                        onClick={() => openEdit(appt)}
                      >
                        <Text strong style={{ fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {custDisp}
                        </Text>
                        {height > 30 && (
                          <Text style={{ fontSize: 10, color: C.subText, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {appt.service}
                          </Text>
                        )}
                        {height > 45 && (
                          <Text style={{ fontSize: 10 }}>
                            <ClockCircleOutlined style={{ marginRight: 2, fontSize: 9 }} />
                            {appt.start_time} – {appt.end_time}
                          </Text>
                        )}
                        {/* Delete button on hover-like placement */}
                        <Popconfirm
                          title="Delete this appointment?"
                          description="This cannot be undone."
                          onConfirm={e => {
                            e?.stopPropagation();
                            deleteAppt.mutate(appt.id);
                          }}
                          okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />}
                            style={{
                              position: "absolute", top: 1, right: 1,
                              padding: 0, fontSize: 9, height: 16, width: 16,
                            }}
                            onClick={e => e.stopPropagation()} />
                        </Popconfirm>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Week view ─────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "calc(100vh - 260px)" }}>
        {/* Day headers */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
          <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${C.border}` }} />
          {weekDates.map((date, i) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const isSelected = selectedDate.toDateString() === date.toDateString();
            return (
              <div key={i} style={{
                flex: "1 0 120px", minWidth: 120, padding: "8px",
                textAlign: "center", borderRight: `1px solid ${C.border}`,
                background: isSelected ? "#e6f7ff" : isToday ? "#fffbeb" : C.bg,
                cursor: "pointer",
              }}
                onClick={() => setSelectedDate(new Date(date))}>
                <Text strong style={{ fontSize: 12, display: "block" }}>
                  {date.toLocaleDateString("en-GB", { weekday: "short" })}
                </Text>
                <Text style={{
                  fontSize: 18, display: "block",
                  color: isToday ? C.blue : C.darkText, fontWeight: isToday ? 700 : 400,
                }}>
                  {date.getDate()}
                </Text>
                <Text style={{ fontSize: 11, color: C.subText }}>
                  {date.toLocaleDateString("en-GB", { month: "short" })}
                </Text>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div style={{ display: "flex", overflowY: "auto", flexGrow: 1 }}>
          <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.bg }}>
            {HOUR_RANGE.map(hour => {
              const dh = hour > 12 ? hour - 12 : hour;
              return (
                <div key={hour} style={{
                  height: 80, borderBottom: `1px solid ${C.border}`,
                  display: "flex", alignItems: "flex-start", justifyContent: "center",
                  paddingTop: 5, color: C.subText, fontSize: 11, fontWeight: 500,
                }}>
                  {`${dh} ${hour >= 12 ? "PM" : "AM"}`}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexGrow: 1 }}>
            {weekDates.map((date, i) => {
              const isToday = new Date().toDateString() === date.toDateString();
              const isSelected = selectedDate.toDateString() === date.toDateString();
              return (
                <div key={i} style={{
                  flex: "1 0 120px", minWidth: 120,
                  borderRight: `1px solid ${C.border}`, position: "relative",
                  background: isSelected ? "#f0f7ff" : isToday ? "#fffbe6" : "transparent",
                }}>
                  {HOUR_RANGE.map(hour => (
                    <div key={hour} style={{ height: 80, borderBottom: `1px solid ${C.border}`, position: "relative" }}>
                      {[20, 40, 60].map(t => (
                        <div key={t} style={{ position: "absolute", left: 0, right: 0, top: t, borderBottom: `1px dotted ${C.border}` }} />
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, borderRadius: 10 }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
        background: "#fff", borderRadius: "10px 10px 0 0",
      }}>
        <Button onClick={() => setSelectedDate(new Date())}
          style={{ borderRadius: 8 }}>Today</Button>
        <Button icon={<LeftOutlined />} onClick={() => navigateDay(-1)} style={{ borderRadius: 8 }} />
        <DatePicker
          value={dayjs(selectedDate)}
          onChange={d => d && setSelectedDate(d.toDate())}
          format="DD MMM YYYY" allowClear={false}
          variant="borderless" suffixIcon={null}
          style={{ fontWeight: 600, fontSize: 14, width: 120 }}
        />
        <Button icon={<RightOutlined />} onClick={() => navigateDay(1)} style={{ borderRadius: 8 }} />

        <Radio.Group value={calendarView}
          onChange={e => setCalendarView(e.target.value)}
          buttonStyle="solid" style={{ marginLeft: 4 }}>
          <Radio.Button value="day" style={{ borderRadius: "8px 0 0 8px" }}>Day</Radio.Button>
          <Radio.Button value="week" style={{ borderRadius: "0 8px 8px 0" }}>Week</Radio.Button>
        </Radio.Group>

        <div style={{ flex: 1 }} />

        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => openCreate()}
          style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
          Add Appointment
        </Button>
      </div>

      {/* Calendar body */}
      <div style={{ background: "#fff", borderRadius: "0 0 10px 10px" }}>
        {calendarView === "day" ? renderDayGrid() : renderWeekView()}
      </div>

      {/* Appointment form drawer */}
      <AppointmentForm
        open={formOpen}
        isEditMode={isEditMode}
        editingId={editingId}
        staffMembers={staffMembers}
        customers={customers}
        products={formattedProducts}
        selectedDate={selectedDate}
        loadingStaff={loadingStaff}
        loadingCustomers={loadingCustomers}
        loadingProducts={loadingProducts}
        formattedSchedules={formattedSchedules}
        onClose={() => setFormOpen(false)}
        onSuccess={refetchSchedules}
      />
    </div>
  );
};

export default CalendarView;