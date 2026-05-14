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
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Text } = Typography;
const { RangePicker } = TimePicker;
const { TextArea } = Input;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
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
  formDefaults: any;           // ← NEW: receive defaults from parent
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
  open, isEditMode, editingId, formDefaults,
  staffMembers, customers, products,
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

  // ── Pre-fill form whenever the drawer opens or defaults change ────────────
  useEffect(() => {
    if (!open) return;

    // Small timeout lets the Drawer finish mounting before setting values
    const timer = setTimeout(() => {
      form.resetFields();
      form.setFieldsValue(formDefaults);

      // Sync local state from defaults
      const bt = formDefaults?.bookingType || "individual";
      setBookingType(bt);
      setMaxCapacity(formDefaults?.maxCapacity || 1);
      setSelectedCusts(formDefaults?.clientNames || []);

      // Detect whether this is a custom (non-existing) client edit
      if (formDefaults?.customClientName && !formDefaults?.clientName && !formDefaults?.clientNames?.length) {
        setClientInputMode("custom");
      } else {
        setClientInputMode("existing");
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [open, formDefaults, form]);

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
      handleClose();
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

  return (
    <Drawer
      open={open} onClose={handleClose} placement="right"
      width="min(520px, 96vw)"
      // NOTE: destroyOnClose removed — keeping the form mounted lets
      // setFieldsValue work reliably. The useEffect + resetFields handles cleanup.
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
      <Form form={form} layout="vertical" onFinish={handleSubmit}>

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
  onAppointmentUpdate?: () => void;
}

const CalendarView = ({ onRegisterEditHandler, onAppointmentUpdate }: CalendarViewProps) => {
  const dispatch = useDispatch();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<"day" | "week">("day");
  const [formOpen, setFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [formDefaults, setFormDefaults] = useState<any>({});
  const [draggedAppt, setDraggedAppt] = useState<any | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{staffName: string; timeSlot: string; date?: Date} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [heldAppointment, setHeldAppointment] = useState<any | null>(null); // Temporary holding state
  
  // Use primary color context instead of hardcoded colors
  const contextResult = usePrimaryColor();
  const primaryColor = contextResult?.primaryColor || '#6c1c2c';
  
  // Generate color palette based on primary color
  const generateColorPalette = (primary: string) => {
    console.log('Generating palette for primary color:', primary);
    
    // Default to the primary color and generate complementary colors
    return {
      primary: primary,
      primaryLight: primary + '20', // Add transparency for light variant
      blue: '#3b82f6',
      orange: '#f59e0b',
      subText: '#64748b',
      darkText: '#0f172a',
      border: '#e2e8f0',
      bg: '#f8fafc',
    };
  };
  
  const colors = generateColorPalette(primaryColor);

  // ── Navigation function ─────────────────────────────────────────────────────
  const navigateDay = useCallback((dir: number) =>
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      return d;
    }), []);

  // ── Keyboard navigation during drag ───────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    console.log('Key pressed:', e.key, 'isDragging:', isDragging);
    
    if (!isDragging || !draggedAppt) return;
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      console.log('Navigating to previous day');
      navigateDay(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      console.log('Navigating to next day');
      navigateDay(1);
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      console.log('Navigating to today');
      setSelectedDate(new Date());
    }
  }, [isDragging, navigateDay, draggedAppt]);

  // ── Global drop handler for better drop detection ───────────────────────────
  const handleGlobalDrop = useCallback((e: DragEvent) => {
    if (!isDragging || !draggedAppt) return;
    
    console.log('Global drop event triggered:', e.target);
    e.preventDefault();
    e.stopPropagation();
    
    // Try to find the nearest valid drop zone
    const target = e.target as HTMLElement;
    console.log('Drop target:', target);
    
    // Try multiple ways to find the drop zone
    let dropZone: Element | null = target.closest('[data-drop-zone]');
    if (!dropZone) {
      dropZone = target.closest('[data-staff-name]');
    }
    if (!dropZone) {
      // Try to find parent with time slot data
      let parent = target.parentElement;
      while (parent && parent !== document.body) {
        if (parent.getAttribute('data-time-slot')) {
          dropZone = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }
    
    console.log('Found drop zone:', dropZone);
    
    if (dropZone) {
      const staffName = dropZone.getAttribute('data-staff-name');
      const timeSlot = dropZone.getAttribute('data-time-slot');
      
      console.log('Drop zone data:', { staffName, timeSlot });
      
      if (staffName && timeSlot) {
        console.log('Calling handleDrop with:', { staffName, timeSlot });
        
        // Check if we have a held appointment to drop
        if (heldAppointment) {
          dropHeldAppointment(staffName, timeSlot);
        } else {
          handleDrop(e as any, staffName, timeSlot);
        }
        return;
      }
    }
    
    // If no valid drop zone found, show error
    message.warning('Please drop the appointment on a valid time slot');
    setDraggedAppt(null);
    setIsDragging(false);
  }, [isDragging, draggedAppt, heldAppointment]);

  // ── Event listeners setup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isDragging) {
      console.log('Adding keyboard listener for drag navigation');
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('drop', handleGlobalDrop);
      document.addEventListener('dragover', (e) => e.preventDefault());
      // Note: handleMouseUp will be added later after it's defined
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('drop', handleGlobalDrop);
      // Note: handleMouseUp will be removed later after it's defined
    };
  }, [isDragging, handleKeyDown, handleGlobalDrop]);

  const shopId = localStorage.getItem("shopId");

  const { data: customersData, isLoading: loadingCustomers, refetch: refetchCustomers } = useQuery({
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
        const isActive = u.status === "Active";

        return rt !== "admin" && rt !== "cleaner" && rt !== "cashier" && isActive;
      }) ?? [],
  });

  // Combined refresh function to update all relevant data after changes
  const refreshAllData = useCallback(() => {
    refetchSchedules();
    refetchCustomers();
    onAppointmentUpdate?.();
  }, [refetchSchedules, refetchCustomers, onAppointmentUpdate]);

  const deleteAppt = useMutation({
    mutationFn: removeSchedule,
    onSuccess: () => { message.success("Appointment deleted"); refreshAllData(); },
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

  // Week view calculations moved outside render function
  const weekSchedules = useMemo(() => {
    if (!scheduleData?.data || !Array.isArray(scheduleData.data)) return [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const weekStart = dayjs(startOfWeek);
    
    return scheduleData.data.map((appt: any) => {
      const apptDate = dayjs(appt.appointment_date);
      const weekEnd = weekStart.add(6, 'day');
      
      // Only include appointments within the week range
      if (apptDate.isBefore(weekStart, 'day') || apptDate.isAfter(weekEnd, 'day')) {
        return null;
      }
      
      return {
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
        dayIndex: apptDate.diff(weekStart, 'day'),
      };
    }).filter((appt): appt is NonNullable<typeof appt> => Boolean(appt));
  }, [scheduleData, selectedDate]);

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

  const isTimeRangeAvailableForDrop = (staffName: string, start: string, end: string, excludeId?: string): boolean => {
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
    
    // Only set form defaults if data is available
    if (!loadingCustomers && !loadingProducts && customers.length > 0 && formattedProducts.length > 0) {
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
      
      // Verify client ID exists in customers array
      if (orig?.booking_type === "group" && custIds.length > 0) {
        const validCustIds = custIds.filter(id => customers.some(c => c._id === id));
        defaults.clientNames = validCustIds;
      } else if (appt.clientId) {
        const clientExists = customers.some(c => c._id === appt.clientId);
        if (clientExists) {
          defaults.clientName = appt.clientId;
        }
      }
      
      // Verify service ID exists in products array
      const serviceExists = formattedProducts.some(p => p.id === appt.serviceId);
      if (serviceExists) {
        defaults.service = appt.serviceId;
      } else {
        defaults.service = undefined;
      }
      
      setFormDefaults(defaults);
      setFormOpen(true);
    } else {
      // If data isn't loaded yet, set a minimal default and retry after a short delay
      const minimalDefaults: any = {
        staff: appt.staffId,
        appointmentDate: orig?.appointment_date ? dayjs(orig.appointment_date) : dayjs(selectedDate),
        timeRange: [dayjs(appt.start_time, "h:mm A"), dayjs(appt.end_time, "h:mm A")],
        specialRequests: appt.specialRequests || "",
        notes: orig?.notes || "",
        bookingType: orig?.booking_type || "individual",
        maxCapacity: orig?.max_capacity || 1,
        customClientName: appt.customClientName || "",
      };
      setFormDefaults(minimalDefaults);
      setFormOpen(true);
      
      // Retry setting the full defaults after data loads
      setTimeout(() => {
        if (!loadingCustomers && !loadingProducts && customers.length > 0 && formattedProducts.length > 0) {
          openEdit(appt);
        }
      }, 100);
    }
  };

  // Register openEdit with parent so list-view can trigger it
  useEffect(() => {
    onRegisterEditHandler?.(openEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterEditHandler]);

  const handleSlotClick = (time: string, staffName: string) => {
    // If we have a held appointment, drop it instead of opening the form
    if (heldAppointment) {
      console.log('Dropping held appointment on slot click:', { staffName, timeSlot: time });
      dropHeldAppointment(staffName, time);
      return;
    }
    
    // Normal slot click behavior
    if (isSlotBooked(staffName, time)) {
      const appt = getAppt(staffName, time);
      if (appt) openEdit(appt);
    } else {
      const staff = staffMembers.find(s => s.name === staffName);
      openCreate(staff?.id, time);
    }
  };

  // ── Pick up and hold functions ─────────────────────────────────────────────
  const pickUpAppointment = (appt: any) => {
    console.log('Picking up appointment:', appt);
    setHeldAppointment(appt);
    message.success(`Picked up: ${appt.customClientName || appt.client} - ${appt.service}`);
  };

  const dropHeldAppointment = async (targetStaffName: string, targetTimeSlot: string, targetDate?: Date) => {
    if (!heldAppointment) {
      message.error('No appointment to drop');
      return;
    }

    console.log('Dropping held appointment:', { targetStaffName, targetTimeSlot, targetDate, heldAppointment });
    
    try {
      // Use the same logic as handleDrop but with heldAppointment
      const orig = heldAppointment.originalData;
      const appointmentDate = targetDate 
        ? dayjs(targetDate).format("YYYY-MM-DD")
        : dayjs(selectedDate).format("YYYY-MM-DD");
      
      // Calculate end time based on original duration
      const originalStart = ALL_TIME_SLOTS.indexOf(heldAppointment.start_time);
      const originalEnd = ALL_TIME_SLOTS.indexOf(heldAppointment.end_time);
      const duration = originalEnd - originalStart;
      const targetStart = ALL_TIME_SLOTS.indexOf(targetTimeSlot);
      const targetEnd = ALL_TIME_SLOTS[targetStart + duration] || targetTimeSlot;
      
      // Find target staff member
      const targetStaffMember = staffMembers.find(s => s.name === targetStaffName);
      if (!targetStaffMember) {
        message.error("Target staff member not found");
        return;
      }

      // Check for time conflicts
      if (!isTimeRangeAvailableForDrop(targetStaffName, targetTimeSlot, targetEnd, heldAppointment.id)) {
        message.error(`Time slot conflicts with an existing appointment for ${targetStaffName}.`);
        return;
      }

      // Prepare customer IDs
      let customerIds: string[] = [];
      let clientId: string | null = null;
      
      if (orig?.booking_type === "group" && orig?.customer_ids?.length > 0) {
        customerIds = orig.customer_ids.map((c: any) => c._id || c) || [];
      } else if (orig?.customer_id?._id) {
        customerIds = [orig.customer_id._id];
        clientId = orig.customer_id._id;
      }

      // Prepare payload
      const payload = {
        staff_id: targetStaffMember.id,
        start_time: targetTimeSlot,
        end_time: targetEnd,
        appointment_date: appointmentDate,
        customer_ids: customerIds,
        client_id: clientId,
        custom_client_name: heldAppointment.customClientName || orig?.custom_client_name || "",
        service_id: heldAppointment.serviceId || orig?.service_id?._id,
        duration: `${duration * 15} mins`,
        isTimeRange: true,
        timeRangeDescription: `${targetTimeSlot} - ${targetEnd}`,
        special_requests: heldAppointment.specialRequests || orig?.special_requests || "",
        notes: orig?.notes || "",
        source: "admin_portal",
        booking_type: orig?.booking_type || "individual",
        max_capacity: orig?.max_capacity || 1,
      };

      console.log('Update payload for held appointment:', payload);

      await dispatch(updateSchedule({ id: heldAppointment.id, data: payload }) as any).unwrap();
      console.log('API call successful for held appointment');
      
      // Clear held appointment
      setHeldAppointment(null);
      refreshAllData();
      
      // Success message
      const staffChanged = targetStaffName !== heldAppointment.staff;
      const dateChanged = targetDate && dayjs(targetDate).format("YYYY-MM-DD") !== dayjs(heldAppointment.appointmentDate).format("YYYY-MM-DD");
      const timeChanged = targetTimeSlot !== heldAppointment.start_time;
      
      const changeDescription = [];
      if (staffChanged) changeDescription.push(`staff: ${heldAppointment.staff} → ${targetStaffName}`);
      if (dateChanged) changeDescription.push(`date: ${dayjs(heldAppointment.appointmentDate).format("MMM DD")} → ${dayjs(targetDate || selectedDate).format("MMM DD")}`);
      if (timeChanged) changeDescription.push(`time: ${heldAppointment.start_time} → ${targetTimeSlot}`);
      
      const changeText = changeDescription.length > 0 ? ` (${changeDescription.join(", ")})` : "";
      
      message.success(`Appointment moved${changeText}`);
    } catch (error: any) {
      message.error(error.message || "Failed to move appointment");
    }
  };

  const clearHeldAppointment = () => {
    setHeldAppointment(null);
    message.info('Cleared held appointment');
  };
  const handleDragStart = (e: React.DragEvent, appt: any) => {
    console.log('Drag start:', appt);
    message.info(`Started dragging: ${appt.customClientName || appt.client}`);
    setDraggedAppt(appt);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(appt));
    // Add visual feedback
    e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 50, 20);
  };

  const handleDragEnd = () => {
    console.log('Drag end');
    setDraggedAppt(null);
    setDragOverInfo(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent, staffName: string, timeSlot: string, date?: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    console.log('Drag over:', { staffName, timeSlot, date });
    
    // Only update if the drag over info has actually changed to prevent infinite re-renders
    const newDragOverInfo = { staffName, timeSlot, date };
    const currentInfo = dragOverInfo;
    
    if (!currentInfo || 
        currentInfo.staffName !== staffName || 
        currentInfo.timeSlot !== timeSlot || 
        currentInfo.date?.toDateString() !== date?.toDateString()) {
      setDragOverInfo(newDragOverInfo);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the target element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      console.log('Drag leave');
      setDragOverInfo(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStaffName: string, targetTimeSlot: string, targetDate?: Date) => {
    console.log('=== handleDrop START ===');
    console.log('Drop triggered:', { targetStaffName, targetTimeSlot, targetDate, draggedAppt });
    
    e.preventDefault();
    setDragOverInfo(null);
    
    if (!draggedAppt) {
      console.log('No dragged appointment - ABORTING');
      return;
    }

    console.log('Proceeding with drop...');

    try {
      // For mouse up events, we might not have dataTransfer, so use the draggedAppt state directly
      let apptData = draggedAppt;
      
      // Try to get data from dataTransfer if available (for actual drop events)
      try {
        const dataTransferData = e.dataTransfer?.getData('text/plain');
        if (dataTransferData) {
          apptData = JSON.parse(dataTransferData);
          console.log('Parsed appt data from dataTransfer:', apptData);
        }
      } catch (err) {
        console.log('Using draggedAppt state instead of dataTransfer');
      }
      
      // Check if dropping on the exact same position (same staff, same time, same date)
      const isSamePosition = 
        apptData.id === draggedAppt.id &&
        targetStaffName === draggedAppt.staff &&
        targetTimeSlot === draggedAppt.start_time &&
        (!targetDate || dayjs(targetDate).format("YYYY-MM-DD") === dayjs(draggedAppt.appointmentDate || selectedDate).format("YYYY-MM-DD"));
      
      if (isSamePosition) {
        console.log('Dropping on same position - ABORTING');
        return;
      }
      
      console.log('Valid move detected - proceeding with update...');

      console.log('Finding target staff member...');

      // Find the target staff member (same logic as handleSubmit)
      const targetStaffMember = staffMembers.find(s => s.name === targetStaffName);
      if (!targetStaffMember) {
        message.error("Target staff member not found");
        return;
      }

      // Prepare the data exactly like handleSubmit does
      const orig = draggedAppt.originalData;
      const appointmentDate = targetDate 
        ? dayjs(targetDate).format("YYYY-MM-DD")
        : dayjs(selectedDate).format("YYYY-MM-DD");
      
      // Calculate end time based on original duration (same logic as handleSubmit)
      const originalStart = ALL_TIME_SLOTS.indexOf(draggedAppt.start_time);
      const originalEnd = ALL_TIME_SLOTS.indexOf(draggedAppt.end_time);
      const duration = originalEnd - originalStart;
      const targetStart = ALL_TIME_SLOTS.indexOf(targetTimeSlot);
      const targetEnd = ALL_TIME_SLOTS[targetStart + duration] || targetTimeSlot;
      
      // Check for time conflicts (same logic as handleSubmit)
      if (!isTimeRangeAvailableForDrop(targetStaffName, targetTimeSlot, targetEnd, draggedAppt.id)) {
        message.error(`Time slot conflicts with an existing appointment for ${targetStaffName}.`);
        return;
      }

      // Prepare customer IDs (same logic as handleSubmit)
      let customerIds: string[] = [];
      let clientId: string | null = null;
      
      if (orig?.booking_type === "group" && orig?.customer_ids?.length > 0) {
        customerIds = orig.customer_ids.map((c: any) => c._id || c) || [];
      } else if (orig?.customer_id?._id) {
        customerIds = [orig.customer_id._id];
        clientId = orig.customer_id._id;
      }

      // Prepare payload exactly like handleSubmit does
      const payload = {
        staff_id: targetStaffMember.id,
        start_time: targetTimeSlot,
        end_time: targetEnd,
        appointment_date: appointmentDate,
        customer_ids: customerIds,
        client_id: clientId,
        custom_client_name: draggedAppt.customClientName || orig?.custom_client_name || "",
        service_id: draggedAppt.serviceId || orig?.service_id?._id,
        duration: `${duration * 15} mins`,
        isTimeRange: true,
        timeRangeDescription: `${targetTimeSlot} - ${targetEnd}`,
        special_requests: draggedAppt.specialRequests || orig?.special_requests || "",
        notes: orig?.notes || "",
        source: "admin_portal",
        booking_type: orig?.booking_type || "individual",
        max_capacity: orig?.max_capacity || 1,
      };

      console.log('Update payload (same as edit form):', payload);

      console.log('About to call updateSchedule API...');
      
      // Call updateSchedule exactly like handleSubmit does
      await dispatch(updateSchedule({ id: draggedAppt.id, data: payload }) as any).unwrap();
      
      console.log('API call successful - appointment updated!');
      
      // Force immediate UI refresh
      refreshAllData();
      
      // Also clear drag state immediately
      setDraggedAppt(null);
      setIsDragging(false);
      setDragOverInfo(null);
      
      // Create descriptive success message
      const staffChanged = targetStaffName !== draggedAppt.staff;
      const dateChanged = targetDate && dayjs(targetDate).format("YYYY-MM-DD") !== dayjs(draggedAppt.appointmentDate).format("YYYY-MM-DD");
      const timeChanged = targetTimeSlot !== draggedAppt.start_time;
      
      const changeDescription = [];
      if (staffChanged) changeDescription.push(`staff: ${draggedAppt.staff} → ${targetStaffName}`);
      if (dateChanged) changeDescription.push(`date: ${dayjs(draggedAppt.appointmentDate).format("MMM DD")} → ${dayjs(targetDate || selectedDate).format("MMM DD")}`);
      if (timeChanged) changeDescription.push(`time: ${draggedAppt.start_time} → ${targetTimeSlot}`);
      
      const changeText = changeDescription.length > 0 ? ` (${changeDescription.join(", ")})` : "";
      
      message.success(`Appointment moved${changeText}`);
      refreshAllData();
    } catch (error: any) {
      message.error(error.message || "Failed to move appointment");
    }
  };

  // ── Mouse up handler for fallback drop detection ───────────────────────────
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedAppt) return;
    
    console.log('Mouse up during drag:', e.target);
    console.log('Dragged appointment:', draggedAppt);
    
    // Check if we're over a valid drop zone
    const target = e.target as HTMLElement;
    const dropZone = target.closest('[data-drop-zone]') || target.closest('[data-time-slot]');
    
    console.log('Found drop zone:', dropZone);
    
    if (dropZone) {
      const staffName = dropZone.getAttribute('data-staff-name');
      const timeSlot = dropZone.getAttribute('data-time-slot');
      
      console.log('Drop zone data:', { staffName, timeSlot });
      
      if (staffName && timeSlot) {
        console.log('Mouse up on drop zone:', { staffName, timeSlot });
        console.log('About to call handleDrop...');
        
        // Check if we have a held appointment to drop
        if (heldAppointment) {
          dropHeldAppointment(staffName, timeSlot);
        } else {
          handleDrop(e as any, staffName, timeSlot);
        }
        return;
      }
    }
    
    // Cancel the drag if not dropped on valid zone
    console.log('Canceling drag - no valid drop zone');
    setDraggedAppt(null);
    setIsDragging(false);
  }, [isDragging, draggedAppt, heldAppointment]);

  // ── Event listeners setup with all handlers ────────────────────────────────
  useEffect(() => {
    if (isDragging) {
      console.log('Adding keyboard listener for drag navigation');
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('drop', handleGlobalDrop);
      document.addEventListener('dragover', (e) => e.preventDefault());
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleKeyDown, handleGlobalDrop, handleMouseUp]);

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
              background: dragOverInfo?.staffName === staff.name ? C.primaryLight : C.bg,
              transition: "all 0.2s ease",
              border: dragOverInfo?.staffName === staff.name ? `2px solid ${C.primary}` : "none",
              borderRadius: dragOverInfo?.staffName === staff.name ? 6 : 0,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", 
                background: dragOverInfo?.staffName === staff.name ? C.primary : C.primaryLight,
                color: "white", fontWeight: 700, fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 4px", transition: "all 0.2s ease",
              }}>
                {staff.name.charAt(0).toUpperCase()}
              </div>
              <Text strong style={{ 
                fontSize: 12, display: "block",
                color: dragOverInfo?.staffName === staff.name ? C.primary : C.darkText
              }}>
                {staff.name}
              </Text>
              <Text style={{ 
                fontSize: 10, 
                color: dragOverInfo?.staffName === staff.name ? C.primary : C.subText
              }}>
                {staff.role}
              </Text>
              {dragOverInfo?.staffName === staff.name && (
                <Text style={{ fontSize: 10, color: C.primary, display: "block", marginTop: 2 }}>
                  Drop to assign
                </Text>
              )}
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
                        const isDragOver = dragOverInfo?.staffName === staff.name && dragOverInfo?.timeSlot === slot;
                        
                        return (
                          <div key={q} style={{
                            position: "absolute", left: 0, right: 0,
                            top: q * 20, height: 20, zIndex: 2,
                            cursor: booked ? "default" : "pointer",
                            background: isDragOver ? colors.primaryLight : (isDragging && !booked ? "rgba(24,144,255,0.05)" : "transparent"),
                            border: isDragOver ? `2px dashed ${primaryColor}` : (isDragging && !booked ? "1px dashed #ccc" : "none"),
                            borderRadius: isDragOver ? 4 : 0,
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: heldAppointment && !booked ? "center" : "flex-start",
                          }}
                            data-staff-name={staff.name}
                            data-time-slot={slot}
                            data-drop-zone="true"
                            onClick={booked ? undefined : () => handleSlotClick(slot, staff.name)}
                            onDragOver={booked ? undefined : (e) => {
                              console.log('Drag over event triggered for:', { staffName: staff.name, timeSlot: slot });
                              handleDragOver(e, staff.name, slot);
                            }}
                            onDragLeave={booked ? undefined : (e) => {
                              console.log('Drag leave event triggered for:', { staffName: staff.name, timeSlot: slot });
                              handleDragLeave(e);
                            }}
                            onDrop={booked ? undefined : (e) => {
                              console.log('Drop event triggered for:', { staffName: staff.name, timeSlot: slot });
                              console.log('Drop event details:', { 
                                type: e.type, 
                                preventDefault: e.defaultPrevented,
                                cancelable: e.cancelable,
                                dataTransfer: e.dataTransfer?.types
                              });
                              e.preventDefault();
                              e.stopPropagation();
                              
                              // Check if we have a held appointment to drop
                              if (heldAppointment) {
                                dropHeldAppointment(staff.name, slot);
                              } else {
                                handleDrop(e, staff.name, slot);
                              }
                            }}
                          >
                            {/* Show Drop Here button when there's a held appointment and slot is not booked */}
                            {heldAppointment && !booked && (
                              <Button
                                size="small"
                                type="primary"
                                style={{
                                  fontSize: 9,
                                  height: 16,
                                  padding: "0 8px",
                                  borderRadius: 4,
                                  background: colors.primary,
                                  borderColor: primaryColor,
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Drop Here button clicked:', { staffName: staff.name, timeSlot: slot });
                                  dropHeldAppointment(staff.name, slot);
                                }}
                              >
                                Drop Here
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Appointment blocks */}
                  {appts.map(appt => {
                    const { top, height } = getApptPosition(appt.start_time, appt.end_time);
                    const custDisp = appt.customClientName || appt.client || "No name";
                    
                    return (
                      <div
                        key={appt.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, appt)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openEdit(appt)}
                        style={{
                          position: "absolute", left: 2, right: 2,
                          top, height, zIndex: 3,
                          background: colors.primary, color: "white",
                          borderRadius: 4, padding: "2px 4px",
                          fontSize: 10, fontWeight: 600,
                          cursor: "pointer",
                          overflow: "hidden",
                          border: draggedAppt?.id === appt.id ? `2px solid ${primaryColor}` : "none",
                          opacity: draggedAppt?.id === appt.id ? 0.7 : 1,
                          transform: draggedAppt?.id === appt.id ? "scale(0.95)" : "scale(1)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                          <Text strong style={{ fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {custDisp}
                          </Text>
                          <div style={{ display: "flex", gap: 2 }}>
                            <Button
                              size="small"
                              type="text"
                              style={{ 
                                color: "white", 
                                padding: "0 2px", 
                                height: 16, 
                                fontSize: 9,
                                minWidth: "auto",
                                display: "flex",
                                alignItems: "center",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                pickUpAppointment(appt);
                              }}
                              title="Pick up appointment"
                            >
                              📋
                            </Button>
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
                                  padding: 0, fontSize: 9, height: 16, width: 16,
                                  color: "white",
                                }}
                                onClick={e => e.stopPropagation()} />
                            </Popconfirm>
                          </div>
                        </div>
                        <div style={{ fontSize: 9, opacity: 0.9 }}>
                          {appt.service}
                        </div>
                        <div style={{ fontSize: 8, opacity: 0.8 }}>
                          {appt.start_time} - {appt.end_time}
                        </div>
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

    const getWeekAppts = (dayIndex: number, staffName: string) => {
      return weekSchedules.filter(appt => appt.dayIndex === dayIndex && appt.staff === staffName);
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "calc(100vh - 260px)" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
          <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${C.border}` }} />
          {weekDates.map((date, i) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const isSelected = selectedDate.toDateString() === date.toDateString();
            const isDragOverDate = dragOverInfo?.date?.toDateString() === date.toDateString();
            
            return (
              <div key={i} style={{
                flex: "1 0 120px", minWidth: 120, padding: "8px",
                textAlign: "center", borderRight: `1px solid ${C.border}`,
                background: isDragOverDate ? colors.primaryLight : isSelected ? colors.primaryLight + "20" : isToday ? colors.primaryLight + "15" : colors.bg,
                cursor: isDragging ? "pointer" : "default",
                transition: "all 0.2s ease",
                border: isDragOverDate ? `2px solid ${colors.primary}` : "none",
                borderRadius: isDragOverDate ? 6 : 0,
              }}
                onClick={() => isDragging && setSelectedDate(new Date(date))}
                onDragOver={(e) => isDragging && handleDragOver(e, "", "9:00 AM", date)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => isDragging && handleDrop(e, "", "9:00 AM", date)}>
                <Text strong style={{ 
                  fontSize: 12, display: "block",
                  color: isDragOverDate ? colors.primary : colors.darkText
                }}>
                  {date.toLocaleDateString("en-GB", { weekday: "short" })}
                </Text>
                <Text style={{
                  fontSize: 18, display: "block",
                  color: isDragOverDate ? colors.primary : (isToday ? colors.primary : colors.darkText), 
                  fontWeight: isDragOverDate ? 700 : (isToday ? 700 : 400),
                }}>
                  {date.getDate()}
                </Text>
                <Text style={{ 
                  fontSize: 11, 
                  color: isDragOverDate ? colors.primary : colors.subText
                }}>
                  {date.toLocaleDateString("en-GB", { month: "short" })}
                </Text>
                {isDragOverDate && (
                  <Text style={{ fontSize: 10, color: colors.primary, display: "block", marginTop: 2 }}>
                    Drop here
                  </Text>
                )}
              </div>
            );
          })}
        </div>

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
                  background: isSelected ? colors.primaryLight + "20" : isToday ? colors.primaryLight + "15" : "transparent",
                }}>
                  {HOUR_RANGE.map(hour => (
                    <div key={hour} style={{ height: 80, borderBottom: `1px solid ${C.border}`, position: "relative" }}>
                      {[20, 40, 60].map(t => (
                        <div key={t} style={{ position: "absolute", left: 0, right: 0, top: t, borderBottom: `1px dotted ${C.border}` }} />
                      ))}
                      {/* Time slots for drag and drop */}
                      {[0, 1, 2, 3].map(q => {
                        const min = q * 15;
                        const dh = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                        const per = hour >= 12 ? "PM" : "AM";
                        const slot = `${dh}:${min < 10 ? "0" + min : min} ${per}`;
                        const isDragOver = dragOverInfo?.date?.toDateString() === date.toDateString() && 
                                         dragOverInfo?.timeSlot === slot;
                        
                        return (
                          <div key={q} style={{
                            position: "absolute", left: 0, right: 0,
                            top: q * 20, height: 20, zIndex: 2,
                            background: isDragOver ? C.primaryLight : "transparent",
                            border: isDragOver ? `2px dashed ${C.primary}` : "none",
                            borderRadius: isDragOver ? 4 : 0,
                          }}
                            onDragOver={(e) => handleDragOver(e, "", slot, date)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, "", slot, date)}
                          />
                        );
                      })}
                      {/* Appointment blocks for this day */}
                      {staffMembers.map(staff => {
                        const appts = getWeekAppts(i, staff.name);
                        return appts.map(appt => {
                          const { top, height } = getApptPosition(appt.start_time, appt.end_time);
                          const custDisp = appt.originalData?.customer_ids?.length > 1
                            ? `${appt.originalData.customer_ids.length} customers`
                            : appt.customClientName || appt.client;
                          
                          return (
                            <div key={appt.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, appt)}
                              onDragEnd={handleDragEnd}
                              title={`${custDisp}\n${appt.service}\n${appt.timeRangeDescription}\nDrag to move appointment`}
                              style={{
                                position: "absolute", top, left: 3, right: 3, height,
                                background: draggedAppt?.id === appt.id ? "#f0f0f0" : colors.primaryLight + "40", 
                                borderLeft: `3px solid ${draggedAppt?.id === appt.id ? C.subText : colors.primary}`,
                                borderRadius: 4, padding: "3px 6px",
                                overflow: "hidden", cursor: "move", zIndex: 3,
                                boxShadow: draggedAppt?.id === appt.id 
                                  ? "0 4px 8px rgba(0,0,0,0.15)" 
                                  : "0 1px 3px rgba(0,0,0,0.08)",
                                opacity: draggedAppt?.id === appt.id ? 0.5 : 1,
                                transform: draggedAppt?.id === appt.id ? "scale(0.95)" : "scale(1)",
                                transition: "all 0.2s ease",
                              }}
                              onClick={() => openEdit(appt)}>
                              <Text strong style={{ fontSize: 10, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {custDisp}
                              </Text>
                              {height > 25 && (
                                <Text style={{ fontSize: 9, color: C.subText, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {appt.service}
                                </Text>
                              )}
                              {height > 40 && (
                                <Text style={{ fontSize: 9 }}>
                                  <ClockCircleOutlined style={{ marginRight: 2, fontSize: 8 }} />
                                  {appt.start_time}
                                </Text>
                              )}
                            </div>
                          );
                        });
      })}
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
    <div style={{ background: colors.bg, borderRadius: 10 }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
        background: "#fff", borderRadius: "10px 10px 0 0",
      }}>
        <Button onClick={() => setSelectedDate(new Date())} 
          style={{ 
            borderRadius: 8,
            background: isDragging ? C.primaryLight : "transparent",
            color: isDragging ? C.primary : C.darkText,
            transition: "all 0.2s ease",
            border: isDragging ? `2px solid ${C.primary}` : "none",
          }}>
          {isDragging && <span style={{ marginRight: 4 }}>📅</span>}
          Today
        </Button>
        <Button 
          icon={<LeftOutlined />} 
          onClick={() => navigateDay(-1)} 
          style={{ 
            borderRadius: 8,
            background: isDragging ? C.primaryLight : "transparent",
            color: isDragging ? C.primary : C.darkText,
            transition: "all 0.2s ease",
            border: isDragging ? `2px solid ${C.primary}` : "none",
            transform: isDragging ? "scale(1.1)" : "scale(1)",
          }} 
        />
        <DatePicker
          value={dayjs(selectedDate)}
          onChange={d => {
            if (d) {
              console.log('Date changed to:', d.format('YYYY-MM-DD'));
              setSelectedDate(d.toDate());
            }
          }}
          format="DD MMM YYYY" allowClear={false}
          variant="borderless" suffixIcon={null}
          style={{ 
            fontWeight: 600, fontSize: 14, width: 120,
            background: isDragging ? C.primaryLight : "transparent",
            borderRadius: 6, padding: "4px 8px",
            transition: "all 0.2s ease",
            border: isDragging ? `2px solid ${C.primary}` : "none",
            transform: isDragging ? "scale(1.05)" : "scale(1)",
          }}
          open={isDragging ? undefined : undefined}
          onDragOver={isDragging ? (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          } : undefined}
          onDrop={isDragging ? (e) => {
            e.preventDefault();
            if (draggedAppt) {
              // Drop on date picker - use 9:00 AM as default time
              handleDrop(e, draggedAppt.staff, "9:00 AM", selectedDate);
            }
          } : undefined}
        />
        <Button 
          icon={<RightOutlined />} 
          onClick={() => navigateDay(1)} 
          style={{ 
            borderRadius: 8,
            background: isDragging ? C.primaryLight : "transparent",
            color: isDragging ? C.primary : C.darkText,
            transition: "all 0.2s ease",
            border: isDragging ? `2px solid ${C.primary}` : "none",
            transform: isDragging ? "scale(1.1)" : "scale(1)",
          }} 
        />

        <Radio.Group value={calendarView}
          onChange={e => setCalendarView(e.target.value)}
          buttonStyle="solid" style={{ marginLeft: 4 }}>
          <Radio.Button value="day" style={{ borderRadius: "8px 0 0 8px" }}>Day</Radio.Button>
          <Radio.Button value="week" style={{ borderRadius: "0 8px 8px 0" }}>Week</Radio.Button>
        </Radio.Group>

        <div style={{ flex: 1 }} />

        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => openCreate()}
          style={{ background: colors.primary, borderColor: primaryColor, borderRadius: 8 }}>
          Add Appointment
        </Button>
      </div>

      {/* Calendar body */}
      <div style={{ background: "#fff", borderRadius: "0 0 10px 10px", position: "relative" }}>
        {/* Appointment Holding Area - Temporary Section */}
        {heldAppointment && (
          <div style={{
            position: "fixed", top: 80, left: 20, background: colors.primary,
            border: `2px solid ${primaryColor}`, borderRadius: 8, padding: "12px 16px",
            zIndex: 9998, fontSize: 11, color: "white", fontWeight: 600,
            minWidth: 250, maxWidth: 300,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>
            <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>📋 Holding Appointment</span>
              <Button 
                size="small" 
                type="text" 
                style={{ color: "white", padding: "0 4px", height: 20 }}
                onClick={clearHeldAppointment}
              >
                ✕
              </Button>
            </div>
            <div style={{ fontSize: 10, opacity: 0.9, marginBottom: 4 }}>
              {heldAppointment.customClientName || heldAppointment.client}
            </div>
            <div style={{ fontSize: 9, opacity: 0.8 }}>
              {heldAppointment.service} • {heldAppointment.start_time} - {heldAppointment.end_time}
            </div>
            <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4 }}>
              Navigate to date and drop in time slot
            </div>
          </div>
        )}
        
        {/* Drag indicator */}
        {isDragging && draggedAppt && (
          <div style={{
            position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)",
            background: colors.primary, color: "white", padding: "8px 16px",
            borderRadius: 20, fontSize: 12, fontWeight: 600,
            zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", gap: 8,
            animation: "slideDown 0.3s ease",
          }}>
            <div style={{ width: 8, height: 8, background: "white", borderRadius: "50%", opacity: 0.8 }} />
            <span>Dragging: {draggedAppt.customClientName || draggedAppt.client} - {draggedAppt.service}</span>
            <Text style={{ fontSize: 10, opacity: 0.8, marginLeft: 8 }}>
              📅 Navigate to date, then drop
            </Text>
            <Text style={{ fontSize: 9, opacity: 0.7, marginLeft: 4 }}>
              (← → arrows or 'T' for Today)
            </Text>
          </div>
        )}
        
        {/* Date Navigation Drop Zone */}
        {isDragging && (
          <div style={{
            position: "fixed", top: 60, right: 20, background: C.primaryLight,
            border: `2px dashed ${C.primary}`, borderRadius: 8, padding: "12px 16px",
            zIndex: 9998, fontSize: 11, color: C.primary, fontWeight: 600,
            minWidth: 200,
          }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedAppt) {
                // Drop here - move to current date at 9:00 AM
                handleDrop(e, draggedAppt.staff, "9:00 AM", selectedDate);
              }
            }}>
            <div style={{ marginBottom: 4 }}>📅 Drop for {dayjs(selectedDate).format("MMM DD")}</div>
            <div style={{ fontSize: 9, opacity: 0.8 }}>Navigate with arrows, then drop here</div>
          </div>
        )}
        
        {/* Enhanced Date Navigation Section */}
        {isDragging && (
          <div style={{
            position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
            background: "white", border: `2px solid ${C.primary}`, borderRadius: 12,
            padding: "16px 24px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 9997, display: "flex", alignItems: "center", gap: 16,
          }}>
            <Text strong style={{ color: C.primary, fontSize: 12 }}>DATE NAVIGATION</Text>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button 
                icon={<LeftOutlined />} 
                onClick={() => navigateDay(-1)} 
                style={{ 
                  borderRadius: 6,
                  background: C.primaryLight,
                  color: C.primary,
                  border: `1px solid ${C.primary}`,
                  transform: "scale(1.1)",
                }}
                size="small"
              >
                Prev Day
              </Button>
              
              <DatePicker
                value={dayjs(selectedDate)}
                onChange={d => {
                  if (d) {
                    console.log('Date changed to:', d.format('YYYY-MM-DD'));
                    setSelectedDate(d.toDate());
                  }
                }}
                format="DD MMM YYYY" allowClear={false}
                size="small"
                style={{ 
                  background: C.primaryLight,
                  border: `1px solid ${C.primary}`,
                  borderRadius: 6,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedAppt) {
                    handleDrop(e, draggedAppt.staff, "9:00 AM", selectedDate);
                  }
                }}
              />
              
              <Button 
                icon={<RightOutlined />} 
                onClick={() => navigateDay(1)} 
                style={{ 
                  borderRadius: 6,
                  background: C.primaryLight,
                  color: C.primary,
                  border: `1px solid ${C.primary}`,
                  transform: "scale(1.1)",
                }}
                size="small"
              >
                Next Day
              </Button>
            </div>
            
            <Button 
              onClick={() => setSelectedDate(new Date())}
              style={{ 
                borderRadius: 6,
                background: colors.primary,
                color: "white",
                border: `1px solid ${colors.primary}`,
                fontSize: 11,
              }}
              size="small"
            >
              📅 Today
            </Button>
          </div>
        )}
        {calendarView === "day" ? renderDayGrid() : renderWeekView()}
      </div>

      {/* Appointment form drawer */}
      <AppointmentForm
        open={formOpen}
        isEditMode={isEditMode}
        editingId={editingId}
        formDefaults={formDefaults}
        staffMembers={staffMembers}
        customers={customers}
        products={formattedProducts}
        selectedDate={selectedDate}
        loadingStaff={loadingStaff}
        loadingCustomers={loadingCustomers}
        loadingProducts={loadingProducts}
        formattedSchedules={formattedSchedules}
        onClose={() => setFormOpen(false)}
        onSuccess={refreshAllData}
      />
    </div>
  );
};

export default CalendarView;